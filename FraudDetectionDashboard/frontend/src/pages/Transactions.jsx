import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Eye, ShieldAlert, ShieldCheck } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { formatCurrency, formatTimestamp } from '../utils/formatters';
import { getRiskLevel } from '../utils/riskColors';
import apiService from '../services/api';

export default function Transactions({ refreshTrigger }) {
  const [transactions, setTransactions] = useState([]);
  const [totalTxs, setTotalTxs] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal inspection
  const [selectedTxId, setSelectedTxId] = useState(null);

  const fetchTransactions = useCallback(async (targetPage = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getTransactions(targetPage, limit);
      setTransactions(res.data || []);
      setTotalTxs(res.total || 0);
      setPage(res.page || 1);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to fetch transactions from server.');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTransactions(page);
  }, [fetchTransactions, page, refreshTrigger]);

  // Client-side filtering across current batch
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Risk level mapping
      const txRiskLevel = tx.riskLevel || getRiskLevel(tx.riskScore);

      // Search match
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        tx.transactionId.toLowerCase().includes(q) ||
        tx.sender.toLowerCase().includes(q) ||
        tx.receiver.toLowerCase().includes(q) ||
        (tx.location && tx.location.toLowerCase().includes(q));

      // Risk filter match
      const matchesRisk =
        riskFilter === 'ALL' || txRiskLevel === riskFilter;

      // Status filter match
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'FRAUD' && tx.isFraud) ||
        (statusFilter === 'SAFE' && !tx.isFraud);

      return matchesSearch && matchesRisk && matchesStatus;
    });
  }, [transactions, searchTerm, riskFilter, statusFilter]);

  return (
    <div className="page-container">
      {error && <ErrorBanner message={error} onRetry={() => fetchTransactions(page)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Transaction Ledger & Risk Audit</h1>
          <p className="page-description">
            Complete stream of analyzed banking transactions with rule-evaluated risk scores
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-card">
        {/* Search input */}
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by Transaction ID, Sender, Receiver, Location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter controls */}
        <div className="filter-controls">
          <div className="select-wrapper">
            <span className="filter-label">Risk Level:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Tiers</option>
              <option value="CRITICAL">Critical (80+)</option>
              <option value="HIGH">High (60-79)</option>
              <option value="MEDIUM">Medium (30-59)</option>
              <option value="LOW">Low (0-29)</option>
            </select>
          </div>

          <div className="select-wrapper">
            <span className="filter-label">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="FRAUD">Flagged Fraud</option>
              <option value="SAFE">Safe</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="table-card">
        {loading ? (
          <LoadingSpinner message="Loading transaction batch from engine..." />
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state-box">
            No transactions match the selected filters.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Sender</th>
                  <th>Receiver</th>
                  <th>Amount</th>
                  <th>Location</th>
                  <th>Device</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const txRiskLevel = tx.riskLevel || getRiskLevel(tx.riskScore);
                  return (
                    <tr
                      key={tx.transactionId}
                      onClick={() => setSelectedTxId(tx.transactionId)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="mono-cell" style={{ fontWeight: 600 }}>
                        {tx.transactionId}
                      </td>
                      <td className="mono-cell">{tx.sender}</td>
                      <td className="mono-cell">{tx.receiver}</td>
                      <td className="mono-cell" style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {formatCurrency(tx.amount)}
                      </td>
                      <td>{tx.location || '—'}</td>
                      <td className="mono-cell" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {tx.deviceId || '—'}
                      </td>
                      <td className="mono-cell" style={{ fontWeight: 700 }}>
                        {tx.riskScore}
                      </td>
                      <td>
                        <RiskBadge level={txRiskLevel} />
                      </td>
                      <td>
                        {tx.isFraud ? (
                          <span className="status-badge status-badge-fraud">
                            <ShieldAlert size={12} /> FRAUD
                          </span>
                        ) : (
                          <span className="status-badge status-badge-safe">
                            <ShieldCheck size={12} /> SAFE
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="inspect-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTxId(tx.transactionId);
                          }}
                          title="Inspect full transaction details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="pagination-bar">
          <span className="pagination-info">
            Showing <strong>{filteredTransactions.length}</strong> of <strong>{totalTxs}</strong> transactions
            (Page {page} of {totalPages})
          </span>

          <div className="pagination-controls">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="pagination-btn"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span className="pagination-page-indicator">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="pagination-btn"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Drill-down Modal */}
      {selectedTxId && (
        <TransactionDetailModal
          transactionId={selectedTxId}
          onClose={() => setSelectedTxId(null)}
        />
      )}
    </div>
  );
}
