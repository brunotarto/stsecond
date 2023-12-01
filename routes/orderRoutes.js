const express = require('express');
const orderController = require('../controllers/orderController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.get('/unfilled', orderController.getAllUnfilledOrders);
router.patch('/:id/cancel', orderController.cancelOrder);
router.get('/', orderController.getAllOrders);

module.exports = router;
