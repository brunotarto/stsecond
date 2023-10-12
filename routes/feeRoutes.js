const express = require('express');
const feeController = require('../controllers/feeController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.get('/', feeController.getAllFees);
router.post('/', authController.protect, authController.restrictTo('Admin'), feeController.createFee);
router.get('/:coin', feeController.getFee);
router.patch('/:coin', authController.protect, authController.restrictTo('Admin'), feeController.updateFee);

module.exports = router;
