#include "DSU.h"

DSU::DSU(int n)
    : parent(n), rank(n, 0), size(n, 1), componentCount(n) {
    // Initially, each element is its own representative root
    std::iota(parent.begin(), parent.end(), 0);
}

int DSU::find(int x) {
    // Path Compression: Point nodes visited along the path directly to the root
    // Amortized Time Complexity: O(alpha(V))
    if (parent[x] != x) {
        parent[x] = find(parent[x]);
    }
    return parent[x];
}

bool DSU::unite(int a, int b) {
    int rootA = find(a);
    int rootB = find(b);

    if (rootA == rootB) {
        return false; // Already in the same connected component
    }

    // Union by Rank: Attach tree with smaller rank under root of tree with larger rank
    if (rank[rootA] < rank[rootB]) {
        parent[rootA] = rootB;
        size[rootB] += size[rootA];
    } else if (rank[rootA] > rank[rootB]) {
        parent[rootB] = rootA;
        size[rootA] += size[rootB];
    } else {
        parent[rootB] = rootA;
        rank[rootA]++;
        size[rootA] += size[rootB];
    }

    componentCount--;
    return true;
}

bool DSU::isConnected(int a, int b) {
    return find(a) == find(b);
}

int DSU::getComponentCount() const {
    return componentCount;
}

int DSU::getComponentSize(int x) {
    return size[find(x)];
}
