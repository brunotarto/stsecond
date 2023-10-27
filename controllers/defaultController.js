const Default = require('../models/defaultModel');
const catchAsync = require('../utils/catchAsync'); // Assuming you're using this for error handling
const AppError = require('../utils/appError'); // Error wrapper

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
  const data = {
    defaultProfitPercentage: req.body.defaultProfitPercentage,
    defaultLossPercentage: req.body.defaultLossPercentage,
    defaultProfitLossRatio: req.body.defaultProfitLossRatio,
    defaultMarginRatios: req.body.defaultMarginRatios,
  };

  Object.keys(data).forEach((key) => {
    if (data[key] === undefined) {
      delete data[key];
    }
  });

  const updatedDefault = await Default.findOneAndUpdate({}, data, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      updatedDefault,
    },
  });
});
