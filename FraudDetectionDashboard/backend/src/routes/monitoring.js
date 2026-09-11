const express = require('express');
const router = express.Router();
const streamManager = require('../services/streamManager');

// GET /api/monitoring/status - Retrieve current continuous monitoring state
router.get('/status', (req, res) => {
    res.json(streamManager.getStatus());
});

// POST /api/monitoring/start - Launch C++ continuous streaming process
router.post('/start', (req, res, next) => {
    try {
        const result = streamManager.startMonitoring();
        if (!result.success && result.running) {
            return res.status(409).json(result);
        }
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
});

// POST /api/monitoring/stop - Terminate C++ continuous streaming process
router.post('/stop', (req, res, next) => {
    try {
        const result = streamManager.stopMonitoring();
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
