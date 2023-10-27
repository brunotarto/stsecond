const express = require('express');
const defaultController = require('../controllers/defaultController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.get('/default', authController.protect, authController.restrictTo('Admin'), defaultController.getDefault);
router.post('/default', authController.protect, authController.restrictTo('Admin'), defaultController.createDefault);
router.patch('/default', authController.protect, authController.restrictTo('Admin'), defaultController.updateDefault);

module.exports = router;
