const axios = require('axios');

const CryptoPrice = require('../models/cryptoPriceModel');
const catchAsync = require('../utils/catchAsync');

exports.updateCryptoPrices = catchAsync(async () => {
  const response = await axios.get(
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
    {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
      },
    }
  );

  const btcData = response.data.data.find((coin) => coin.symbol === 'BTC');
  const ethData = response.data.data.find((coin) => coin.symbol === 'ETH');
  const bnbData = response.data.data.find((coin) => coin.symbol === 'BNB');
  const trxData = response.data.data.find((coin) => coin.symbol === 'TRX');

  const updatePrice = async (symbol, price) => {
    await CryptoPrice.findOneAndUpdate(
      { symbol },
      { usdPrice: price, lastUpdated: Date.now() },
      { upsert: true } // this will create a new doc if one doesn't exist
    );
  };

  if (btcData) {
    await updatePrice('BTC', btcData.quote.USD.price);
  }
  if (ethData) {
    await updatePrice('ETH', ethData.quote.USD.price);
  }
  if (bnbData) {
    await updatePrice('BNB', bnbData.quote.USD.price);
  }
  if (trxData) {
    await updatePrice('TRX', trxData.quote.USD.price);
  }

  // ... the rest of your code for MarketStatus update goes here ...
});

exports.getCryptoPrices = catchAsync(async (req, res, next) => {
  const data = await CryptoPrice.find();
  res.status(200).json({
    status: 'success',
    data,
  });
});

exports.getCryptoPriceBySymbol = catchAsync(async (req, res, next) => {
  const data = await CryptoPrice.findOne({ symbol: req.params.symbol });
  res.status(200).json({
    status: 'success',
    data,
  });
});
