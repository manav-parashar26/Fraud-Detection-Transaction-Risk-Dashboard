import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const apiService = {
  // Check backend engine connectivity and health
  getHealth: async () => {
    const res = await apiClient.get('/health');
    return res.data;
  },

  // Trigger C++ fraud detection engine analysis and refresh cache
  runAnalysis: async () => {
    const res = await apiClient.post('/analyze');
    return res.data;
  },

  // Retrieve fraud analytics summary statistics
  getAnalytics: async () => {
    const res = await apiClient.get('/analytics');
    return res.data;
  },

  // Retrieve top suspicious accounts aggregated from historical alerts
  getSuspiciousAccounts: async (limit = 10) => {
    const res = await apiClient.get('/analytics/suspicious-accounts', {
      params: { limit }
    });
    return res.data;
  },

  // Retrieve paginated transactions with optional multi-attribute filters
  getTransactions: async (pageOrParams = 1, maybeLimit = 50) => {
    let params = {};
    if (typeof pageOrParams === 'object' && pageOrParams !== null) {
      params = { ...pageOrParams };
    } else {
      params = { page: pageOrParams, limit: maybeLimit };
    }
    const res = await apiClient.get('/transactions', { params });
    return res.data;
  },

  // Retrieve specific transaction details by ID
  getTransactionById: async (id) => {
    const res = await apiClient.get(`/transactions/${encodeURIComponent(id)}`);
    return res.data;
  },

  // Retrieve fraud alerts, optionally filtered by riskLevel (LOW, MEDIUM, HIGH, CRITICAL)
  getAlerts: async (riskLevel = '', page = 1, limit = 50) => {
    const params = { page, limit };
    if (riskLevel && riskLevel !== 'ALL') {
      params.riskLevel = riskLevel.toUpperCase();
    }
    const res = await apiClient.get('/alerts', { params });
    return res.data;
  },

  // Retrieve detected fraud networks and cycle clusters
  getNetworks: async () => {
    const res = await apiClient.get('/networks');
    return res.data;
  },

  // Retrieve continuous monitoring status
  getMonitoringStatus: async () => {
    const res = await apiClient.get('/monitoring/status');
    return res.data;
  },

  // Start continuous C++ stream monitoring
  startMonitoring: async () => {
    const res = await apiClient.post('/monitoring/start');
    return res.data;
  },

  // Stop continuous C++ stream monitoring
  stopMonitoring: async () => {
    const res = await apiClient.post('/monitoring/stop');
    return res.data;
  }
};

export default apiService;
