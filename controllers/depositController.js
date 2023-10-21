const mongoose = require('mongoose');
const Transaction = require('../models/transModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createDeposit = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      userId,
      action,
      cryptoType,
      txHash,
      amountUSD,
      cryptoAmount,
      status,
      memo,
    } = req.body;

    if (amountUSD <= 0) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Invalid amount', 404));
    }

    // Increase the user's balance by the deposit amount
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { accountBalance: amountUSD } },
      { validateBeforeSave: false, new: true, session }
    );

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('User not found', 404));
    }

    // Record the deposit transaction
    const newTransaction = new Transaction({
      userID: userId,
      action,
      amountUSD,
      cryptoType,
      cryptoAmount,
      txHash,
      status,
      memo,
    });

    await newTransaction.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({
        message: 'Deposit transaction created',
        data: { newTransaction },
      });
  } catch (error) {
    // Rollback the transaction on error
    await session.abortTransaction();
    session.endSession();

    return next(new AppError('Error creating deposit transaction', 400));
  }
});
