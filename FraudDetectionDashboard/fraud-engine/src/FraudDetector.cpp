#include "FraudDetector.h"
#include <algorithm>
#include <iostream>

FraudDetector::FraudDetector() = default;

FraudDetector::~FraudDetector() = default;

void FraudDetector::buildAccountIndex(const std::vector<Transaction>& transactions) {
    senderIndex.clear();
    senderIndex.reserve(32);

    for (const auto& tx : transactions) {
        senderIndex[tx.sender].push_back(tx);
    }

    for (auto& entry : senderIndex) {
        auto& txList = entry.second;
        std::sort(txList.begin(), txList.end(), [](const Transaction& a, const Transaction& b) {
            return a.timestamp < b.timestamp;
        });
    }
}

void FraudDetector::recordAlert(const Transaction& tx, const std::string& reason, int riskContribution) {
    auto it = suspiciousRecords.find(tx.transactionId);
    if (it == suspiciousRecords.end()) {
        SuspiciousRecord record(tx);
        record.addAlert(reason, riskContribution);
        suspiciousRecords.emplace(tx.transactionId, std::move(record));
    } else {
        it->second.addAlert(reason, riskContribution);
    }
}

std::vector<FraudAlert> FraudDetector::detectHighValueTransactions(const std::vector<Transaction>& transactions) {
    std::vector<FraudAlert> detectedAlerts;
    const double HIGH_VALUE_THRESHOLD = 50000.0;
    const std::string REASON = "Unusually high transaction amount";

    for (const auto& tx : transactions) {
        if (tx.amount >= HIGH_VALUE_THRESHOLD) {
            highValueTxIds.insert(tx.transactionId);
            recordAlert(tx, REASON, 25);
            summary.highValueAlerts++;
        }
    }

    return detectedAlerts;
}

std::vector<FraudAlert> FraudDetector::detectRapidTransactions(const std::vector<Transaction>& /*transactions*/) {
    std::vector<FraudAlert> detectedAlerts;
    const long long WINDOW_SECONDS = 60;
    const size_t MIN_BURST_COUNT = 5;
    const std::string REASON = "Rapid transaction burst";

    std::unordered_set<std::string> flaggedInThisRule;

    for (const auto& entry : senderIndex) {
        const auto& txList = entry.second;
        if (txList.size() < MIN_BURST_COUNT) {
            continue;
        }

        std::deque<size_t> window;

        for (size_t i = 0; i < txList.size(); ++i) {
            const auto& currentTx = txList[i];

            while (!window.empty() && (currentTx.timestamp - txList[window.front()].timestamp > WINDOW_SECONDS)) {
                window.pop_front();
            }

            window.push_back(i);

            if (window.size() >= MIN_BURST_COUNT) {
                for (size_t idx : window) {
                    const auto& burstTx = txList[idx];
                    rapidBurstTxIds.insert(burstTx.transactionId);
                    if (flaggedInThisRule.find(burstTx.transactionId) == flaggedInThisRule.end()) {
                        recordAlert(burstTx, REASON, 20);
                        flaggedInThisRule.insert(burstTx.transactionId);
                        summary.rapidTransactionAlerts++;
                    }
                }
            }
        }
    }

    return detectedAlerts;
}

