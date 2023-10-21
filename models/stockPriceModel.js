const mongoose = require('mongoose');

const stockPriceSchema = new mongoose.Schema({
  ticker: {
    type: String,
    required: true,
    ref: 'Stock', // Reference to the Stock model
  },
  price: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const StockPrice = mongoose.model('StockPrice', stockPriceSchema);
module.exports = StockPrice;
