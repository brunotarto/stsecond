const catchAsync = require('../utils/catchAsync');
const AdminBank = require('../models/adminBankModel');

exports.getAdminBankUser = catchAsync(async (req, res, next) => {
  // Get user from the collection
  const bank = await AdminBank.findOne({ isActive: true }).select(
    '-isActive -isWithdrawActive'
  );

  res.status(200).json({
    status: 'success',
    data: {
      bank,
    },
  });
});

exports.getAdminBankAdmin = catchAsync(async (req, res, next) => {
  // Get user from the collection
  const bank = await AdminBank.findOne();

  res.status(200).json({
    status: 'success',
    data: {
      bank,
    },
  });
});

exports.getAdminBankWithdrawStatus = catchAsync(async (req, res, next) => {
  // Get user from the collection
  const bank = await AdminBank.findOne({
    isWithdrawActive: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      status: !!bank,
    },
  });
});

exports.updateAdminBank = catchAsync(async (req, res, next) => {
  const {
    isActive,
    isWithdrawActive,
    bankName,
    bankAccountName,
    bankAccountIBAN,
    bankAccountBIC,
    bankAccountBeneficiaryAddress,
    bankAddress,
  } = req.body;

  const bank = await AdminBank.findOneAndUpdate(
    {},
    {
      isActive,
      isWithdrawActive,
      bankName,
      bankAccountName,
      bankAccountIBAN,
      bankAccountBIC,
      bankAccountBeneficiaryAddress,
      bankAddress,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      bank,
    },
  });
});

exports.createAdminBank = catchAsync(async (req, res, next) => {
  const existingAdminBank = await AdminBank.findOne();

  if (existingAdminBank) {
    return next(
      new AppError(
        'Admin Bank already exist. Cannot create more than one.',
        400
      )
    );
  }

  const {
    isActive,
    isWithdrawActive,
    bankName,
    bankAccountName,
    bankAccountIBAN,
    bankAccountBIC,
    bankAccountBeneficiaryAddress,
    bankAddress,
  } = req.body;

  const bank = await AdminBank.create({
    isActive,
    isWithdrawActive,
    bankName,
    bankAccountName,
    bankAccountIBAN,
    bankAccountBIC,
    bankAccountBeneficiaryAddress,
    bankAddress,
  });

  res.status(201).json({
    status: 'success',
    data: {
      bank,
    },
  });
});
