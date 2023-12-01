const mongoose = require('mongoose');

const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Transaction = require('../models/transModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError'); // Error wrapper
const APIFeatures = require('../utils/apiFeatures');

exports.getAllOrders = catchAsync(async (req, res, next) => {
  let query;

  if (req.user.role === 'Admin') {
    // Find IDs of all demo accounts
    const demoUsers = await User.find({ isDemo: true }).select('_id');
    const demoUserIds = demoUsers.map((user) => user._id);

    // Exclude transactions belonging to demo accounts
    query = Order.find({ userId: { $nin: demoUserIds } });
  } else {
    // For non-admin users, only return their own transactions
    query = Order.find({ userId: req.user._id });
  }

  const features = new APIFeatures(query, req.query)
    .filter()
    .sort()
    .field()
    .skip()
    .dateRange();

  const orders = await features.query;
  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

exports.getAllUnfilledOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({
    userId: req.user._id,
    orderStatus: 'unfilled',
  });

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

const createOrder = async (orderDetails, session) => {
  const {
    userId,
    ticker,
    direction,
    marginRatio,
    initialCapital,
    orderCloseAtPrice,
  } = orderDetails;
  const newOrder = await Order.create(
    [
      {
        userId,
        ticker,
        direction,
        marginRatio,
        initialCapital,
        orderCloseAtPrice,
      },
    ],
    { session }
  );

  await User.findByIdAndUpdate(
    userId,
    { $inc: { [`accountBalance`]: -initialCapital } },
    { validateBeforeSave: false, new: true, session }
  );

  await Transaction.create(
    [
      {
        userId,
        action: 'order',
        ticker,
        amountUSD: initialCapital,
        memo: newOrder[0]._id,
      },
    ],
    { session }
  );

  return newOrder;
};
exports.createOrder = createOrder;

exports.cancelOrder = catchAsync(async (req, res, next) => {
  const userId = req.user.role === 'Admin' ? req.body.userId : req.user._id;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, userId, orderStatus: 'unfilled' },
      { orderStatus: 'canceled' },
      {
        new: true,
        runValidators: true,
        session, // add session to the query
      }
    );

    if (!order) {
      await session.abortTransaction(); // Rollback transaction
      session.endSession(); // Always end the session
      return next(new AppError('No Order found with that ID', 404));
    }

    await User.findByIdAndUpdate(
      order.userId,
      { $inc: { [`accountBalance`]: +order.initialCapital } },
      { validateBeforeSave: false, new: true, session } // add session to the query
    );

    await Transaction.create(
      [
        {
          userId: order.userId,
          action: 'order-cancel',
          ticker: order.ticker,
          amountUSD: order.initialCapital,
          memo: order._id,
        },
      ],
      { session } // add session to the query
    );

    await session.commitTransaction(); // Commit the transaction
    session.endSession(); // Always end the session

    res.status(200).json({
      status: 'success',
      data: {
        order,
      },
    });
  } catch (error) {
    await session.abortTransaction(); // Rollback transaction in case of an error
    session.endSession(); // Always end the session
    next(error); // Pass the error to the error handling middleware
  }
});

/// Admin functions

exports.getUserOrders = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;
  const baseQuery = Order.find({ userId });

  const features = new APIFeatures(baseQuery, req.query)
    .filter()
    .sort()
    .field()
    .skip()
    .dateRange();

  const orders = await features.query;
  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

exports.getOrder = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const _id = req.params.orderId;
  const order =
    req.user.role === 'Admin'
      ? await Order.findOne({ _id })
      : await Order.findOne({ _id, userId });

  if (!order) {
    return next(
      new AppError('No order found with ID: ' + req.params.orderId, 404)
    );
  }
  res.status(200).json({
    status: 'success',
    data: { order },
  });
});

exports.updateOrder = catchAsync(async (req, res, next) => {
  const updates = Object.entries(req.body).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});

  const order = await Order.findByIdAndUpdate(req.params.orderId, updates, {
    new: true,
    runValidators: true,
  });

  if (!order) {
    return next(
      new AppError('No order found with ID: ' + req.params.orderId, 404)
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      order,
    },
  });
});

exports.deleteOrder = catchAsync(async (req, res, next) => {
  const query = Order.findByIdAndDelete(req.params.orderId);

  const order = await query;

  if (!order) {
    return next(
      new AppError('No order found with ID: ' + req.params.orderId, 404)
    );
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
