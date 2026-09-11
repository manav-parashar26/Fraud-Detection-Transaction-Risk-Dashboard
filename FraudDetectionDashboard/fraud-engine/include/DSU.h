#ifndef DSU_H
#define DSU_H

#include <vector>
#include <numeric>

/**
 * @brief Disjoint Set Union (DSU / Union-Find) data structure.
 *
 * Employs two key algorithmic optimizations:
 * 1. Path Compression: Flattens the tree during find(), pointing nodes directly to the root.
 * 2. Union by Rank: Attaches the shallower tree under the deeper tree to prevent degeneration into lines.
 *
 * Amortized Time Complexity: O(alpha(V)) per operation, where alpha is the Inverse Ackermann function
 * (practically O(1) <= 4 for all realistic graph sizes).
 * Space Complexity: O(V) auxiliary space for parent and rank vectors.
 */
class DSU {
public:
    /**
     * @brief Initializes DSU with n isolated elements (0 to n - 1).
     * @param n Number of elements.
     */
    explicit DSU(int n);

    /**
     * @brief Finds the representative root of the set containing element x with Path Compression.
     * @param x Element index.
     * @return int Representative root of the component.
     */
    int find(int x);

    /**
     * @brief Unites the sets containing elements a and b using Union by Rank.
     * @param a First element index.
     * @param b Second element index.
     * @return bool True if elements were in different sets and merged; false if already in the same set.
     */
    bool unite(int a, int b);

    /**
     * @brief Checks if elements a and b belong to the same connected component.
     */
    bool isConnected(int a, int b);

    /**
     * @brief Returns the total count of disjoint connected components.
     */
    int getComponentCount() const;

    /**
     * @brief Returns the number of elements in the component containing x.
     */
    int getComponentSize(int x);

private:
    std::vector<int> parent; // parent[i] points to parent node in tree
    std::vector<int> rank;   // rank[i] approximates tree depth for Union by Rank
    std::vector<int> size;   // size[i] stores component node count at root
    int componentCount;      // Number of active disjoint components
};

#endif // DSU_H
