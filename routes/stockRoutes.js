const express = require('express');
const stockController = require('../controllers/stockController');
const authController = require('../controllers/authController');
const marketStatusController = require('../controllers/marketStatusController');
const cryptoPriceController = require('../controllers/cryptoPriceController');

const router = express.Router();

// Routes that allow any authenticated user
router.get('/market-info', marketStatusController.getMarketInfo);
router.get('/market-status', marketStatusController.getMarketStatus);

router.get('/crypto', cryptoPriceController.getCryptoPrices);
router.get('/crypto/:symbol', cryptoPriceController.getCryptoPriceBySymbol);

router.get('/', stockController.getAllStocks);

// Routes that are restricted to Admin only
router.post('/', authController.protect, authController.restrictTo('Admin'), stockController.createStock);
router.patch('/:id', authController.protect, authController.restrictTo('Admin'), stockController.updateStock);
router.delete('/:id', authController.protect, authController.restrictTo('Admin'), stockController.deleteStock);

module.exports = router;
