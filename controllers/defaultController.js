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

exports.updateDefault = catchAsync(async (req, res, next) => {
  const data = {
    defaultProfitPercentage: req.body.defaultProfitPercentage,
    defaultLossPercentage: req.body.defaultLossPercentage,
    defaultProfitLossRatio: req.body.defaultProfitLossRatio,
    defaultMarginRatios: req.body.defaultMarginRatios,
  };

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
