#include "TransactionGraph.h"
#include <algorithm>
#include <iostream>

TransactionGraph::TransactionGraph()
    : edgeCount(0) {}

void TransactionGraph::clear() {
    adjList.clear();
    allAccounts.clear();
    accountToId.clear();
    idToAccount.clear();
    edgeCount = 0;
}

int TransactionGraph::getOrCreateAccountId(const std::string& account) {
    auto it = accountToId.find(account);
    if (it != accountToId.end()) {
        return it->second;
    }
    int newId = static_cast<int>(idToAccount.size());
    accountToId[account] = newId;
    idToAccount.push_back(account);
    allAccounts.push_back(account);
    return newId;
}

std::string TransactionGraph::getAccountName(int id) const {
    if (id >= 0 && id < static_cast<int>(idToAccount.size())) {
        return idToAccount[id];
    }
    return "";
}

void TransactionGraph::addEdge(const std::string& sender, const std::string& receiver) {
    getOrCreateAccountId(sender);
    getOrCreateAccountId(receiver);

    adjList[sender].push_back(receiver);
    // Ensure receiver exists in adjList even if it has no outgoing edges
    if (adjList.find(receiver) == adjList.end()) {
        adjList[receiver] = std::vector<std::string>();
    }
    edgeCount++;
}

void TransactionGraph::buildFromTransactions(const std::vector<Transaction>& transactions) {
    clear();
    for (const auto& tx : transactions) {
        addEdge(tx.sender, tx.receiver);
    }
}

std::vector<std::string> TransactionGraph::bfs(const std::string& startAccount) const {
    std::vector<std::string> result;
    if (adjList.find(startAccount) == adjList.end()) {
        return result;
    }

    // Queue for frontier exploration
    std::queue<std::string> q;
    // Hash set for O(1) visited lookups to prevent revisiting and infinite cycles
    std::unordered_set<std::string> visited;

    q.push(startAccount);
    visited.insert(startAccount);

    while (!q.empty()) {
        std::string current = q.front();
        q.pop();
        result.push_back(current);

        auto it = adjList.find(current);
        if (it != adjList.end()) {
            for (const auto& neighbor : it->second) {
                if (visited.find(neighbor) == visited.end()) {
                    visited.insert(neighbor);
                    q.push(neighbor);
                }
            }
        }
    }

    return result;
}

void TransactionGraph::dfsHelper(const std::string& current,
                                 std::unordered_set<std::string>& visited,
                                 std::vector<std::string>& result) const {
    visited.insert(current);
    result.push_back(current);

    auto it = adjList.find(current);
    if (it != adjList.end()) {
        for (const auto& neighbor : it->second) {
            if (visited.find(neighbor) == visited.end()) {
                dfsHelper(neighbor, visited, result);
            }
        }
    }
}

std::vector<std::string> TransactionGraph::dfs(const std::string& startAccount) const {
    std::vector<std::string> result;
    if (adjList.find(startAccount) == adjList.end()) {
        return result;
    }

    std::unordered_set<std::string> visited;
    dfsHelper(startAccount, visited, result);
    return result;
}