std::vector<FraudAlert> FraudDetector::detectMultipleRecipients(const std::vector<Transaction>& /*transactions*/) {
    std::vector<FraudAlert> detectedAlerts;
    const long long WINDOW_SECONDS = 60;
    const size_t MIN_UNIQUE_RECEIVERS = 2;
    const std::string REASON = "Multiple recipients in short time";

    std::unordered_set<std::string> flaggedInThisRule;

    for (const auto& entry : senderIndex) {
        const auto& txList = entry.second;
        if (txList.size() < MIN_UNIQUE_RECEIVERS) {
            continue;
        }

        std::deque<size_t> window;
        std::unordered_map<std::string, int> receiverFreq;

        for (size_t i = 0; i < txList.size(); ++i) {
            const auto& currentTx = txList[i];

            while (!window.empty() && (currentTx.timestamp - txList[window.front()].timestamp > WINDOW_SECONDS)) {
                size_t oldIdx = window.front();
                const std::string& oldReceiver = txList[oldIdx].receiver;
                if (--receiverFreq[oldReceiver] == 0) {
                    receiverFreq.erase(oldReceiver);
                }
                window.pop_front();
            }

            window.push_back(i);
            receiverFreq[currentTx.receiver]++;

            if (receiverFreq.size() >= MIN_UNIQUE_RECEIVERS) {
                for (size_t idx : window) {
                    const auto& multiTx = txList[idx];
                    multiRecipTxIds.insert(multiTx.transactionId);
                    if (flaggedInThisRule.find(multiTx.transactionId) == flaggedInThisRule.end()) {
                        recordAlert(multiTx, REASON, 15);
                        flaggedInThisRule.insert(multiTx.transactionId);
                        summary.multipleRecipientAlerts++;
                    }
                }
            }
        }
    }

    return detectedAlerts;
}

void FraudDetector::buildGraph(const std::vector<Transaction>& transactions) {
    graph.buildFromTransactions(transactions);
}

std::vector<FraudNetwork> FraudDetector::analyzeFraudNetworks(const std::vector<Transaction>& /*transactions*/) {
    fraudNetworks.clear();
    accountsInCycle.clear();
    accountsInFraudNetwork.clear();

    std::vector<std::vector<std::string>> components = graph.findConnectedComponents();
    std::vector<std::vector<std::string>> cycles = graph.detectCycles();

    // Index all accounts participating in detected directed cycles
    for (const auto& cycle : cycles) {
        for (const auto& acc : cycle) {
            accountsInCycle.insert(acc);
        }
    }

    int networkCounter = 0;

    for (const auto& comp : components) {
        std::unordered_set<std::string> compAccounts(comp.begin(), comp.end());

        int suspiciousTxCount = 0;
        bool hasHighValue = false;
        bool hasBurst = false;
        bool hasMultiRecip = false;

        for (const auto& entry : suspiciousRecords) {
            const auto& rec = entry.second;
            if (compAccounts.count(rec.transaction.sender) || compAccounts.count(rec.transaction.receiver)) {
                suspiciousTxCount++;
                for (const auto& rsn : rec.reasons) {
                    if (rsn.find("high") != std::string::npos) hasHighValue = true;
                    if (rsn.find("burst") != std::string::npos) hasBurst = true;
                    if (rsn.find("Multiple") != std::string::npos) hasMultiRecip = true;
                }
            }
        }

        bool compHasCycle = false;
        std::vector<std::string> matchedCycle;

        for (const auto& cycle : cycles) {
            if (!cycle.empty() && compAccounts.count(cycle[0])) {
                compHasCycle = true;
                matchedCycle = cycle;
                break;
            }
        }

        // Flag as Fraud Network only if suspicious activity or cycle is detected
        if (compHasCycle || suspiciousTxCount > 0) {
            FraudNetwork network;
            network.networkId = ++networkCounter;
            network.accounts = comp;
            network.suspiciousTransactionCount = suspiciousTxCount;
            network.hasCycle = compHasCycle;
            network.cyclePath = matchedCycle;

            if (compHasCycle) {
                network.riskIndicators.push_back("Circular transaction flow");
            }
            if (hasHighValue) {
                network.riskIndicators.push_back("Unusually high transaction transfers");
            }
            if (hasBurst) {
                network.riskIndicators.push_back("Rapid transaction activity");
            }
            if (hasMultiRecip) {
                network.riskIndicators.push_back("Multiple recipients");
            }

            for (const auto& acc : comp) {
                accountsInFraudNetwork.insert(acc);
            }

            fraudNetworks.push_back(std::move(network));
        }
    }

    return fraudNetworks;
}

