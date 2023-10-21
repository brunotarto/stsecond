const cron = require('node-cron');
const Position = require('../models/positionModel');
const { getTickerPrice } = require('../utils/stockUtils');
const { cronClosePosition } = require('../controllers/positionController');

// Schedule a task to run every minute
// You can adjust the cron syntax based on your requirement (e.g., every hour, day, etc.)
cron.schedule('0 * * * * *', async () => {
  try {
    // Fetch all open positions where orderCloseAtDate is less than or equal to the current time
    const positionsToClose = await Position.find({
      open: true,
      orderCloseAtDate: { $lte: new Date() },
    });

    // Loop through each position and close it
    for (let position of positionsToClose) {
      await cronClosePosition(position._id); // Assuming closePosition accepts the position ID to close it
    }
  } catch (error) {
    console.error('Error while running the cron job:', error);
  }
});

// Schedule a task to run every minute to trigger closing positions based on orderCloseAtPrice
cron.schedule('20 * * * * *', async () => {
  try {
    // Fetch current price for each ticker
    // This is a simplified approach; in a real-world scenario, you might want to optimize this to reduce the number of calls to getTickerPrice
    const distinctTickers = await Position.distinct('ticker');
    const tickerPrices = {};
    for (let ticker of distinctTickers) {
      tickerPrices[ticker] = await getTickerPrice(ticker);
    }

    // Fetch all open positions
    const openPositions = await Position.find({
      open: true,
      orderCloseAtPrice: { $exists: true, $ne: null },
    });

    // Loop through each position and check if it meets the criteria to close based on price
    for (let position of openPositions) {
      const currentPrice = tickerPrices[position.ticker];

      if (
        position.direction === 'long' &&
        currentPrice >= position.orderCloseAtPrice
      ) {
        await cronClosePosition(position._id); // Close the long position
      } else if (
        position.direction === 'short' &&
        currentPrice <= position.orderCloseAtPrice
      ) {
        await cronClosePosition(position._id); // Close the short position
      }
    }
  } catch (error) {
    console.error('Error while running the orderCloseAtPrice cron job:', error);
  }
});

// Schedule a task to run every minute to trigger liquidation for short positions
cron.schedule('40 * * * * *', async () => {
  try {
    // Fetch current price for each ticker
    const distinctTickers = await Position.distinct('ticker');
    const tickerPrices = {};
    for (let ticker of distinctTickers) {
      tickerPrices[ticker] = await getTickerPrice(ticker);
    }

    // Fetch all open positions (both short and long)
    const allOpenPositions = await Position.find({
      open: true,
    });

    // Loop through each open position and check if it needs to be liquidated
    for (let position of allOpenPositions) {
      const currentPrice = tickerPrices[position.ticker];
      const currentValue = position.totalShares * currentPrice;

      // Calculate the loss for short positions
      if (position.direction === 'short') {
        const loss = position.averageCost * position.totalShares - currentValue;
        if (loss >= position.initialCapital) {
          await cronClosePosition(position._id); // Liquidate the position
        }
      }

      // Calculate the loss for long positions
      if (position.direction === 'long') {
        const loss = currentValue - position.averageCost * position.totalShares;
        if (loss >= position.initialCapital) {
          await cronClosePosition(position._id); // Liquidate the position
        }
      }
    }
  } catch (error) {
    console.error('Error while running the liquidation cron job:', error);
  }
});
