/**
 * Deep Database Persistence & Upsert Deduplication Test Suite
 * Uses MongoMemoryServer to spin up an ephemeral MongoDB engine,
 * connects Mongoose, and executes real bulk upserts, queries, and aggregations.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const cppEngineService = require('../src/services/cppEngineService');
const Transaction = require('../src/models/Transaction');
const FraudAlert = require('../src/models/FraudAlert');
const FraudNetwork = require('../src/models/FraudNetwork');

async function testDatabasePersistence() {
  console.log('================================================================');
  console.log('DATABASE PERSISTENCE & DEDUPLICATION VERIFICATION');
  console.log('================================================================\n');

  let mongod;
  let passed = 0;
  let total = 0;

  function assert(name, condition, detail = '') {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${name}`);
      if (detail) console.log(`       ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${name}`);
      if (detail) console.error(`       Details: ${detail}`);
    }
  }

  try {
    console.log('[1/5] Initializing Ephemeral MongoDB Memory Server...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    console.log(`[1/5] In-Memory MongoDB running at: ${uri}`);

    await mongoose.connect(uri);
    assert('Mongoose connected to MongoDB instance', mongoose.connection.readyState === 1);

    console.log('\n[2/5] Running C++ Fraud Detection Engine to generate batch dataset...');
    const analysis = await cppEngineService.runFraudEngine();
    assert('Engine produced batch analysis', analysis && analysis.transactions && analysis.transactions.length >= 1000);

    const initialTxCount = await Transaction.countDocuments();
    const initialAlertCount = await FraudAlert.countDocuments();
    const initialNetworkCount = await FraudNetwork.countDocuments();

    assert('Transactions persisted to MongoDB', initialTxCount >= 1000, `Stored ${initialTxCount} transactions`);
    assert('Fraud alerts persisted to MongoDB', initialAlertCount > 0, `Stored ${initialAlertCount} alerts`);
    assert('Fraud networks persisted to MongoDB', initialNetworkCount > 0, `Stored ${initialNetworkCount} networks`);

    console.log('\n[3/5] Testing Deduplication on Re-Analysis (Upsert Idempotency)...');
    // Run persistAnalysisToDatabase again with identical data
    await cppEngineService.persistAnalysisToDatabase(analysis);

    const recheckTxCount = await Transaction.countDocuments();
    const recheckAlertCount = await FraudAlert.countDocuments();
    const recheckNetworkCount = await FraudNetwork.countDocuments();

    assert('Transaction count unchanged after re-run (Zero duplicates)', recheckTxCount === initialTxCount, `Count: ${recheckTxCount}`);
    assert('Fraud alert count unchanged after re-run (Zero duplicates)', recheckAlertCount === initialAlertCount, `Count: ${recheckAlertCount}`);
    assert('Fraud network count unchanged after re-run (Zero duplicates)', recheckNetworkCount === initialNetworkCount, `Count: ${recheckNetworkCount}`);

    console.log('\n[4/5] Testing MongoDB Historical Queries & Aggregations...');
    const dbTxs = await cppEngineService.getTransactions({ page: 1, limit: 10, status: 'FRAUD' });
    assert('MongoDB filter query for status=FRAUD succeeded', dbTxs.data.length > 0 && dbTxs.data.every(t => t.isFraud === true));

    const dbAnalytics = await cppEngineService.getAnalytics();
    assert('MongoDB aggregation pipeline computed summary statistics', dbAnalytics.totalTransactions === initialTxCount, `Aggregated total: ${dbAnalytics.totalTransactions}`);

    const dbTopAccounts = await cppEngineService.getSuspiciousAccounts(5);
    assert('MongoDB aggregation computed top suspicious accounts', dbTopAccounts.length > 0 && dbTopAccounts[0].alertCount > 0, `Top account: ${dbTopAccounts[0]?.accountId} (${dbTopAccounts[0]?.alertCount} alerts)`);

    console.log('\n[5/5] Cleaning up MongoDB resources...');
    await mongoose.disconnect();
    await mongod.stop();
    assert('Clean disconnection and server teardown completed', mongoose.connection.readyState === 0);

    console.log('\n================================================================');
    console.log(`PERSISTENCE SUMMARY: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
    console.log('================================================================');

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Database verification error:', err);
    if (mongod) await mongod.stop();
    process.exit(1);
  }
}

testDatabasePersistence();
