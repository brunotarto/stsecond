const {
  connectToFinnhub,
  cleanupOldPrices,
} = require('../controllers/stockPriceController');
const { updateMarketStatus } = require('../controllers/marketStatusController');
const { updateCryptoPrices } = require('../controllers/cryptoPriceController');

module.exports = function () {
  // update market status
  // Call it initially
  updateMarketStatus();
  // Then, call it every minute
  setInterval(updateMarketStatus, 1 * 60 * 1000);
  // update crypto Prices
  // Call it initially
  updateCryptoPrices();
  // Then, call it 5 minutes
  setInterval(updateCryptoPrices, 5 * 60 * 1000);
  // This will run the cleanup task
  setInterval(cleanupOldPrices, 24 * 60 * 60 * 1000);
  setInterval(startBatchInsertInterval, 15 * 1000);
  setInterval(connectToFinnhub, 5 * 60 * 1000);
  // Connect to Finnhub Websocket after all initializations
  connectToFinnhub();
};
