// marketStatusController.js
const axios = require('axios');
const StockPrice = require('../models/stockPriceModel');
const MarketStatus = require('../models/marketStatusModel');
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

exports.getMarketInfo = catchAsync(async (req, res, next) => {
  const data = await MarketStatus.findOne({ exchange: 'US' });
  res.status(200).json({
    status: 'success',
    data,
  });
});

exports.getGrossMargin = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      grossMargin: +process.env.GROSS_MARGIN,
    },
  });
});

exports.getMarketStatus = catchAsync(async (req, res, next) => {
  const currentTimeDelayed = new Date(
    Date.now() - process.env.DELAY_TIME * 60 * 1000
  );
  const oneMinuteAfterCurrentTimeDelayed = new Date(
    Date.now() - (process.env.DELAY_TIME - 1) * 60 * 1000
  );

  const priceDelayed = await StockPrice.find()
    .where('createdAt')
    .lt(oneMinuteAfterCurrentTimeDelayed)
    .gt(currentTimeDelayed)
    .sort('-createdAt')
    .limit(1)
    .select('price');

  const currentTime = new Date(Date.now());
  const oneMinuteBeforeCurrentTime = new Date(Date.now() - 2 * 60 * 1000);

  const price = await StockPrice.find()
    .where('createdAt')
    .lt(currentTime)
    .gt(oneMinuteBeforeCurrentTime)
    .sort('-createdAt')
    .limit(1)
    .select('price');
  const isOpen = !!price[0]?.price && !!priceDelayed[0]?.price;
  res.status(200).json({
    status: 'success',
    data: { isOpen },
  });
});
