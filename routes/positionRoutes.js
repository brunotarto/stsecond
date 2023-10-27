const express = require('express');
const positionController = require('../controllers/positionController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.patch('/:id/close', authController.protect, positionController.closePosition);
router.get('/limit', authController.protect, positionController.getAiPositionLimit);
router.get('/total-profit-or-loss', authController.protect, positionController.sumProfitOrLoss);
router.get('/total-open-equity', authController.protect, positionController.sumOpenEquity);
router.get('/', authController.protect, positionController.getAllPositions);
router.post('/', authController.protect, positionController.createPosition);

module.exports = router;
