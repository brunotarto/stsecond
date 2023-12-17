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
      userId,
      action,
      amountUSD,
      cryptoType,
      cryptoAmount,
      txHash,
      status,
      memo,
    });

    await newTransaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Deposit transaction created',
    });
  } catch (error) {
    // Rollback the transaction on error
    await session.abortTransaction();
    session.endSession();

    return next(new AppError('Error creating deposit transaction', 400));
  }
});

const rewardUser = async (userId, amount, session, bountyId = '') => {
  try {
    // Update user account balance and set rewarded flag to true
    await User.findByIdAndUpdate(
      userId,
      {
        $inc: { accountBalance: amount },
      },
      { validateBeforeSave: false, new: true, session }
    );

    // Create and save the user transaction
    const userTransaction = new Transaction({
      userId,
      action: 'reward',
      amountUSD: amount,
      memo: bountyId,
    });
    await userTransaction.save({ session });
  } catch (error) {
    // Handle error
    throw new AppError('Error in rewarding user', 500);
  }
};
exports.rewardUser = rewardUser;
