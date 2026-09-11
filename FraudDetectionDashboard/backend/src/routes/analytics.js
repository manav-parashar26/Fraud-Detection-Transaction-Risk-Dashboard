const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// GET /api/analytics - Retrieve fraud detection analytics summary
router.get('/', analyticsController.getAnalytics);

// GET /api/analytics/suspicious-accounts - Retrieve top suspicious accounts with alert counts
router.get('/suspicious-accounts', analyticsController.getSuspiciousAccounts);

module.exports = router;
