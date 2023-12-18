const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const sendTemplatedEmail = require('../utils/email');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');

const speakeasy = require('speakeasy');

const signToken = (userId, demoId) => {
  return jwt.sign({ id: userId, demoId: demoId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id, user.demoId);
  const filteredUser = {
    name: user.name,
    email: user.email,
    accountBalance: user.accountBalance,
    withdrawalAddresses: user.withdrawalAddresses,
    otp_enabled: user.otp_enabled,
  };

  res.status(statusCode).json({
    status: 'success',
    data: {
      user: filteredUser,
      token: token,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return next(new AppError('User already exists with this email', 400));
    }
    // Check for a referral code in the request
    const referralCode = req.body.referralCode;
    let referrer;

    if (referralCode) {
      // Find the referrer user with the provided referral code
      referrer = await User.findOne({ referralCode });
    }

    // Create a new user object (but don't save yet)
    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      referrer: referrer ? referrer._id : undefined,
      emailVerificationToken: crypto.randomBytes(32).toString('hex'),
      emailVerified: false,
    });

    // Save the new user
    await newUser.save();

    // Generate verification URL
    const verificationUrl = `https://www.${process.env.FUNCTION}.com/verify-email/${newUser.emailVerificationToken}`;

    // Send email with verification link
    await sendTemplatedEmail(
      'welcome',
      'Verify Your Email to Complete Your Registration',
      { email: newUser.email, verificationUrl }
    );

    // Send response without authentication token
    res.status(201).json({
      status: 'success',
      message:
        'Registration successful! Please check your email to verify your account.',
    });
  } catch (error) {
    console.error(error);
    next(
      new AppError(
        'An error occurred during registration, please try again.',
        500
      )
    );
  }
});

