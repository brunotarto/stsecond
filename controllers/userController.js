const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const IpLogController = require('../controllers/ipLogController');
const {
  sumOpenEquity,
  sumProfitOrLoss,
} = require('../controllers/positionController');
const speakeasy = require('speakeasy');

function filterUserData(userData) {
  const filteredUser = {
    name: userData.name,
    country: userData.country,
    address: userData.address,
    zip: userData.zip,
    email: userData.email,
    accountBalance: userData.accountBalance,
    withdrawalAddresses: userData.withdrawalAddresses,
    referralCode: userData.referralCode,
    otp_enabled: userData.otp_enabled,
    marginRatios: userData.marginRatios,
    isVerified: userData.isVerified,
  };

  Object.keys(filteredUser).forEach((key) => {
    if (filteredUser[key] === undefined) {
      delete filteredUser[key];
    }
  });
  return filteredUser;
}

const filterUserUpdateData = (body) => {
  const allowedFields = [
    'name',
    'country',
    'address',
    'zip',
    'withdrawalAddresses',
  ];
  let filteredBody = {};

  Object.keys(body).forEach((key) => {
    if (allowedFields.includes(key)) {
      filteredBody[key] = body[key];
    }
  });

  // Check for nested objects and filter out unauthorized fields.
  if (filteredBody.withdrawalAddresses) {
    const allowedNestedFields = ['BTC', 'ETH', 'BNB', 'TRX'];
    let filteredNestedBody = {};

    Object.keys(filteredBody.withdrawalAddresses).forEach((key) => {
      if (allowedNestedFields.includes(key)) {
        filteredNestedBody[key] = filteredBody.withdrawalAddresses[key];
      }
    });

    filteredBody.withdrawalAddresses = filteredNestedBody;
  }

  // Remove empty fields
  for (let field in filteredBody) {
    if (!filteredBody[field]) delete filteredBody[field];
  }

  return filteredBody;
};
// ------------------------------
// Admin-only user functions
// ------------------------------

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find({ isDemo: false })
    .populate('referrer')
    .sort({ createdAt: -1 });

  // Use Promise.all to handle the asynchronous operations for each user
  const usersWithCalculations = await Promise.all(
    users.map(async (user) => {
      const openEquity = await sumOpenEquity(user._id);
      const profitOrLoss = await sumProfitOrLoss(user._id);

      // Return a new object with the additional properties
      return {
        ...user.toObject(), // Convert Mongoose document to plain JavaScript object
        sumOpenEquity: openEquity,
        sumProfitOrLoss: profitOrLoss,
      };
    })
  );

  res.status(200).json({
    status: 'success',
    results: usersWithCalculations.length,
    data: {
      users: usersWithCalculations,
    },
  });
});

// Get a single user by ID
exports.getUser = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;

  const userDoc = await User.findById(userId).populate('referrer');

  if (!userDoc) {
    return next(new AppError('No user found with ID: ' + userId, 404));
  }

  // Convert the Mongoose document to a JavaScript object
  const user = userDoc.toObject();

  // Add the new properties to the plain JavaScript object
  user.openEquity = await sumOpenEquity(user._id);
  user.profitOrLoss = await sumProfitOrLoss(user._id);

  res.status(200).json({
    status: 'success',
    data: {
      user, // Now this object includes the additional properties
    },
  });
});

// Update a user by ID
exports.updateUser = catchAsync(async (req, res, next) => {
  if (req.body.referrer) {
    const referrerUser = await User.findById(req.body.referrer);
    if (!referrerUser) {
      return next(
        new AppError('No user found with referrer ID: ' + referrer, 404)
      );
    }
  }

  const user = await User.findByIdAndUpdate(req.params.userId, req.body, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(
      new AppError('No user found with ID: ' + req.params.userId, 404)
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.updateUserBalance = catchAsync(async (req, res, next) => {
  const amount = +req.body.amount;
  const userId = req.params.userId;
  const user = await User.findById(req.params.userId);
  if (!user) {
    return next(
      new AppError('No user found with ID: ' + req.params.userId, 404)
    );
  }
  if (!amount) {
    return next(new AppError('Invalid amount ', 404));
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { accountBalance: amount } },
    { validateBeforeSave: false, new: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      updatedUser,
    },
  });
});

exports.updateUserPassword = catchAsync(async (req, res, next) => {
  // Get user from the collection
  const user = await User.findById(req.params.userId);

  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  await user.save();

  // Send response
  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully.',
  });
});
// ------------------------------
// User account management functions
// ------------------------------

// Get the logged-in user's account
exports.getAccount = catchAsync(async (req, res, next) => {
  // Get user from the collection
  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError('No user found with that ID.', 404));
  }
  await user.applyDefaultValues();
  const filteredUser = filterUserData(user);

  // await calculateEarnings(req.user._id);

  // Log user's IP address
  if (req.user.role !== 'Admin') {
    let ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (!ip) {
      ip = req.socket.remoteAddress;
    }
    IpLogController.logUserIp(ip, user._id); // Log the IP address
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: filteredUser,
    },
  });
});

// Update user's email, name, and withdrawalAddresses
exports.updateUserDetails = catchAsync(async (req, res, next) => {
  // Fetch user first to check for restrictions
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new AppError('No user found with that ID.', 404));
  }

  if (user.otp_enabled) {
    // Verify the OTP
    if (!req.body.otp) {
      return next(new AppError('OTP', 202));
    }
    if (!req.body.otp || typeof req.body.otp !== 'string') {
      return next(new AppError('Invalid OTP', 401));
    }
    const otp = req.body.otp;
    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: 'base32',
      token: otp,
    });

    if (!verified) {
      return next(new AppError('Invalid OTP', 401));
    }
  }

  // Check if user has 'updateProfile' in their restrictedActions
  if (
    user.restrictedActions &&
    user.restrictedActions.includes('updateProfile')
  ) {
    return next(
      new AppError('Something went wrong please try again later! 500', 403)
    );
  }

  // Get the fields to be updated
  const updatedData = filterUserUpdateData(req.body);

  // Update user data
  const updatedUser = await User.findByIdAndUpdate(req.user._id, updatedData, {
    new: true,
    runValidators: true,
  });

  const filteredUser = filterUserData(updatedUser._doc);

  res.status(200).json({
    status: 'success',
    data: {
      user: filteredUser,
    },
  });
});

// user update Password
exports.updatePassword = catchAsync(async (req, res, next) => {
  // Get user from the collection
  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    return next(new AppError('No user found with that ID.', 404));
  }

  if (!req.body.passwordCurrent) {
    return next(new AppError('Your current password is empty.', 404));
  }

  // Check if the posted current password is correct
  const isCorrect = await user.correctPassword(
    req.body.passwordCurrent,
    user.password
  );

  if (!isCorrect) {
    return next(new AppError('Your current password is incorrect.', 401));
  }

  // If the current password is correct, update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // Send response
  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully.',
  });
});
