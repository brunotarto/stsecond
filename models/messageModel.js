const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  announcer: {
    type: String,
    enum: ['Support', 'User'],
    default: 'User',
  },
  content: {
    type: String,
    required: true,
    maxLength: [5000, 'Content cannot be longer than 5000 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
