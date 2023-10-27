const StockPrice = require('../models/stockPriceModel');
const AppError = require('../utils/appError'); // Error wrapper

const getTickerPrice = async (ticker) => {
  const currentTime = new Date(Date.now() - process.env.DELAY_TIME * 60 * 1000);
  const price = await StockPrice.find({ ticker })
    .where('createdAt')
    .lt(currentTime)
    .sort('-createdAt')
    .limit(1)
    .select('price');
  return price[0]?.price;
};

const getMarketStatus = async (ticker) => {
  const currentTimeDelayed = new Date(
    Date.now() - process.env.DELAY_TIME * 60 * 1000
  );
  const oneMinuteAfterCurrentTimeDelayed = new Date(
    Date.now() - (process.env.DELAY_TIME - 1) * 60 * 1000
  );

  const priceDelayed = await StockPrice.find({ ticker })
    .where('createdAt')
    .lt(oneMinuteAfterCurrentTimeDelayed)
    .gt(currentTimeDelayed)
    .sort('-createdAt')
    .limit(1)
    .select('price');

  const currentTime = new Date(Date.now());
  const oneMinuteBeforeCurrentTime = new Date(Date.now() - 2 * 60 * 1000);

  const price = await StockPrice.find({ ticker })
    .where('createdAt')
    .lt(currentTime)
    .gt(oneMinuteBeforeCurrentTime)
    .sort('-createdAt')
    .limit(1)
    .select('price');
  return !!price[0]?.price && !!priceDelayed[0]?.price;
};

const getTickerFuturePrice = async (ticker) => {
  const currentTime = new Date(Date.now() - process.env.DELAY_TIME * 60 * 1000);
  const prices = await StockPrice.find({ ticker })
    .where('createdAt')
    .gt(currentTime)
    .lte(Date.now())
    .sort('createdAt');
  return prices;
};
const getTickerFuturePriceLength = async (ticker) => {
  const currentTime = new Date(Date.now() - process.env.DELAY_TIME * 60 * 1000);
  const length = await StockPrice.countDocuments({
    ticker,
    createdAt: {
      $gt: currentTime,
      $lte: Date.now(),
    },
  });

  return length;
};

const getMarginRatioAndDirection = async (ticker, marginRatios, percentage) => {
  const marketStatus = await getMarketStatus('AAPL');
  if (!marketStatus) {
    return new AppError(
      'Open new position with AI is not possible while market is close',
      404
    );
  }

  const futurePrices = await getTickerFuturePrice(ticker);

  const maxFuturePrice = Math.max(
    ...futurePrices.map((priceObj) => priceObj.price)
  );
  const minFuturePrice = Math.min(
    ...futurePrices.map((priceObj) => priceObj.price)
  );

  const entryPrice = await getTickerPrice(ticker);
  const possibleMarginRatios = marginRatios.sort((a, b) => b - a);

  let optimalMarginRatio = 1;
  let gainOrLoss = percentage >= 0 ? 'gain' : 'lose';
  let maximumPercentage = percentage >= 0 ? percentage : percentage * -1;
  let direction =
    maxFuturePrice - entryPrice > entryPrice - minFuturePrice
      ? 'long'
      : 'short';

  const optimalFuturePrice =
    direction === 'long' ? maxFuturePrice : minFuturePrice;

  const optimalFuturePriceObj = futurePrices.find(
    (priceObj) => priceObj.price === optimalFuturePrice
  );

  const optimalFuturePriceDate = optimalFuturePriceObj.createdAt;

  for (let marginRatio of possibleMarginRatios) {
    if (direction === 'long') {
      if (
        ((optimalFuturePrice - entryPrice) / entryPrice) * marginRatio <
        maximumPercentage * 0.01
      ) {
        optimalMarginRatio = marginRatio;
        break;
      }
    }
    if (direction === 'short') {
      if (
        ((entryPrice - optimalFuturePrice) / entryPrice) * marginRatio <
        maximumPercentage * 0.01
      ) {
        optimalMarginRatio = marginRatio;
        break;
      }
    }
  }
  direction =
    gainOrLoss === 'gain'
      ? direction
      : direction === 'short'
      ? 'long'
      : 'short';
  const result = {
    optimalMarginRatio,
    direction,
    optimalFuturePrice,
    optimalFuturePriceDate,
  };
  return result;
};

module.exports = {
  getTickerPrice,
  getMarginRatioAndDirection,
  getTickerFuturePriceLength,
};
