const cppEngineService = require('../services/cppEngineService');

exports.getTransactions = async (req, res, next) => {
    try {
        const { page, limit, riskLevel, status, sender, receiver, search, startDate, endDate } = req.query;
        const result = await cppEngineService.getTransactions({
            page,
            limit,
            riskLevel,
            status,
            sender,
            receiver,
            search,
            startDate,
            endDate
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getTransactionById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const transaction = await cppEngineService.getTransactionById(id);

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json(transaction);
    } catch (err) {
        next(err);
    }
};
