import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  AlertOctagon,
  ShieldAlert,
  Flame,
  Activity,
  Award,
  ArrowRight,
  Radio,
  Clock,
  ExternalLink,
  UserX
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import StatCard from '../components/StatCard';
import AlertCard from '../components/AlertCard';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { formatNumber, formatCurrency, formatTimestamp } from '../utils/formatters';
import { getRiskLevel } from '../utils/riskColors';
import apiService from '../services/api';
import socketService from '../services/socket';

export default function Dashboard({ refreshTrigger }) {
  const [analytics, setAnalytics] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [suspiciousAccounts, setSuspiciousAccounts] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTxId, setSelectedTxId] = useState(null);
  const [liveUpdateFlag, setLiveUpdateFlag] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [analyticsData, alertsData, txData, accountsData] = await Promise.all([
        apiService.getAnalytics(),
        apiService.getAlerts(),
        apiService.getTransactions(1, 15),
        apiService.getSuspiciousAccounts(6).catch(() => [])
      ]);

      setAnalytics(analyticsData || {});
      const sortedAlerts = (alertsData.alerts || [])
        .slice()
        .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
        .slice(0, 4);
      setRecentAlerts(sortedAlerts);
      setLiveFeed(txData.data || []);
      setSuspiciousAccounts(accountsData || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Unable to connect to fraud detection server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshTrigger]);

  // Real-time WebSocket subscriptions for Phase 7
  useEffect(() => {
    socketService.connect();

    // 1. On live transaction update
    const unbindTx = socketService.on('transaction:update', (data) => {
      if (data && data.transaction) {
        setLiveFeed((prev) => [data.transaction, ...prev.slice(0, 24)]);
        setLiveUpdateFlag(true);
        setTimeout(() => setLiveUpdateFlag(false), 800);
      }
    });

    // 2. On live fraud alert
    const unbindAlert = socketService.on('fraud:alert', (newAlert) => {
      setRecentAlerts((prev) => {
        // Prevent duplicate alerts in view
        const filtered = prev.filter((a) => a.transactionId !== newAlert.transactionId);
        return [newAlert, ...filtered.slice(0, 3)];
      });
    });

    // 3. On live analytics update
    const unbindAnalytics = socketService.on('analytics:update', (liveAnalytics) => {
      setAnalytics((prev) => ({
        ...prev,
        ...liveAnalytics
      }));
    });

    return () => {
      unbindTx();
      unbindAlert();
      unbindAnalytics();
    };
  }, []);

  if (loading && !analytics) {
    return <LoadingSpinner message="Loading fraud analytics and risk metrics..." />;
  }

  if (error && !analytics) {
    return <ErrorBanner message={error} onRetry={fetchDashboardData} />;
  }

  // Prepare Risk Distribution data for Recharts
  const riskDistributionData = [
    { name: 'LOW', count: analytics?.lowRisk || 0, color: '#10b981' },
    { name: 'MEDIUM', count: analytics?.mediumRisk || 0, color: '#eab308' },
    { name: 'HIGH', count: analytics?.highRisk || 0, color: '#f97316' },
    { name: 'CRITICAL', count: analytics?.criticalRisk || 0, color: '#ef4444' }
  ];

  // Group live transactions by risk score intervals for the area chart
  const scoreBuckets = [
    { range: '0-19', count: 0 },
    { range: '20-39', count: 0 },
    { range: '40-59', count: 0 },
    { range: '60-79', count: 0 },
    { range: '80-100', count: 0 }
  ];

  liveFeed.forEach((tx) => {
    const s = tx.riskScore || 0;
    if (s < 20) scoreBuckets[0].count++;
    else if (s < 40) scoreBuckets[1].count++;
    else if (s < 60) scoreBuckets[2].count++;
    else if (s < 80) scoreBuckets[3].count++;
    else scoreBuckets[4].count++;
  });

  return (
    <div className="page-container">
      {error && <ErrorBanner message={error} onRetry={fetchDashboardData} />}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Risk Overview</h1>
          <p className="page-description">
            Live telemetry stream from C++17 Rule Scorer and Graph Detection Engine
          </p>
        </div>
      </div>

      {/* 6 Summary Metric Cards (with live increment badges) */}
      <div className="stats-grid">
        <StatCard
          title="Total Transactions"
          value={formatNumber(analytics?.totalTransactions)}
          subtitle="Processed in engine telemetry"
          icon={CreditCard}
          color="#3b82f6"
        />
        <StatCard
          title="Suspicious Transactions"
          value={formatNumber(analytics?.suspiciousTransactions)}
          subtitle="Analyzed by sliding window & rules"
          icon={Activity}
          color="#f59e0b"
        />
        <StatCard
          title="Fraud Alerts Generated"
          value={formatNumber(analytics?.totalAlerts)}
          subtitle="Transactions with riskScore >= 30"
          icon={ShieldAlert}
          color="#8b5cf6"
        />
        <StatCard
          title="Critical Alerts"
          value={formatNumber(analytics?.criticalRisk)}
          subtitle="High-severity threats (Score >= 80)"
          icon={Flame}
          color="#ef4444"
          isHighRisk={Boolean(analytics?.criticalRisk && analytics.criticalRisk > 0)}
        />
        <StatCard
          title="Average Risk Score"
          value={analytics?.averageRiskScore !== undefined ? `${analytics.averageRiskScore}` : '—'}
          subtitle="Mean score across all accounts"
          icon={Activity}
          color="#06b6d4"
        />
        <StatCard
          title="Highest Risk Score"
          value={analytics?.highestRiskScore !== undefined ? `${analytics.highestRiskScore} / 100` : '—'}
          subtitle="Peak anomaly score recorded"
          icon={Award}
          color="#ec4899"
        />
      </div>

      {/* Live Transaction Feed (Step 9) */}
      <div className="dashboard-section" style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="live-pulse-badge">
              <Radio size={12} className="spin-animation" style={{ animationDuration: '2s' }} />
              LIVE STREAM
            </span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Live Transaction Stream
            </h2>
          </div>

          <Link to="/transactions" className="view-all-link">
            <span>View Full Ledger</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Transaction ID</th>
                  <th>Flow</th>
                  <th>Amount</th>
                  <th>Risk Tier</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {liveFeed.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      Waiting for incoming transactions... Click <strong>START MONITORING</strong> in the header to activate C++ stream.
                    </td>
                  </tr>
                ) : (
                  liveFeed.slice(0, 10).map((tx, idx) => {
                    const txRiskLevel = tx.riskLevel || getRiskLevel(tx.riskScore);
                    return (
                      <tr
                        key={tx.transactionId}
                        onClick={() => setSelectedTxId(tx.transactionId)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: idx === 0 && liveUpdateFlag ? 'rgba(59, 130, 246, 0.08)' : undefined,
                          transition: 'background-color 0.4s'
                        }}
                      >
                        <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                          {tx.timestamp ? new Date(tx.timestamp < 1e11 ? tx.timestamp * 1000 : tx.timestamp).toLocaleTimeString() : '—'}
                        </td>
                        <td className="mono-cell" style={{ fontWeight: 700, color: '#f8fafc' }}>
                          {tx.transactionId}
                        </td>
                        <td className="mono-cell" style={{ fontSize: '0.8rem' }}>
                          {tx.sender} → {tx.receiver}
                        </td>
                        <td className="mono-cell" style={{ fontWeight: 600, color: '#f8fafc' }}>
                          {formatCurrency(tx.amount)}
                        </td>
                        <td>
                          <RiskBadge level={txRiskLevel} />
                        </td>
                        <td className="mono-cell" style={{ fontWeight: 700 }}>
                          {tx.riskScore}
                        </td>
                        <td>
                          {tx.isFraud ? (
                            <span className="status-badge status-badge-fraud">FLAGGED</span>
                          ) : (
                            <span className="status-badge status-badge-safe">SAFE</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <ExternalLink size={14} color="#64748b" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid" style={{ marginTop: '16px' }}>
        {/* Risk Distribution Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h2 className="chart-title">Risk Severity Breakdown</h2>
              <span className="chart-subtitle">Direct counts by risk classification tier</span>
            </div>
          </div>
          <div className="chart-body" style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistributionData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transaction Risk Score Spectrum */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h2 className="chart-title">Risk Score Spectrum</h2>
              <span className="chart-subtitle">Active transactions grouped by risk score interval</span>
            </div>
          </div>
          <div className="chart-body" style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreBuckets} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#scoreGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Suspicious Accounts Leaderboard (Step 13) */}
      <div className="dashboard-section" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserX size={20} color="#f97316" />
              Top Suspicious Accounts Leaderboard
            </h2>
            <span style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
              Highest risk entities aggregated from historical alerts and circular fraud clusters
            </span>
          </div>

          <Link to="/history" className="view-all-link">
            <span>Audit in History</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {suspiciousAccounts.length === 0 ? (
          <div className="empty-state-box">
            No suspicious accounts identified yet. Run analysis to populate risk entities.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {suspiciousAccounts.map((acc, index) => {
              const riskLevel = getRiskLevel(acc.maxRiskScore);
              return (
                <div
                  key={acc.accountId}
                  className="table-card"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    borderLeft: `4px solid ${acc.maxRiskScore >= 80 ? '#ef4444' : acc.maxRiskScore >= 60 ? '#f97316' : '#eab308'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>#{index + 1}</span>
                      <span className="mono-cell" style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                        {acc.accountId}
                      </span>
                    </div>
                    <RiskBadge level={riskLevel} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                    <span style={{ color: '#94a3b8' }}>
                      Flagged Alerts: <strong style={{ color: '#f8fafc' }}>{acc.alertCount}</strong>
                    </span>
                    <span style={{ color: '#94a3b8' }}>
                      Max Score: <strong style={{ color: '#f8fafc' }}>{acc.maxRiskScore}/100</strong>
                    </span>
                  </div>

                  {acc.reasons && acc.reasons.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {acc.reasons.slice(0, 2).map((r, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: '#cbd5e1'
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                    <Link
                      to={`/history`}
                      style={{
                        fontSize: '0.78rem',
                        color: '#38bdf8',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Inspect Audit Trail <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Highest Priority Fraud Alerts */}
      <div className="dashboard-section" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Top Priority Fraud Alerts
            </h2>
            <span style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
              Highest risk transactions flagged by circular routing, rapid bursts, or high transfers
            </span>
          </div>

          <Link to="/alerts" className="view-all-link">
            <span>View All Alerts</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {recentAlerts.length === 0 ? (
          <div className="empty-state-box">
            No active fraud alerts detected.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {recentAlerts.map((alert) => (
              <AlertCard
                key={alert.transactionId}
                alert={alert}
                onSelect={(a) => setSelectedTxId(a.transactionId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drill-down modal */}
      {selectedTxId && (
        <TransactionDetailModal
          transactionId={selectedTxId}
          onClose={() => setSelectedTxId(null)}
        />
      )}
    </div>
  );
}
