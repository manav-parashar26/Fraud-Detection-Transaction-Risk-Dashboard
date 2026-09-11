#ifndef TRANSACTION_GENERATOR_H
#define TRANSACTION_GENERATOR_H

#include "Transaction.h"
#include <vector>
#include <string>
#include <random>

/**
 * @brief Generates realistic synthetic banking transactions for fraud analysis.
 *
 * Implements deterministic generation using std::mt19937 seeded pseudo-random
 * numbers. Guarantees distinct sender and receiver, strictly monotonic timestamps,
 * unique sequential transaction IDs, and realistic distribution across accounts,
 * devices, and geographical locations.
 */
class TransactionGenerator {
public:
    /**
     * @brief Constructs a generator with a specific seed for reproducible generation.
     * @param seed Seed for the Mersenne Twister engine (default: 42).
     */
    explicit TransactionGenerator(unsigned int seed = 42);

    /**
     * @brief Generates a specified count of simulated transactions.
     * @param count Number of transactions to generate (e.g., 1000).
     * @return std::vector<Transaction> Chronologically sorted transaction stream.
     */
    std::vector<Transaction> generate(int count);

    /**
     * @brief Resets the generator state with an optional new seed.
     */
    void reset(unsigned int seed = 42);

private:
    std::mt19937 rng;
    unsigned int initialSeed;

    // Pools for realistic simulated data
    static const std::vector<std::string> ACCOUNTS;
    static const std::vector<std::string> DEVICES;
    static const std::vector<std::string> LOCATIONS;
};

#endif // TRANSACTION_GENERATOR_H
