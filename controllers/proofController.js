/* eslint-disable node/no-unsupported-features/es-syntax */
const Proof = require('../models/proofModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');

// Get all proofs
exports.getAllProofs = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Proof, req.query)
    .filter()
    .sort()
    .field()
    .skip();

  const proofs = await features.query;

  res.status(200).json({
    status: 'success',
    results: proofs.length,
    data: {
      proofs,
    },
  });
});
