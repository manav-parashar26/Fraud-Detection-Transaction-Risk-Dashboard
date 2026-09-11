# Fraud Detection Backend (Node.js + Express)

Backend orchestration layer connecting the frontend dashboard to the high-performance **C++17 Fraud Detection Engine**.

## Architecture & Design

```
Frontend (React - Phase 6)
       │ HTTP / REST
       ▼
Node.js + Express.js API Layer (Port 5000)
       │ child_process.execFile (with maxBuffer: 10MB)
       ▼
C++17 Fraud Detection Engine (fraud_engine.exe --json)
       │ Graph BFS/DFS, Tarjan/Cycle, DSU, Sliding Window, Hashing
       ▼
RFC 8259 JSON Analysis Stream -> Cached In-Memory
```

### Key Highlights
- **Direct C++ Orchestration**: Node.js does not reimplement the detection algorithms in JavaScript. All fraud detection (Cycle detection, BFS, DFS, Union-Find, Sliding window, Hashing, Risk Scoring) is executed in the compiled C++17 engine.
- **Secure Subprocess Execution**: Uses `child_process.execFile` directly targeting the binary path (bypassing the shell, preventing command injection).
- **In-Memory Caching**: Results from C++ analysis are cached in memory for sub-millisecond query responses across paginated and filtered endpoints.
- **Lazy Initialization**: If the C++ engine has not yet been triggered when a query arrives, the engine automatically runs on demand.

---

## Prerequisites

- **Node.js**: v18+ (tested on v20.18.0 LTS)
- **C++ Engine Binary**: `fraud_engine.exe` or `fraud_detector.exe` compiled in `../fraud-engine/`

---

## Installation

```bash
cd FraudDetectionDashboard/backend
npm install
```

---

## Running the Server

### Development / Production
```bash
npm start
```
By default, the server runs on port `5000` (or `process.env.PORT`).

---

## REST API Endpoints

### 1. Health Check
- **URL**: `GET /api/health`
- **Response**:
```json
{
  "status": "OK",
  "uptime": 12.345,
  "timestamp": "2026-09-11T06:15:00.000Z"
}
```

### 2. Trigger Fraud Engine Analysis
- **URL**: `POST /api/analyze`
- **Description**: Executes the C++ binary with `--json`, updates the in-memory cache, and returns execution summary.
- **Response**:
```json
{
  "success": true,
  "message": "Fraud analysis completed",
  "summary": {
    "totalTransactions": 1000,
    "flaggedTransactions": 576,
    "fraudRate": 57.6,
    "totalFraudRings": 3,
    "riskLevelBreakdown": {
      "CRITICAL": 128,
      "HIGH": 204,
      "MEDIUM": 244,
      "LOW": 424
    }
  }
}
```

### 3. Get Transactions (Paginated)
- **URL**: `GET /api/transactions?page=1&limit=50`
- **Query Parameters**:
  - `page` (optional, default: `1`): Page number (1-indexed)
  - `limit` (optional, default: `50`, max: `500`): Items per page
- **Response**:
```json
{
  "total": 1000,
  "page": 1,
  "limit": 50,
  "totalPages": 20,
  "data": [
    {
      "transactionId": "TX1000",
      "sender": "ACC_000000000001",
      "receiver": "ACC_000000000002",
      "amount": 250.50,
      "timestamp": 1700000000,
      "isFlagged": false,
      "riskScore": 15,
      "riskLevel": "LOW"
    }
  ]
}
```

### 4. Get Single Transaction
- **URL**: `GET /api/transactions/:id`
- **Example**: `GET /api/transactions/TX1042`
- **Response**:
```json
{
  "transactionId": "TX1042",
  "sender": "ACC_000000000014",
  "receiver": "ACC_000000000015",
  "amount": 10500.00,
  "timestamp": 1700003600,
  "isFlagged": true,
  "riskScore": 85,
  "riskLevel": "CRITICAL"
}
```

### 5. Get Fraud Alerts
- **URL**: `GET /api/alerts?riskLevel=CRITICAL`
- **Query Parameters**:
  - `riskLevel` (optional): Filter by `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`. If omitted, returns all alerts.
- **Response**:
```json
{
  "totalAlerts": 128,
  "filter": "CRITICAL",
  "alerts": [
    {
      "transactionId": "TX1042",
      "sender": "ACC_000000000014",
      "receiver": "ACC_000000000015",
      "amount": 10500.00,
      "timestamp": 1700003600,
      "riskScore": 85,
      "riskLevel": "CRITICAL",
      "reasons": [
        "Rapid burst of transactions in sliding window",
        "Participant in circular transaction ring (length: 3)"
      ]
    }
  ]
}
```

### 6. Get Analytics Summary
- **URL**: `GET /api/analytics`
- **Response**:
```json
{
  "totalTransactions": 1000,
  "flaggedTransactions": 576,
  "fraudRate": 57.6,
  "totalFraudRings": 3,
  "riskLevelBreakdown": {
    "CRITICAL": 128,
    "HIGH": 204,
    "MEDIUM": 244,
    "LOW": 424
  }
}
```

### 7. Get Fraud Network Clusters
- **URL**: `GET /api/networks`
- **Response**:
```json
{
  "totalNetworks": 3,
  "networks": [
    {
      "networkId": 1,
      "type": "CYCLE_RING",
      "members": [
        "ACC_000000000010",
        "ACC_000000000011",
        "ACC_000000000012"
      ],
      "riskLevel": "CRITICAL"
    }
  ]
}
```
