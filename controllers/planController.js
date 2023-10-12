/* eslint-disable node/no-unsupported-features/es-syntax */
const Plan = require('../models/planModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Get all plans
exports.getAllPlans = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Plan, req.query)
    .filter()
    .sort()
    .field()
    .skip();

  const plans = await features.query;

  res.status(200).json({
    status: 'success',
    results: plans.length,
    data: {
      plans,
    },
  });
});

// Get a single plan by ID
exports.getPlan = catchAsync(async (req, res, next) => {
  const plan = await Plan.findById(req.params.id).select('-__v');

  if (!plan)
    return next(new AppError('No plan found with ID: ' + req.params.id, 404));

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// Update a plan by ID
exports.updatePlan = catchAsync(async (req, res, next) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
    runValidators: true,
    new: true,
  });

  if (!plan)
    return next(new AppError('No plan found with ID: ' + req.params.id, 404));

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// Delete a plan by ID
exports.deletePlan = catchAsync(async (req, res, next) => {
  const plan = await Plan.findByIdAndDelete(req.params.id);

  if (!plan)
    return next(new AppError('No plan found with ID: ' + req.params.id, 404));

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Create a new plan
exports.createPlan = catchAsync(async (req, res, next) => {
  const newPlan = await Plan.create(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      plan: newPlan,
    },
  });
});
