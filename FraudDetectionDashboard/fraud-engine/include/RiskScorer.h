#ifndef RISK_SCORER_H
#define RISK_SCORER_H

#include "Transaction.h"
#include <string>
#include <vector>
#include <algorithm>

/**
 * @brief Represents active fraud indicators detected for a transaction.
 */
struct FraudIndicators {
    bool highValue = false;          // +25 points (amount >= ₹50,000)
    bool rapidTransactions = false;  // +20 points (>= 5 transactions in 60s)
    bool multipleRecipients = false; // +15 points (>= 2 unique recipients in 60s)
    bool suspiciousNetwork = false;  // +15 points (member of suspicious graph component)
    bool cycleDetected = false;      // +25 points (involved in circular money route)
};

/**
 * @brief Rule-based Risk Scoring Engine.
 *
 * Implements deterministic risk evaluation adhering to:
 * - High-value transfer: +25
 * - Rapid burst activity: +20
 * - Multiple recipients: +15
 * - Suspicious fraud network: +15
 * - Directed cycle detected: +25
 * - Cap: 100 points maximum (min(score, 100))
 *
 * Severity Tiers:
 * - 0–29: LOW
 * - 30–59: MEDIUM
 * - 60–79: HIGH
 * - 80–100: CRITICAL
 *
 * Time Complexity: O(1) constant time per transaction evaluation.
 * Space Complexity: O(1) auxiliary space.
 */
class RiskScorer {
public:
    RiskScorer() = default;
    ~RiskScorer() = default;

    /**
     * @brief Computes composite risk score capped at 100.
     * Complexity: O(1).
     */
    static int calculateRiskScore(const FraudIndicators& indicators);

    /**
     * @brief Maps integer risk score to severity tier.
     * Complexity: O(1).
     */
    static std::string getRiskLevel(int score);

    /**
     * @brief Extracts list of descriptive human-readable reasons from active indicators.
     * Complexity: O(1).
     */
    static std::vector<std::string> getReasons(const FraudIndicators& indicators);
};

#endif // RISK_SCORER_H
