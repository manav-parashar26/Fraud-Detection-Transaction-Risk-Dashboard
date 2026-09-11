import React, { useState, useEffect, useRef } from 'react';
import { Radio, Play, Square, RefreshCw, Terminal, Activity, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import apiService from '../services/api';
import socketService from '../services/socket';
import RiskBadge from '../components/RiskBadge';
import { formatCurrency, formatTimestamp } from '../utils/formatters';

export default function Monitoring() {
  const [isRunning, setIsRunning] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [streamLog, setStreamLog] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tpm, setTpm] = useState(0);
  const recentTimestampsRef = useRef([]);

  // Fetch initial status
  useEffect(() => {
    let isMounted = true;
    const loadStatus = async () => {
      try {
        const status = await apiService.getMonitoringStatus();
        if (isMounted) {
          setIsRunning(Boolean(status.running));
          setUptime(status.uptime || 0);
        }
      } catch (err) {
        console.error('Failed to get monitoring status:', err);
      }
    };
    loadStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // Uptime tick timer
  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setUptime((prev) => prev + 1);

        // Calculate TPM (Transactions In Last 60s)
        const now = Date.now();
        recentTimestampsRef.current = recentTimestampsRef.current.filter((t) => now - t <= 60000);
        setTpm(recentTimestampsRef.current.length);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // WebSocket listeners
  useEffect(() => {
    socketService.connect();

    const unbindStatus = socketService.on('monitoring:status', (status) => {
      setIsRunning(Boolean(status && status.running));
      if (!status?.running) {
        setTpm(0);
      }
    });

    const unbindTx = socketService.on('transaction:update', (data) => {
      if (data && data.transaction) {
        recentTimestampsRef.current.push(Date.now());
        setStreamLog((prev) => [data, ...prev.slice(0, 40)]);
      }
    });

    const unbindAlert = socketService.on('fraud:alert', (alert) => {
      setRecentAlerts((prev) => [alert, ...prev.slice(0, 15)]);
    });

    return () => {
      unbindStatus();
      unbindTx();
      unbindAlert();
    };
  }, []);

  const handleStart = async () => {
    try {
      setLoading(true);
      const res = await apiService.startMonitoring();
      setIsRunning(Boolean(res.running));
    } catch (err) {
      alert(`Start failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setLoading(true);
      const res = await apiService.stopMonitoring();
      setIsRunning(Boolean(res.running));
    } catch (err) {
      alert(`Stop failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Real-Time Telemetry & Operations Console</h1>
          <p className="page-description">
            Direct monitoring control for the continuous C++ transaction simulator and event dispatcher
          </p>
        </div>
      </div>

      {/* Control Banner */}
      <div className="callout-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: isRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
              color: isRunning ? '#34d399' : '#94a3b8'
            }}
          >
            <Radio size={28} className={isRunning ? 'spin-animation' : ''} style={{ animationDuration: '3s' }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`status-pill ${isRunning ? 'status-monitoring-active' : 'status-monitoring-stopped'}`}>
                {isRunning ? '● STREAM ACTIVE' : '○ STREAM STOPPED'}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Uptime: <strong style={{ color: '#f8fafc' }}>{formatUptime(uptime)}</strong>
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Subprocess executes <code>fraud_engine.exe --stream</code> with real-time sliding window & graph cycle evaluations.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {isRunning ? (
            <button
              onClick={handleStop}
              disabled={loading}
              className="btn-monitoring btn-stop-monitoring"
              style={{ padding: '10px 20px', fontSize: '0.9rem' }}
            >
              <Square size={16} />
              <span>TERMINATE STREAM</span>
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading}
              className="btn-monitoring btn-start-monitoring"
              style={{ padding: '10px 20px', fontSize: '0.9rem' }}
            >
              <Play size={16} />
              <span>LAUNCH STREAM</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="filter-label">VELOCITY (TPM)</span>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace', marginTop: '6px' }}>
            {tpm} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>tx/min</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Rolling 60-second window</span>
        </div>

        <div className="stat-card">
          <span className="filter-label">TOTAL STREAMED</span>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace', marginTop: '6px' }}>
            {streamLog.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Transactions received in session</span>
        </div>

        <div className="stat-card">
          <span className="filter-label">LIVE ALERTS TRIGGERED</span>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444', fontFamily: 'JetBrains Mono, monospace', marginTop: '6px' }}>
            {recentAlerts.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Transactions with riskScore &ge; 30</span>
        </div>
      </div>

      {/* Dual Stream Panels */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        {/* Terminal Telemetry Stream */}
        <div className="chart-card">
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={18} color="#3b82f6" />
                Raw Telemetry Stream
              </h2>
              <span className="chart-subtitle">Direct line-by-line JSON payload emitted by C++</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
              Buffer: {streamLog.length} items
            </span>
          </div>

          <div
            style={{
              backgroundColor: '#090d16',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '12px',
              height: '420px',
              overflowY: 'auto',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {streamLog.length === 0 ? (
              <div style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>
                No events streamed yet. Start monitoring to activate.
              </div>
            ) : (
              streamLog.map((event, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    backgroundColor: event.transaction?.isFraud ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    borderLeft: `3px solid ${event.transaction?.isFraud ? '#ef4444' : '#10b981'}`
                  }}
                >
                  <span style={{ color: '#64748b' }}>[{new Date().toLocaleTimeString()}]</span>{' '}
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{event.transaction?.transactionId}</span>{' '}
                  <span style={{ color: '#94a3b8' }}>{event.transaction?.sender} → {event.transaction?.receiver}</span>{' '}
                  <span style={{ color: '#38bdf8' }}>{formatCurrency(event.transaction?.amount)}</span>{' '}
                  <span style={{ color: event.transaction?.riskScore >= 60 ? '#f87171' : '#34d399' }}>
                    Score: {event.transaction?.riskScore} ({event.transaction?.riskLevel})
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Incident Stream */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h2 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#ef4444" />
                Live Flagged Incidents
              </h2>
              <span className="chart-subtitle">Rule violations evaluated in real time</span>
            </div>
          </div>

          <div
            style={{
              height: '420px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {recentAlerts.length === 0 ? (
              <div style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>
                No flagged anomalies in current session.
              </div>
            ) : (
              recentAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#0f172a',
                    border: `1px solid ${alert.isCritical ? '#ef4444' : '#334155'}`,
                    borderLeft: `4px solid ${alert.isCritical ? '#ef4444' : '#f97316'}`,
                    borderRadius: '8px',
                    padding: '10px 14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#f8fafc' }}>
                      {alert.transactionId}
                    </span>
                    <RiskBadge level={alert.riskLevel} score={alert.riskScore} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                    {alert.sender} → {alert.receiver} • {formatCurrency(alert.amount)}
                  </div>
                  {alert.reasons && alert.reasons.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '4px' }}>
                      • {alert.reasons.join(', ')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
