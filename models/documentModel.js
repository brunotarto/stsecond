const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Document must belong to a user'],
  },
  documentPath: {
    type: String,
    required: [true, 'Document must have a path'],
  },
  givenNames: {
    type: String,
    required: [true, 'Document must have a given Name'],
  },
  surname: {
    type: String,
    required: [true, 'Document must have a surname'],
  },
  birthDate: {
    type: String,
    required: [true, 'Document must have a birth Date'],
  },
  country: {
    type: String,
    required: [true, 'Document must have a country'],
  },
  expiryDate: {
    type: String,
    required: [true, 'Document must have a expiry Date'],
  },
  gender: {
    type: String,
    required: [true, 'Document must have a gender'],
  },
  idNumber: {
    type: String,
    required: [true, 'Document must have a id Number'],
    unique: true, // This enforces uniqueness
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
