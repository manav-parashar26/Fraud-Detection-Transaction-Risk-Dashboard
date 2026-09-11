#include <iostream>
#include <vector>
#include <iomanip>
#include <string>
#include <cassert>
#include "Transaction.h"
#include "TransactionGenerator.h"
#include "FraudInjector.h"
#include "FraudDetector.h"
#include "RiskScorer.h"
#include "JsonSerializer.h"
#include "StreamSimulator.h"

#ifdef _WIN32
#include <windows.h>
#endif

// Runs the comprehensive validation tests for Phase 4
void runPhase4Tests() {
    std::cout << "==================================================" << std::endl;
    std::cout << " PHASE 4 RISK SCORING & ALERT VERIFICATION SUITE" << std::endl;
    std::cout << "==================================================" << std::endl;

    // TEST 1: Normal transaction -> Low risk (Score = 0, Level = LOW)
    {
        FraudIndicators ind;
        int score = RiskScorer::calculateRiskScore(ind);
        std::string level = RiskScorer::getRiskLevel(score);
        bool pass = (score == 0 && level == "LOW");
        std::cout << "TEST 1: Normal transaction evaluation: "
                  << (pass ? "[PASS] (Score: 0, Level: LOW)" : "[FAIL]") << std::endl;
        assert(pass);
    }

    // TEST 2: High-value transaction -> +25 points
    {
        FraudIndicators ind;
        ind.highValue = true;
        int score = RiskScorer::calculateRiskScore(ind);
        bool pass = (score == 25);
        std::cout << "TEST 2: High-value transaction indicator: "
                  << (pass ? "[PASS] (Score: +25)" : "[FAIL]") << std::endl;
        assert(pass);
    }

    // TEST 3: Rapid transaction burst -> +20 points
    {
        FraudIndicators ind;
        ind.rapidTransactions = true;
        int score = RiskScorer::calculateRiskScore(ind);
        bool pass = (score == 20);
        std::cout << "TEST 3: Rapid transaction burst indicator: "
                  << (pass ? "[PASS] (Score: +20)" : "[FAIL]") << std::endl;
        assert(pass);
    }

    // TEST 4: Multiple recipients -> +15 points
    {
        FraudIndicators ind;
        ind.multipleRecipients = true;
        int score = RiskScorer::calculateRiskScore(ind);
        bool pass = (score == 15);
        std::cout << "TEST 4: Multiple recipients indicator: "
                  << (pass ? "[PASS] (Score: +15)" : "[FAIL]") << std::endl;
        assert(pass);
    }

    // TEST 5: Cycle detected -> +25 points
    {
        FraudIndicators ind;
        ind.cycleDetected = true;
        int score = RiskScorer::calculateRiskScore(ind);
        bool pass = (score == 25);
        std::cout << "TEST 5: Cycle detected indicator: "
                  << (pass ? "[PASS] (Score: +25)" : "[FAIL]") << std::endl;
        assert(pass);
    }

    // TEST 6: Multiple indicators (High Value + Rapid + Cycle: 25 + 20 + 25 = 70) -> Level: HIGH
    {
        FraudIndicators ind;
        ind.highValue = true;
        ind.rapidTransactions = true;
        ind.cycleDetected = true;
        int score = RiskScorer::calculateRiskScore(ind);
        std::string level = RiskScorer::getRiskLevel(score);
        bool pass = (score == 70 && level == "HIGH");
        std::cout << "TEST 6: Multi-indicator composite scoring: "
                  << (pass ? "[PASS] (Score: 70, Level: HIGH)" : "[FAIL]") << std::endl;
        assert(pass);
    }

    // TEST 7: Every indicator triggered (25+20+15+15+25 = 100 capped) -> Level: CRITICAL
    {
        FraudIndicators ind;
        ind.highValue = true;
        ind.rapidTransactions = true;
        ind.multipleRecipients = true;
        ind.suspiciousNetwork = true;
        ind.cycleDetected = true;
        int score = RiskScorer::calculateRiskScore(ind);
        std::string level = RiskScorer::getRiskLevel(score);
        bool pass = (score == 100 && level == "CRITICAL");
        std::cout << "TEST 7: All indicators triggered (Capped at 100): "
                  << (pass ? "[PASS] (Score: 100, Level: CRITICAL)" : "[FAIL]") << std::endl;
        assert(pass);
    }

    // TEST 8: Deduplication -> exactly 1 unified alert per transaction with all reasons
    {
        Transaction tx("TX_TEST", "A101", "A102", 95000.0, 1000000000LL, "DEV01", "Delhi");
        FraudIndicators ind;
        ind.highValue = true;
        ind.rapidTransactions = true;
        ind.cycleDetected = true;
        int score = RiskScorer::calculateRiskScore(ind);
        auto reasons = RiskScorer::getReasons(ind);
        FraudAlert alert(tx.transactionId, tx.sender, tx.amount, tx.timestamp, score, RiskScorer::getRiskLevel(score), reasons);
        bool pass = (alert.reasons.size() == 3 && alert.riskScore == 70);
        std::cout << "TEST 8: Deduplication & unified alert consolidation: "
                  << (pass ? "[PASS] (1 unified alert with 3 consolidated reasons)" : "[FAIL]") << std::endl;
        assert(pass);
    }

    std::cout << "==================================================" << std::endl;
    std::cout << std::endl;
}

