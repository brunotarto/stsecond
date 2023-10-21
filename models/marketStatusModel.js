const mongoose = require('mongoose');

const marketStatusSchema = new mongoose.Schema({
  exchange: {
    type: String,
    default: 'US',
  },
  holiday: {
    type: String,
    default: null,
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
  session: {
    type: String,
    default: null,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

const MarketStatus = mongoose.model('MarketStatus', marketStatusSchema);
module.exports = MarketStatus;
