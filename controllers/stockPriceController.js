const WebSocket = require('ws');
const Stock = require('../models/stockModel');
const StockPrice = require('../models/stockPriceModel');
const moment = require('moment');
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// Create a simple in-memory cache to track the last update timestamp for each ticker
let tickerTimestampCache = {};
const tickerPriceCache = {};
const MAX_RETRIES = 5;
let retries = 0;
let ws;
let pingInterval;
let checkPongInterval;
let lastPongTimestamp = null;
let stockPriceBatch = [];
let stockAndPrices = {};
let lastSentPrices = {};
exports.updateStockAndPricesCache = async () => {
  const stocks = await Stock.find();
  for (const stock of stocks) {
    const fromTime = moment()
      .subtract(process.env.DELAY_TIME + 1, 'minutes')
      .toDate();
    const fromTime15 = moment()
      .subtract(process.env.DELAY_TIME, 'minutes')
      .toDate();
    const prices = await StockPrice.find({
      ticker: stock.ticker,
      createdAt: { $gte: fromTime },
    }).sort({ createdAt: 1 });

    let aiProgress = prices.length > 100 ? 100 : prices.length;
    let lastPrice = prices.length > 0 ? prices[0].price : null;

    if (aiProgress === 0) {
      const lastPriceBeforeDelay = await StockPrice.findOne({
        ticker: stock.ticker,
        createdAt: { $lt: fromTime15 },
      }).sort({ createdAt: -1 });
      lastPrice = lastPriceBeforeDelay ? lastPriceBeforeDelay.price : null;
    }

    stockAndPrices[stock.ticker] = {
      companyName: stock.companyName,
      prices: prices.map((p) => ({ price: p.price, createdAt: p.createdAt })),
      lastPrice,
      aiProgress,
    };
  }
};

const connectToFinnhub = async () => {
  if (ws) {
    ws.removeAllListeners();
    ws.close();
    clearInterval(pingInterval);
    clearInterval(checkPongInterval); // Clear the checkPongInterval here
  }
  ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);

  // When the connection opens, subscribe to the symbols in the Stock model
  ws.on('open', async () => {
    retries = 0; // reset retries on successful connection
    console.log('Finnhub Connected');
    lastPongTimestamp = Date.now();
    const stocks = await Stock.find();
    stocks.forEach((stock) => {
      ws.send(JSON.stringify({ type: 'subscribe', symbol: stock.ticker }));
    });
    // Heartbeat check: Send ping every 10 seconds
    pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping(() => {});
      }
    }, 20 * 1000);

    checkPongInterval = setInterval(() => {
      if (Date.now() - lastPongTimestamp > 30 * 1000) {
        console.error('Did not receive pong in the last 30 seconds.');
        ws.close(); // This will trigger a reconnect because of the 'close' event handler logic
      }
    }, 30 * 1000);
  });

  ws.on('pong', () => {
    lastPongTimestamp = Date.now();
  });

  // When a message is received from the websocket
  ws.on('message', async (data) => {
    const parsedData = JSON.parse(data);

    // Check if the received data contains trade data for a stock
    if (parsedData.type === 'trade') {
      const currentTime = Date.now();

      // Create a set to track which tickers have been processed

      for (const trade of parsedData.data) {
        const processedTickers = new Set();
        const { s: symbol, p: price } = trade;

        // Check if this ticker has already been processed
        if (processedTickers.has(symbol)) {
          continue;
        }

        // Add this ticker to the set
        processedTickers.add(symbol);

        // Check if there's a last timestamp stored for this ticker
        // and if it's been more than a second
        if (
          (!tickerTimestampCache[symbol] ||
            currentTime - tickerTimestampCache[symbol] >= 1000) &&
          tickerPriceCache[symbol] !== price
        ) {
          // Store this timestamp in the cache
          tickerTimestampCache[symbol] = currentTime;

          // Store this price in the cache for the symbol
          tickerPriceCache[symbol] = price;
          // Create a new stock price entry
          stockPriceBatch.push({
            ticker: symbol,
            price,
            createdAt: new Date(currentTime),
          });
        }
      }
    }
  });

  // Handle any errors
  ws.on('error', (error) => {
    console.error(`WebSocket Error: ${error}`);
  });

  ws.on('close', (code, reason) => {
    console.error(`WebSocket closed. Code: ${code}, Reason: ${reason}`);

    if (retries < MAX_RETRIES) {
      console.log(`Attempting to reconnect. Attempt: ${retries + 1}`);
      retries += 1;
      setTimeout(connectToFinnhub, 1000 * 10);
    } else {
      console.error('Max reconnection attempts reached.');
    }
  });
};

exports.connectToFinnhub = connectToFinnhub;

exports.sendStockUpdates = (io) => {
  console.log('Websocket Established');
  setInterval(() => {
    const stocksWithPrices = [];

    for (let ticker in stockAndPrices) {
      const stockData = stockAndPrices[ticker];
      const fromTime = moment()
        .subtract(process.env.DELAY_TIME, 'minutes')
        .toDate();
      const toTime = moment(fromTime).add(1, 'seconds').toDate();

      // Find the price entry within the specific time frame
      const relevantPriceEntry = stockData.prices.find(
        (p) => p.createdAt >= fromTime && p.createdAt <= toTime
      );

      // Use relevant price, last known price, or the last price before DELAY_TIME
      let priceToSend = relevantPriceEntry
        ? relevantPriceEntry.price
        : lastSentPrices[ticker] || stockData.lastPrice;

      // Update the last sent price for the ticker
      lastSentPrices[ticker] = priceToSend;

      stocksWithPrices.push({
        aiProgress: stockData.aiProgress,
        ticker: ticker,
        companyName: stockData.companyName,
        price: priceToSend,
      });
    }

    // Emitting stocks with their respective delayed prices to connected clients
    io.emit('stockPriceUpdate', stocksWithPrices);
  }, 1000); // Send updates every second
};
// Schedule a task to delete old prices
exports.cleanupOldPrices = async () => {
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  await StockPrice.deleteMany({ createdAt: { $lt: fourDaysAgo } });
};

exports.startBatchInsertInterval = async () => {
  if (stockPriceBatch.length > 0) {
    try {
      await StockPrice.insertMany(stockPriceBatch);
      stockPriceBatch = [];
    } catch (error) {
      console.error('Error in batch insert:', error);
    }
  }
};
