const express = require('express');
const limiter = require('../utils/limiter');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const transController = require('./../controllers/transController');
const addressController = require('./../controllers/addressController');
const withdrawController = require('./../controllers/withdrawController');
const documentController = require('./../controllers/documentController');
const subscriptionController = require('../controllers/subscriptionController');
const referralController = require('../controllers/referralController');
const bankController = require('../controllers/bankController');
const adminBankController = require('../controllers/adminBankController');
const rewardController = require('../controllers/rewardController');
const bountyController = require('../controllers/bountyController');

const router = express.Router();

// Signup and login routes with rate limiting middleware
router.post('/signup', limiter.signup, authController.signup);
router.post('/login', limiter.login, authController.login);
router.get('/verify-email/:token', limiter.login, authController.verifyEmail);
router.post('/resend-verification-email', limiter.login, authController.resendVerificationEmail);
router.post('/forgot-password', limiter.login, authController.forgotPassword);
router.patch('/reset-password', limiter.login, authController.resetPassword);

router.post('/otp/generate', authController.protect, authController.generate2FA);
router.post('/otp/verify', authController.protect, authController.verify2FA);
router.post('/otp/disable', authController.protect, authController.disable2FA);

// Get Account info and update account
router.get('/account', authController.protect, userController.getAccount);
router.patch('/account', authController.protect, userController.updateUserDetails);
router.patch('/account/update-password', authController.protect, authController.restrictToReal, userController.updatePassword);

//rewards
router.get('/rewards', authController.protect, rewardController.getAllRewardsUser);
router.post('/rewards', authController.protect, authController.restrictToReal, bountyController.submitBountyRequest);

//Bank
router.get('/website-bank', authController.protect, adminBankController.getAdminBankUser);
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
router.get('/withdraw-wire-status', authController.protect, adminBankController.getAdminBankWithdrawStatus);
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
