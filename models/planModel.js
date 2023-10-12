const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  // Plan name
  name: {
    type: String,
    trim: true,
    required: [true, 'A plan must have a name'],
    maxLength: [40, 'Maximum Length of plan name is 40'],
    minLength: [5, 'Minimum Length of plan name is 5'],
  },

  // Plan duration
  duration: {
    type: Number,
    required: [true, 'A plan must have a duration, Enter 0 for infinite'],
  },

  // Profit calculation period
  period: {
    type: String,
    required: [true, 'A plan must have a period'],
    enum: {
      values: ['minutely', 'hourly', 'daily', 'weekly', 'monthly'],
      message: 'Period is either: minutely, hourly, daily, weekly, or monthly',
    },
  },

  // Profit percentage
  percentage: {
    type: Number,
    required: [true, 'A plan must have a percentage'],
  },

  // Referral commission percentage
  commission: {
    type: Number,
    default: 0,
  },

  // Level 2 Referral commission percentage
  commission2: {
    type: Number,
    default: 0,
  },

  // Compounding interest flag
  compound: {
    type: Boolean,
    default: false,
  },

  // Return of principal amount flag
  return: {
    type: Boolean,
    default: false,
  },

  // Early principal release flag
  release: {
    type: Boolean,
    default: false,
  },

  // Penalty for early principal release
  releasePenalty: {
    type: Number,
    default: 0,
    max: [100, 'Maximum release penalty is 100'],
    min: [0, 'Minimum release penalty is 0'],
  },
  // Plan status
  status: {
    type: Boolean,
    default: true,
  },

  // Plan creation date
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-find middleware to filter active plans
planSchema.pre(/^find/, function (next) {
  this.find({ status: { $eq: true } });
  next();
});

const Plan = mongoose.model('Plan', planSchema);
module.exports = Plan;
