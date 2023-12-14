const Transaction = require('../models/transModel');
const Position = require('../models/positionModel');
const User = require('../models/userModel');

exports.validateVerify = async function (user) {
  if (!user.isVerified) {
    return 'Your account is not verified, please verify your account';
  }
  return true;
};

exports.validatePurchaseAnnually = async function (user) {
  const purchaseAnnually = await Transaction.countDocuments({
    userId: user._id,
    action: 'purchase',
    amountUSD: +process.env.ANNUALLY_SUBSCRIPTION_FEE,
  });

  if (purchaseAnnually === 0) {
    return 'You did not purchase any Annually subscription';
  }
  return true;
};

exports.validatePurchaseMonthly = async function (user) {
  const purchaseMonthly = await Transaction.countDocuments({
    userId: user._id,
    action: 'purchase',
    amountUSD: +process.env.MONTHLY_SUBSCRIPTION_FEE,
  });
  if (purchaseMonthly === 0) {
    return 'You did not purchase any Monthly subscription';
  }

  return true;
};

exports.validateOneAITrade = async function (user) {
  const AITrade = await Position.countDocuments({
    userId: user._id,
    ai: true,
  });

  if (AITrade === 0) {
    return 'You did not use AI trade';
  }
  return true;
};

exports.validateVerifyReferralsOver10 = async function (user) {
  const referrals = await User.countDocuments({
    referrer: user._id,
    isVerified: true,
  });

  if (referrals < 10) {
    return 'Your verified referrals is: ' + referrals;
  }
  return true;
};

exports.validateVerifyReferralsOver100 = async function (user) {
  const referrals = await User.countDocuments({
    referrer: user._id,
    isVerified: true,
  });

  if (referrals < 100) {
    return 'Your verified referrals is: ' + referrals;
  }
  return true;
};

exports.validateSingleDepositBetween10And100 = async function (user) {
  const deposit = await Transaction.countDocuments({
    userId: user._id,
    action: 'deposit',
    amountUSD: { $gte: 10, $lt: 100 },
  });

  if (deposit === 0) {
    return 'Your verified referrals is: ' + referrals;
  }
  return true;
};

exports.validateSingleDepositBetween100And1000 = async function (user) {
  const deposit = await Transaction.countDocuments({
    userId: user._id,
    action: 'deposit',
    amountUSD: { $gte: 100, $lt: 1000 },
  });

  if (deposit === 0) {
    return 'Your verified referrals is: ' + referrals;
  }
  return true;
};

exports.validateSingleDepositBetween1000And10000 = async function (user) {
  const deposit = await Transaction.countDocuments({
    userId: user._id,
    action: 'deposit',
    amountUSD: { $gte: 1000, $lt: 10000 },
  });

  if (deposit === 0) {
    return 'Your verified referrals is: ' + referrals;
  }
  return true;
};

exports.validateSumDepositOver1000 = async function (user) {
  const result = await Transaction.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(user._id),
        action: 'deposit',
      },
    },
    {
      $group: {
        _id: null,
        totalDeposit: { $sum: '$amountUSD' },
      },
    },
  ]);

  // Check if the total deposit sum is greater than 1000
  if (result.length > 0 && result[0].totalDeposit >= 1000) {
    return true;
  } else {
    return 'Your total deposit is: ' + result[0].totalDeposit;
  }
};

exports.validateSumDepositOver10000 = async function (user) {
  const result = await Transaction.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(user._id),
        action: 'deposit',
      },
    },
    {
      $group: {
        _id: null,
        totalDeposit: { $sum: '$amountUSD' },
      },
    },
  ]);

  // Check if the total deposit sum is greater than 1000
  if (result.length > 0 && result[0].totalDeposit >= 10000) {
    return true;
  } else {
    return 'Your total deposit is: ' + result[0].totalDeposit;
  }
};

exports.validateReferralSumDepositOver1000 = async function (user) {
  const referralUsers = await User.find({ referrer: user._id }).select('_id');
  const referralUserIds = referralUsers.map((referral) => referral._id);

  // Step 2: Aggregate deposit transactions for these users
  const result = await Transaction.aggregate([
    {
      $match: {
        userId: { $in: referralUserIds },
        action: 'deposit',
      },
    },
    {
      $group: {
        _id: null,
        totalDeposit: { $sum: '$amountUSD' },
      },
    },
  ]);

  // Step 3: Check if the total deposit sum is greater than 1000
  if (result.length > 0 && result[0].totalDeposit >= 1000) {
    return true;
  } else {
    return 'Your referrals total deposit is: ' + result[0].totalDeposit;
  }
};

exports.validateReferralSumDepositOver10000 = async function (user) {
  const referralUsers = await User.find({ referrer: user._id }).select('_id');
  const referralUserIds = referralUsers.map((referral) => referral._id);

  // Step 2: Aggregate deposit transactions for these users
  const result = await Transaction.aggregate([
    {
      $match: {
        userId: { $in: referralUserIds },
        action: 'deposit',
      },
    },
    {
      $group: {
        _id: null,
        totalDeposit: { $sum: '$amountUSD' },
      },
    },
  ]);

  // Step 3: Check if the total deposit sum is greater than 1000
  if (result.length > 0 && result[0].totalDeposit >= 10000) {
    return true;
  } else {
    return 'Your referrals total deposit is: ' + result[0].totalDeposit;
  }
};
