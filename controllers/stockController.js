const Stock = require('../models/stockModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError'); // Error wrapper

exports.getAllStocks = catchAsync(async (req, res, next) => {
  const stocks = await Stock.find();

  res.status(200).json({
    status: 'success',
    results: stocks.length,
    data: {
      stocks,
    },
  });
});

exports.createStock = catchAsync(async (req, res, next) => {
  const newStock = await Stock.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      stock: newStock,
    },
  });
});

exports.updateStock = catchAsync(async (req, res, next) => {
  const stock = await Stock.findByIdAndUpdate(req.params.stockId, req.body, {
    new: true,
    runValidators: true,
  });

  if (!stock) {
    return next(new AppError('No stock found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      stock,
    },
  });
});

exports.deleteStock = catchAsync(async (req, res, next) => {
  const stock = await Stock.findByIdAndDelete(req.params.stockId);

  if (!stock) {
    return next(new AppError('No stock found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