void FraudDetector::runAllDetections(std::vector<Transaction>& transactions) {
    senderIndex.clear();
    highValueTxIds.clear();
    rapidBurstTxIds.clear();
    multiRecipTxIds.clear();
    accountsInCycle.clear();
    accountsInFraudNetwork.clear();
    suspiciousRecords.clear();
    fraudAlerts.clear();
    summary = RiskSummary();
    summary.totalTransactions = transactions.size();

    // Step 1: Phase 2 Detection
    buildAccountIndex(transactions);
    detectHighValueTransactions(transactions);
    detectRapidTransactions(transactions);
    detectMultipleRecipients(transactions);

    // Step 2: Phase 3 Graph & Fraud Network Analysis
    buildGraph(transactions);
    summary.graphAccounts = graph.getNodeCount();
    summary.graphEdges = graph.getEdgeCount();
    analyzeFraudNetworks(transactions);
    summary.cyclesDetected = graph.detectCycles().size();
    summary.fraudNetworksCount = fraudNetworks.size();

    // Step 3: Phase 4 Risk Scoring & Unified Alert Generation
    long long totalScoreSum = 0;

    for (auto& tx : transactions) {
        FraudIndicators indicators;
        indicators.highValue = (highValueTxIds.count(tx.transactionId) > 0 || tx.amount >= 50000.0);
        indicators.rapidTransactions = (rapidBurstTxIds.count(tx.transactionId) > 0);
        indicators.multipleRecipients = (multiRecipTxIds.count(tx.transactionId) > 0);
        indicators.cycleDetected = (accountsInCycle.count(tx.sender) > 0 && accountsInCycle.count(tx.receiver) > 0);
        indicators.suspiciousNetwork = (accountsInFraudNetwork.count(tx.sender) > 0 || accountsInFraudNetwork.count(tx.receiver) > 0);

        int score = RiskScorer::calculateRiskScore(indicators);

        // Step 12: Update Transaction Objects in-place
        tx.riskScore = static_cast<double>(score);
        tx.isFraud = (score >= 30);

        totalScoreSum += score;
        if (score > summary.highestRiskScore) {
            summary.highestRiskScore = score;
        }
        if (score > 0) {
            summary.totalSuspiciousTransactions++;
        }

        std::string level = RiskScorer::getRiskLevel(score);
        if (level == "LOW") {
            summary.lowRiskCount++;
        } else if (level == "MEDIUM") {
            summary.mediumRiskCount++;
        } else if (level == "HIGH") {
            summary.highRiskCount++;
        } else if (level == "CRITICAL") {
            summary.criticalRiskCount++;
        }

        // Step 7 & Step 11: Alert Generation for score >= 30 (deduplicated per transaction)
        if (score >= 30) {
            fraudAlerts.emplace_back(
                tx.transactionId,
                tx.sender,
                tx.amount,
                tx.timestamp,
                score,
                level,
                RiskScorer::getReasons(indicators)
            );
        }
    }

    summary.totalFraudAlerts = fraudAlerts.size();
    if (summary.totalTransactions > 0) {
        summary.averageRiskScore = static_cast<double>(totalScoreSum) / static_cast<double>(summary.totalTransactions);
    }

    // Step 8: Prioritize Alerts by highest risk score first (O(M log M))
    std::sort(fraudAlerts.begin(), fraudAlerts.end(), [](const FraudAlert& a, const FraudAlert& b) {
        if (a.riskScore != b.riskScore) {
            return a.riskScore > b.riskScore;
        }
        return a.transactionId < b.transactionId;
    });
}

const std::vector<FraudAlert>& FraudDetector::getFraudAlerts() const {
    return fraudAlerts;
}

const RiskSummary& FraudDetector::getRiskSummary() const {
    return summary;
}

const TransactionGraph& FraudDetector::getGraph() const {
    return graph;
}

const std::vector<FraudNetwork>& FraudDetector::getFraudNetworks() const {
    return fraudNetworks;
}

const std::unordered_map<std::string, SuspiciousRecord>& FraudDetector::getSuspiciousRecords() const {
    return suspiciousRecords;
}
