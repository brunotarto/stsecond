const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['BTC', 'ETH', 'BNB', 'TRX', 'USD'],
    required: true,
  },
  transactionReference: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    required: true,
  },
  compound: {
    type: Number,
    default: 0,
    validate: [
      {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value',
      },
      {
        validator: function (value) {
          return value >= 0;
        },
        message:
          'Compound value ({VALUE}) should be greater than or equal to 0',
      },
      {
        validator: function (value) {
          return value <= 100;
        },
        message: 'Compound value ({VALUE}) should be less than or equal to 100',
      },
    ],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastEarningDate: {
    type: Date,
    default: function () {
      return this.createdAt;
    },
  },
});

const Deposit = mongoose.model('Deposit', depositSchema);

module.exports = Deposit;
