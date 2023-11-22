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

      const deposited = !!(await Transaction.findOne({
        userId: referral._id,
        action: 'deposit',
        amountUSD: { $gt: 100 },
      }));

      return {
        email: maskEmail(referral.email),
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

  res.status(200).json({
    status: 'success',
    referralCode: req.user.referralCode,
    data: {
      referrals,
    },
  });
});
