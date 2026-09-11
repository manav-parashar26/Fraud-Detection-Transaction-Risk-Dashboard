#ifndef STREAM_SIMULATOR_H
#define STREAM_SIMULATOR_H

#include "Transaction.h"
#include "RiskScorer.h"
#include "TransactionGraph.h"
#include "FraudDetector.h"
#include "JsonSerializer.h"
#include <deque>
#include <unordered_map>
#include <string>
#include <vector>
#include <random>

/**
 * @brief Real-time continuous transaction generator and fraud telemetry engine.
 *
 * Simulates real-time banking transfers:
 * - Generates approximately 1 transaction every 1–2 seconds.
 * - Dynamically evaluates sliding-window velocities (bursts, multi-recipients).
 * - Maintains an incremental directed graph to detect circular routing (cycles).
 * - Evaluates multi-factor risk scores via RiskScorer in O(1) time.
 * - Streams single-line RFC 8259 JSON objects to stdout.
 * - Safely terminates on SIGINT / SIGTERM signals.
 */
class StreamSimulator {
public:
    explicit StreamSimulator(unsigned int seed = 42);

    /**
     * @brief Executes the real-time simulation loop until interrupted.
     */
    void run();

private:
    std::mt19937 rng;
    long long currentTxNum;
    long long currentTimestamp;
    RiskSummary runningSummary;
    long long totalScoreSum;

    // Temporal sliding window state for velocity rules (60-second window)
    std::unordered_map<std::string, std::deque<long long>> senderWindow;
    std::unordered_map<std::string, std::deque<std::pair<long long, std::string>>> receiverWindow;

    // Incremental directed graph for cycle and component detection
    TransactionGraph streamGraph;

    // Account pools
    static const std::vector<std::string> ACCOUNTS;
    static const std::vector<std::string> LOCATIONS;
    static const std::vector<std::string> DEVICES;

    // Ring cycle sequence: A101 -> A102 -> A103 -> A104 -> A101
    int cycleStep;
    static const std::vector<std::string> CYCLE_RING;
};

#endif // STREAM_SIMULATOR_H