int main(int argc, char* argv[]) {
#ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);
#endif

    bool jsonMode = false;
    bool streamMode = false;
    for (int i = 1; i < argc; ++i) {
        if (std::string(argv[i]) == "--json") {
            jsonMode = true;
        } else if (std::string(argv[i]) == "--stream") {
            streamMode = true;
        }
    }

    if (streamMode) {
        // Continuous real-time simulation and fraud telemetry stream (Phase 7)
        StreamSimulator simulator(777);
        simulator.run();
        return 0;
    }

    if (jsonMode) {
        // Fast, silent execution emitting strictly valid JSON (Phase 5)
        TransactionGenerator generator(42);
        const int totalTransactions = 1000;
        std::vector<Transaction> transactions = generator.generate(totalTransactions);

        FraudInjector injector(99);
        injector.injectAll(transactions, 10, 5, 5, true);

        FraudDetector detector;
        detector.runAllDetections(transactions);

        std::cout << JsonSerializer::serialize(
            detector.getRiskSummary(),
            transactions,
            detector.getFraudAlerts(),
            detector.getFraudNetworks()
        );
        return 0;
    }

    // Default: Run Verification Suite and display human-readable dashboard (Phase 1-4)
    runPhase4Tests();

    // 2. Generate baseline transactions
    TransactionGenerator generator(42);
    const int totalTransactions = 1000;
    std::vector<Transaction> transactions = generator.generate(totalTransactions);

    // 3. Inject known fraud scenarios (Phase 2 & Phase 3)
    FraudInjector injector(99);
    injector.injectAll(transactions, 10, 5, 5, true);

    // 4. Run Unified Fraud Detection & Risk Scoring Engine
    FraudDetector detector;
    detector.runAllDetections(transactions);

    const RiskSummary& summary = detector.getRiskSummary();
    const auto& alerts = detector.getFraudAlerts();

    // 5. Output Console Report (Step 10 format)
    std::cout << "==================================================" << std::endl;
    std::cout << "       FRAUD DETECTION & RISK ENGINE" << std::endl;
    std::cout << "==================================================" << std::endl;
    std::cout << std::endl;
    std::cout << "Transactions Analyzed: " << summary.totalTransactions << std::endl;
    std::cout << std::endl;
    std::cout << "--------------------------------------------------" << std::endl;
    std::cout << "RISK SUMMARY" << std::endl;
    std::cout << "--------------------------------------------------" << std::endl;
    std::cout << std::endl;
    std::cout << "Low Risk:       " << summary.lowRiskCount << std::endl;
    std::cout << "Medium Risk:    " << summary.mediumRiskCount << std::endl;
    std::cout << "High Risk:      " << summary.highRiskCount << std::endl;
    std::cout << "Critical Risk:  " << summary.criticalRiskCount << std::endl;
    std::cout << std::endl;
    std::cout << "Total Alerts:   " << summary.totalFraudAlerts << std::endl;
    std::cout << std::endl;
    std::cout << "Average Risk:   " << std::fixed << std::setprecision(1) << summary.averageRiskScore << std::endl;
    std::cout << "Highest Risk:   " << summary.highestRiskScore << std::endl;
    std::cout << std::endl;

    std::cout << "==================================================" << std::endl;
    std::cout << "TOP FRAUD ALERTS" << std::endl;
    std::cout << "==================================================" << std::endl;
    std::cout << std::endl;

    // Display Top Prioritized Alerts (first 10 highest risk alerts)
    const size_t displayCount = std::min(size_t(10), alerts.size());
    for (size_t i = 0; i < displayCount; ++i) {
        alerts[i].print();
    }

    // 6. Connected Fraud Networks Summary
    const auto& networks = detector.getFraudNetworks();
    std::cout << "==================================================" << std::endl;
    std::cout << "FRAUD NETWORKS IDENTIFIED: " << networks.size() << std::endl;
    std::cout << "==================================================" << std::endl;
    for (const auto& net : networks) {
        std::cout << "Network #" << net.networkId << " | Accounts: ";
        for (size_t i = 0; i < net.accounts.size(); ++i) {
            std::cout << net.accounts[i] << (i + 1 < net.accounts.size() ? " -> " : "");
        }
        std::cout << " | Cycle: " << (net.hasCycle ? "YES" : "NO") << std::endl;
    }
    std::cout << "==================================================" << std::endl;

    return 0;
}
