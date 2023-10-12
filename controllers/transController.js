const mongoose = require('mongoose');
const Transaction = require('../models/transModel');
const User = require('../models/userModel'); // Import userModel
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

exports.createTransaction = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, amount, type, paymentMethod, status } = req.body;

    if (amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Invalid amount', 404));
    }

    // Determine if the transaction has a positive or negative impact on the balance
    const positiveImpact = ['fund', 'referral', 'earning', 'bonus'].includes(
      type
    );
    const updateAmount = positiveImpact ? amount : -amount;

    // Update the user's balance based on the payment method
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { [`accountBalance.${paymentMethod}`]: updateAmount } },
      { validateBeforeSave: false, new: true, session }
    );

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('User not found', 404));
    }

    // Record the transaction
    const newTransaction = new Transaction({
      userId,
      amount,
      type,
      paymentMethod,
      relatedBalance: user.accountBalance[paymentMethod],
      status,
    });
    await newTransaction.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(201)
      .json({ message: 'Transaction created', data: { newTransaction } });
  } catch (error) {
    // Rollback the transaction on error
    await session.abortTransaction();
    session.endSession();

    return next(new AppError('Error creating transaction', 400));
  }
});

exports.getAllTransactions = catchAsync(async (req, res, next) => {
  // Add a condition to the query based on the user's role

  const baseQuery =
    req.user.role === 'Admin'
      ? Transaction.find().populate('userId')
      : Transaction.find({ userId: req.user._id });

  const features = new APIFeatures(baseQuery, req.query)
    .filter()
    .sort()
    .field()
    .skip()
    .dateRange();

  if (req.user.role !== 'Admin') {
    features.query = features.query.select('-userId');
  }

  const transactions = await features.query;

  res.status(200).json({
    status: 'success',
    results: transactions.length,
    data: {
      transactions,
    },
  });
});

exports.getTransaction = catchAsync(async (req, res, next) => {
  const query =
    req.user.role === 'Admin'
      ? Transaction.findById(req.params.transId)
      : Transaction.findOne({ _id: req.params.transId, userId: req.user._id });

  if (req.user.role !== 'Admin') {
    query.select('-userId');
  }

  const transaction = await query;

  if (!transaction) {
    return next(
      new AppError('No transaction found with ID: ' + req.params.transId, 404)
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      transaction,
    },
  });
});
