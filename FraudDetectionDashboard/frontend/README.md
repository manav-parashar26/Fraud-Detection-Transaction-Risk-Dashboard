# Fraud Detection Dashboard (React.js + Vite)

Enterprise-grade, real-time banking risk dashboard for monitoring simulated transaction streams, flagged anomalies, and circular fraud rings detected by the **C++17 algorithmic engine**.

---

## Key Features

- **Executive Risk Overview**: Live statistical cards for Total Transactions, Flagged Transactions, Alerts, Critical Threats, and Risk Score averages.
- **Visual Risk Analytics**:
  - Recharts Bar Chart showing risk severity breakdown (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - Recharts Area Chart depicting risk score spectrum across transactions.
- **Transaction Ledger & Inspection**: Searchable, paginated data table with risk/status filters and a deep drill-down modal showing sender/receiver flow, device IDs, locations, and flagged fraud rules.
- **Prioritized Fraud Alerts**: Real-time incident feed with severity tabs (`Critical`, `High`, `Medium`), score sorting, and consolidated behavioral reasons.
- **Topological Fraud Networks**: Directed graph visualization displaying circular money-muling rings computed via C++ DFS Cycle Detection & Disjoint Set Union (DSU).
- **Subprocess Orchestration**: Single-click **"Run Fraud Analysis"** trigger communicating with the backend to invoke the C++ engine and update the dashboard in real-time.
- **Resilience & Accessibility**: Semantic HTML, screen-reader friendly risk tags, live connection health monitor (`Engine Online` / `Engine Offline`), and network error banners with instant retry.

---

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Routing**: React Router DOM v6
- **Data Visualizations**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios

---

## Installation & Setup

### Prerequisites
- Node.js v18+ (tested on v20.18.0 LTS)
- Express API server running on `http://localhost:5000`

### 1. Install Dependencies
```bash
cd FraudDetectionDashboard/frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `frontend` root (see `.env.example`):
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Server
```bash
npm run dev
```
The application will be accessible at: `http://localhost:3000`

### 4. Build for Production
```bash
npm run build
```
Generates a production build inside `frontend/dist/`.

---

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx             # Collapsible navigation drawer
│   │   ├── Header.jsx              # Status pill, analysis timestamp & trigger button
│   │   ├── StatCard.jsx            # KPI metric cards
│   │   ├── RiskBadge.jsx           # Accessible risk badge (LOW, MEDIUM, HIGH, CRITICAL)
│   │   ├── AlertCard.jsx           # Anomaly incident card with reason tags
│   │   ├── LoadingSpinner.jsx      # Animated state loader
│   │   ├── ErrorBanner.jsx         # Connection error banner with retry trigger
│   │   ├── TransactionDetailModal.jsx # Full transaction inspector dialog
│   │   └── NetworkGraph.jsx        # SVG directed ring network visualization
│   ├── pages/
│   │   ├── Dashboard.jsx           # KPI metrics, Recharts charts, recent alerts
│   │   ├── Transactions.jsx        # Paginated ledger table with filters
│   │   ├── Alerts.jsx              # Prioritized fraud alert feed
│   │   └── Networks.jsx            # Topological fraud cluster cards
│   ├── services/
│   │   └── api.js                  # Centralized Axios client for all /api endpoints
│   ├── utils/
│   │   ├── formatters.js           # Currency (₹), timestamp, number formatters
│   │   └── riskColors.js           # Risk tier configuration & color mapping
│   ├── App.jsx                     # Layout & React Router setup
│   ├── App.css                     # Dark-mode enterprise CSS
│   ├── index.css                   # Global reset and typography
│   └── main.jsx                    # React entrypoint
├── index.html
├── vite.config.js
└── package.json
```
