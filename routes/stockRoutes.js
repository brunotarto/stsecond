const express = require('express');
const stockController = require('../controllers/stockController');
const authController = require('../controllers/authController');
const marketStatusController = require('../controllers/marketStatusController');

const router = express.Router();

// Routes that allow any authenticated user
router.get('/market', marketStatusController.getMarketStatus);

router.get('/', stockController.getAllStocks);
router.get('/:id', stockController.getStock);

// Routes that are restricted to Admin only
router.post('/', authController.protect, authController.restrictTo('Admin'), stockController.createStock);
router.patch('/:id', authController.protect, authController.restrictTo('Admin'), stockController.updateStock);
router.delete('/:id', authController.protect, authController.restrictTo('Admin'), stockController.deleteStock);

module.exports = router;
