const Fee = require('../models/feeModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all fees
exports.getAllFees = catchAsync(async (req, res, next) => {
  const fees = await Fee.find().select('-__v');
  res.status(200).json({
    status: 'success',
    data: fees,
  });
});

// Get fee by coin name
exports.getFee = catchAsync(async (req, res, next) => {
  const { coin } = req.params;
  const fee = await Fee.findOne({ coin }).select('-__v');
  if (!fee) {
    return next(new AppError('Fee not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: fee,
  });
});

// Update fee by coin name
exports.updateFee = catchAsync(async (req, res, next) => {
  const { coin } = req.params;
  const { native, token } = req.body;

  const updatedFee = await Fee.findOneAndUpdate(
    { coin },
    { native, token },
    { new: true }
  ).select('-__v');
  if (!updatedFee) {
    return next(new AppError('Fee not found', 404));
  }
  res.status(200).json({
    status: 'success',
    data: updatedFee,
  });
});

// Create fee
exports.createFee = catchAsync(async (req, res, next) => {
  const { coin, native, token } = req.body;

  const newFee = await Fee.create({ coin, native, token });
  res.status(201).json({
    status: 'success',
    data: newFee,
  });
});
