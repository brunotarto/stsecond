// marketStatusController.js
const axios = require('axios');

const MarketStatus = require('../models/marketStatusModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.updateMarketStatus = catchAsync(async () => {
  const response = await axios.get(
    `https://finnhub.io/api/v1/stock/market-status?exchange=US&token=${process.env.FINNHUB_API_KEY}`
  );

  if (response.data) {
    const data = response.data;

    let status = await MarketStatus.findOne({ exchange: 'US' });

    if (!status) {
      status = new MarketStatus({ exchange: 'US' });
    }

    status.holiday = data.holiday;
    status.isOpen = data.isOpen;
    status.session = data.session;
    status.lastUpdated = new Date();

    await status.save();
  }
});

exports.getMarketStatus = catchAsync(async (req, res, next) => {
  const data = await MarketStatus.findOne({ exchange: 'US' });
  res.status(200).json({
    status: 'success',
    data,
  });
});
