const mongoose = require('mongoose');

const ipLogSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
  },
  country: {
    type: String,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  accessedAt: {
    type: Date,
    default: Date.now,
  },
});

const IpLog = mongoose.model('IpLog', ipLogSchema);

module.exports = IpLog;
