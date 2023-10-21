const WebSocket = require('ws');
const Stock = require('../models/stockModel');
const StockPrice = require('../models/stockPriceModel');
const moment = require('moment');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);

// Create a simple in-memory cache to track the last update timestamp for each ticker
let tickerTimestampCache = {};
const tickerPriceCache = {};

exports.connectToFinnhub = async () => {
  // When the connection opens, subscribe to the symbols in the Stock model
  ws.on('open', async () => {
    const stocks = await Stock.find();
    stocks.forEach((stock) => {
      ws.send(JSON.stringify({ type: 'subscribe', symbol: stock.ticker }));
    });
  });
  console.log('Finnhub Connected');
  // When a message is received from the websocket
  ws.on('message', async (data) => {
    const parsedData = JSON.parse(data);

    // Check if the received data contains trade data for a stock
    if (parsedData.type === 'trade') {
      const { s: symbol, p: price } = parsedData.data[0];
      const currentTime = Date.now();

      // Check if there's a last timestamp stored for this ticker and if it's been more than a second
      if (
        (!tickerTimestampCache[symbol] ||
          currentTime - tickerTimestampCache[symbol] >= 1000) &&
        tickerPriceCache[symbol] !== price
      ) {
        // Store this timestamp in the cache
        tickerTimestampCache[symbol] = currentTime;

        // Store this price in the cache for symbol
        tickerPriceCache[symbol] = price;

        // Create a new stock price entry
        await StockPrice.create({ ticker: symbol, price });
      }
    }
  });

  // Handle any errors
  ws.on('error', (error) => {
    console.error(`WebSocket Error: ${error}`);
  });
};
exports.sendStockUpdates = (io) => {
  console.log('Websocket Established');
  setInterval(async () => {
    // Fetch all stocks
    const stocks = await Stock.find();

    // Fetch delayed stock prices for each stock
    const stocksWithPrices = [];
    for (let stock of stocks) {
      const fifteenMinutesAgo = moment()
        .subtract(process.env.DELAY_TIME, 'minutes')
        .toDate();

      const priceEntry = await StockPrice.findOne({
        ticker: stock.ticker,
        createdAt: { $lte: fifteenMinutesAgo },
      })
        .sort({ createdAt: -1 })
        .limit(1);

      if (priceEntry) {
        stocksWithPrices.push({
          ticker: stock.ticker,
          companyName: stock.companyName,
          price: priceEntry.price,
        });
      }
    }
    // Emitting stocks with their respective delayed prices to connected clients
    io.emit('stockPriceUpdate', stocksWithPrices);
  }, 1000); // This will fetch and send updates every second
};
// Schedule a task to delete old prices once a day
const cleanupOldPrices = async () => {
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  await StockPrice.deleteMany({ createdAt: { $lt: fourDaysAgo } });
};

setInterval(cleanupOldPrices, 24 * 60 * 60 * 1000); // This will run the cleanup task every 24 hours
