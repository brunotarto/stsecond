const mongoose = require('mongoose');

const User = require('../models/userModel');
const Transaction = require('../models/transModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const {
  fetchUserSubscriptionStatus,
} = require('../controllers/positionController');

exports.getUserSubscriptionStatus = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404));
  }
  const { isSubscribed, plan, expirationDate } =
    await fetchUserSubscriptionStatus(userId);
  res.status(200).json({
    status: 'success',
    data: {
      isSubscribed,
      plan,
      expirationDate,
    },
  });
});

exports.getNewSubscription = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (req.body.plan !== 'monthly' && req.body.plan !== 'annually') {
    return next(new AppError('Plan should be monthly or annually', 404));
  }

  const { isSubscribed, plan } = await fetchUserSubscriptionStatus(userId);

  if (isSubscribed || plan) {
    return next(new AppError(`Already subscripted to ${plan} plan`, 404));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const amountUSD =
      req.body.plan === 'monthly'
        ? +process.env.MONTHLY_SUBSCRIPTION_FEE
        : +process.env.ANNUALLY_SUBSCRIPTION_FEE;

    if (user.accountBalance < amountUSD) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Insufficient balance', 400));
    }

    const newTransaction = new Transaction({
      userId,
      action: 'purchase',
      amountUSD,
      memo: req.body.plan,
    });
    await newTransaction.save({ session });
    const transaction = newTransaction;

    await User.findByIdAndUpdate(
      userId,
      {
        $inc: { [`accountBalance`]: -amountUSD },
      },
      { validateBeforeSave: false, session }
    );

    if (user.referrer) {
      referrerId = user.referrer;
      referralAmount = amountUSD * 0.1;
      const referralTransaction = new Transaction({
        userId: referrerId,
        action: 'referral',
        amountUSD: referralAmount,
        memo: user.email,
      });
      await referralTransaction.save({ session });
      await User.findByIdAndUpdate(
        referrerId,
        {
          $inc: { [`accountBalance`]: referralAmount },
        },
        { validateBeforeSave: false, session }
      );
    }
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: 'success',
      data: {
        transaction,
      },
    });
  } catch (error) {
    // Rollback the transaction on error
    await session.abortTransaction();
    session.endSession();
    console.log(error);
    return next(new AppError('Error initiating subscription', 400));
  }
});
