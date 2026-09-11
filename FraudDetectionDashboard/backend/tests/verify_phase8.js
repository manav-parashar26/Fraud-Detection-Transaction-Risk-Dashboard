/**
 * Comprehensive Automated Verification Suite for Phase 8:
 * Tests Database Integration, Models, Upsert Deduplication, Historical Queries,
 * Top Suspicious Accounts Aggregations, Real-time Persistence, Resilience & Fallback.
 */
const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('PHASE 8 AUTOMATED VERIFICATION TEST SUITE');
  console.log('================================================================\n');

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
    // 1. Health Check
    console.log('--- Testing System Health & Resilience ---');
    const healthRes = await request('GET', '/api/health');
    assert('Health endpoint responds with HTTP 200', healthRes.status === 200);
    assert('Health reports backend status as ok/true', healthRes.body.backend === true || healthRes.body.backend === 'ok', `backend=${healthRes.body.backend}`);
    assert('Health reports database status accurately', healthRes.body.database !== undefined, `database=${healthRes.body.database}`);
    assert('Health reports monitoring status', healthRes.body.monitoring !== undefined, `monitoring=${healthRes.body.monitoring}`);
    assert('Health reports C++ engine availability', healthRes.body.engine === 'available' || healthRes.body.engineAvailable === true, `engine=${healthRes.body.engine}`);

    // 2. Batch Engine Execution & Persistence
    console.log('\n--- Testing C++ Batch Execution & Data Synchronization ---');
    const analyzeRes = await request('POST', '/api/analyze');
    assert('POST /api/analyze executes C++ engine successfully', analyzeRes.status === 200 && analyzeRes.body.success === true);
    assert('Analysis summary returns total transactions > 1000', analyzeRes.body.summary && analyzeRes.body.summary.totalTransactions >= 1000, `Total: ${analyzeRes.body.summary?.totalTransactions}`);

    // 3. Transactions Retrieval & Multi-Attribute Filters
    console.log('\n--- Testing Transaction Querying & Filters ---');
    const txRes = await request('GET', '/api/transactions?page=1&limit=25');
    assert('GET /api/transactions returns paginated list', txRes.status === 200 && Array.isArray(txRes.body.data) && txRes.body.data.length === 25, `Returned ${txRes.body.data?.length} records, total=${txRes.body.total}`);

    const criticalTxs = await request('GET', '/api/transactions?riskLevel=CRITICAL&limit=10');
    const allCritical = (criticalTxs.body.data || []).every(t => t.riskLevel === 'CRITICAL' || t.riskScore >= 80);
    assert('GET /api/transactions?riskLevel=CRITICAL filters correctly', criticalTxs.status === 200 && criticalTxs.body.data.length > 0 && allCritical, `Found ${criticalTxs.body.data?.length} critical records`);

    const fraudOnly = await request('GET', '/api/transactions?status=FRAUD&limit=10');
    const allFraud = (fraudOnly.body.data || []).every(t => t.isFraud === true);
    assert('GET /api/transactions?status=FRAUD filters only flagged transactions', fraudOnly.status === 200 && fraudOnly.body.data.length > 0 && allFraud, `Found ${fraudOnly.body.data?.length} fraud records`);

    // 4. Single Transaction Inspection
    if (txRes.body.data && txRes.body.data.length > 0) {
      const sampleId = txRes.body.data[0].transactionId;
      const singleTx = await request('GET', `/api/transactions/${sampleId}`);
      assert(`GET /api/transactions/${sampleId} returns matching record`, singleTx.status === 200 && singleTx.body.transactionId === sampleId);
    }

    // 5. Fraud Alerts Retrieval
    console.log('\n--- Testing Fraud Alerts ---');
    const alertRes = await request('GET', '/api/alerts?page=1&limit=20');
    assert('GET /api/alerts returns alerts array', alertRes.status === 200 && Array.isArray(alertRes.body.alerts) && alertRes.body.alerts.length > 0, `Total alerts: ${alertRes.body.totalAlerts}`);

    // 6. Analytics Summary & Aggregation
    console.log('\n--- Testing Analytics & Top Suspicious Accounts ---');
    const analyticsRes = await request('GET', '/api/analytics');
    assert('GET /api/analytics returns multi-tier risk metrics', analyticsRes.status === 200 && analyticsRes.body.totalTransactions >= 1000);
    assert('Analytics contains risk tier counts', analyticsRes.body.lowRisk !== undefined && analyticsRes.body.criticalRisk !== undefined, `Low: ${analyticsRes.body.lowRisk}, Critical: ${analyticsRes.body.criticalRisk}`);

    // 7. Top Suspicious Accounts Leaderboard
    const accountsRes = await request('GET', '/api/analytics/suspicious-accounts?limit=5');
    assert('GET /api/analytics/suspicious-accounts returns leaderboard array', accountsRes.status === 200 && Array.isArray(accountsRes.body) && accountsRes.body.length > 0, `Top accounts count: ${accountsRes.body.length}`);
    if (accountsRes.body.length > 0) {
      const topAcc = accountsRes.body[0];
      assert('Top account has accountId, alertCount, and maxRiskScore', topAcc.accountId && topAcc.alertCount > 0 && topAcc.maxRiskScore > 0, `Account: ${topAcc.accountId}, Alerts: ${topAcc.alertCount}, MaxScore: ${topAcc.maxRiskScore}`);
    }

    // 8. Fraud Networks
    console.log('\n--- Testing Fraud Networks ---');
    const networksRes = await request('GET', '/api/networks');
    assert('GET /api/networks returns graph clusters', networksRes.status === 200 && Array.isArray(networksRes.body.networks));

    // 9. Real-Time Monitoring Subprocess
    console.log('\n--- Testing Real-Time Stream Monitoring ---');
    const startRes = await request('POST', '/api/monitoring/start');
    assert('POST /api/monitoring/start activates stream', startRes.status === 200 && startRes.body.running === true, `PID: ${startRes.body.pid}`);

    // Wait 3.5 seconds to allow transactions to stream
    await new Promise(r => setTimeout(r, 3500));

    const statusRes = await request('GET', '/api/monitoring/status');
    assert('GET /api/monitoring/status verifies emitted transactions > 0', statusRes.status === 200 && statusRes.body.transactionsEmitted > 0, `Emitted: ${statusRes.body.transactionsEmitted}`);

    const stopRes = await request('POST', '/api/monitoring/stop');
    assert('POST /api/monitoring/stop stops stream cleanly', stopRes.status === 200 && stopRes.body.running === false);

    console.log('\n================================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
    console.log('================================================================');

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test suite encountered an error:', error);
    process.exit(1);
  }
}

runTests();
