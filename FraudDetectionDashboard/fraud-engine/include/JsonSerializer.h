#ifndef JSON_SERIALIZER_H
#define JSON_SERIALIZER_H

#include "Transaction.h"
#include "FraudAlert.h"
#include "FraudDetector.h"
#include <string>
#include <vector>

/**
 * @brief Represents an individual rule alert and its risk contribution in streaming mode.
 */
struct StreamAlert {
    std::string reason;
    int riskContribution = 0;
};

/**
 * @brief Zero-dependency, high-performance JSON serializer for the Fraud Engine.
 *
 * Emits strictly valid RFC 8259 JSON compliant with Step 5 specifications:
 * - summary
 * - transactions
 * - alerts
 * - networks
 *
 * Also provides single-line streaming JSON serialization for Phase 7 real-time telemetry.
 */
class JsonSerializer {
public:
    JsonSerializer() = default;

    /**
     * @brief Serializes all batch detection analysis artifacts into a valid JSON string.
     */
    static std::string serialize(const RiskSummary& summary,
                                const std::vector<Transaction>& transactions,
                                const std::vector<FraudAlert>& alerts,
                                const std::vector<FraudNetwork>& networks);

    /**
     * @brief Serializes a single streaming transaction event into a compact single-line JSON string.
     */
    static std::string serializeStreamTransaction(
        const Transaction& tx,
        const std::string& riskLevel,
        const std::vector<StreamAlert>& alerts,
        const RiskSummary& summary,
        bool cycleDetected = false,
        int clusterId = 0,
        const std::vector<std::string>& clusterAccounts = {}
    );

    /**
     * @brief Helper to safely escape characters for JSON string values.
     */
    static std::string escapeString(const std::string& input);
};

#endif // JSON_SERIALIZER_H
