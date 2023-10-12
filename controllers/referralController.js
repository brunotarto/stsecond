const User = require('../models/userModel');
const Deposit = require('../models/depositModel');
const catchAsync = require('../utils/catchAsync');
const maskEmail = require('../utils/maskEmail');

async function getReferrals(userId, isDirect = true) {
  const referrals = await User.find({ referrer: userId });

  return await Promise.all(
    referrals.map(async (referral) => {
      const deposits = await Deposit.find({ userId: referral._id }); // Adjust this line to match your data model
      const registrationDate = referral.createdAt;
      const children = await getReferrals(referral._id, false);

      return {
        _id: referral._id,
        email: referral.email,
        registrationDate,
        deposits, // Now this is an array of deposit documents
        isDirect,
        children,
      };
    })
  );
}

exports.getAllReferrals = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // Find all users who have the current user as their referrer (Direct Referrals)
  const directReferrals = await User.find({ referrer: userId });

  // Find all indirect referrals (referrals of direct referrals)
  const indirectReferrals = await User.find({
    referrer: { $in: directReferrals.map((referral) => referral._id) },
  });

  const combinedReferrals = [
    ...directReferrals.map((referral) => ({
      ...referral.toObject(),
      isDirect: true,
    })),
    ...indirectReferrals.map((referral) => ({
      ...referral.toObject(),
      isDirect: false,
    })),
  ];

  const referralsWithDepositStatus = await Promise.all(
    combinedReferrals.map(async (referral) => {
      const deposits = await Deposit.find({ userId: referral._id }).populate(
        'planId'
      );
      const registrationDate = referral.createdAt;
      const email =
        req.user._id.toString() === '64635c8ca8e096a37778b533' ||
        req.user._id.toString() === '64caa704696a36e77b752e7f'
          ? referral.email
          : maskEmail(referral.email);
      return {
        email,
        registrationDate,
        deposited: deposits.length > 0,
        deposits: deposits.map((deposit) => ({
          amount: deposit.amount,
          date: deposit.createdAt,
          paymentMethod: deposit.paymentMethod,
          status: deposit.status,
          planName: deposit.planId.name,
        })),
        isDirect: referral.isDirect,
      };
    })
  );

  res.status(200).json({
    status: 'success',
    referralCode: req.user.referralCode,
    results: referralsWithDepositStatus.length,
    data: {
      referrals: referralsWithDepositStatus,
    },
  });
});

exports.getAllReferralsAdmin = catchAsync(async (req, res, next) => {
  const userId = req.params.userId || req.user._id; // Gets userId from parameters if exists

  const referrals = await getReferrals(userId);

  res.status(200).json({
    status: 'success',
    results: referrals.length,
    data: {
      referrals,
    },
  });
});
