const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Reward = require('../models/rewardModel');
const Bounty = require('../models/bountyModel');

exports.getAllRewards = catchAsync(async (req, res, next) => {
  const rewards = await Reward.find();

  res.status(200).json({
    status: 'success',
    results: rewards.length,
    data: {
      rewards,
    },
  });
});

exports.createReward = catchAsync(async (req, res, next) => {
  const updates = Object.entries(req.body).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});

  if (updates.expiryDate) updates.expiryDate = new Date(updates.expiryDate);

  const newReward = await Reward.create(updates);
  res.status(201).json({
    status: 'success',
    data: {
      reward: newReward,
    },
  });
});

exports.updateReward = catchAsync(async (req, res, next) => {
  if (req.body.expiryDate) req.body.expiryDate = new Date(req.body.expiryDate);

  const reward = await Reward.findByIdAndUpdate(req.params.rewardId, req.body, {
    new: true,
    runValidators: true,
  });

  if (!reward) {
    return next(new AppError('No reward found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      reward,
    },
  });
});

exports.deleteReward = catchAsync(async (req, res, next) => {
  const reward = await Reward.findByIdAndDelete(req.params.rewardId);

  if (!reward) {
    return next(new AppError('No reward found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// User methods:

exports.getAllRewardsUser = catchAsync(async (req, res, next) => {
  const userId = req.user._id; // Assuming the user ID is available in req.user._id
  const rewards = await Reward.find({
    $or: [
      { expiryDate: { $gte: new Date() } },
      { expiryDate: { $exists: false } },
      { expiryDate: null },
    ],
  });

  // Adding claimed status to each reward
  const rewardsWithClaimStatus = await Promise.all(
    rewards.map(async (reward) => {
      const bounty = await Bounty.findOne({
        userId: userId,
        rewardId: reward._id,
      });
      let claimedStatus = false;

      if (bounty && bounty.isClaimed) {
        claimedStatus = 'claimed';
      }

      if (bounty && !bounty.isClaimed) {
        claimedStatus = 'pending';
      }

      return { ...reward.toObject(), claimedStatus };
    })
  );

  res.status(200).json({
    status: 'success',
    results: rewardsWithClaimStatus.length,
    data: {
      rewards: rewardsWithClaimStatus,
    },
  });
});
