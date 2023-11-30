const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ticker: {
      type: String,
      required: true,
    },
    direction: {
      type: String,
      enum: ['long', 'short'],
      required: true,
    },
    marginRatio: {
      type: Number,
      default: 1,
    },
    initialCapital: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value > 0;
        },
        message: 'Investment should be a positive value',
      },
    },
    orderCloseAtPrice: Number,
    orderStatus: {
      type: String,
      enum: ['filled', 'unfilled', 'canceled'],
      default: 'unfilled',
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
