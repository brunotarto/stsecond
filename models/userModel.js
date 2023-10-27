const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const validate = require('multicoin-address-validator').validate;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    maxLength: [50, 'Name cannot be longer than 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: [true],
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
    maxLength: [50, 'Name cannot be longer than 50 characters'],
  },
  role: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minLength: 8,
    select: false,
  },
  country: {
    type: String,
    maxLength: [50, 'Name cannot be longer than 50 characters'],
  },
  address: {
    type: String,
    maxLength: [150, 'Name cannot be longer than 150 characters'],
  },
  zip: {
    type: String,
    maxLength: [10, 'Name cannot be longer than 10 characters'],
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function (el) {
        // Only works on SAVE and CREATE
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  accountBalance: {
    type: Number,
    default: 0.0,
  },
  withdrawalAddresses: {
    BTC: {
      type: String,
      default: '',
      validate: {
        validator: function (address) {
          return address === '' || validate(address, 'BTC');
        },
        message: 'Invalid BTC address',
      },
    },
    ETH: {
      type: String,
      default: '',
      validate: {
        validator: function (address) {
          return address === '' || validate(address, 'ETH');
        },
        message: 'Invalid ETH address',
      },
    },
    BNB: {
      type: String,
      default: '',
      validate: {
        validator: function (address) {
          return address === '' || validate(address, 'ETH');
        },
        message: 'Invalid BNB address',
      },
    },
    TRX: {
      type: String,
      default: '',
      validate: {
        validator: function (address) {
          return address === '' || validate(address, 'TRX');
        },
        message: 'Invalid TRX address',
      },
    },
  },
  tier: {
    type: String,
    enum: ['basic', 'mid', 'pro'],
    default: 'basic',
  },
  profitPercentage: {
    type: Number,
    default: null, // will set this value programmatically
  },
  lossPercentage: {
    type: Number,
    default: null, // will set this value programmatically
  },
  profitLossRatio: {
    type: Number,
    default: null, // will set this value programmatically
  },
  marginRatios: {
    type: Array,
    default: null, // will set this value programmatically
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

  passwordResetToken: String,
  passwordResetExpires: Date,
  changedPasswordAt: Date,

  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  referralCode: {
    type: String,
    unique: true,
  },
  twoFASecret: {
    type: String,
  },
  otp_enabled: {
    type: Boolean,
    default: false,
  },
  restrictedActions: {
    type: Array,
    default: [],
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  if (this.isNew) {
    this.referralCode = await generateReferralCode();

    // Fetch the default values and set them to the user
    const DefaultsModel = mongoose.model('Defaults'); // Referencing the model
    const defaultValues = await DefaultsModel.findOne(); // Assuming there's only one document with defaults
    if (defaultValues) {
      this.profitPercentage = defaultValues.defaultProfitPercentage;
      this.lossPercentage = defaultValues.defaultLossPercentage;
      this.profitLossRatio = defaultValues.defaultProfitLossRatio;
      this.marginRatios = defaultValues.defaultMarginRatios;
    }
  }
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 60 minutes validation
  return resetToken;
};

async function generateReferralCode() {
  let referralCode;
  let unique = false;

  while (!unique) {
    referralCode = crypto.randomBytes(4).toString('hex');
    const existingUser = await User.findOne({ referralCode });
    if (!existingUser) {
      unique = true;
    }
  }

  return referralCode;
}

userSchema.virtual('maxTradesPerDay').get(function () {
  switch (this.tier) {
    case 'basic':
      return 1;
    case 'mid':
      return 3;
    case 'pro':
      return 5;
    default:
      return 1; // default for safety, but ideally, this shouldn't be hit because of the enum restriction.
  }
});

const User = mongoose.model('User', userSchema);
module.exports = User;
