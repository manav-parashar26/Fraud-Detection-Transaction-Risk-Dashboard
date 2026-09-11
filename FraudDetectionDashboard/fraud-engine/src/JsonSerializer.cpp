#include "JsonSerializer.h"
#include <sstream>
#include <iomanip>

std::string JsonSerializer::escapeString(const std::string& input) {
    std::string output;
    output.reserve(input.size() + 8);
    for (char c : input) {
        switch (c) {
            case '"':  output += "\\\""; break;
            case '\\': output += "\\\\"; break;
            case '\b': output += "\\b"; break;
            case '\f': output += "\\f"; break;
            case '\n': output += "\\n"; break;
            case '\r': output += "\\r"; break;
            case '\t': output += "\\t"; break;
            default:   output += c; break;
        }
    }
    return output;
}

std::string JsonSerializer::serialize(const RiskSummary& summary,
                                     const std::vector<Transaction>& transactions,
                                     const std::vector<FraudAlert>& alerts,
                                     const std::vector<FraudNetwork>& networks) {
    std::ostringstream ss;

    ss << "{\n";

    // 1. Summary section
    ss << "  \"summary\": {\n";
    ss << "    \"totalTransactions\": " << summary.totalTransactions << ",\n";
    ss << "    \"suspiciousTransactions\": " << summary.totalSuspiciousTransactions << ",\n";
    ss << "    \"totalAlerts\": " << summary.totalFraudAlerts << ",\n";
    ss << "    \"lowRisk\": " << summary.lowRiskCount << ",\n";
    ss << "    \"mediumRisk\": " << summary.mediumRiskCount << ",\n";
    ss << "    \"highRisk\": " << summary.highRiskCount << ",\n";
    ss << "    \"criticalRisk\": " << summary.criticalRiskCount << ",\n";
    ss << "    \"averageRiskScore\": " << std::fixed << std::setprecision(1) << summary.averageRiskScore << ",\n";
    ss << "    \"highestRiskScore\": " << summary.highestRiskScore << "\n";
    ss << "  },\n";

    // 2. Transactions array
    ss << "  \"transactions\": [\n";
    for (size_t i = 0; i < transactions.size(); ++i) {
        const auto& tx = transactions[i];
        ss << "    {\n";
        ss << "      \"transactionId\": \"" << escapeString(tx.transactionId) << "\",\n";
        ss << "      \"sender\": \"" << escapeString(tx.sender) << "\",\n";
        ss << "      \"receiver\": \"" << escapeString(tx.receiver) << "\",\n";
        ss << "      \"amount\": " << std::fixed << std::setprecision(0) << tx.amount << ",\n";
        ss << "      \"timestamp\": " << tx.timestamp << ",\n";
        ss << "      \"deviceId\": \"" << escapeString(tx.deviceId) << "\",\n";
        ss << "      \"location\": \"" << escapeString(tx.location) << "\",\n";
        ss << "      \"riskScore\": " << static_cast<int>(tx.riskScore) << ",\n";
        ss << "      \"isFraud\": " << (tx.isFraud ? "true" : "false") << "\n";
        ss << "    }" << (i + 1 < transactions.size() ? "," : "") << "\n";
    }
    ss << "  ],\n";

    // 3. Alerts array
    ss << "  \"alerts\": [\n";
    for (size_t i = 0; i < alerts.size(); ++i) {
        const auto& alert = alerts[i];
        ss << "    {\n";
        ss << "      \"transactionId\": \"" << escapeString(alert.transactionId) << "\",\n";
        ss << "      \"accountId\": \"" << escapeString(alert.accountId) << "\",\n";
        ss << "      \"amount\": " << std::fixed << std::setprecision(0) << alert.amount << ",\n";
        ss << "      \"timestamp\": " << alert.timestamp << ",\n";
        ss << "      \"riskScore\": " << alert.riskScore << ",\n";
        ss << "      \"riskLevel\": \"" << escapeString(alert.riskLevel) << "\",\n";
        ss << "      \"reasons\": [\n";
        for (size_t r = 0; r < alert.reasons.size(); ++r) {
            ss << "        \"" << escapeString(alert.reasons[r]) << "\"" << (r + 1 < alert.reasons.size() ? "," : "") << "\n";
        }
        ss << "      ]\n";
        ss << "    }" << (i + 1 < alerts.size() ? "," : "") << "\n";
    }
    ss << "  ],\n";

    // 4. Networks array
    ss << "  \"networks\": [\n";
    for (size_t i = 0; i < networks.size(); ++i) {
        const auto& net = networks[i];
        ss << "    {\n";
        ss << "      \"id\": " << net.networkId << ",\n";
        ss << "      \"accounts\": [\n";
        for (size_t a = 0; a < net.accounts.size(); ++a) {
            ss << "        \"" << escapeString(net.accounts[a]) << "\"" << (a + 1 < net.accounts.size() ? "," : "") << "\n";
        }
        ss << "      ],\n";
        ss << "      \"cycleDetected\": " << (net.hasCycle ? "true" : "false") << ",\n";
        ss << "      \"suspiciousTransactions\": " << net.suspiciousTransactionCount << ",\n";
        ss << "      \"riskIndicators\": [\n";
        for (size_t ind = 0; ind < net.riskIndicators.size(); ++ind) {
            ss << "        \"" << escapeString(net.riskIndicators[ind]) << "\"" << (ind + 1 < net.riskIndicators.size() ? "," : "") << "\n";
        }
        ss << "      ]\n";
        ss << "    }" << (i + 1 < networks.size() ? "," : "") << "\n";
    }
    ss << "  ]\n";

    ss << "}\n";

    return ss.str();
}

