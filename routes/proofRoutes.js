const express = require('express');
const proofController = require('./../controllers/proofController');

const router = express.Router();

// Route for getting all plans and creating a new plan
router.route('/').get(proofController.getAllProofs);

module.exports = router;
