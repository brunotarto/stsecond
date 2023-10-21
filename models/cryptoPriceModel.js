const mongoose = require('mongoose');

const cryptoPriceSchema = new mongoose.Schema({
  symbol: {
    // BTC, ETH, BNB, TRX, etc.
    type: String,
    required: true,
    uppercase: true,
    unique: true,
  },
  usdPrice: {
    // Price in USD
    type: Number,
    required: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

const CryptoPrice = mongoose.model('CryptoPrice', cryptoPriceSchema);
module.exports = CryptoPrice;
