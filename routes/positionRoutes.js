const express = require('express');
const positionController = require('../controllers/positionController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.patch('/:positionId/close', positionController.closePosition);
router.get('/limit', positionController.getAiPositionLimit);
router.get('/total-profit-or-loss', positionController.totalProfitOrLoss);
router.get('/total-open-equity', positionController.totalOpenEquity);
router.get('/:positionId', positionController.getPosition);
router.get('/', positionController.getAllPositions);
router.post('/', positionController.createPosition);

module.exports = router;