std::string JsonSerializer::serializeStreamTransaction(
    const Transaction& tx,
    const std::string& riskLevel,
    const std::vector<StreamAlert>& alerts,
    const RiskSummary& summary,
    bool cycleDetected,
    int clusterId,
    const std::vector<std::string>& clusterAccounts
) {
    std::ostringstream ss;
    ss << "{\"type\":\"transaction\",\"transaction\":{";
    ss << "\"transactionId\":\"" << escapeString(tx.transactionId) << "\",";
    ss << "\"sender\":\"" << escapeString(tx.sender) << "\",";
    ss << "\"receiver\":\"" << escapeString(tx.receiver) << "\",";
    ss << "\"amount\":" << std::fixed << std::setprecision(0) << tx.amount << ",";
    ss << "\"timestamp\":" << tx.timestamp << ",";
    ss << "\"deviceId\":\"" << escapeString(tx.deviceId) << "\",";
    ss << "\"location\":\"" << escapeString(tx.location) << "\",";
    ss << "\"riskScore\":" << static_cast<int>(tx.riskScore) << ",";
    ss << "\"riskLevel\":\"" << escapeString(riskLevel) << "\",";
    ss << "\"isFraud\":" << (tx.isFraud ? "true" : "false");
    ss << "},\"alerts\":[";
    for (size_t i = 0; i < alerts.size(); ++i) {
        ss << "{\"reason\":\"" << escapeString(alerts[i].reason) << "\",\"riskContribution\":" << alerts[i].riskContribution << "}";
        if (i + 1 < alerts.size()) ss << ",";
    }
    ss << "],\"analytics\":{";
    ss << "\"totalTransactions\":" << summary.totalTransactions << ",";
    ss << "\"suspiciousTransactions\":" << summary.totalSuspiciousTransactions << ",";
    ss << "\"totalAlerts\":" << summary.totalFraudAlerts << ",";
    ss << "\"lowRisk\":" << summary.lowRiskCount << ",";
    ss << "\"mediumRisk\":" << summary.mediumRiskCount << ",";
    ss << "\"highRisk\":" << summary.highRiskCount << ",";
    ss << "\"criticalRisk\":" << summary.criticalRiskCount << ",";
    ss << "\"averageRiskScore\":" << std::fixed << std::setprecision(1) << summary.averageRiskScore << ",";
    ss << "\"highestRiskScore\":" << summary.highestRiskScore;
    ss << "}";
    if (clusterId > 0 && !clusterAccounts.empty()) {
        ss << ",\"network\":{";
        ss << "\"clusterId\":" << clusterId << ",";
        ss << "\"accounts\":[";
        for (size_t a = 0; a < clusterAccounts.size(); ++a) {
            ss << "\"" << escapeString(clusterAccounts[a]) << "\"";
            if (a + 1 < clusterAccounts.size()) ss << ",";
        }
        ss << "],\"cycleDetected\":" << (cycleDetected ? "true" : "false");
        ss << "}";
    }
    ss << "}";
    return ss.str();
}

