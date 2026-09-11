#ifndef FRAUD_DETECTOR_H
#define FRAUD_DETECTOR_H

#include "Transaction.h"
#include "FraudAlert.h"
#include "RiskScorer.h"
#include "TransactionGraph.h"
#include "DSU.h"
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <deque>

/**
 * @brief Represents a coordinated fraud network discovered through graph & DSU analysis.
 */
struct FraudNetwork {
    int networkId = 0;
    std::vector<std::string> accounts;
    int suspiciousTransactionCount = 0;
    bool hasCycle = false;
    std::vector<std::string> cyclePath;
    std::vector<std::string> riskIndicators;
};

/**
 * @brief Comprehensive summary statistics across rule, graph, and risk tiers.
 */
struct RiskSummary {
    size_t totalTransactions = 0;
    size_t totalSuspiciousTransactions = 0;
    size_t totalFraudAlerts = 0;
    size_t lowRiskCount = 0;
    size_t mediumRiskCount = 0;
    size_t highRiskCount = 0;
    size_t criticalRiskCount = 0;
    double averageRiskScore = 0.0;
    int highestRiskScore = 0;

    // Rule & Graph metrics
    size_t highValueAlerts = 0;
    size_t rapidTransactionAlerts = 0;
    size_t multipleRecipientAlerts = 0;
    size_t graphAccounts = 0;
    size_t graphEdges = 0;
    size_t cyclesDetected = 0;
    size_t fraudNetworksCount = 0;
};

/**
 * @brief Unified Fraud Detection and Risk Scoring Engine.
 *
 * Coordinates:
 * - Phase 2: Hashing Index & Sliding Window Burst Analysis
 * - Phase 3: Directed Graph, BFS, DFS, Cycle Detection, and DSU Clustering
 * - Phase 4: Unified Risk Scoring, Risk Tiers, and Prioritized Fraud Alerts
 */
class FraudDetector {
public:
    FraudDetector();
    ~FraudDetector();

    /**
     * @brief Builds hash index of transactions partitioned by sender account.
     */
    void buildAccountIndex(const std::vector<Transaction>& transactions);

    /**
     * @brief Detects transactions with monetary amount >= ₹50,000.
     */
    std::vector<FraudAlert> detectHighValueTransactions(const std::vector<Transaction>& transactions);

    /**
     * @brief Detects rapid bursts of >= 5 transactions within a 60-second window.
     */
    std::vector<FraudAlert> detectRapidTransactions(const std::vector<Transaction>& transactions);

    /**
     * @brief Detects senders transferring to >= 2 unique receivers in a 60-second window.
     */
    std::vector<FraudAlert> detectMultipleRecipients(const std::vector<Transaction>& transactions);

    /**
     * @brief Builds the directed transaction graph from the transactions.
     */
    void buildGraph(const std::vector<Transaction>& transactions);

    /**
     * @brief Analyzes connected account networks using DSU and cycle detection.
     */
    std::vector<FraudNetwork> analyzeFraudNetworks(const std::vector<Transaction>& transactions);

    /**
     * @brief Executes the complete detection & risk scoring pipeline.
     * Updates transaction objects in-place with riskScore and isFraud.
     */
    void runAllDetections(std::vector<Transaction>& transactions);

    // Accessors
    const std::vector<FraudAlert>& getFraudAlerts() const;
    const RiskSummary& getRiskSummary() const;
    const TransactionGraph& getGraph() const;
    const std::vector<FraudNetwork>& getFraudNetworks() const;
    const std::unordered_map<std::string, SuspiciousRecord>& getSuspiciousRecords() const;

private:
    void recordAlert(const Transaction& tx, const std::string& reason, int riskContribution);

    // Hash-based account index
    std::unordered_map<std::string, std::vector<Transaction>> senderIndex;

    // Intermediate tracking sets for indicator aggregation
    std::unordered_set<std::string> highValueTxIds;
    std::unordered_set<std::string> rapidBurstTxIds;
    std::unordered_set<std::string> multiRecipTxIds;
    std::unordered_set<std::string> accountsInCycle;
    std::unordered_set<std::string> accountsInFraudNetwork;

    // Directed Transaction Graph
    TransactionGraph graph;

    // Discovered Fraud Networks
    std::vector<FraudNetwork> fraudNetworks;

    // Unified prioritized alerts (score >= 30)
    std::vector<FraudAlert> fraudAlerts;

    // Legacy suspicious record map
    std::unordered_map<std::string, SuspiciousRecord> suspiciousRecords;

    // Summary statistics
    RiskSummary summary;
};

#endif // FRAUD_DETECTOR_H
