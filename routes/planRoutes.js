const express = require('express');
const planController = require('./../controllers/planController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Route for getting all plans and creating a new plan
router.route('/').get(planController.getAllPlans);
router.route('/').post(authController.protect, authController.restrictTo('Admin'), planController.createPlan);

// Route for getting, updating, and deleting a plan by ID
router.route('/:id').get(planController.getPlan);
router.route('/:id').patch(authController.protect, authController.restrictTo('Admin'), planController.updatePlan);
router.route('/:id').delete(authController.protect, authController.restrictTo('Admin'), planController.deletePlan);

module.exports = router;
