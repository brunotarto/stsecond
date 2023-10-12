const mongoose = require('mongoose');

const lockSchema = new mongoose.Schema({
  depositId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deposit',
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '20m', // This lock will be deleted after 5 minutes
  },
});

const Lock = mongoose.model('Lock', lockSchema);

module.exports = Lock;
