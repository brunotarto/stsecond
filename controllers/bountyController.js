const mongoose = require('mongoose');
const Bounty = require('../models/bountyModel');
const Reward = require('../models/rewardModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validationFunctions = require('../utils/validationFunctions');
const { rewardUser } = require('../controllers/depositController');
const APIFeatures = require('../utils/apiFeatures');

exports.getAllBounties = catchAsync(async (req, res, next) => {
  const query = Bounty.find();

  const features = new APIFeatures(query, req.query)
    .filter()
    .sort()
    .field()
    .skip()
    .dateRange();

  const bounties = await features.query;

  res.status(200).json({
    status: 'success',
    results: bounties.length,
    data: {
      bounties,
    },
  });
});

exports.getUserBounties = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;

  const query = Bounty.find({ userId });

  const features = new APIFeatures(query, req.query)
    .filter()
    .sort()
    .field()
    .skip()
    .dateRange();

  const bounties = await features.query;

  res.status(200).json({
    status: 'success',
    results: bounties.length,
    data: {
      bounties,
    },
  });
});

exports.getBounty = catchAsync(async (req, res, next) => {
  const bounty = await Bounty.findById(req.params.bountyId).populate(
    'rewardId userId'
  );
  if (!bounty) {
    return next(new AppError('No bounty found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      bounty,
    },
  });
});

exports.verifyBounty = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bounty = await Bounty.findOne({
      _id: req.params.bountyId,
      claimedStatus: 'Pending',
    })
      .populate('rewardId')
      .session(session);

    if (!bounty) {
      throw new Error('No pending bounty found with that ID');
    }

    if (!req.body.conditionsStatus) {
      throw new Error('Please define Conditions Status');
    }

    await rewardUser(
      bounty.userId, // userId
      bounty.rewardId.value, // value of reward
      session, // session
      bounty._id
    );

    // Update the bounty as claimed
    bounty.claimedStatus = 'Claimed';
    bounty.conditionsStatus = req.body.conditionsStatus;
    bounty.claimedOn = new Date();
    await bounty.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      data: {
        bounty,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return next(
      new AppError('Error verifying bounty claim: ' + error.message, 400)
    );
  }
});

exports.updateBounty = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bounty = await Bounty.findOne({
      _id: req.params.bountyId,
    })
      .populate('rewardId')
      .session(session);

    if (!bounty) {
      throw new Error('No bounty found with that ID');
    }

    // Update the bounty as claimed
    bounty.claimedStatus = req.body.claimedStatus;
    bounty.conditionsStatus = req.body.conditionsStatus;
    await bounty.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      data: {
        bounty,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return next(
      new AppError('Error rejecting bounty claim: ' + error.message, 400)
    );
  }
});

exports.deleteBounty = catchAsync(async (req, res, next) => {
  const bounty = await Bounty.findByIdAndDelete(req.params.bountyId);

  if (!bounty) {
    return next(new AppError('No bounty found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

//User method to submit bounty
exports.submitBountyRequest = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const userId = req.user._id;
  const { rewardId, proofOfContribution } = req.body;

  try {
    const bounty = await Bounty.findOne({
      rewardId,
      userId,
    }).session(session);

    if (bounty && bounty.claimedStatus !== 'Rejected') {
      throw new Error('You already contributed for this reward');
    }

    const reward = await Reward.findOne({
      _id: rewardId,
      $or: [
        { expiryDate: { $gte: new Date() } },
        { expiryDate: { $exists: false } },
        { expiryDate: null },
      ],
    });
    if (!reward) {
      throw new Error('Reward not found or expired!');
    }
    let isValid;

    // Validate each function in the insideValidation array
    if (reward.insideValidations && reward.insideValidations.length) {
      for (const validationFunctionName of reward.insideValidations) {
        const trimmedFunctionName = validationFunctionName.trim();

        if (validationFunctions[trimmedFunctionName]) {
          isValid = await validationFunctions[trimmedFunctionName](req.user);
          if (typeof isValid === 'string') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
              status: 'error',
              message: isValid,
            });
          }
        } else {
          throw new Error('Something went wrong, please contact support');
        }
      }
    }
    let newBounty;
    if (bounty) {
      bounty.claimedStatus = 'Pending';
      bounty.proofOfContribution += ' * ' + proofOfContribution;
      await bounty.save({ session });
    } else {
      let newBountyData = {
        userId,
        rewardId,
        claimedStatus:
          reward.insideValidations.length > 0 ? 'Claimed' : 'Pending',
        proofOfContribution: proofOfContribution || 'Automated Validation',
      };

      newBounty = await Bounty.create([newBountyData], { session });
    }

    if (reward.insideValidations.length > 0) {
      await rewardUser(userId, reward.value, session, newBounty._id);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: 'success',
      data: {
        bounty: bounty || newBounty,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(
      new AppError('Error verifying bounty claim: ' + error.message, 400)
    );
  }
});
