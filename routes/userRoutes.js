const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const transController = require('./../controllers/transController');
const depositController = require('./../controllers/depositController');
const addressController = require('./../controllers/addressController');
const withdrawController = require('./../controllers/withdrawController');
const referralController = require('./../controllers/referralController');
const ticketController = require('./../controllers/ticketController');
const supportController = require('./../controllers/supportController');
const subscribeController = require('./../controllers/subscribeController');
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
router.post('/transactions', authController.protect, authController.restrictTo('Admin'), transController.createTransaction);
router.get('/transactions/:transId', authController.protect, transController.getTransaction);

// Ticket routes
router.post('/tickets', authController.protect, ticketController.createTicket);
router.get('/tickets', authController.protect, ticketController.getTickets);
router.patch('/tickets/:ticketId', authController.protect, ticketController.updateTicketStatus);
router.post('/tickets/:ticketId/messages', authController.protect, ticketController.createMessage);
router.get('/tickets/:ticketId/messages', authController.protect, ticketController.getTicketMessages);

// send email to support
router.post('/support', supportController.support);

// subscribe and unsubscribe
router.post('/subscribe', subscribeController.subscribe);
router.post('/unsubscribe', subscribeController.unsubscribe);

// Get an address for fund account balance
router.get('/addresses/:network', authController.protect, addressController.generateAddress);

// Get an address for deposit to a plan
router.get('/addresses/:network/plans/:planId', authController.protect, addressController.generateAddress);

// Deposits routes
router.post('/deposits', authController.protect, authController.restrictTo('Admin'), depositController.createDeposit);
router.post('/deposits/expiring', authController.protect, authController.restrictTo('Admin'), depositController.getExpiringDeposits);

router.get('/deposits', authController.protect, depositController.getAllDeposits);
router.post('/deposits/from-account', authController.protect, depositController.depositFromAccount);
router.patch('/deposits/release/:depositId', authController.protect, depositController.releaseDeposit);
router.get('/deposits/:depositId', authController.protect, depositController.getDeposit);
router.patch('/deposits/:depositId', authController.protect, depositController.updateDeposit);

// request withdrawal
router.post('/withdraw', authController.protect, withdrawController.withdrawRequest);

// request referrals
router.get('/referrals', authController.protect, referralController.getAllReferrals);
router.get('/referrals/:userId', authController.protect, authController.restrictTo('Admin'), referralController.getAllReferralsAdmin);

// Users management - admin only
router.get('/', authController.protect, authController.restrictTo('Admin'), userController.getAllUsers);
router.post('/', authController.protect, authController.restrictTo('Admin'), userController.createUser);

// Route for admin to get all IP logs
router.get('/ip-logs', authController.protect, authController.restrictTo('Admin'), ipLogController.getAllIpLogs);
// Route for admin to get IP logs for a specific user
router.get('/ip-logs/:userId', authController.protect, authController.restrictTo('Admin'), ipLogController.getIpLogsByUserId);

router.get('/:userId', authController.protect, authController.restrictTo('Admin'), userController.getUser);
router.patch('/:userId', authController.protect, authController.restrictTo('Admin'), userController.updateUser);
router.delete('/:userId', authController.protect, authController.restrictTo('Admin'), userController.deleteUser);

module.exports = router;
