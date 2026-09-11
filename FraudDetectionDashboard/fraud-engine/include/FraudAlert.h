#ifndef FRAUD_ALERT_H
#define FRAUD_ALERT_H

#include "Transaction.h"
#include <string>
#include <vector>
#include <algorithm>
#include <iostream>
#include <iomanip>

/**
 * @brief Unified Fraud Alert model representing actionable high-risk transactions.
 *
 * Generated exclusively for transactions with riskScore >= 30.
 * Aggregates all triggered fraud indicators, severity tiers, and rationale
 * into exactly ONE alert per transaction (strictly preventing duplicates).
 */
struct FraudAlert {
    std::string transactionId;  // Flagged transaction ID (e.g., "TX1055")
    std::string accountId;      // Originating sender account (e.g., "A101")
    double amount;              // Monetary amount in INR
    long long timestamp;        // Epoch timestamp
    int riskScore;              // Composite risk score [0 - 100]
    std::string riskLevel;      // Severity tier: LOW, MEDIUM, HIGH, CRITICAL
    std::vector<std::string> reasons; // All contributing detection reasons

    FraudAlert()
        : amount(0.0), timestamp(0), riskScore(0), riskLevel("LOW") {}

    FraudAlert(std::string txId,
               std::string accId,
               double amt,
               long long ts,
               int score,
               std::string level,
               std::vector<std::string> rsns)
        : transactionId(std::move(txId)),
          accountId(std::move(accId)),
          amount(amt),
          timestamp(ts),
          riskScore(score),
          riskLevel(std::move(level)),
          reasons(std::move(rsns)) {}

    /**
     * @brief Formats alert in readable card format for console reports.
     */
    void print() const {
        std::cout << "[" << riskLevel << "] " << transactionId << std::endl;
        std::cout << "Account: " << accountId << std::endl;
        std::cout << "Amount: ₹" << std::fixed << std::setprecision(0) << amount << std::endl;
        std::cout << "Risk Score: " << riskScore << std::endl;
        std::cout << std::endl;
        std::cout << "Reasons:" << std::endl;
        for (const auto& rsn : reasons) {
            std::cout << "- " << rsn << std::endl;
        }
        std::cout << std::endl;
        std::cout << "--------------------------------------------------" << std::endl;
    }
};

/**
 * @brief Aggregates alerts and reasons per transaction to prevent duplicates.
 */
struct SuspiciousRecord {
    Transaction transaction;
    std::vector<std::string> reasons;
    int totalRisk;

    SuspiciousRecord()
        : totalRisk(0) {}

    explicit SuspiciousRecord(Transaction tx)
        : transaction(std::move(tx)), totalRisk(0) {}

    void addAlert(const std::string& reason, int risk) {
        if (std::find(reasons.begin(), reasons.end(), reason) == reasons.end()) {
            reasons.push_back(reason);
            totalRisk += risk;
            transaction.riskScore = static_cast<double>(totalRisk);
            transaction.isFraud = (totalRisk >= 30);
        }
    }
};

#endif // FRAUD_ALERT_H
