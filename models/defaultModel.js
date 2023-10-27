const mongoose = require('mongoose');
const defaultsSchema = new mongoose.Schema({
  defaultProfitPercentage: {
    type: Number,
    required: true,
  },
  defaultLossPercentage: {
    type: Number,
    required: true,
  },
  defaultProfitLossRatio: {
    type: Number,
    required: true,
  },
  defaultMarginRatios: {
    type: Array,
    required: true,
  },
});

const Default = mongoose.model('Defaults', defaultsSchema);
module.exports = Default;
