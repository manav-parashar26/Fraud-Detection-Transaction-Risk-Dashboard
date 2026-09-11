import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Database,
  Clock
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { formatCurrency, formatTimestamp } from '../utils/formatters';
import { getRiskLevel } from '../utils/riskColors';
import apiService from '../services/api';

export default function History({ refreshTrigger }) {
  const [transactions, setTransactions] = useState([]);
  const [totalTxs, setTotalTxs] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal inspection
  const [selectedTxId, setSelectedTxId] = useState(null);

  const fetchHistoricalData = useCallback(async (targetPage = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: targetPage,
        limit,
        riskLevel: riskFilter !== 'ALL' ? riskFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchTerm.trim() || undefined,
        startDate: startDate ? new Date(startDate).getTime() / 1000 : undefined,
        endDate: endDate ? new Date(endDate).getTime() / 1000 : undefined
      };

      const res = await apiService.getTransactions(params);
      setTransactions(res.data || []);
      setTotalTxs(res.total || 0);
      setPage(res.page || 1);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to query historical transaction database.');
    } finally {
      setLoading(false);
    }
  }, [limit, riskFilter, statusFilter, searchTerm, startDate, endDate]);

  useEffect(() => {
    fetchHistoricalData(page);
  }, [fetchHistoricalData, page, refreshTrigger]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setRiskFilter('ALL');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistoricalData(1);
  };

  return (
    <div className="page-container">
      {error && <ErrorBanner message={error} onRetry={() => fetchHistoricalData(page)} />}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Database size={24} style={{ color: '#38bdf8' }} />
            Historical Transaction Audit & Archive
          </h1>
          <p className="page-description">
            Query and analyze persistent transaction records with multi-attribute time, risk, and fraud filters
          </p>
        </div>
        <button
          onClick={handleResetFilters}
          className="refresh-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          title="Reset all search and date filters"
        >
          <RotateCcw size={15} />
          Reset Filters
        </button>
      </div>

      {/* Historical Query Filter Card */}
      <div className="filter-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', width: '100%', flexWrap: 'wrap' }}>
          {/* Text search */}
          <div className="search-input-wrapper" style={{ flex: '1 1 300px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search account, transaction ID, city/location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button type="submit" className="action-btn" style={{ padding: '0.5rem 1.25rem' }}>
            Apply Search
          </button>
        </form>

        {/* Filter controls row */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Date from */}
          <div className="select-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="filter-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={14} /> From:
            </span>
            <input
              type="date"
              className="filter-select"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              style={{ padding: '0.4rem 0.6rem' }}
            />
          </div>

          {/* Date to */}
          <div className="select-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="filter-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={14} /> To:
            </span>
            <input
              type="date"
              className="filter-select"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              style={{ padding: '0.4rem 0.6rem' }}
            />
          </div>

          {/* Risk Level */}
          <div className="select-wrapper">
            <span className="filter-label">Risk Tier:</span>
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="CRITICAL">Critical (80+)</option>
              <option value="HIGH">High (60-79)</option>
              <option value="MEDIUM">Medium (30-59)</option>
              <option value="LOW">Low (0-29)</option>
            </select>
          </div>

          {/* Fraud Status */}
          <div className="select-wrapper">
            <span className="filter-label">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="FRAUD">Flagged Fraud</option>
              <option value="SAFE">Safe</option>
            </select>
          </div>

          {/* Page size limit */}
          <div className="select-wrapper" style={{ marginLeft: 'auto' }}>
            <span className="filter-label">Per Page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="filter-select"
            >
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Historical Records Table */}
      <div className="table-card">
        {loading ? (
          <LoadingSpinner message="Querying persistent transaction records..." />
        ) : transactions.length === 0 ? (
          <div className="empty-state-box" style={{ padding: '3rem 1rem' }}>
            <Database size={40} style={{ color: '#475569', marginBottom: '0.75rem' }} />
            <h3 style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>No Historical Records Found</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              No transactions match your current query parameters. Try widening the date or risk filters.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Timestamp</th>
                  <th>Sender</th>
                  <th>Receiver</th>
                  <th>Amount</th>
                  <th>Location</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
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
                      <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {formatTimestamp(tx.timestamp)}
                      </td>
                      <td className="mono-cell">{tx.sender}</td>
                      <td className="mono-cell">{tx.receiver}</td>
                      <td className="mono-cell" style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {formatCurrency(tx.amount)}
                      </td>
                      <td>{tx.location || '—'}</td>
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
                          title="Inspect complete audit trail"
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

        {/* Pagination Controls */}
        <div className="pagination-bar">
          <span className="pagination-info">
            Showing <strong>{transactions.length}</strong> of <strong>{totalTxs}</strong> archived records
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
