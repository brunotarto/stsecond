const Default = require('../models/defaultModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getDefault = catchAsync(async (req, res, next) => {
  const defaults = await Default.findOne();

  res.status(200).json({
    status: 'success',
    data: {
      defaults,
    },
  });
});

exports.createDefault = catchAsync(async (req, res, next) => {
  const existingDefault = await Default.findOne();

  if (existingDefault) {
    return next(
      new AppError(
        'Default values already exist. Cannot create more than one.',
        400
      )
    );
  }

  const {
    defaultProfitPercentage,
    defaultLossPercentage,
    defaultProfitLossRatio,
    defaultMarginRatios,
  } = req.body;

  const newDefault = await Default.create({
    defaultProfitPercentage,
    defaultLossPercentage,
    defaultProfitLossRatio,
    defaultMarginRatios,
  });

  res.status(201).json({
    status: 'success',
    data: {
      default: newDefault,
    },
  });
});

exports.updateDefault = catchAsync(async (req, res, next) => {
  const data = req.body;

  // Remove undefined keys
  Object.keys(data).forEach((key) => {
    if (data[key] === undefined || data[key] === '' || data[key] === null) {
      delete data[key];
    }
  });

  // Find one and update or insert if not found
  const updatedDefault = await Default.findOneAndUpdate({}, data, {
    new: true,
    upsert: true, // This creates a new document if none exists
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      updatedDefault,
    },
  });
});
