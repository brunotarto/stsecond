const mongoose = require('mongoose');
const Deposit = require('../models/depositModel');
const Transaction = require('../models/transModel');
const User = require('../models/userModel');
const Plan = require('../models/planModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');
const TransactionController = require('./transController');
const maskEmail = require('../utils/maskEmail');
const getCurrentTime = require('../utils/getCurrentTime');
const sendTemplatedEmail = require('../utils/email');

async function handleReferralLogic(user, plan, amount, paymentMethod, session) {
  if (user.referrer && (plan.commission > 0 || plan.commission2 > 0)) {
    // Calculate the referral bonus based on the deposit amount (e.g., 5%)
    const referralBonusPercentage = plan.commission * 0.01;
    const referralBonusAmount = amount * referralBonusPercentage;

    // Update the referrer's account balance

    const referrer = await User.findByIdAndUpdate(
      user.referrer,
      { $inc: { [`accountBalance.${paymentMethod}`]: referralBonusAmount } },
      { validateBeforeSave: false, new: true, session }
    );

    // set referrer TransactionReference to masked user email address
    const referrerTransactionReference = maskEmail(user.email);

    // Record the referral bonus transaction
    const referralTransaction = new Transaction({
      userId: referrer._id,
      amount: referralBonusAmount,
      type: 'referral',
      paymentMethod,
      relatedBalance: referrer.accountBalance[paymentMethod],
      referrerTransactionReference,
      status: 'completed',
    });
    await referralTransaction.save(session);

    // Check for second-level referrer and plan.commission2
    if (referrer.referrer && plan.commission2 > 0) {
      // Calculate the second-level referral bonus
      const referralBonusPercentage2 = plan.commission2 * 0.01;
      const referralBonusAmount2 = amount * referralBonusPercentage2;

      // Update the second-level referrer's account balance
      const referrer2 = await User.findByIdAndUpdate(
        referrer.referrer,
        { $inc: { [`accountBalance.${paymentMethod}`]: referralBonusAmount2 } },
        { validateBeforeSave: false, new: true, session }
      );

      // set second-level referrer TransactionReference to masked first-level referrer email address
      const referrerTransactionReference2 = maskEmail(referrer.email);

      // Record the second-level referral bonus transaction
      const referralTransaction2 = new Transaction({
        userId: referrer2._id,
        amount: referralBonusAmount2,
        type: 'referral',
        paymentMethod,
        relatedBalance: referrer2.accountBalance[paymentMethod],
        referrerTransactionReference: referrerTransactionReference2,
        status: 'completed',
      });
      await referralTransaction2.save(session);
    }
  }
}

exports.createDeposit = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, planId, amount, paymentMethod, transactionReference, ipn } =
      req.body;

    if (!userId || !planId || !amount || !paymentMethod) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError(
          'Missing required parameters. Please ensure userId, planId, amount, and paymentMethod are included in the request body.',
          400
        )
      );
    }

    // check plan exist
    const plan = await Plan.findById(planId).session(session);
    if (!plan) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Plan not found', 404));
    }

    // check user exist
    const user = await User.findById(userId).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('User not found', 404));
    }

    if (amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Negative amount not allowed', 400));
    }
    // Record the fund transaction
    const relatedBalance = user.accountBalance[paymentMethod];
    let status = 'completed';
    let type = 'fund';
    if (transactionReference !== 'From Balance') {
      const fundTransaction = new Transaction({
        userId,
        amount,
        type,
        paymentMethod,
        relatedBalance,
        transactionReference,
        status,
      });
      await fundTransaction.save(session);
    }

    status = 'active';
    // Record the deposit on deposit table
    const deposit = new Deposit({
      userId,
      planId,
      amount,
      paymentMethod,
      status,
    });
    await deposit.save(session);

    // Record the deposit transaction
    status = 'completed';
    type = 'deposit';
    const depositTransaction = new Transaction({
      userId,
      amount,
      type,
      paymentMethod,
      relatedBalance,
      status,
    });
    await depositTransaction.save(session);

    await handleReferralLogic(user, plan, amount, paymentMethod, session);

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    const emailData = {
      name: user.name,
      email: user.email,
      paymentMethod,
      type: 'Deposit',
      amount,
      date: getCurrentTime(),
    };
    await sendTemplatedEmail(
      'activity',
      'Deposit Confirmation: ' + amount + ' ' + paymentMethod,
      emailData
    );
    if (ipn === true) {
      res.status(200).json({ message: ' IPN Received ' });
    } else {
      res.status(201).json({ message: 'Deposit created', data: { deposit } });
    }
  } catch (error) {
    // Rollback the transaction on error
    await session.abortTransaction();
    session.endSession();
    return next(new AppError('Error creating transaction' + error, 400));
  }
});

