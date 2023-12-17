const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const maskEmail = require('../utils/maskEmail');
const Transaction = require('../models/transModel');

async function getReferrals(userId) {
  const referrals = await User.find({ referrer: userId });

  return await Promise.all(
    referrals.map(async (referral) => {
      const purchaseAnnuallyCount = await Transaction.countDocuments({
        userId: referral._id,
        action: 'purchase',
        amountUSD: +process.env.ANNUALLY_SUBSCRIPTION_FEE,
      });

      const purchaseMonthlyCount = await Transaction.countDocuments({
        userId: referral._id,
        action: 'purchase',
        amountUSD: +process.env.MONTHLY_SUBSCRIPTION_FEE,
      });

      return {
        email: maskEmail(referral.email),
        isVerified: referral.isVerified,
        purchaseAnnuallyCount,
        purchaseMonthlyCount,
      };
    })
  );
}

async function getReferralsAdmin(userId) {
  const referrals = await User.find({ referrer: userId });

  return await Promise.all(
    referrals.map(async (referral) => {
      const purchaseAnnuallyCount = await Transaction.countDocuments({
        userId: referral._id,
        action: 'purchase',
        amountUSD: +process.env.ANNUALLY_SUBSCRIPTION_FEE,
      });

      const purchaseMonthlyCount = await Transaction.countDocuments({
        userId: referral._id,
        action: 'purchase',
        amountUSD: +process.env.MONTHLY_SUBSCRIPTION_FEE,
      });

      const deposited = !!(await Transaction.findOne({
        userId: referral._id,
        action: 'deposit',
        amountUSD: { $gte: 1 },
      }));
      return {
        _id: referral._id,
        email: referral.email,
        isVerified: referral.isVerified,
        purchaseAnnuallyCount,
        purchaseMonthlyCount,
        deposited,
      };
    })
  );
}

exports.getReferrals = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const referrals = await getReferrals(userId);
  let referralCode = req.user.referralCode;

  if (req.user.isDemo === true) referralCode = '*demo*';
  res.status(200).json({
    status: 'success',
    referralCode,
    data: {
      referrals,
    },
  });
});

/// admin function
exports.getUserReferrals = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;
  const referrals = await getReferralsAdmin(userId);

  res.status(200).json({
    status: 'success',
    data: {
      referrals,
    },
  });
});
