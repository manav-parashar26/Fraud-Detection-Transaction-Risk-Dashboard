const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// GET /api/alerts - Retrieve fraud alerts (?riskLevel=LOW|MEDIUM|HIGH|CRITICAL)
router.get('/', alertController.getAlerts);

module.exports = router;
