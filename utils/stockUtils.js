const StockPrice = require('../models/stockPriceModel');

const getTickerPrice = async (ticker) => {
  const fifteenMinutesAgo = new Date(
    Date.now() - process.env.DELAY_TIME * 60 * 1000
  );
  const price = await StockPrice.find({ ticker })
    .where('createdAt')
    .lt(fifteenMinutesAgo)
    .sort('-createdAt')
    .limit(1)
    .select('price');
  return price[0]?.price;
};

const getTickerFuturePrice = async (ticker) => {
  const fifteenMinutesAgo = new Date(
    Date.now() - process.env.DELAY_TIME * 60 * 1000
  );
  const prices = await StockPrice.find({ ticker })
    .where('createdAt')
    .gt(fifteenMinutesAgo)
    .lte(Date.now())
    .sort('createdAt');
  return prices;
};

const getOptimalMarginRatioAndDirection = async (ticker, MarginRatios) => {
  const futurePrices = await getTickerFuturePrice(ticker);

  const maxFuturePrice = Math.max(
    ...futurePrices.map((priceObj) => priceObj.price)
  );
  const minFuturePrice = Math.min(
    ...futurePrices.map((priceObj) => priceObj.price)
  );

  const entryPrice = await getTickerPrice(ticker);
  const possibleMarginRatios = MarginRatios.sort((a, b) => b - a);

  let optimalMarginRatio = 1;
  const optimalDirection =
    maxFuturePrice - entryPrice > entryPrice - minFuturePrice
      ? 'long'
      : 'short';

  const optimalFuturePrice =
    optimalDirection === 'long' ? maxFuturePrice : minFuturePrice;
  const optimalFuturePriceObj = futurePrices.find(
    (priceObj) => priceObj.price === optimalFuturePrice
  );
  const optimalFuturePriceDate = optimalFuturePriceObj
    ? optimalFuturePriceObj.createdAt
    : null;

  for (let marginRatio of possibleMarginRatios) {
    if (optimalDirection === 'long') {
      if (((entryPrice - minFuturePrice) / entryPrice) * marginRatio < 1) {
        optimalMarginRatio = marginRatio;
        break;
      }
    }
    if (optimalDirection === 'short') {
      if (((maxFuturePrice - entryPrice) / entryPrice) * marginRatio < 1) {
        optimalMarginRatio = marginRatio;
        break;
      }
    }
  }
  return {
    optimalMarginRatio,
    optimalDirection,
    optimalFuturePrice,
    optimalFuturePriceDate,
  };
};

module.exports = {
  getTickerPrice,
  getOptimalMarginRatioAndDirection,
};
