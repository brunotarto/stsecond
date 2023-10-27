const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ticker: {
    type: String,
    required: true,
  },
  direction: {
    type: String,
    enum: ['long', 'short'],
    required: true,
  },
  marginRatio: {
    type: Number,
    default: 1,
  },
  totalShares: {
    type: Number,
    required: true,
    default: 0,
    validate: {
      validator: function (value) {
        return value > 0;
      },
      message: 'Shares should be a positive value',
    },
  },
  initialCapital: {
    type: Number,
    required: true,
    validate: {
      validator: function (value) {
        return value > 0;
      },
      message: 'Investment should be a positive value',
    },
  },
  loan: {
    type: Number,
    required: true,
    default: 0,
    validate: {
      validator: function (value) {
        return value >= 0;
      },
      message: 'loan should be a positive value or zero',
    },
  },
  averageCost: {
    type: Number,
    required: true,
    default: 0,
    validate: {
      validator: function (value) {
        return value >= 0;
      },
      message: 'Average cost should be a positive value or zero',
    },
  },
  closePrice: {
    type: Number,
    validate: {
      validator: function (value) {
        return value >= 0;
      },
      message: 'Close price should be a positive value or zero',
    },
  },
  profitOrLoss: {
    type: Number,
  },
  orderCloseAtDate: Date,
  orderCloseAtPrice: Number,
  open: {
    type: Boolean,
    default: true,
  },
  ai: {
    type: Boolean,
    default: false,
  },
  openedAt: {
    type: Date,
    default: Date.now,
  },

  closedAt: Date,
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

positionSchema.index({ open: 1, orderCloseAtDate: 1 });
positionSchema.index({ open: 1, orderCloseAtPrice: 1 });

positionSchema.index({ ticker: 1 });

const Position = mongoose.model('Position', positionSchema);
module.exports = Position;