exports.getAllDeposits = catchAsync(async (req, res, next) => {
  // Add a condition to the query based on the user's role

  const baseQuery =
    req.user.role === 'Admin'
      ? Deposit.find().populate('planId')
      : Deposit.find({ userId: req.user._id, status: 'active' }).populate(
          'planId'
        );

  const features = new APIFeatures(baseQuery, req.query)
    .filter()
    .sort()
    .field()
    .skip();

  const deposits = await features.query;

  res.status(200).json({
    status: 'success',
    results: deposits.length,
    data: {
      deposits,
    },
  });
});

exports.getDeposit = catchAsync(async (req, res, next) => {
  const query =
    req.user.role === 'Admin'
      ? Deposit.findById(req.params.depositId).populate('planId')
      : Deposit.findOne({
          _id: req.params.depositId,
          userId: req.user._id,
          status: 'active',
        }).populate('planId');

  const deposit = await query;

  if (!deposit) {
    return next(
      new AppError('No deposit found with ID: ' + req.params.depositId, 404)
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      deposit,
    },
  });
});

exports.updateDeposit = catchAsync(async (req, res, next) => {
  const { depositId } = req.params;
  const { compound } = req.body;

  if (typeof compound === 'undefined') {
    return next(
      new AppError('You must provide a compound value to update.', 400)
    );
  }

  const query =
    req.user.role === 'Admin'
      ? Deposit.findById(depositId)
      : Deposit.findOne({ _id: depositId, userId: req.user._id });

  const deposit = await query;

  if (!deposit) {
    return next(new AppError('No deposit found with ID: ' + depositId, 404));
  }

  const plan = await Plan.findById(deposit.planId);

  if (!plan.compound) {
    return next(new AppError('This plan is not allowed to compound.', 400));
  }

  if (deposit.status !== 'active') {
    return next(
      new AppError('You can not update an inactive deposit: ' + depositId, 400)
    );
  }

  deposit.compound = compound;
  await deposit.save();

  res.status(200).json({
    status: 'success',
    data: {
      deposit,
    },
  });
});

exports.releaseDeposit = catchAsync(async (req, res, next) => {
  const { depositId } = req.params;
  const { releaseAmount } = req.body;

  if (typeof releaseAmount === 'undefined') {
    return next(new AppError('You must provide a release amount.', 400));
  }

  const query =
    req.user.role === 'Admin'
      ? Deposit.findById(depositId)
      : Deposit.findOne({ _id: depositId, userId: req.user._id });

  const deposit = await query;

  if (!deposit) {
    return next(new AppError('No deposit found with ID: ' + depositId, 404));
  }

  if (deposit.status !== 'active') {
    return next(
      new AppError('You can not update an inactive deposit: ' + depositId, 400)
    );
  }

  const plan = await Plan.findById(deposit.planId);

  if (!plan.release) {
    return next(new AppError('This plan is not allowed to release.', 400));
  }

  if (releaseAmount <= 0 || releaseAmount > deposit.amount) {
    return next(new AppError('Invalid release amount.', 400));
  }

  deposit.amount -= releaseAmount;
  if (deposit.amount === 0) deposit.status = 'inactive';

  await deposit.save();
  const transactionData = {
    userId: req.user._id,
    amount: +releaseAmount - releaseAmount * plan.releasePenalty * 0.01,
    type: 'fund',
    paymentMethod: deposit.paymentMethod,
    status: 'completed',
  };

  req.body = transactionData;
  TransactionController.createTransaction(req, res, next);
});

