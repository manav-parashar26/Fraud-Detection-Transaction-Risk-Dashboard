import React, { useEffect, useState, useCallback } from 'react';
import { Network, AlertCircle, CheckCircle2, ShieldAlert, ArrowRight, Info, Users, Repeat } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import NetworkGraph from '../components/NetworkGraph';
import apiService from '../services/api';

export default function Networks({ refreshTrigger }) {
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNetworks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getNetworks();
      setNetworks(res.networks || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve fraud network clusters from engine.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetworks();
  }, [fetchNetworks, refreshTrigger]);

  const totalCycles = networks.filter((n) => n.cycleDetected).length;

  return (
    <div className="page-container">
      {error && <ErrorBanner message={error} onRetry={fetchNetworks} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Graph-Based Fraud Network Analysis</h1>
          <p className="page-description">
            Visual topological analysis of connected money-muling rings computed via C++ DFS Cycle Detection & DSU
          </p>
        </div>
      </div>

      {/* Network Summary Callout */}
      <div className="callout-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Network size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>
              Algorithmic Graph Intelligence (C++17 Engine)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.4' }}>
              Networks are discovered using <strong>Disjoint Set Union (DSU)</strong> with path compression for connected components, and <strong>3-Color DFS Traversal</strong> to identify circular routing structures ($O(V + E)$).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #334155' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Detected Clusters</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9', fontFamily: 'JetBrains Mono, monospace' }}>
              {networks.length}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Circular Rings</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: totalCycles > 0 ? '#f87171' : '#34d399', fontFamily: 'JetBrains Mono, monospace' }}>
              {totalCycles}
            </div>
          </div>
        </div>
      </div>

      {/* Networks Grid */}
      {loading ? (
        <LoadingSpinner message="Evaluating graph topology and connected components..." />
      ) : networks.length === 0 ? (
        <div className="empty-state-box">
          No suspicious fraud networks detected.
        </div>
      ) : (
        <div className="networks-grid">
          {networks.map((net) => {
            const hasCycle = net.cycleDetected;

            return (
              <div
                key={net.id}
                className={`network-card ${hasCycle ? 'network-card-danger' : ''}`}
              >
                {/* Network Card Header */}
                <div className="network-card-header">
                  <div>
                    <span className="network-id-label">CLUSTER #{net.id}</span>
                    <h2 className="network-title">
                      {hasCycle ? 'Circular Money-Muling Ring' : 'Connected Flow Network'}
                    </h2>
                  </div>

                  {hasCycle ? (
                    <span className="cycle-badge cycle-badge-danger">
                      <Repeat size={13} /> CYCLE DETECTED: YES
                    </span>
                  ) : (
                    <span className="cycle-badge cycle-badge-neutral">
                      <CheckCircle2 size={13} /> CYCLE DETECTED: NO
                    </span>
                  )}
                </div>

                {/* Graph Visualization */}
                <div className="network-graph-container">
                  <NetworkGraph network={net} />
                </div>

                {/* Network Statistics */}
                <div className="network-meta-grid">
                  <div className="network-meta-item">
                    <span className="meta-label">
                      <Users size={12} /> Member Accounts
                    </span>
                    <span className="meta-value">
                      {(net.accounts || []).length}
                    </span>
                  </div>

                  <div className="network-meta-item">
                    <span className="meta-label">
                      <ShieldAlert size={12} /> Suspicious Trans.
                    </span>
                    <span className="meta-value" style={{ color: hasCycle ? '#f87171' : '#f59e0b' }}>
                      {net.suspiciousTransactions || 0}
                    </span>
                  </div>
                </div>

                {/* Account Ring Flow Path */}
                <div className="network-accounts-box">
                  <span className="meta-label" style={{ marginBottom: '8px', display: 'block' }}>
                    Entity Chain Path:
                  </span>
                  <div className="account-chips-wrapper">
                    {(net.accounts || []).map((acc, idx) => (
                      <React.Fragment key={acc}>
                        <span className={`account-chip ${hasCycle ? 'account-chip-highlight' : ''}`}>
                          {acc}
                        </span>
                        {idx < net.accounts.length - 1 && (
                          <ArrowRight size={13} color="#64748b" style={{ flexShrink: 0 }} />
                        )}
                      </React.Fragment>
                    ))}
                    {hasCycle && (
                      <>
                        <ArrowRight size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                        <span className="account-chip account-chip-cycle-return">
                          {net.accounts[0]} (Loop)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Risk Indicators */}
                {net.riskIndicators && net.riskIndicators.length > 0 && (
                  <div className="network-indicators-box">
                    <span className="meta-label" style={{ marginBottom: '6px', display: 'block' }}>
                      Network Risk Indicators:
                    </span>
                    <ul className="network-indicators-list">
                      {net.riskIndicators.map((ind, i) => (
                        <li key={i}>{ind}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
