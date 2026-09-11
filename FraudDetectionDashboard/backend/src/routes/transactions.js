const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// GET /api/transactions - Retrieve paginated transactions (?page=1&limit=50)
router.get('/', transactionController.getTransactions);

// GET /api/transactions/:id - Retrieve details of a specific transaction
router.get('/:id', transactionController.getTransactionById);

module.exports = router;
