const express = require('express');
const marketStatusController = require('../controllers/marketStatusController');
const cryptoPriceController = require('../controllers/cryptoPriceController');

const router = express.Router();

// Routes that allow any authenticated user
router.get('/market-info', marketStatusController.getMarketInfo);
router.get('/market-status', marketStatusController.getMarketStatus);
router.get('/gross-margin', marketStatusController.getGrossMargin);

router.get('/crypto', cryptoPriceController.getCryptoPrices);
router.get('/crypto/:symbol', cryptoPriceController.getCryptoPriceBySymbol);

module.exports = router;
