const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { isDatabaseConnected } = require('../config/database');
const { getEngineExecutablePath, getEngineDirectory } = require('../config/engine');
const Transaction = require('../models/Transaction');
const FraudAlert = require('../models/FraudAlert');
const FraudNetwork = require('../models/FraudNetwork');

function getRiskLevelFromScore(score = 0) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

/**
 * Service to manage execution of the compiled C++ Fraud Detection Engine,
 * maintain in-memory cached analysis results, and synchronize persistent
 * state with MongoDB.
 */
class CppEngineService {
  constructor() {
    this.latestAnalysis = null;
  }

  /**
   * Resolves the executable path using the centralized engine config.
   */
  getExecutablePath() {
    return getEngineExecutablePath();
  }

  /**
   * Resolves the engine directory.
   */
  getEngineDir() {
    return getEngineDirectory();
  }

  /**
   * Invokes the compiled C++ engine with --json flag, stores result in memory,
   * and persists batch analysis into MongoDB when connected.
   * @returns {Promise<Object>} The parsed JSON analysis from C++.
   */
  async runFraudEngine() {
    const parsedData = await new Promise((resolve, reject) => {
      let executable;
      try {
        executable = this.getExecutablePath();
      } catch (err) {
        return reject(err);
      }

      const args = ['--json'];
      const options = {
        cwd: this.getEngineDir(),
        maxBuffer: 15 * 1024 * 1024 // 15 MB buffer for 1000+ transaction payload
      };

      execFile(executable, args, options, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`C++ Engine execution failed: ${error.message}. Stderr: ${stderr}`));
        }

        try {
          const data = JSON.parse(stdout);
          resolve(data);
        } catch (parseError) {
          reject(new Error(`Failed to parse C++ JSON output: ${parseError.message}. Raw output preview: ${stdout.substring(0, 200)}`));
        }
      });
    });

    this.latestAnalysis = parsedData;

    // Persist into MongoDB if connected
    if (isDatabaseConnected()) {
      try {
        await this.persistAnalysisToDatabase(parsedData);
      } catch (dbErr) {
        console.error('[Database Persistence Error]', dbErr.message);
      }
    }

    return parsedData;
  }

  /**
   * Bulk upserts batch analysis data into MongoDB with zero duplicate records
   */
  async persistAnalysisToDatabase(data) {
    const txList = data.transactions || [];
    const alertList = data.alerts || [];
    const networkList = data.networks || [];

    // 1. Upsert Transactions
    if (txList.length > 0) {
      const txOps = txList.map((tx) => ({
        updateOne: {
          filter: { transactionId: tx.transactionId },
          update: {
            $set: {
              transactionId: tx.transactionId,
              sender: tx.sender,
              receiver: tx.receiver,
              amount: tx.amount,
              timestamp: tx.timestamp,
              deviceId: tx.deviceId || '',
              location: tx.location || '',
              riskScore: tx.riskScore || 0,
              riskLevel: tx.riskLevel || getRiskLevelFromScore(tx.riskScore || 0),
              isFraud: Boolean(tx.isFraud),
              reasons: tx.reasons || []
            }
          },
          upsert: true
        }
      }));
      await Transaction.bulkWrite(txOps, { ordered: false });
    }

    // 2. Upsert Fraud Alerts
    if (alertList.length > 0) {
      const alertOps = alertList.map((a) => {
        const account = a.accountId || a.sender || 'UNKNOWN';
        const reasons = a.reasons || (a.reason ? [a.reason] : []);
        return {
          updateOne: {
            filter: { transactionId: a.transactionId, accountId: account },
            update: {
              $set: {
                transactionId: a.transactionId,
                accountId: account,
                riskScore: a.riskScore || 0,
                riskLevel: a.riskLevel || 'LOW',
                reasons,
                timestamp: a.timestamp || 0
              }
            },
            upsert: true
          }
        };
      });
      await FraudAlert.bulkWrite(alertOps, { ordered: false });
    }

    // 3. Upsert Fraud Networks
    if (networkList.length > 0) {
      const networkOps = networkList.map((net) => ({
        updateOne: {
          filter: { networkId: net.networkId },
          update: {
            $set: {
              networkId: net.networkId,
              accounts: net.accounts || [],
              suspiciousTransactions: net.suspiciousTransactions || [],
              cycleDetected: Boolean(net.cycleDetected),
              riskLevel: net.riskLevel || 'LOW',
              riskIndicators: net.riskIndicators || []
            }
          },
          upsert: true
        }
      }));
      await FraudNetwork.bulkWrite(networkOps, { ordered: false });
    }

    console.log(`[Database] Successfully persisted ${txList.length} txs, ${alertList.length} alerts, ${networkList.length} networks`);
  }

  /**
   * Returns latest analysis, triggering one if memory is empty
   */
  async ensureAnalysis() {
    if (!this.latestAnalysis) {
      await this.runFraudEngine();
    }
    return this.latestAnalysis;
  }

  /**
   * Returns paginated and filtered transactions from MongoDB or cached fallback
   */
  async getTransactions(params = {}) {
    const pageNum = Math.max(1, parseInt(params.page, 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(params.limit, 10) || 50));
    const { riskLevel, status, sender, receiver, search, startDate, endDate } = params;

    // Database path
    if (isDatabaseConnected()) {
      try {
        const filter = {};
        if (riskLevel && riskLevel !== 'ALL') {
          filter.riskLevel = riskLevel.toUpperCase();
        }
        if (status && status !== 'ALL') {
          if (status.toUpperCase() === 'FRAUD') filter.isFraud = true;
          else if (status.toUpperCase() === 'SAFE') filter.isFraud = false;
        }
        if (sender) filter.sender = sender;
        if (receiver) filter.receiver = receiver;
        if (startDate || endDate) {
          filter.timestamp = {};
          if (startDate) filter.timestamp.$gte = Number(startDate);
          if (endDate) filter.timestamp.$lte = Number(endDate);
        }
        if (search) {
          const regex = { $regex: search, $options: 'i' };
          filter.$or = [
            { transactionId: regex },
            { sender: regex },
            { receiver: regex },
            { location: regex }
          ];
        }

        const total = await Transaction.countDocuments(filter);
        const data = await Transaction.find(filter)
          .sort({ timestamp: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean();

        return {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.max(1, Math.ceil(total / limitNum)),
          data
        };
      } catch (err) {
        console.warn('[Database Query Fallback]', err.message);
      }
    }

    // In-Memory Cached Fallback
    const analysis = await this.ensureAnalysis();
    let txs = analysis.transactions || [];

    if (riskLevel && riskLevel !== 'ALL') {
      const upper = riskLevel.toUpperCase();
      txs = txs.filter((t) => (t.riskLevel || getRiskLevelFromScore(t.riskScore || 0)).toUpperCase() === upper);
    }
    if (status && status !== 'ALL') {
      const isFraudTarget = status.toUpperCase() === 'FRAUD';
      txs = txs.filter((t) => Boolean(t.isFraud) === isFraudTarget);
    }
    if (sender) txs = txs.filter((t) => t.sender === sender);
    if (receiver) txs = txs.filter((t) => t.receiver === receiver);
    if (startDate) txs = txs.filter((t) => t.timestamp >= Number(startDate));
    if (endDate) txs = txs.filter((t) => t.timestamp <= Number(endDate));
    if (search) {
      const q = search.toLowerCase();
      txs = txs.filter(
        (t) =>
          t.transactionId.toLowerCase().includes(q) ||
          t.sender.toLowerCase().includes(q) ||
          t.receiver.toLowerCase().includes(q) ||
          (t.location && t.location.toLowerCase().includes(q))
      );
    }

    const startIndex = (pageNum - 1) * limitNum;
    const paginated = txs.slice(startIndex, startIndex + limitNum).map((t) => ({
      ...t,
      riskLevel: t.riskLevel || getRiskLevelFromScore(t.riskScore || 0)
    }));

    return {
      total: txs.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(txs.length / limitNum)),
      data: paginated
    };
  }

  /**
   * Returns a single transaction by ID
   */
  async getTransactionById(id) {
    if (isDatabaseConnected()) {
      try {
        const tx = await Transaction.findOne({ transactionId: id }).lean();
        if (tx) return tx;
      } catch (err) {
        console.warn('[Database FindOne Fallback]', err.message);
      }
    }

    const analysis = await this.ensureAnalysis();
    return (analysis.transactions || []).find((t) => t.transactionId === id) || null;
  }

  /**
   * Returns fraud alerts, optionally filtered by risk level
   */
  async getAlerts(riskLevel, page = 1, limit = 50) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));

    if (isDatabaseConnected()) {
      try {
        const filter = {};
        if (riskLevel && riskLevel !== 'ALL') {
          filter.riskLevel = riskLevel.toUpperCase();
        }

        const totalAlerts = await FraudAlert.countDocuments(filter);
        const alerts = await FraudAlert.find(filter)
          .sort({ riskScore: -1, timestamp: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean();

        return {
          totalAlerts,
          page: pageNum,
          limit: limitNum,
          filter: riskLevel ? riskLevel.toUpperCase() : 'ALL',
          alerts
        };
      } catch (err) {
        console.warn('[Database Alerts Fallback]', err.message);
      }
    }

    const analysis = await this.ensureAnalysis();
    let alerts = analysis.alerts || [];

    if (riskLevel && riskLevel !== 'ALL') {
      const upper = riskLevel.toUpperCase();
      alerts = alerts.filter((a) => a.riskLevel === upper);
    }

    const startIndex = (pageNum - 1) * limitNum;
    return {
      totalAlerts: alerts.length,
      page: pageNum,
      limit: limitNum,
      filter: riskLevel ? riskLevel.toUpperCase() : 'ALL',
      alerts: alerts.slice(startIndex, startIndex + limitNum)
    };
  }

  /**
   * Returns summary analytics from MongoDB aggregations or C++ cache
   */
  async getAnalytics() {
    if (isDatabaseConnected()) {
      try {
        const stats = await Transaction.aggregate([
          {
            $group: {
              _id: null,
              totalTransactions: { $sum: 1 },
              suspiciousTransactions: {
                $sum: { $cond: [{ $gte: ['$riskScore', 30] }, 1, 0] }
              },
              fraudulentTransactions: {
                $sum: { $cond: [{ $eq: ['$isFraud', true] }, 1, 0] }
              },
              lowRisk: {
                $sum: { $cond: [{ $eq: ['$riskLevel', 'LOW'] }, 1, 0] }
              },
              mediumRisk: {
                $sum: { $cond: [{ $eq: ['$riskLevel', 'MEDIUM'] }, 1, 0] }
              },
              highRisk: {
                $sum: { $cond: [{ $eq: ['$riskLevel', 'HIGH'] }, 1, 0] }
              },
              criticalRisk: {
                $sum: { $cond: [{ $eq: ['$riskLevel', 'CRITICAL'] }, 1, 0] }
              },
              averageRiskScore: { $avg: '$riskScore' },
              highestRiskScore: { $max: '$riskScore' }
            }
          }
        ]);

        if (stats && stats.length > 0) {
          const totalAlerts = await FraudAlert.countDocuments();
          return {
            totalTransactions: stats[0].totalTransactions || 0,
            suspiciousTransactions: stats[0].suspiciousTransactions || 0,
            totalAlerts,
            lowRisk: stats[0].lowRisk || 0,
            mediumRisk: stats[0].mediumRisk || 0,
            highRisk: stats[0].highRisk || 0,
            criticalRisk: stats[0].criticalRisk || 0,
            averageRiskScore: Math.round(stats[0].averageRiskScore || 0),
            highestRiskScore: stats[0].highestRiskScore || 0
          };
        }
      } catch (err) {
        console.warn('[Database Analytics Aggregation Fallback]', err.message);
      }
    }

    const analysis = await this.ensureAnalysis();
    return analysis.summary || {};
  }

  /**
   * Returns top suspicious accounts with alert counts and maximum risk scores
   */
  async getSuspiciousAccounts(limit = 10) {
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));

    if (isDatabaseConnected()) {
      try {
        const topAccounts = await FraudAlert.aggregate([
          {
            $group: {
              _id: '$accountId',
              alertCount: { $sum: 1 },
              maxRiskScore: { $max: '$riskScore' },
              avgRiskScore: { $avg: '$riskScore' },
              reasons: { $addToSet: '$reasons' }
            }
          },
          { $sort: { alertCount: -1, maxRiskScore: -1 } },
          { $limit: limitNum }
        ]);

        return topAccounts.map((item) => ({
          accountId: item._id,
          alertCount: item.alertCount,
          maxRiskScore: item.maxRiskScore,
          avgRiskScore: Math.round(item.avgRiskScore || 0),
          reasons: [...new Set((item.reasons || []).flat())]
        }));
      } catch (err) {
        console.warn('[Database Suspicious Accounts Fallback]', err.message);
      }
    }

    // In-memory fallback
    const analysis = await this.ensureAnalysis();
    const alerts = analysis.alerts || [];
    const accountMap = new Map();

    for (const a of alerts) {
      const acc = a.accountId || a.sender || 'UNKNOWN';
      if (!accountMap.has(acc)) {
        accountMap.set(acc, {
          accountId: acc,
          alertCount: 0,
          maxRiskScore: 0,
          totalScore: 0,
          reasons: new Set()
        });
      }
      const item = accountMap.get(acc);
      item.alertCount++;
      item.totalScore += a.riskScore || 0;
      if (a.riskScore > item.maxRiskScore) item.maxRiskScore = a.riskScore;
      if (a.reason) item.reasons.add(a.reason);
      if (Array.isArray(a.reasons)) {
        a.reasons.forEach((r) => item.reasons.add(r));
      }
    }

    return Array.from(accountMap.values())
      .map((item) => ({
        accountId: item.accountId,
        alertCount: item.alertCount,
        maxRiskScore: item.maxRiskScore,
        avgRiskScore: Math.round(item.totalScore / (item.alertCount || 1)),
        reasons: Array.from(item.reasons)
      }))
      .sort((a, b) => b.alertCount - a.alertCount || b.maxRiskScore - a.maxRiskScore)
      .slice(0, limitNum);
  }

  /**
   * Returns fraud network information
   */
  async getNetworks() {
    if (isDatabaseConnected()) {
      try {
        const networks = await FraudNetwork.find({}).lean();
        if (networks && networks.length > 0) {
          return {
            totalNetworks: networks.length,
            networks
          };
        }
      } catch (err) {
        console.warn('[Database Networks Fallback]', err.message);
      }
    }

    const analysis = await this.ensureAnalysis();
    return {
      totalNetworks: (analysis.networks || []).length,
      networks: analysis.networks || []
    };
  }
}

module.exports = new CppEngineService();
