const mongoose = require('mongoose');

const adminBankSchema = new mongoose.Schema(
  {
    isActive: {
      type: Boolean,
      default: false,
    },
    isWithdrawActive: {
      type: Boolean,
      default: false,
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
    },
    bankAccountName: {
      type: String,
      required: [true, 'Bank account name is required'],
    },
    bankAccountIBAN: {
      type: String,
      required: [true, 'Account IBAN is required'],
      unique: true,
    },
    bankAccountBIC: {
      type: String,
      required: [true, 'bankAccountBIC is required'],
    },
    bankAccountBeneficiaryAddress: {
      type: String,
      required: [true, 'bankAccountBeneficiaryAddress is required'],
    },
    bankAddress: {
      type: String,
      required: [true, 'bankAddress is required'],
    },
  },
  { timestamps: true }
);

const AdminBank = mongoose.model('AdminBank', adminBankSchema);

module.exports = AdminBank;
