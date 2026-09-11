#ifndef FRAUD_INJECTOR_H
#define FRAUD_INJECTOR_H

#include "Transaction.h"
#include <vector>
#include <string>
#include <random>

/**
 * @brief Statistics tracking the count of injected fraud scenarios.
 */
struct InjectionStats {
    int highValueCount = 0;
    int rapidBurstCount = 0;
    int multipleRecipientCount = 0;
    int cycleCount = 0;
};

/**
 * @brief Injects known, deterministic fraudulent patterns into a transaction stream.
 *
 * Simulates:
 * 1. High Value Transactions (amount >= ₹50,000)
 * 2. Rapid Transaction Bursts (>= 5 transactions from the same sender within 60 seconds)
 * 3. Multiple Recipient Patterns (>= 4 unique receivers from one sender within a short window)
 * 4. Directed Circular Fraud Cycle (A101 -> A102 -> A103 -> A104 -> A101)
 */
class FraudInjector {
public:
    /**
     * @brief Constructs the injector with an optional random seed for reproducibility.
     */
    explicit FraudInjector(unsigned int seed = 12345);

    /**
     * @brief Injects high-value transactions (amount >= ₹50,000).
     */
    int injectHighValueTransactions(std::vector<Transaction>& transactions, int count = 10);

    /**
     * @brief Injects rapid transaction bursts (>= 5 txs from same sender within 60s).
     */
    int injectRapidBursts(std::vector<Transaction>& transactions, int burstCount = 5);

    /**
     * @brief Injects multiple recipient patterns (>= 4 unique receivers in short interval).
     */
    int injectMultipleRecipients(std::vector<Transaction>& transactions, int patternCount = 5);

    /**
     * @brief Injects a circular transaction ring (e.g., A101 -> A102 -> A103 -> A104 -> A101).
     */
    int injectCycle(std::vector<Transaction>& transactions,
                    const std::vector<std::string>& cycleNodes = {"A101", "A102", "A103", "A104"},
                    double amount = 45000.0);

    /**
     * @brief Injects all scenarios into the dataset and preserves chronological ordering.
     */
    InjectionStats injectAll(std::vector<Transaction>& transactions,
                             int highValCount = 10,
                             int burstCount = 5,
                             int multiRecipCount = 5,
                             bool injectCircularRing = true);

private:
    std::mt19937 rng;
};

#endif // FRAUD_INJECTOR_H
