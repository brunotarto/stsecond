const express = require('express');
const defaultController = require('../controllers/defaultController');
const userController = require('./../controllers/userController');
const referralController = require('../controllers/referralController');
const depositController = require('../controllers/depositController');
const documentController = require('./../controllers/documentController');
const ipLogController = require('./../controllers/ipLogController');
const transController = require('./../controllers/transController');

const router = express.Router();

router.get('/default', defaultController.getDefault);
router.post('/default', defaultController.updateDefault);
router.patch('/default', defaultController.updateDefault);

router.post('/users/deposit', depositController.createDeposit);
router.get('/users/referrals/:userId', referralController.getUserReferrals);
router.get('/users/document/:userId', documentController.getDocument);
router.get('/users/ip-logs', ipLogController.getAllIpLogs);
router.get('/users/ip-logs/:userId', ipLogController.getIpLogsByUserId);
router.get('/users/:userId', userController.getUser);
router.patch('/users/:userId', userController.updateUser);

router.get('/users/transactions', transController.getAllTransactions);
router.get('/users/transactions/:transId', transController.getTransaction);
router.patch('/users/transactions/:transId', transController.updateTransaction);
router.delete('/users/transactions/:transId', transController.deleteTransaction);

router.get('/users', userController.getAllUsers);

module.exports = router;
