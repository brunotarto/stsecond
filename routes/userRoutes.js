const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const transController = require('./../controllers/transController');
const addressController = require('./../controllers/addressController');
const withdrawController = require('./../controllers/withdrawController');
const documentController = require('./../controllers/documentController');
const subscriptionController = require('../controllers/subscriptionController');
const referralController = require('../controllers/referralController');
const bankController = require('../controllers/bankController');
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
router.patch('/account/update-password', authController.protect, authController.restrictToReal, userController.updatePassword);

//Bank
router.get('/bank', authController.protect, bankController.getBank);
router.patch('/bank', authController.protect, bankController.updateBank);

// Get subscription status
router.get('/subscription-status', authController.protect, subscriptionController.getUserSubscriptionStatus);
router.post('/subscription', authController.protect, subscriptionController.getNewSubscription);

router.get('/referrals', authController.protect, referralController.getReferrals);

// Transactions routes
router.get('/transactions', authController.protect, transController.getAllTransactions);
router.get('/transactions/:transId', authController.protect, transController.getTransaction);

// Get an address for fund account balance
router.get('/addresses/:network', authController.protect, authController.restrictToReal, addressController.generateAddress);

// request withdrawal
router.post('/withdraw', authController.protect, authController.restrictToReal, withdrawController.createWithdrawal);

router.post(
  '/document/upload',
  authController.protect,
  authController.restrictToReal,
  documentController.uploadUserDocument, // This middleware handles the file upload in memory
  documentController.verifyDocument, // This middleware handles document verification with Mindee
  documentController.createDocument // This middleware handles saving the document metadata to MongoDB
);
router.get('/document/status', authController.protect, documentController.getVerificationStatus);

module.exports = router;
