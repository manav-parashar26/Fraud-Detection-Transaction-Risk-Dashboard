#include "StreamSimulator.h"
#include <iostream>
#include <csignal>
#include <algorithm>

#ifdef _WIN32
#include <windows.h>
#else
#include <chrono>
#include <thread>
#endif

namespace {
    volatile std::sig_atomic_t g_streamRunning = 1;

    void streamSignalHandler(int) {
        g_streamRunning = 0;
    }
}

const std::vector<std::string> StreamSimulator::ACCOUNTS = {
    "A101", "A102", "A103", "A104", "A105",
    "A106", "A107", "A108", "A109", "A110"
};

const std::vector<std::string> StreamSimulator::LOCATIONS = {
    "Mumbai", "Delhi", "Bengaluru", "Kolkata",
    "Hyderabad", "Chennai", "Pune", "Ahmedabad"
};

const std::vector<std::string> StreamSimulator::DEVICES = {
    "DEV01", "DEV02", "DEV03", "DEV04", "DEV05",
    "DEV06", "DEV07", "DEV08", "DEV09", "DEV10"
};

const std::vector<std::string> StreamSimulator::CYCLE_RING = {
    "A101", "A102", "A103", "A104"
};

StreamSimulator::StreamSimulator(unsigned int seed)
    : rng(seed),
      currentTxNum(2001),
      currentTimestamp(1726038000LL),
      totalScoreSum(0),
      cycleStep(0) {
    runningSummary = RiskSummary();
}

