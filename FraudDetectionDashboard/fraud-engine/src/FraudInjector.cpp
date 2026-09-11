#include "FraudInjector.h"
#include <algorithm>
#include <unordered_set>

FraudInjector::FraudInjector(unsigned int seed)
    : rng(seed) {}

int FraudInjector::injectHighValueTransactions(std::vector<Transaction>& transactions, int count) {
    if (transactions.size() < static_cast<size_t>(count)) {
        return 0;
    }

    const std::vector<size_t> targetIndices = {
        42, 125, 235, 345, 465, 575, 685, 785, 875, 955
    };

    const double highAmounts[] = {
        95000.0, 78000.0, 62500.0, 89000.0, 54000.0,
        91000.0, 67000.0, 73500.0, 85000.0, 99000.0
    };

    const std::pair<std::string, std::string> accountPairs[] = {
        {"A101", "A104"}, {"A105", "A107"}, {"A108", "A110"},
        {"A101", "A103"}, {"A105", "A106"}, {"A108", "A109"},
        {"A102", "A104"}, {"A106", "A107"}, {"A109", "A110"},
        {"A101", "A102"}
    };

    int injected = 0;
    for (int i = 0; i < count && i < static_cast<int>(targetIndices.size()); ++i) {
        size_t idx = targetIndices[i];
        if (idx < transactions.size()) {
            transactions[idx].amount = highAmounts[i % 10];
            transactions[idx].sender = accountPairs[i % 10].first;
            transactions[idx].receiver = accountPairs[i % 10].second;
            injected++;
        }
    }

    return injected;
}

int FraudInjector::injectRapidBursts(std::vector<Transaction>& transactions, int burstCount) {
    if (transactions.size() < 100) {
        return 0;
    }

    const std::vector<size_t> baseIndices = {80, 260, 450, 650, 830};
    const std::pair<std::string, std::string> burstPairs[] = {
        {"A105", "A106"}, // Cluster 2
        {"A108", "A109"}, // Cluster 3
        {"A105", "A107"}, // Cluster 2
        {"A108", "A110"}, // Cluster 3
        {"A106", "A107"}  // Cluster 2
    };

    int injectedBursts = 0;
    for (int b = 0; b < burstCount && b < static_cast<int>(baseIndices.size()); ++b) {
        size_t baseIdx = baseIndices[b];
        if (baseIdx + 5 > transactions.size()) continue;

        const std::string& sender = burstPairs[b].first;
        const std::string& receiver = burstPairs[b].second;
        long long baseTs = transactions[baseIdx].timestamp;

        // 5 transactions within 32 seconds (well below 60s threshold)
        for (int j = 0; j < 5; ++j) {
            size_t idx = baseIdx + j;
            transactions[idx].sender = sender;
            transactions[idx].receiver = receiver;
            transactions[idx].timestamp = baseTs + (j * 8);
        }
        injectedBursts++;
    }

    return injectedBursts;
}

int FraudInjector::injectMultipleRecipients(std::vector<Transaction>& transactions, int patternCount) {
    if (transactions.size() < 100) {
        return 0;
    }

    const std::vector<size_t> baseIndices = {160, 350, 550, 740, 910};

    // Intra-cluster multi-recipient groups:
    // Pattern 1: A105 -> {A106, A107} (Cluster 2)
    // Pattern 2: A108 -> {A109, A110} (Cluster 3)
    // Pattern 3: A101 -> {A102, A103, A104} (Cluster 1)
    // Pattern 4: A105 -> {A106, A107} (Cluster 2)
    // Pattern 5: A108 -> {A109, A110} (Cluster 3)
    const std::string senders[] = {"A105", "A108", "A101", "A105", "A108"};
    const std::vector<std::vector<std::string>> receiverSets = {
        {"A106", "A107"},
        {"A109", "A110"},
        {"A102", "A103", "A104"},
        {"A106", "A107"},
        {"A109", "A110"}
    };

    int injectedPatterns = 0;
    for (int p = 0; p < patternCount && p < static_cast<int>(baseIndices.size()); ++p) {
        size_t baseIdx = baseIndices[p];
        const auto& receivers = receiverSets[p];
        size_t needed = receivers.size();
        if (baseIdx + needed > transactions.size()) continue;

        const std::string& sender = senders[p];
        long long baseTs = transactions[baseIdx].timestamp;

        for (size_t j = 0; j < needed; ++j) {
            size_t idx = baseIdx + j;
            transactions[idx].sender = sender;
            transactions[idx].receiver = receivers[j];
            transactions[idx].timestamp = baseTs + static_cast<long long>(j * 10);
        }
        injectedPatterns++;
    }

    return injectedPatterns;
}

int FraudInjector::injectCycle(std::vector<Transaction>& transactions,
                               const std::vector<std::string>& cycleNodes,
                               double amount) {
    if (cycleNodes.size() < 2 || transactions.size() < 30) {
        return 0;
    }

    // Explicit circular transaction ring: A101 -> A102 -> A103 -> A104 -> A101
    size_t baseIdx = 20;
    long long baseTs = transactions[baseIdx].timestamp;
    size_t n = cycleNodes.size();

    for (size_t i = 0; i < n; ++i) {
        size_t idx = baseIdx + i;
        transactions[idx].sender = cycleNodes[i];
        transactions[idx].receiver = cycleNodes[(i + 1) % n];
        transactions[idx].amount = amount;
        transactions[idx].timestamp = baseTs + static_cast<long long>(i * 12);
    }

    return 1;
}

InjectionStats FraudInjector::injectAll(std::vector<Transaction>& transactions,
                                       int highValCount,
                                       int burstCount,
                                       int multiRecipCount,
                                       bool injectCircularRing) {
    InjectionStats stats;
    stats.highValueCount = injectHighValueTransactions(transactions, highValCount);
    stats.rapidBurstCount = injectRapidBursts(transactions, burstCount);
    stats.multipleRecipientCount = injectMultipleRecipients(transactions, multiRecipCount);
    if (injectCircularRing) {
        stats.cycleCount = injectCycle(transactions, {"A101", "A102", "A103", "A104"});
    }

    // Re-sort the dataset to maintain strict chronological timestamp ordering
    std::stable_sort(transactions.begin(), transactions.end(),
                     [](const Transaction& a, const Transaction& b) {
                         return a.timestamp < b.timestamp;
                     });

    return stats;
}
