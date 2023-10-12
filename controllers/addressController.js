const GatewayHandler = require('../utils/gatewayHandler');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Plan = require('../models/planModel');

exports.generateAddress = catchAsync(async (req, res, next) => {
  if (req.params.planId) {
    const plan = await Plan.findById(req.params.planId);
    if (!plan) {
      return next(new AppError('Plan not found', 404));
    }
  }

  if (!['btc', 'eth', 'bnb', 'trx'].includes(req.params.network))
    return next(new AppError('This network is not supported', 404));

  if (req.params.network === 'bnb') req.params.network = 'bsc';
  const uniq = req.params.planId || 'account';

  const params = {
    network: req.params.network,
    statusURL: process.env.IPN_HANDLER,
    label: req.user._id + '.' + uniq,
    waitPeriod: 1 * 30 * 24 * 60, // 1 month to minutes
  };

  const generatedAddress = await GatewayHandler('give', params);
  const address = generatedAddress.result.address;
  if (!address) new AppError('Please try again latter', 403);
  generatedAddress.result.address;
  res.status(200).json({
    status: 'success',
    data: {
      address,
    },
  });
});
