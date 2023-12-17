const mongoose = require('mongoose');

const bountySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reward',
    },
    claimedStatus: {
      type: String,
      enum: ['Pending', 'Claimed', 'Rejected', 'Banned'],
    },
    conditionsStatus: [Boolean],
    claimedOn: Date,
    proofOfContribution: String,
  },
  { timestamps: true }
);

const Bounty = mongoose.model('Bounty', bountySchema);
module.exports = Bounty;
