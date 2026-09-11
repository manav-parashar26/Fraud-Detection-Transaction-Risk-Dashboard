#ifndef TRANSACTION_GRAPH_H
#define TRANSACTION_GRAPH_H

#include "Transaction.h"
#include "DSU.h"
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <queue>

/**
 * @brief Represents a directed graph of banking transactions.
 *
 * Each node represents an account (e.g., "A101").
 * Each directed edge (u -> v) represents a monetary transfer from sender u to receiver v.
 *
 * Implements:
 * - Adjacency list representation: O(V + E) space
 * - Breadth-First Search (BFS): O(V + E) time, level-order reachability analysis
 * - Depth-First Search (DFS): O(V + E) time, deep path traversal
 * - Directed Cycle Detection: O(V + E) time, detecting circular money-routing rings
 * - Connected Components via DSU: O(E * alpha(V)) time, grouping account clusters
 */
class TransactionGraph {
public:
    TransactionGraph();

    /**
     * @brief Adds an account node to the graph if not already registered.
     * Maps account string to a contiguous 0-based integer ID.
     */
    int getOrCreateAccountId(const std::string& account);

    /**
     * @brief Looks up account name from its internal integer ID.
     */
    std::string getAccountName(int id) const;

    /**
     * @brief Adds a directed edge from sender to receiver.
     */
    void addEdge(const std::string& sender, const std::string& receiver);

    /**
     * @brief Constructs the directed transaction graph from a collection of transactions.
     * Complexity: O(E) time where E is the number of transactions.
     */
    void buildFromTransactions(const std::vector<Transaction>& transactions);

    /**
     * @brief Clears all nodes, edges, and mappings from the graph.
     */
    void clear();

    /**
     * @brief Performs Breadth-First Search from a start account.
     *
     * Traversal details:
     * - Explores accounts level-by-level using std::queue.
     * - Uses std::unordered_set<std::string> visited to prevent repeated visits and infinite loops.
     * - Ideal for downstream impact analysis: identifies all accounts directly or indirectly receiving funds.
     *
     * Complexity:
     * - Time: O(V + E) where V is accounts and E is transaction edges reachable.
     * - Space: O(V) auxiliary space for queue and visited set.
     *
     * @param startAccount Account ID to begin exploration.
     * @return std::vector<std::string> List of reachable accounts in BFS order.
     */
    std::vector<std::string> bfs(const std::string& startAccount) const;

    /**
     * @brief Performs Depth-First Search from a start account.
     *
     * Traversal details:
     * - Explores deeply along money transfer chains before backtracking.
     * - Uses std::unordered_set<std::string> visited to track visited vertices.
     *
     * Complexity:
     * - Time: O(V + E)
     * - Space: O(V) auxiliary space for call stack and visited set.
     *
     * @param startAccount Account ID to begin exploration.
     * @return std::vector<std::string> List of traversed accounts in DFS order.
     */
    std::vector<std::string> dfs(const std::string& startAccount) const;

    /**
     * @brief Checks whether the directed transaction graph contains any directed cycle.
     *
     * Algorithmic design:
     * - Employs recursion stack tracking (visited and recursionStack sets).
     * - A back-edge pointing to an ancestor currently in the recursion stack indicates a cycle.
     *
     * Complexity: O(V + E) time, O(V) space.
     */
    bool hasCycle() const;

    /**
     * @brief Detects directed cycles and returns their closed account paths.
     * Example: {"A101", "A102", "A103", "A104", "A101"}
     */
    std::vector<std::vector<std::string>> detectCycles() const;

    /**
     * @brief Groups accounts into weakly connected components using DSU.
     *
     * Algorithm:
     * - For each edge (u -> v), unifies sets via DSU.unite(id(u), id(v)).
     * - Accounts sharing the same DSU root form a connected component.
     *
     * Complexity: O(E * alpha(V)) time, O(V) space.
     *
     * @return std::vector<std::vector<std::string>> List of account clusters.
     */
    std::vector<std::vector<std::string>> findConnectedComponents() const;

    // Accessors
    size_t getNodeCount() const;
    size_t getEdgeCount() const;
    const std::unordered_map<std::string, std::vector<std::string>>& getAdjacencyList() const;
    const std::vector<std::string>& getAllAccounts() const;

private:
    // Helper for recursive DFS traversal
    void dfsHelper(const std::string& current,
                   std::unordered_set<std::string>& visited,
                   std::vector<std::string>& result) const;

    // Helper for directed cycle detection with path extraction
    bool detectCycleHelper(const std::string& node,
                           std::unordered_set<std::string>& visited,
                           std::unordered_set<std::string>& recursionStack,
                           std::vector<std::string>& currentPath,
                           std::vector<std::vector<std::string>>& detectedCycles) const;

    // Adjacency List: account -> list of recipient accounts
    std::unordered_map<std::string, std::vector<std::string>> adjList;

    // Accounts catalog
    std::vector<std::string> allAccounts;

    // Bidirectional account ID mapping for DSU efficiency
    std::unordered_map<std::string, int> accountToId;
    std::vector<std::string> idToAccount;

    size_t edgeCount;
};

#endif // TRANSACTION_GRAPH_H
