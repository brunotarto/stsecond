const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const IpLogController = require('../controllers/ipLogController');

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

// Get all users
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().populate('referrer').sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

// Get a single user by ID
exports.getUser = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;

  const user = await User.findById(userId).populate('referrer');
  if (!user) {
    return next(
      new AppError('No user found with ID: ' + req.params.userId, 404)
    );
  }
  const deposits = await Deposit.find({ userId }).populate('planId');

  res.status(200).json({
    status: 'success',
    data: {
      user,
      deposits,
    },
  });
});

// Update a user by ID
exports.updateUser = catchAsync(async (req, res, next) => {
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
