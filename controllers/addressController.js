const GatewayHandler = require('../utils/gatewayHandler');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.generateAddress = catchAsync(async (req, res, next) => {
  if (!['btc', 'eth', 'bnb', 'trx'].includes(req.params.network))
    return next(new AppError('This network is not supported', 404));

  if (req.params.network === 'bnb') req.params.network = 'bsc';
  const params = {
    network: req.params.network,
    statusURL: process.env.IPN_HANDLER,
    label: req.user._id,
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
