const cppEngineService = require('../services/cppEngineService');

exports.getAlerts = async (req, res, next) => {
    try {
        const { riskLevel, page, limit } = req.query;

        if (riskLevel) {
            const validTiers = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
            if (!validTiers.includes(riskLevel.toUpperCase())) {
                return res.status(400).json({
                    error: `Invalid risk level '${riskLevel}'. Allowed values: ${validTiers.join(', ')}`
                });
            }
        }

        const alertsData = await cppEngineService.getAlerts(riskLevel, page, limit);
        res.json(alertsData);
    } catch (err) {
        next(err);
    }
};
