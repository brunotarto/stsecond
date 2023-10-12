const express = require('express');
const ipnController = require('./../controllers/ipnController');

const router = express.Router();

router.post('', ipnController.receive);

module.exports = router;
