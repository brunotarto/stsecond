const mongoose = require('mongoose');
const Transaction = require('../models/transModel');
const User = require('../models/userModel');
const Fee = require('../models/feeModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const GatewayHandler = require('../utils/gatewayHandler');
const getCurrentTime = require('../utils/getCurrentTime');
const sendTemplatedEmail = require('../utils/email');

exports.withdrawRequest = catchAsync(async (req, res, next) => {
  // Add a condition to the query based on the user's role

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount } = req.body;
    let { network, token } = req.body;
    const userId = req.user._id;
    const type = 'withdrawal';
    const status = 'pending';

    network = network ? network.toUpperCase() : undefined;
    token = token ? token.toUpperCase() : undefined;

    let user = await User.findOne({ _id: req.user._id });

    if (network === token) token = undefined;

    if (!['ETH', 'BTC', 'TRX', 'BNB'].includes(network)) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError(`Network should be either: ETH, BTC, TRX or BSC`, 400)
      );
    }

    if (!['BUSD', 'USDT', 'USDC'].includes(token) && token) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError(`USD token should be either: USDT, BUSD or USDC`, 400)
      );
    }

    if (token && network === 'BTC') {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError(`Can not use Bitcoin as network to transfer USD`, 400)
      );
    }

    const paymentMethod = token ? 'USD' : network;

    // Retrieve the fee for the respective cryptocurrency from the database
    const fee = await Fee.findOne({ coin: network });
    if (!fee) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Fee not found for the network', 404));
    }
    const effectiveFee = token ? fee.token : fee.native;

    if (user.accountBalance[paymentMethod] < amount) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError('Requested amount more than account balance.', 400)
      );
    }

    if (amount - effectiveFee <= effectiveFee) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Requested amount plus fee or too small', 400));
    }

    if (!user.withdrawalAddresses[network]) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError(`${network} address is undefined`, 400));
    }

    // Check if user has 'withdraw' in their restrictedActions
    if (user.restrictedActions && user.restrictedActions.includes('withdraw')) {
      return next(
        new AppError('Something went wrong please try again later! 500', 403)
      );
    }

    const transactionReference = network + ':' + token;

    // update user balance
    user = await User.findByIdAndUpdate(
      user._id,
      { $inc: { [`accountBalance.${paymentMethod}`]: -amount } },
      { validateBeforeSave: false, new: true, session }
    );

    // Record the transaction
    const newTransaction = new Transaction({
      userId,
      amount,
      type,
      paymentMethod,
      relatedBalance: user.accountBalance[paymentMethod],
      status,
      transactionReference,
    });

    const savedTransaction = await newTransaction.save({ session });

    // Access transaction ID
    const transactionId = savedTransaction._id.toString();

    //prepare Gateway api call
    const params = {
      network: network,
      token: token,
      address: user.withdrawalAddresses[network],
      statusURL: process.env.IPN_HANDLER,
      label: transactionId,
      amount: amount - effectiveFee,
    };

    // delete undefined params (token)
    Object.keys(params).forEach((key) => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });

    // send request to Gateway
    await GatewayHandler('send', params);

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    const emailData = {
      name: user.name,
      email: user.email,
      paymentMethod,
      type: 'Withdrawal',
      amount,
      date: getCurrentTime(),
    };
    await sendTemplatedEmail(
      'activity',
      'Withdrawal Confirmation: ' + amount + ' ' + paymentMethod,
      emailData
    );

    res
      .status(201)
      .json({ message: 'Request created', data: { newTransaction } });
  } catch (error) {
    // Rollback the transaction on error
    await session.abortTransaction();
    session.endSession();

    return next(new AppError('Error creating withdraw request', 400));
  }
});
