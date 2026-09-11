#include "TransactionGenerator.h"
#include <random>
#include <chrono>

// Realistic account, device, and location pools
const std::vector<std::string> TransactionGenerator::ACCOUNTS = {
    "A101", "A102", "A103", "A104", "A105",
    "A106", "A107", "A108", "A109", "A110"
};

const std::vector<std::string> TransactionGenerator::DEVICES = {
    "DEV01", "DEV02", "DEV03", "DEV04", "DEV05"
};

const std::vector<std::string> TransactionGenerator::LOCATIONS = {
    "Delhi", "Mumbai", "Kolkata", "Chennai", "Bangalore"
};

TransactionGenerator::TransactionGenerator(unsigned int seed)
    : rng(seed), initialSeed(seed) {}

void TransactionGenerator::reset(unsigned int seed) {
    initialSeed = seed;
    rng.seed(seed);
}

std::vector<Transaction> TransactionGenerator::generate(int count) {
    std::vector<Transaction> transactions;
    if (count <= 0) {
        return transactions;
    }

    transactions.reserve(count);

    // Realistic banking community clusters:
    // Cluster 1: A101, A102, A103, A104
    // Cluster 2: A105, A106, A107
    // Cluster 3: A108, A109, A110
    const std::vector<std::vector<std::string>> clusters = {
        {"A101", "A102", "A103", "A104"},
        {"A105", "A106", "A107"},
        {"A108", "A109", "A110"}
    };

    std::uniform_int_distribution<size_t> clusterDist(0, clusters.size() - 1);
    std::uniform_int_distribution<size_t> deviceDist(0, DEVICES.size() - 1);
    std::uniform_int_distribution<size_t> locationDist(0, LOCATIONS.size() - 1);

    // Realistic normal banking amounts: ₹100 to ₹35,000 (safely below ₹50,000 high-value fraud threshold)
    std::uniform_int_distribution<int> amountUnitsDist(2, 700); // 2 * 50 = ₹100, 700 * 50 = ₹35,000

    // Increasing timestamps: start timestamp and small incremental delta (1 to 15 seconds)
    long long currentTimestamp = 1000000000LL;
    std::uniform_int_distribution<int> timeDeltaDist(1, 15);

    for (int i = 0; i < count; ++i) {
        // Generate unique sequential transaction ID
        std::string txId = "TX" + std::to_string(1000 + i);

        // Select banking community cluster
        size_t cIdx = clusterDist(rng);
        const auto& cluster = clusters[cIdx];

        // Acyclic intra-cluster flow (u < v) guarantees normal baseline graph has no false cycles (DAG)
        std::uniform_int_distribution<size_t> uDist(0, cluster.size() - 2);
        size_t u = uDist(rng);
        std::uniform_int_distribution<size_t> vDist(u + 1, cluster.size() - 1);
        size_t v = vDist(rng);

        std::string sender = cluster[u];
        std::string receiver = cluster[v];

        // Monetary amount
        double amount = static_cast<double>(amountUnitsDist(rng) * 50);

        // Advance timestamp strictly chronologically
        currentTimestamp += timeDeltaDist(rng);

        // Device and location
        std::string deviceId = DEVICES[deviceDist(rng)];
        std::string location = LOCATIONS[locationDist(rng)];

        // Create transaction with default riskScore = 0.0 and isFraud = false
        transactions.emplace_back(
            txId,
            sender,
            receiver,
            amount,
            currentTimestamp,
            deviceId,
            location,
            0.0,
            false
        );
    }

    return transactions;
}
