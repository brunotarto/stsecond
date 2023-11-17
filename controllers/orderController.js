const mongoose = require('mongoose');

const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Transaction = require('../models/transModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError'); // Error wrapper

exports.getAllOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({
    userId: req.user._id,
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
      },
    ],
    { session }
  );

  return newOrder;
};
exports.createOrder = createOrder;

exports.cancelOrder = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, orderStatus: 'unfilled' },
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
