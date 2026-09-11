import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Play, Square, Check, Clock, RefreshCw, Menu, Radio, Activity } from 'lucide-react';
import apiService from '../services/api';
import socketService from '../services/socket';

export default function Header({ onAnalysisComplete, onToggleSidebar }) {
  const [engineOnline, setEngineOnline] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Check HTTP health and monitoring status periodically
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const health = await apiService.getHealth();
        if (isMounted) {
          setEngineOnline(health && health.status === 'OK');
          if (health.monitoring) {
            setIsMonitoring(Boolean(health.monitoring.running));
          }
        }
      } catch (err) {
        if (isMounted) {
          setEngineOnline(false);
          setIsMonitoring(false);
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 2. Connect to WebSocket and subscribe to monitoring events
  useEffect(() => {
    socketService.connect();

    const cleanupWs = socketService.onConnectionChange((connected) => {
      setWsConnected(connected);
    });

    const cleanupMonitoring = socketService.on('monitoring:status', (status) => {
      setIsMonitoring(Boolean(status && status.running));
    });

    return () => {
      cleanupWs();
      cleanupMonitoring();
    };
  }, []);

  // Handle Start / Stop continuous stream monitoring
  const handleToggleMonitoring = async () => {
    if (monitoringLoading) return;
    try {
      setMonitoringLoading(true);
      if (isMonitoring) {
        const res = await apiService.stopMonitoring();
        setIsMonitoring(Boolean(res.running));
      } else {
        const res = await apiService.startMonitoring();
        setIsMonitoring(Boolean(res.running));
      }
    } catch (err) {
      alert(`Monitoring toggle failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setMonitoringLoading(false);
    }
  };

  // Handle Batch C++ Analysis
  const handleRunAnalysis = async () => {
    if (analyzing) return;
    try {
      setAnalyzing(true);
      setSuccessMsg('');
      const res = await apiService.runAnalysis();
      setLastAnalyzed(new Date());
      setSuccessMsg('Analysis completed');
      setEngineOnline(true);
      if (onAnalysisComplete) {
        onAnalysisComplete(res);
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(`Analysis failed: ${err.message || 'Engine unreachable'}`);
      setEngineOnline(false);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
        <div className="header-title-container">
          <h1 className="header-title">
            Fraud Detection & Risk Engine
          </h1>
          <span className="header-subtitle">
            C++17 Algorithmic Core • Real-time Transaction Analysis
          </span>
        </div>
      </div>

      <div className="header-right">
        {/* Backend API Status (Step 13) */}
        <div
          className={`status-pill ${engineOnline ? 'status-online' : 'status-offline'}`}
          title={engineOnline ? 'REST API is connected' : 'REST API is unreachable'}
        >
          <span className="status-dot" />
          <span>Backend: {engineOnline ? 'Connected' : 'Disconnected'}</span>
        </div>

        {/* WebSocket Connection Status (Step 13) */}
        <div
          className={`status-pill ${wsConnected ? 'status-ws-live' : 'status-offline'}`}
          title={wsConnected ? 'WebSocket connection active' : 'WebSocket disconnected'}
        >
          <span className="status-dot" />
          <span>WebSocket: {wsConnected ? 'Live' : 'Disconnected'}</span>
        </div>

        {/* Monitoring State Badge (Step 12) */}
        <div
          className={`status-pill ${isMonitoring ? 'status-monitoring-active' : 'status-monitoring-stopped'}`}
          title="Continuous C++ transaction streaming state"
        >
          <Radio size={13} className={isMonitoring ? 'pulse-icon' : ''} />
          <span>{isMonitoring ? 'Monitoring Active' : 'Monitoring Stopped'}</span>
        </div>

        {/* Start / Stop Monitoring Control (Step 12) */}
        <button
          onClick={handleToggleMonitoring}
          disabled={monitoringLoading || !engineOnline}
          className={`btn-monitoring ${isMonitoring ? 'btn-stop-monitoring' : 'btn-start-monitoring'}`}
          title={isMonitoring ? 'Stop continuous C++ transaction stream' : 'Launch continuous C++ transaction stream'}
        >
          {monitoringLoading ? (
            <>
              <RefreshCw size={14} className="spin-animation" />
              <span>Updating...</span>
            </>
          ) : isMonitoring ? (
            <>
              <Square size={14} />
              <span>STOP MONITORING</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>START MONITORING</span>
            </>
          )}
        </button>

        {/* Batch Run Fraud Analysis Button */}
        <button
          onClick={handleRunAnalysis}
          disabled={analyzing || !engineOnline}
          className={`btn-primary ${analyzing ? 'btn-loading' : ''}`}
          title="Run batch analysis on 1,000 transactions"
        >
          {analyzing ? (
            <>
              <RefreshCw size={14} className="spin-animation" />
              <span>Analyzing...</span>
            </>
          ) : successMsg ? (
            <>
              <Check size={14} color="#34d399" />
              <span>Done</span>
            </>
          ) : (
            <>
              <Activity size={14} />
              <span>Batch Run</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