exports.resendVerificationEmail = catchAsync(async (req, res, next) => {
  if (typeof req.body.email !== 'string' || req.body.email.trim() === '') {
    return next(new AppError('Invalid email provided', 400));
  }

  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.emailVerified) {
    return next(new AppError('Email is already verified', 400));
  }

  const now = Date.now();
  const timeSinceLastEmail = now - (user.lastEmailSent || 0);
  const cooldownPeriod = user.emailResendCooldown || 10000; // 10 seconds for the first attempt

  if (timeSinceLastEmail < cooldownPeriod) {
    const waitTime = Math.ceil((cooldownPeriod - timeSinceLastEmail) / 1000); // Convert to seconds
    return next(
      new AppError(
        `Please wait ${waitTime} seconds before requesting another email`,
        429
      )
    );
  }

  // Update cooldown (double it) and lastEmailSent
  user.emailResendCooldown = cooldownPeriod * 2;
  user.lastEmailSent = now;
  await user.save({ validateBeforeSave: false });

  const verificationUrl = `https://www.${process.env.FUNCTION}.com/verify-email/${user.emailVerificationToken}`;

  await sendTemplatedEmail(
    'welcome',
    'Verify Your Email to Complete Your Xomble Registration (Resent)',
    { email: user.email, verificationUrl }
  );

  res.status(200).json({
    status: 'success',
    message: 'Verification email resent successfully',
  });
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const token = req.params.token;
  if (typeof token !== 'string' || token.trim() === '') {
    return next(new AppError('Invalid email provided', 400));
  }
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerified: false,
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save({ validateBeforeSave: false });

  // Instead of just sending a success message, also log the user in
  createSendToken(user, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  // Retrieve the email and password from the request body
  const { email, password } = req.body;

  // Check if either email or password is missing
  if (!email || !password) {
    // If either is missing, return a 400 Bad Request response with a custom error message
    return next(new AppError('Please provide email and password', 400));
  }

  // Retrieve the user with the given email and select the password field
  const user = await User.findOne({ email, isDemo: false }).select('+password');

  // Check if the password is correct
  const correctPassword = user
    ? await user.correctPassword(password, user.password)
    : false;

  // If either the user or the password is incorrect
  if (!user || !correctPassword) {
    // Return a 401 Unauthorized response with a custom error message
    return next(new AppError('Incorrect email or password', 401));
  }

  if (user.restrictedActions && user.restrictedActions.includes('access')) {
    return next(
      new AppError('Something went wrong please try again later! 500', 405)
    );
  }

  if (!user.emailVerified && user.role !== 'Admin') {
    return next(new AppError('Please verify your email to login', 403));
  }

  if (user.otp_enabled) {
    // Verify the OTP
    if (!req.body.otp) {
      return next(new AppError('OTP', 202));
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

  // If the email and password are correct, call the createSendToken function to send a token to the client
  createSendToken(user, 200, res);
});

exports.validateWebSocketToken = async (token, accountType) => {
  // accountType added as a parameter
  try {
    if (!token) {
      throw new AppError('No token provided.', 401);
    }

    // Verify the token and extract the payload
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Determine the account type (real or demo)
    const accountId = accountType === 'demo' ? decoded.demoId : decoded.id;

    // Check if the user still exists
    const currentUser = await User.findById(accountId);
    if (!currentUser) {
      throw new AppError(
        'The user belonging to this token no longer exists.',
        401
      );
    }

    // Check if user has 'access' in their restrictedActions
    if (
      currentUser.restrictedActions &&
      currentUser.restrictedActions.includes('access')
    ) {
      throw new AppError('Restricted access.', 403);
    }

    return currentUser;
  } catch (error) {
    console.error('Token validation error:', error.message);
    return null; // Instead of throwing an error, just return null
  }
};

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get the token from the Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.',
      });
    }

    // Verify the token and extract the payload
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Determine the account type (real or demo)
    const accountType = req.headers['x-account-type']; // Custom header
    const accountId = accountType === 'demo' ? decoded.demoId : decoded.id;

    // Check if the user still exists
    const currentUser = await User.findById(accountId);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // Check if user has 'withdraw' in their restrictedActions
    if (
      currentUser.restrictedActions &&
      currentUser.restrictedActions.includes('access')
    ) {
      return next(
        new AppError('Something went wrong please try again later! 500', 403)
      );
    }
    // Grant access to the protected route
    req.user = currentUser;
    next();
  } catch (error) {
    res.status(401).json({
      status: 'fail',
      message: 'Invalid token or access denied.',
      error,
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array of allowed roles, e.g. ['admin', 'user']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email, isDemo: false });

  if (!user) {
    return next(new AppError('There is no user with email address', 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `https://www.${process.env.FUNCTION.toLowerCase()}.com/public/forget-password?token=${resetToken}`;
  user.resetLink = resetURL;

  try {
    await sendTemplatedEmail('passwordReset', 'Reset Password', {
      email: user.email,
      resetURL,
    });

    res.status(200).json({
      status: 'success',
      message: 'Email has been sent',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try again later.',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { resetToken, password, passwordConfirm } = req.body;

  if (
    !resetToken ||
    !password ||
    !passwordConfirm ||
    password !== passwordConfirm
  ) {
    return next(new AppError('Invalid or missed input', 400));
  }

  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is a user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  if (password !== passwordConfirm) {
    return next(
      new AppError('password and passwordConfirm are not match.', 400)
    );
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // 3) Update changedPasswordAt property for the user
  user.changedPasswordAt = Date.now();
  await user.save();

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.generate2FA = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (user.otp_enabled) {
    return next(
      new AppError('Two factor authentication is already set upped', 401)
    );
  }

  const { base32, otpauth_url } = speakeasy.generateSecret({
    length: 15,
    issuer: process.env.FUNCTION,
    name: `${process.env.FUNCTION} (${user.email})`,
  });

  user.twoFASecret = base32;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      otpauth_url,
      base32,
    },
  });
});

exports.verify2FA = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const token = req.body.token;
  const secret = user.twoFASecret;

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
  });

  if (!verified) {
    return next(new AppError('Invalid OTP', 401));
  }

  user.otp_enabled = true;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'OTP verified successfully',
  });
});

exports.disable2FA = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user.otp_enabled) {
    return next(new AppError('User already disabled 2FA', 401));
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

  user.otp_enabled = false;
  user.twoFASecret = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      twoFAEnabled: user.otp_enabled,
    },
  });
});

exports.restrictToReal = (req, res, next) => {
  // roles is an array of allowed roles, e.g. ['admin', 'user']
  if (req.user.isDemo) {
    return next(
      new AppError('This action is not available for demo accounts.', 403)
    );
  }
  next();
};
