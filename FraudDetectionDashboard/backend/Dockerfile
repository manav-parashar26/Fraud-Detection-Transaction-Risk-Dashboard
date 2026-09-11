# ==============================================================================
# Multi-Stage Dockerfile for C++17 Fraud Detection Engine + Node.js Backend API
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the C++17 High-Performance Fraud Detection Engine
# ------------------------------------------------------------------------------
FROM gcc:12-bookworm AS cpp-builder

WORKDIR /build

# Copy C++ source files and build configurations
COPY fraud-engine/ ./fraud-engine/

WORKDIR /build/fraud-engine

# Compile C++17 engine with full optimization (-O3) and pthreads for Linux target
RUN g++ -std=c++17 -O3 -pthread \
    src/main.cpp \
    src/TransactionGenerator.cpp \
    src/FraudInjector.cpp \
    src/FraudDetector.cpp \
    src/TransactionGraph.cpp \
    src/DSU.cpp \
    src/RiskScorer.cpp \
    src/JsonSerializer.cpp \
    src/StreamSimulator.cpp \
    -Iinclude \
    -o fraud_engine

# ------------------------------------------------------------------------------
# Stage 2: Production Node.js 20 Runtime
# ------------------------------------------------------------------------------
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies for executing native C++ binaries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy backend package manifests and install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend application source code
COPY backend/ ./

# Create directory for the compiled C++ binary and copy from builder stage
RUN mkdir -p /app/fraud-engine
COPY --from=cpp-builder /build/fraud-engine/fraud_engine /app/fraud-engine/fraud_engine
RUN chmod +x /app/fraud-engine/fraud_engine

# Environment configuration
ENV NODE_ENV=production
ENV PORT=5000
ENV CPP_ENGINE_PATH=/app/fraud-engine/fraud_engine
EXPOSE 5000

# Container health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {if (r.statusCode !== 200) process.exit(1);});"

# Start Express + Socket.IO server
CMD ["node", "src/server.js"]
