import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, ArrowRight } from 'lucide-react';
import socketService from '../services/socket';
import { formatCurrency } from '../utils/formatters';

export default function LiveAlertToast({ onInspectTx }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleFraudAlert = (alert) => {
      // Create new toast notification
      const id = `${alert.transactionId}-${Date.now()}`;
      const newToast = {
        id,
        transactionId: alert.transactionId,
        sender: alert.sender,
        receiver: alert.receiver,
        amount: alert.amount,
        riskScore: alert.riskScore,
        riskLevel: alert.riskLevel,
        reasons: alert.reasons || [],
        isCritical: alert.isCritical
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 3)]);

      // Auto-dismiss after 6 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    };

    const cleanup = socketService.on('fraud:alert', handleFraudAlert);
    return cleanup;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 9999,
        maxWidth: '380px',
        width: '100%',
        pointerEvents: 'none'
      }}
      role="region"
      aria-live="assertive"
      aria-label="Real-time fraud notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            backgroundColor: '#1e293b',
            border: `1px solid ${toast.isCritical ? '#ef4444' : '#f97316'}`,
            borderLeft: `5px solid ${toast.isCritical ? '#ef4444' : '#f97316'}`,
            borderRadius: '10px',
            padding: '14px 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(239, 68, 68, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color={toast.isCritical ? '#ef4444' : '#f97316'} />
              <strong style={{ fontSize: '0.85rem', color: toast.isCritical ? '#f87171' : '#fb923c', letterSpacing: '0.04em' }}>
                {toast.isCritical ? '🚨 CRITICAL FRAUD DETECTED' : '⚠️ HIGH RISK ANOMALY'}
              </strong>
            </div>

            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px'
              }}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
              {toast.transactionId}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: '0.85rem', color: '#cbd5e1' }}>
              {formatCurrency(toast.amount)}
            </span>
          </div>

          <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>
            {toast.sender} <ArrowRight size={11} style={{ display: 'inline', margin: '0 2px' }} /> {toast.receiver} • Score: <strong style={{ color: '#f8fafc' }}>{toast.riskScore}</strong>
          </div>

          {toast.reasons.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#fca5a5', lineHeight: '1.3' }}>
              • {toast.reasons[0]}
            </div>
          )}

          {onInspectTx && (
            <button
              onClick={() => onInspectTx(toast.transactionId)}
              style={{
                marginTop: '4px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid #334155',
                color: '#e2e8f0',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Inspect Transaction Details
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
