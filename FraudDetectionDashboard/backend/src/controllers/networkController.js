const cppEngineService = require('../services/cppEngineService');

exports.getNetworks = async (req, res, next) => {
    try {
        const networksData = await cppEngineService.getNetworks();
        res.json(networksData);
    } catch (err) {
        next(err);
    }
};
