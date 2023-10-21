const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  ticker: {
    type: String,
    required: true,
    unique: true,
  },
  companyName: {
    type: String,
    required: true,
  },
});

const Stock = mongoose.model('Stock', stockSchema);
module.exports = Stock;