bool TransactionGraph::detectCycleHelper(const std::string& node,
                                        std::unordered_set<std::string>& visited,
                                        std::unordered_set<std::string>& recursionStack,
                                        std::vector<std::string>& currentPath,
                                        std::vector<std::vector<std::string>>& detectedCycles) const {
    visited.insert(node);
    recursionStack.insert(node);
    currentPath.push_back(node);

    auto it = adjList.find(node);
    if (it != adjList.end()) {
        for (const auto& neighbor : it->second) {
            if (recursionStack.find(neighbor) != recursionStack.end()) {
                // Directed cycle detected! Reconstruct cycle path from neighbor back to neighbor
                auto cycleStartIt = std::find(currentPath.begin(), currentPath.end(), neighbor);
                if (cycleStartIt != currentPath.end()) {
                    std::vector<std::string> rawNodes;
                    for (auto p = cycleStartIt; p != currentPath.end(); ++p) {
                        rawNodes.push_back(*p);
                    }
                    if (rawNodes.size() >= 2) {
                        // Canonical normalization: rotate cycle to start with lexicographically minimum account
                        auto minIt = std::min_element(rawNodes.begin(), rawNodes.end());
                        std::rotate(rawNodes.begin(), minIt, rawNodes.end());

                        std::vector<std::string> canonicalCycle = rawNodes;
                        canonicalCycle.push_back(rawNodes[0]); // Close loop

                        bool alreadyFound = false;
                        for (const auto& existing : detectedCycles) {
                            if (existing == canonicalCycle) {
                                alreadyFound = true;
                                break;
                            }
                        }
                        if (!alreadyFound) {
                            detectedCycles.push_back(canonicalCycle);
                        }
                    }
                }
            } else if (visited.find(neighbor) == visited.end()) {
                detectCycleHelper(neighbor, visited, recursionStack, currentPath, detectedCycles);
            }
        }
    }

    // Backtrack
    recursionStack.erase(node);
    currentPath.pop_back();
    return !detectedCycles.empty();
}

bool TransactionGraph::hasCycle() const {
    std::unordered_set<std::string> visited;
    std::unordered_set<std::string> recursionStack;
    std::vector<std::string> currentPath;
    std::vector<std::vector<std::string>> detectedCycles;

    for (const auto& account : allAccounts) {
        if (visited.find(account) == visited.end()) {
            detectCycleHelper(account, visited, recursionStack, currentPath, detectedCycles);
            if (!detectedCycles.empty()) {
                return true;
            }
        }
    }
    return false;
}

std::vector<std::vector<std::string>> TransactionGraph::detectCycles() const {
    std::unordered_set<std::string> visited;
    std::unordered_set<std::string> recursionStack;
    std::vector<std::string> currentPath;
    std::vector<std::vector<std::string>> detectedCycles;

    for (const auto& account : allAccounts) {
        if (visited.find(account) == visited.end()) {
            detectCycleHelper(account, visited, recursionStack, currentPath, detectedCycles);
        }
    }
    return detectedCycles;
}

std::vector<std::vector<std::string>> TransactionGraph::findConnectedComponents() const {
    if (allAccounts.empty()) {
        return {};
    }

    DSU dsu(static_cast<int>(allAccounts.size()));

    // Unite vertices for each directed edge (weakly connected components)
    for (const auto& entry : adjList) {
        const std::string& sender = entry.first;
        int senderId = accountToId.at(sender);
        for (const auto& receiver : entry.second) {
            int receiverId = accountToId.at(receiver);
            dsu.unite(senderId, receiverId);
        }
    }

    // Group accounts by representative root
    std::unordered_map<int, std::vector<std::string>> componentMap;
    for (const auto& account : allAccounts) {
        int id = accountToId.at(account);
        int root = dsu.find(id);
        componentMap[root].push_back(account);
    }

    std::vector<std::vector<std::string>> components;
    components.reserve(componentMap.size());
    for (auto& entry : componentMap) {
        // Sort accounts inside each component for clean readability
        std::sort(entry.second.begin(), entry.second.end());
        components.push_back(entry.second);
    }

    // Sort components by first account identifier
    std::sort(components.begin(), components.end(), [](const std::vector<std::string>& a, const std::vector<std::string>& b) {
        if (a.empty() || b.empty()) return a.size() < b.size();
        return a[0] < b[0];
    });

    return components;
}

size_t TransactionGraph::getNodeCount() const {
    return allAccounts.size();
}

size_t TransactionGraph::getEdgeCount() const {
    return edgeCount;
}

const std::unordered_map<std::string, std::vector<std::string>>& TransactionGraph::getAdjacencyList() const {
    return adjList;
}

const std::vector<std::string>& TransactionGraph::getAllAccounts() const {
    return allAccounts;
}
