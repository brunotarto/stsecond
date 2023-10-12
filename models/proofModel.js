const mongoose = require('mongoose');

const proofSchema = new mongoose.Schema({
  email: {
    type: String,
  },
  txid: {
    type: String,
  },
  network: {
    type: String,
  },
  token: {
    type: String,
  },
  amount: {
    type: Number,
  },
  type: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Proof = mongoose.model('Proof', proofSchema);
module.exports = Proof;
