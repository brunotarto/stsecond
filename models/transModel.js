const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'fund',
      'deposit',
      'withdrawal',
      'referral',
      'earning',
      'penalty',
      'bonus',
    ],
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
  relatedBalance: {
    type: Number,
  },
  transactionReference: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    required: true,
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add unique compound index
transactionSchema.index(
  {
    userId: 1,
    type: 1,
    amount: 1,
    paymentMethod: 1,
    createdAt: 1,
  },
  { unique: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
