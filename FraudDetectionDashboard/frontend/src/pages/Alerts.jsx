import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ShieldAlert, Search, ArrowDownUp, Filter, AlertTriangle } from 'lucide-react';
import AlertCard from '../components/AlertCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import TransactionDetailModal from '../components/TransactionDetailModal';
import apiService from '../services/api';

export default function Alerts({ refreshTrigger }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Sorting
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('DESC'); // DESC or ASC

  // Drill-down inspection
  const [selectedTxId, setSelectedTxId] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getAlerts(riskFilter);
      setAlerts(res.alerts || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve fraud alerts from server.');
    } finally {
      setLoading(false);
    }
  }, [riskFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts, refreshTrigger]);

  // Client-side search and sort
  const processedAlerts = useMemo(() => {
    let list = alerts.slice();

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.transactionId.toLowerCase().includes(q) ||
          (a.accountId && a.accountId.toLowerCase().includes(q)) ||
          (a.reasons && a.reasons.some((r) => r.toLowerCase().includes(q)))
      );
    }

    // Sort by risk score
    list.sort((a, b) => {
      const diff = (b.riskScore || 0) - (a.riskScore || 0);
      return sortOrder === 'DESC' ? diff : -diff;
    });

    return list;
  }, [alerts, searchTerm, sortOrder]);

  const criticalCount = alerts.filter((a) => a.riskLevel === 'CRITICAL').length;
  const highCount = alerts.filter((a) => a.riskLevel === 'HIGH').length;
  const mediumCount = alerts.filter((a) => a.riskLevel === 'MEDIUM').length;

  return (
    <div className="page-container">
      {error && <ErrorBanner message={error} onRetry={fetchAlerts} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Fraud Risk Alerts & Incident Feed</h1>
          <p className="page-description">
            Prioritized stream of rule-triggered anomalies with consolidated behavioral reasons
          </p>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="filter-card">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by Transaction ID, Account, or Reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          {/* Risk Filter Tabs */}
          <div className="tab-group">
            <button
              className={`tab-btn ${riskFilter === 'ALL' ? 'tab-btn-active' : ''}`}
              onClick={() => setRiskFilter('ALL')}
            >
              All ({alerts.length})
            </button>
            <button
              className={`tab-btn tab-btn-critical ${riskFilter === 'CRITICAL' ? 'tab-btn-active' : ''}`}
              onClick={() => setRiskFilter('CRITICAL')}
            >
              Critical ({criticalCount})
            </button>
            <button
              className={`tab-btn tab-btn-high ${riskFilter === 'HIGH' ? 'tab-btn-active' : ''}`}
              onClick={() => setRiskFilter('HIGH')}
            >
              High ({highCount})
            </button>
            <button
              className={`tab-btn tab-btn-medium ${riskFilter === 'MEDIUM' ? 'tab-btn-active' : ''}`}
              onClick={() => setRiskFilter('MEDIUM')}
            >
              Medium ({mediumCount})
            </button>
          </div>

          {/* Sort Control */}
          <button
            className="sort-btn"
            onClick={() => setSortOrder((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'))}
            title="Toggle sort order by risk score"
          >
            <ArrowDownUp size={15} />
            <span>Score: {sortOrder === 'DESC' ? 'High to Low' : 'Low to High'}</span>
          </button>
        </div>
      </div>

      {/* Alert Feed */}
      {loading ? (
        <LoadingSpinner message="Scanning fraud alert stream..." />
      ) : processedAlerts.length === 0 ? (
        <div className="empty-state-box">
          <AlertTriangle size={32} color="#64748b" style={{ marginBottom: '12px' }} />
          <div>No fraud alerts found matching the current criteria.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {processedAlerts.map((alert) => (
            <AlertCard
              key={alert.transactionId}
              alert={alert}
              onSelect={(a) => setSelectedTxId(a.transactionId)}
            />
          ))}
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTxId && (
        <TransactionDetailModal
          transactionId={selectedTxId}
          onClose={() => setSelectedTxId(null)}
        />
      )}
    </div>
  );
}
