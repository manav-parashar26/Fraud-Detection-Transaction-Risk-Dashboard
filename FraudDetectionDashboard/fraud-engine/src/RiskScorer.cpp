#include "RiskScorer.h"

int RiskScorer::calculateRiskScore(const FraudIndicators& indicators) {
    int score = 0;

    // Rule 1: High-value transaction (+25)
    if (indicators.highValue) {
        score += 25;
    }

    // Rule 2: Rapid transaction burst (+20)
    if (indicators.rapidTransactions) {
        score += 20;
    }

    // Rule 3: Multiple recipients (+15)
    if (indicators.multipleRecipients) {
        score += 15;
    }

    // Rule 4: Suspicious fraud network (+15)
    if (indicators.suspiciousNetwork) {
        score += 15;
    }

    // Rule 5: Cycle detected (+25)
    if (indicators.cycleDetected) {
        score += 25;
    }

    // Score capping: strictly bounded between 0 and 100
    return std::min(score, 100);
}

std::string RiskScorer::getRiskLevel(int score) {
    if (score >= 80) {
        return "CRITICAL";
    }
    if (score >= 60) {
        return "HIGH";
    }
    if (score >= 30) {
        return "MEDIUM";
    }
    return "LOW";
}

std::vector<std::string> RiskScorer::getReasons(const FraudIndicators& indicators) {
    std::vector<std::string> reasons;

    if (indicators.highValue) {
        reasons.push_back("Unusually high transaction amount");
    }
    if (indicators.rapidTransactions) {
        reasons.push_back("Rapid transaction burst");
    }
    if (indicators.multipleRecipients) {
        reasons.push_back("Multiple recipients");
    }
    if (indicators.suspiciousNetwork) {
        reasons.push_back("Suspicious fraud network");
    }
    if (indicators.cycleDetected) {
        reasons.push_back("Circular transaction flow");
    }

    return reasons;
}
