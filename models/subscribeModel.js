const mongoose = require('mongoose');
const validator = require('validator');

const subscribeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: [true],
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  status: {
    type: Boolean,
    default: true,
  },
});

const Subscribe = mongoose.model('Subscribe', subscribeSchema);
module.exports = Subscribe;
