const express = require('express');
const orderController = require('../controllers/orderController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.get('/unfilled', authController.protect, orderController.getAllUnfilledOrders);
router.patch('/:id/cancel', authController.protect, orderController.cancelOrder);
router.get('/', authController.protect, orderController.getAllOrders);

module.exports = router;
