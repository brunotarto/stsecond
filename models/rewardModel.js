const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  description: String,
  conditions: [String], // Array of strings for multiple conditions
  value: Number,
  expiryDate: Date,
  actionType: {
    type: String,
    enum: [
      'Video',
      'Xomble',
      'Post',
      'Re-post',
      'Follow',
      'Like',
      'Review',
      'Other',
    ],
  },
  socialMediaPlatform: String,
  socialMediaLink: String,
  proof: String,
  insideValidations: [String], // Array of function names
});

const Reward = mongoose.model('Reward', rewardSchema);
module.exports = Reward;
