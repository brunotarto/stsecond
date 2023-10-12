const Subscribe = require('../models/subscribeModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.subscribe = catchAsync(async (req, res, next) => {
  if (!req.body.email) {
    return next(new AppError('Please provide an email to subscribe.', 400));
  }

  const existingSubscription = await Subscribe.findOne({
    email: req.body.email,
  });

  if (existingSubscription) {
    if (existingSubscription.status) {
      return res.status(200).json({
        status: 'success',
        message: 'Email is already subscribed.',
      });
    } else {
      existingSubscription.status = true;
      await existingSubscription.save();
      return res.status(200).json({
        status: 'success',
        message: 'Email subscription status updated.',
      });
    }
  } else {
    await Subscribe.create({
      email: req.body.email,
    });

    res.status(201).json({
      status: 'success',
      message: 'Email subscribed successfully.',
    });
  }
});

exports.unsubscribe = catchAsync(async (req, res, next) => {
  if (!req.body.email) {
    return next(new AppError('Please provide an email to unsubscribe.', 400));
  }

  const filter = { email: req.body.email };
  const update = { status: false };

  const updatedSubscription = await Subscribe.findOneAndUpdate(filter, update);

  if (!updatedSubscription) {
    return next(
      new AppError(
        'The provided email address is not found in the subscription list.',
        404
      )
    );
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