exports.depositFromAccount = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { planId, amount, paymentMethod } = req.body;

    if (!planId || !amount || !paymentMethod || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError(
          'Missing required parameters. Please ensure planId, amount, and paymentMethod are included in the request body.',
          400
        )
      );
    }

    let user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('User not found', 404));
    }

    const relatedBalance = user.accountBalance[paymentMethod];
    if (amount > relatedBalance) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Insufficient balance', 400));
    }

    // Check plan exist
    const plan = await Plan.findById(planId).session(session);
    if (!plan) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Plan not found', 404));
    }

    // Adjust user's balance
    user = await User.findByIdAndUpdate(
      user._id,
      { $inc: { [`accountBalance.${paymentMethod}`]: -amount } },
      { validateBeforeSave: false, new: true, session }
    );

    // Record the deposit on deposit table
    let status = 'active';
    const deposit = new Deposit({
      userId,
      planId,
      amount,
      paymentMethod,
      status,
    });
    await deposit.save(session);

    // Record the deposit transaction
    status = 'completed';
    let type = 'deposit';
    const depositTransaction = new Transaction({
      userId,
      amount,
      type,
      paymentMethod,
      relatedBalance: user.accountBalance[paymentMethod],
      status,
    });
    await depositTransaction.save(session);

    // referral logic
    await handleReferralLogic(user, plan, amount, paymentMethod, session);

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Deposit created',
      data: { deposit },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(new AppError('Error creating transaction: ' + error, 400));
  }
});

exports.getExpiringDeposits = catchAsync(async (req, res, next) => {
  // Filter object example: {BTC:'0.1',ETH:'1',...}
  let filters = req.body;

  if (!filters || Object.keys(filters).length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'No filters provided',
    });
  }

  // Transform filter object to array of conditions
  let conditions = [];
  for (let [method, amount] of Object.entries(filters)) {
    conditions.push({
      $and: [{ paymentMethod: method }, { amount: { $gt: Number(amount) } }],
    });
  }

  const deposits = await Deposit.aggregate([
    // Match only the active deposits
    { $match: { status: 'active' } },

    // Dynamic match based on payment method and minimum amount
    { $match: { $or: conditions } },

    // Add the new field
    {
      $addFields: {
        expires_at: {
          $add: [
            '$createdAt',
            {
              $cond: [
                { $eq: ['$planId.period', 'daily'] },
                { $multiply: ['$planId.duration', 24 * 60 * 60 * 1000] },
                {
                  $cond: [
                    { $eq: ['$planId.period', 'monthly'] },
                    {
                      $multiply: ['$planId.duration', 30 * 24 * 60 * 60 * 1000],
                    },
                    0,
                  ],
                },
              ],
            },
          ],
        },
      },
    },

    // lookup (populate) userId
    {
      $lookup: {
        from: 'users', // assuming users collection
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },

    // lookup (populate) planId
    {
      $lookup: {
        from: 'plans', // assuming plans collection
        localField: 'planId',
        foreignField: '_id',
        as: 'plan',
      },
    },

    // Unwind user and plan to convert them from arrays to objects
    { $unwind: '$user' },
    { $unwind: '$plan' },

    // Sort by the new field
    { $sort: { expires_at: 1 } },
  ]).exec();

  res.status(200).json({
    status: 'success',
    results: deposits.length,
    data: {
      deposits,
    },
  });
});
