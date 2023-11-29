const Transaction = require('../models/transModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

exports.getAllTransactions = catchAsync(async (req, res, next) => {
  // Add a condition to the query based on the user's role

  const baseQuery =
    req.user.role === 'Admin'
      ? Transaction.find({ isDemo: false }).populate('userId')
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

exports.updateTransaction = catchAsync(async (req, res, next) => {
  // Removing empty values from req.body
  const updates = Object.entries(req.body).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});

  // Finding and updating the transaction
  const transaction = await Transaction.findByIdAndUpdate(
    req.params.transId,
    updates,
    {
      new: true, // Return the modified document rather than the original
      runValidators: true, // Ensure that updates adhere to the schema
    }
  );

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

exports.deleteTransaction = catchAsync(async (req, res, next) => {
  const query = Transaction.findByIdAndDelete(req.params.transId);

  const transaction = await query;

  if (!transaction) {
    return next(
      new AppError('No transaction found with ID: ' + req.params.transId, 404)
    );
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
