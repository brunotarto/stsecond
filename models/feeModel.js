const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  coin: {
    type: String,
    required: true,
    unique: true,
  },
  native: {
    type: Number,
    required: true,
  },
  token: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model('Fee', feeSchema);
