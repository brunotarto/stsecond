const Transaction = require('../models/transModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

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
