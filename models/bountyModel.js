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
    isClaimed: Boolean,
    claimedOn: Date,
    proofOfContribution: String,
  },
  { timestamps: true }
);

const Bounty = mongoose.model('Bounty', bountySchema);
module.exports = Bounty;