void StreamSimulator::run() {
    // Register signal handlers for clean termination on Windows & POSIX
    std::signal(SIGINT, streamSignalHandler);
    std::signal(SIGTERM, streamSignalHandler);

    std::uniform_int_distribution<size_t> accDist(0, ACCOUNTS.size() - 1);
    std::uniform_int_distribution<size_t> locDist(0, LOCATIONS.size() - 1);
    std::uniform_int_distribution<size_t> devDist(0, DEVICES.size() - 1);
    std::uniform_real_distribution<double> normalAmountDist(600.0, 15000.0);
    std::uniform_real_distribution<double> highAmountDist(55000.0, 92000.0);
    std::uniform_int_distribution<int> timeStepDist(1, 3);

    int transactionCounter = 0;

    while (g_streamRunning) {
        transactionCounter++;
        currentTimestamp += timeStepDist(rng);

        std::string sender;
        std::string receiver;
        double amount = normalAmountDist(rng);

        // Periodically inject realistic fraud patterns (approx 1 in 5 transactions)
        int patternChoice = transactionCounter % 6;

        if (patternChoice == 1) {
            // 1. High Value Anomaly
            sender = ACCOUNTS[accDist(rng)];
            do {
                receiver = ACCOUNTS[accDist(rng)];
            } while (receiver == sender);
            amount = highAmountDist(rng);
        } else if (patternChoice == 3) {
            // 2. Rapid burst (force sender A105 to produce a burst)
            sender = "A105";
            do {
                receiver = ACCOUNTS[accDist(rng)];
            } while (receiver == sender);
            amount = normalAmountDist(rng);
            // Tight timestamp interval for burst
            currentTimestamp += 1;
        } else if (patternChoice == 4) {
            // 3. Multi-recipient pattern (sender A108 sends to multiple accounts)
            sender = "A108";
            receiver = ACCOUNTS[transactionCounter % ACCOUNTS.size()];
            if (receiver == sender) receiver = "A109";
            amount = normalAmountDist(rng);
        } else if (patternChoice == 5) {
            // 4. Circular Money-Muling Ring edge (A101 -> A102 -> A103 -> A104 -> A101)
            sender = CYCLE_RING[cycleStep % CYCLE_RING.size()];
            receiver = CYCLE_RING[(cycleStep + 1) % CYCLE_RING.size()];
            cycleStep = (cycleStep + 1) % CYCLE_RING.size();
            amount = (cycleStep == 0) ? 82000.0 : 45000.0;
        } else {
            // Standard normal transaction
            sender = ACCOUNTS[accDist(rng)];
            do {
                receiver = ACCOUNTS[accDist(rng)];
            } while (receiver == sender);
        }

        std::string txId = "TX" + std::to_string(currentTxNum++);
        std::string dev = DEVICES[devDist(rng)];
        std::string loc = LOCATIONS[locDist(rng)];

        Transaction tx(txId, sender, receiver, amount, currentTimestamp, dev, loc);

        // 1. Sliding window burst detection (60-second window)
        auto& sWindow = senderWindow[tx.sender];
        while (!sWindow.empty() && (tx.timestamp - sWindow.front() > 60)) {
            sWindow.pop_front();
        }
        sWindow.push_back(tx.timestamp);
        bool isRapidBurst = (sWindow.size() >= 5);

        // 2. Sliding window multi-recipient detection (60-second window)
        auto& rWindow = receiverWindow[tx.sender];
        while (!rWindow.empty() && (tx.timestamp - rWindow.front().first > 60)) {
            rWindow.pop_front();
        }
        rWindow.push_back({tx.timestamp, tx.receiver});
        std::unordered_set<std::string> uniqueReceivers;
        for (const auto& p : rWindow) {
            uniqueReceivers.insert(p.second);
        }
        bool isMultiRecip = (uniqueReceivers.size() >= 2);

        // 3. Directed Cycle Detection via Graph BFS reachability
        bool completesCycle = false;
        if (streamGraph.getNodeCount() > 0) {
            std::vector<std::string> reachable = streamGraph.bfs(tx.receiver);
            for (const auto& node : reachable) {
                if (node == tx.sender) {
                    completesCycle = true;
                    break;
                }
            }
        }

        // Add directed edge to graph
        streamGraph.addEdge(tx.sender, tx.receiver);

        // 4. Network and cluster indicator
        bool isNetworkRing = (completesCycle || (sender <= "A104" && receiver <= "A104"));

        // 5. Evaluate Multi-factor Risk Score
        FraudIndicators ind;
        ind.highValue = (tx.amount >= 50000.0);
        ind.rapidTransactions = isRapidBurst;
        ind.multipleRecipients = isMultiRecip;
        ind.cycleDetected = completesCycle;
        ind.suspiciousNetwork = isNetworkRing;

        int score = RiskScorer::calculateRiskScore(ind);
        std::string riskLevel = RiskScorer::getRiskLevel(score);
        tx.riskScore = score;
        tx.isFraud = (score >= 30);

        // Build list of alert reasons with risk contributions
        std::vector<StreamAlert> alerts;
        if (ind.highValue) {
            alerts.push_back({"Unusually high transaction amount", 25});
        }
        if (ind.rapidTransactions) {
            alerts.push_back({"Rapid transaction burst", 20});
        }
        if (ind.multipleRecipients) {
            alerts.push_back({"Multiple recipients in short time", 15});
        }
        if (ind.cycleDetected) {
            alerts.push_back({"Circular transaction flow", 25});
        }
        if (ind.suspiciousNetwork && !ind.cycleDetected) {
            alerts.push_back({"Suspicious fraud network", 15});
        }

        // 6. Update Running Summary Metrics
        runningSummary.totalTransactions++;
        if (score > 0) {
            runningSummary.totalSuspiciousTransactions++;
        }
        if (score >= 30) {
            runningSummary.totalFraudAlerts++;
        }

        if (riskLevel == "LOW") runningSummary.lowRiskCount++;
        else if (riskLevel == "MEDIUM") runningSummary.mediumRiskCount++;
        else if (riskLevel == "HIGH") runningSummary.highRiskCount++;
        else if (riskLevel == "CRITICAL") runningSummary.criticalRiskCount++;

        totalScoreSum += score;
        runningSummary.averageRiskScore = static_cast<double>(totalScoreSum) / static_cast<double>(runningSummary.totalTransactions);
        if (score > runningSummary.highestRiskScore) {
            runningSummary.highestRiskScore = score;
        }

        // 7. Output Single-line RFC 8259 JSON stream to stdout
        std::string jsonLine = JsonSerializer::serializeStreamTransaction(
            tx,
            riskLevel,
            alerts,
            runningSummary,
            completesCycle,
            (isNetworkRing ? 1 : 0),
            (isNetworkRing ? CYCLE_RING : std::vector<std::string>{})
        );

        std::cout << jsonLine << std::endl;
        std::cout.flush();

        // Sleep for ~1.5s in 50ms intervals to remain responsive to SIGINT / SIGTERM
        for (int i = 0; i < 30 && g_streamRunning; ++i) {
#ifdef _WIN32
            Sleep(50);
#else
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
#endif
        }
    }
}
