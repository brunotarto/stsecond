const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const validate = require('multicoin-address-validator').validate;
const Default = require('./defaultModel'); // Ensure correct path

const userSchema = new mongoose.Schema(
  {
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
    profitPercentage: {
      type: Number,
      default: null, // will set this value programmatically
      validate: {
        validator: function (value) {
          return value === '' || value >= 0;
        },
        message: 'Invalid value for profitPercentage',
      },
    },
    lossPercentage: {
      type: Number,
      default: null, // will set this value programmatically
      validate: {
        validator: function (value) {
          return value === '' || value <= 0;
        },
        message: 'Invalid value for lossPercentage',
      },
    },
    profitLossRatio: {
      type: Number,
      default: null, // will set this value programmatically
    },
    marginRatios: {
      type: [Number],
      default: null, // will set this value programmatically
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
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    demoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    restrictedActions: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  const code = await generateReferralCode();
  this.referralCode = this.isDemo ? 'demo_' + code : code;
  if (this.isNew && !this.isDemo) {
    // Create a demo account linked to this real account
    const demoUser = new User({
      email: `demo_${this.email}`, // Modify email to avoid duplication
      password: this.password, // Use the same password
      passwordConfirm: this.password, // Use the same password
      isDemo: true,
      accountBalance: 100000, // Set initial balance for demo account
      // Copy other relevant fields if needed
    });

    await demoUser.save();
    this.demoId = demoUser._id; // Link demo account ID to real account
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

userSchema.methods.applyDefaultValues = async function () {
  const defaults = await Default.findOne();
  if (!defaults) return; // No defaults found

  // Check and set default values if necessary
  if (
    this.profitPercentage === null ||
    this.profitPercentage === '' ||
    this.profitPercentage === undefined
  ) {
    this.profitPercentage = defaults.defaultProfitPercentage;
  }
  if (
    this.lossPercentage === null ||
    this.lossPercentage === '' ||
    this.lossPercentage === undefined
  ) {
    this.lossPercentage = defaults.defaultLossPercentage;
  }
  if (
    this.profitLossRatio === null ||
    this.profitLossRatio === '' ||
    this.profitLossRatio === undefined
  ) {
    this.profitLossRatio = defaults.defaultProfitLossRatio;
  }
  if (
    !this.marginRatios ||
    this.marginRatios.length === 0 ||
    this.marginRatios[0] === null ||
    this.marginRatios[0] === undefined ||
    this.marginRatios[0] === ''
  ) {
    this.marginRatios = defaults.defaultMarginRatios;
  }
};

const User = mongoose.model('User', userSchema);
module.exports = User;
