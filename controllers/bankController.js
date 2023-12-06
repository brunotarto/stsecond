const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Bank = require('../models/bankModel');
const Document = require('../models/documentModel');

exports.getBank = catchAsync(async (req, res, next) => {
  // Get user from the collection
  const userId = req.user.role === 'Admin' ? req.params.userId : req.user._id;
  const bank = await Bank.findOne({ userId });

  res.status(200).json({
    status: 'success',
    data: {
      bank,
    },
  });
});

exports.updateBank = catchAsync(async (req, res, next) => {
  const userId = req.user.role === 'Admin' ? req.params.userId : req.user._id;

  const document = await Document.findOne({ userId, isValid: true });

  if (!document) {
    return next(new AppError('No document found with for this user', 404));
  }

  const data = {
    bankAccountName: document.givenNames + ' ' + document.surname,
    bankName: req.body.bankName,
    bankAccountNumber: req.body.bankAccountNumber,
    bankRoutingNumber: req.body.bankRoutingNumber,
    bankSwiftCode: req.body.bankSwiftCode,
  };
  const bank = await Bank.findOneAndUpdate({ userId }, data, {
    new: true,
    upsert: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      bank,
    },
  });
});
