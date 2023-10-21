const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const transController = require('./../controllers/transController');
const depositController = require('./../controllers/depositController');
const addressController = require('./../controllers/addressController');
const withdrawController = require('./../controllers/withdrawController');
const ipLogController = require('./../controllers/ipLogController');

const limiter = require('../utils/limiter');

const router = express.Router();

// Signup and login routes with rate limiting middleware
router.post('/signup', limiter.signup, authController.signup);
router.post('/login', limiter.login, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password', authController.resetPassword);

router.post('/otp/generate', authController.protect, authController.generate2FA);
router.post('/otp/verify', authController.protect, authController.verify2FA);
router.post('/otp/disable', authController.protect, authController.disable2FA);

// Get Account info and update account
router.get('/account', authController.protect, userController.getAccount);
router.patch('/account', authController.protect, userController.updateUserDetails);
router.patch('/account/update-password', authController.protect, userController.updatePassword);

// Transactions routes
router.get('/transactions', authController.protect, transController.getAllTransactions);
router.get('/transactions/:transId', authController.protect, transController.getTransaction);

// Get an address for fund account balance
router.get('/addresses/:network', authController.protect, addressController.generateAddress);

// Deposits routes
router.post('/deposits', authController.protect, authController.restrictTo('Admin'), depositController.createDeposit);

// request withdrawal
router.post('/withdraw', authController.protect, withdrawController.createWithdrawal);

// Users management - admin only
router.get('/', authController.protect, authController.restrictTo('Admin'), userController.getAllUsers);

// Route for admin to get all IP logs
router.get('/ip-logs', authController.protect, authController.restrictTo('Admin'), ipLogController.getAllIpLogs);
// Route for admin to get IP logs for a specific user
router.get('/ip-logs/:userId', authController.protect, authController.restrictTo('Admin'), ipLogController.getIpLogsByUserId);

router.get('/:userId', authController.protect, authController.restrictTo('Admin'), userController.getUser);
router.patch('/:userId', authController.protect, authController.restrictTo('Admin'), userController.updateUser);

module.exports = router;
