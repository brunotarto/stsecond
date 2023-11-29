const express = require('express');
const defaultController = require('../controllers/defaultController');
const userController = require('./../controllers/userController');
const referralController = require('../controllers/referralController');
const depositController = require('../controllers/depositController');
const documentController = require('./../controllers/documentController');
const ipLogController = require('./../controllers/ipLogController');
const transController = require('./../controllers/transController');

const router = express.Router();

router.get('/defaults', defaultController.getDefault);
router.post('/defaults', defaultController.updateDefault);
router.patch('/defaults', defaultController.updateDefault);

router.get('/users/referrals/:userId', referralController.getUserReferrals);

router.get('/users/:userId', userController.getUser);
router.patch('/users/:userId', userController.updateUser);
router.patch('/users/:userId/transactions', userController.updateUser);
router.get('/users/:userId/ip-logs', ipLogController.getIpLogsByUserId);
router.get('/users/:userId/document', documentController.getDocument);
router.get('/users/:userId/document/data', documentController.getDocumentData);

router.get('/ip-logs', ipLogController.getAllIpLogs);
router.post('/deposit', depositController.createDeposit);
router.get('/transactions', transController.getAllTransactions);
router.get('/transactions/:transId', transController.getTransaction);
router.patch('/transactions/:transId', transController.updateTransaction);
router.delete('/transactions/:transId', transController.deleteTransaction);

router.get('/users', userController.getAllUsers);

module.exports = router;
