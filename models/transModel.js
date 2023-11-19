const mongoose = require('mongoose');
const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A transaction must belong to a user.'],
  },
  action: {
    type: String,
    enum: [
      'buy',
      'sell',
      'deposit',
      'withdraw',
      'referral',
      'purchase',
      'order',
      'order-cancel',
    ],
    required: [true, 'A transaction must have an action.'],
  },
  ticker: {
    type: String,
    required: function () {
      return ['buy', 'sell'].includes(this.action);
    },
  },
  amountUSD: {
    type: Number,
    required: [true, 'A transaction must have an amount in USD.'],
  },
  shares: {
    type: Number,
    required: function () {
      return ['buy', 'sell'].includes(this.action);
    },
  },
  cryptoType: {
    type: String,
    enum: ['BTC', 'ETH', 'BNB', 'TRX', 'USD'],
    required: function () {
      return ['deposit', 'withdraw'].includes(this.action);
    },
  },
  cryptoAmount: {
    type: Number,
    required: function () {
      return ['deposit', 'withdraw'].includes(this.action);
    },
  },
  txHash: {
    type: String,
    required: function () {
      return ['deposit'].includes(this.action);
    },
  },
  memo: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
