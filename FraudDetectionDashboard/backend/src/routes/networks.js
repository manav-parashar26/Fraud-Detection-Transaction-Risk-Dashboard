const express = require('express');
const router = express.Router();
const networkController = require('../controllers/networkController');

// GET /api/networks - Retrieve detected fraud network clusters
router.get('/', networkController.getNetworks);

module.exports = router;
