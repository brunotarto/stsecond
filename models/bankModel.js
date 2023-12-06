const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
    },
    bankAccountName: {
      type: String,
      required: [true, 'Bank account name is required'],
    },
    bankAccountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      unique: true,
    },
    bankRoutingNumber: {
      type: String,
      required: [true, 'Routing number is required'],
    },
    bankSwiftCode: {
      type: String, // SWIFT code is optional and applicable for international transfers
    },
  },
  { timestamps: true }
);

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);

module.exports = BankAccount;
