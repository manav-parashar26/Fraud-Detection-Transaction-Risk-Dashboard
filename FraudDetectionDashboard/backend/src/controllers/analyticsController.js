const cppEngineService = require('../services/cppEngineService');

exports.getAnalytics = async (req, res, next) => {
    try {
        const analytics = await cppEngineService.getAnalytics();
        res.json(analytics);
    } catch (err) {
        next(err);
    }
};

exports.runAnalysis = async (req, res, next) => {
    try {
        const result = await cppEngineService.runFraudEngine();
        res.status(200).json({
            success: true,
            message: 'Fraud analysis completed and synchronized',
            summary: result.summary || {}
        });
    } catch (err) {
        next(err);
    }
};

exports.getSuspiciousAccounts = async (req, res, next) => {
    try {
        const { limit } = req.query;
        const accounts = await cppEngineService.getSuspiciousAccounts(limit);
        res.json(accounts);
    } catch (err) {
        next(err);
    }
};
