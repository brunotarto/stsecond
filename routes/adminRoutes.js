const express = require('express');
const defaultController = require('../controllers/defaultController');
const userController = require('./../controllers/userController');
const referralController = require('../controllers/referralController');
const depositController = require('../controllers/depositController');
const documentController = require('./../controllers/documentController');
const ipLogController = require('./../controllers/ipLogController');
const transController = require('./../controllers/transController');
const positionController = require('../controllers/positionController');
const orderController = require('../controllers/orderController');
const subscriptionController = require('../controllers/subscriptionController');
const stockController = require('../controllers/stockController');
const bankController = require('../controllers/bankController');
const adminBankController = require('../controllers/adminBankController');
const rewardController = require('../controllers/rewardController');
const bountyController = require('../controllers/bountyController');

const router = express.Router();

// Routes that are restricted to Admin only

// User routes
router.get('/users', userController.getAllUsers);
router.get('/users/:userId', userController.getUser);
router.patch('/users/:userId/balance', userController.updateUserBalance);
router.patch('/users/:userId/password', userController.updateUserPassword);
router.patch('/users/:userId', userController.updateUser);

// User sub-resources
router.get('/users/:userId/transactions', transController.getUserTransactions);
router.get('/users/:userId/positions', positionController.getUserPositions);
router.get('/users/:userId/orders', orderController.getUserOrders);
router.get('/users/:userId/subscription', subscriptionController.getUserSubscriptionStatus);
router.get('/users/:userId/referrals', referralController.getUserReferrals);
router.get('/users/:userId/bounties', bountyController.getUserBounties);
router.get('/users/:userId/ip-logs', ipLogController.getIpLogsByUserId);
router.get('/users/:userId/documents', documentController.getDocumentsData);
router.get('/users/:userId/bank', bankController.getBank);
router.patch('/users/:userId/bank', bankController.updateBank);
router.get('/users/:userId/documents/:documentId', documentController.getDocumentImage);
router.patch('/users/:userId/documents/:documentId', documentController.updateDocumentValidity);

// IP logs
router.get('/ip-logs', ipLogController.getAllIpLogs);

// Deposits
router.post('/deposit', depositController.createDeposit);

// Transactions
router.get('/transactions/:transId', transController.getTransaction);
router.get('/transactions', transController.getAllTransactions);
router.patch('/transactions/:transId', transController.updateTransaction);
router.delete('/transactions/:transId', transController.deleteTransaction);

// Positions
router.get('/positions/:positionId', positionController.getPosition);
router.get('/positions', positionController.getAllPositions);
router.patch('/positions/:positionId/close', positionController.closePositionImmediately);
router.patch('/positions/:positionId', positionController.updatePosition);
router.delete('/positions/:positionId', positionController.deletePosition);

// Orders
router.get('/orders/:orderId', orderController.getOrder);
router.get('/orders', orderController.getAllOrders);
router.patch('/orders/:orderId/cancel', orderController.cancelOrder);
router.patch('/orders/:orderId', orderController.updateOrder);
router.delete('/orders/:orderId', orderController.deleteOrder);

//Stocks
router.get('/stocks', stockController.getAllStocks);
router.post('/stocks', stockController.createStock);
router.patch('/stocks/:stockId', stockController.updateStock);
router.delete('/stocks/:stockId', stockController.deleteStock);

//Rewards
router.get('/rewards', rewardController.getAllRewards);
router.post('/rewards', rewardController.createReward);
router.patch('/rewards/:rewardId', rewardController.updateReward);
router.delete('/rewards/:rewardId', rewardController.deleteReward);

//bounties
router.get('/bounties/:bountyId', bountyController.getBounty);
router.get('/bounties', bountyController.getAllBounties);
router.patch('/bounties/:bountyId/verify', bountyController.verifyBounty);
router.patch('/bounties/:bountyId', bountyController.updateBounty);
router.delete('/bounties/:bountyId', bountyController.deleteBounty);

// Defaults
router.get('/defaults', defaultController.getDefault);
router.post('/defaults', defaultController.createDefault);
router.patch('/defaults', defaultController.updateDefault);

//Admin Bank
router.get('/admin-bank', adminBankController.getAdminBankAdmin);
router.post('/admin-bank', adminBankController.createAdminBank);
router.patch('/admin-bank', adminBankController.updateAdminBank);

module.exports = router;
