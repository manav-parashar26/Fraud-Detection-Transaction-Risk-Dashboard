import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, ShieldCheck, MapPin, Smartphone, Clock, ArrowRight, User } from 'lucide-react';
import RiskBadge from './RiskBadge';
import { formatCurrency, formatTimestamp } from '../utils/formatters';
import { getRiskConfig } from '../utils/riskColors';
import apiService from '../services/api';

export default function TransactionDetailModal({ transactionId, onClose }) {
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchDetails() {
      if (!transactionId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getTransactionById(transactionId);
        if (isMounted) setTx(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load transaction details');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDetails();

    // Close on Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [transactionId, onClose]);

  if (!transactionId) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #334155',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-tx-title"
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0f172a'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Transaction Inspection
            </span>
            <h2 id="modal-tx-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}>
              {transactionId}
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
              Loading transaction details...
            </div>
          ) : error ? (
            <div style={{ padding: '20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '8px', fontSize: '0.875rem' }}>
              {error}
            </div>
          ) : tx ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Amount & Status Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: '#0f172a',
                  borderRadius: '10px',
                  border: '1px solid #334155'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Amount</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatCurrency(tx.amount)}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Status</span>
                  {tx.isFraud ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#f87171', fontWeight: 600, fontSize: '0.85rem' }}>
                      <ShieldAlert size={16} /> FLAGGED
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#34d399', fontWeight: 600, fontSize: '0.85rem' }}>
                      <ShieldCheck size={16} /> SAFE
                    </span>
                  )}
                </div>
              </div>

              {/* Transfer Flow */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px',
                  backgroundColor: '#0f172a',
                  borderRadius: '10px',
                  border: '1px solid #334155'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} /> Sender
                  </span>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#f1f5f9', fontSize: '0.95rem', marginTop: '2px' }}>
                    {tx.sender}
                  </div>
                </div>

                <div style={{ color: '#64748b', display: 'flex', justifyContent: 'center' }}>
                  <ArrowRight size={18} />
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                    <User size={12} /> Receiver
                  </span>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#f1f5f9', fontSize: '0.95rem', marginTop: '2px' }}>
                    {tx.receiver}
                  </div>
                </div>
              </div>

              {/* Risk Assessment Score Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>
                    Risk Assessment Score
                  </span>
                  <RiskBadge level={tx.riskLevel || (tx.riskScore >= 80 ? 'CRITICAL' : tx.riskScore >= 60 ? 'HIGH' : tx.riskScore >= 30 ? 'MEDIUM' : 'LOW')} score={tx.riskScore} />
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '8px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, tx.riskScore || 0))}%`,
                      backgroundColor: getRiskConfig(tx.riskLevel || (tx.riskScore >= 80 ? 'CRITICAL' : tx.riskScore >= 60 ? 'HIGH' : tx.riskScore >= 30 ? 'MEDIUM' : 'LOW')).color,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>

              {/* Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> Location
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0', marginTop: '2px', display: 'block' }}>
                    {tx.location || 'Unknown'}
                  </span>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Smartphone size={12} /> Device ID
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0', marginTop: '2px', display: 'block', fontFamily: 'JetBrains Mono, monospace' }}>
                    {tx.deviceId || 'Unknown'}
                  </span>
                </div>

                <div style={{ gridColumn: 'span 2', padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Timestamp
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0', marginTop: '2px', display: 'block' }}>
                    {formatTimestamp(tx.timestamp)}
                  </span>
                </div>
              </div>

              {/* Fraud Reasons if present */}
              {tx.reasons && tx.reasons.length > 0 && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#fca5a5', marginBottom: '6px' }}>
                    <ShieldAlert size={14} /> Triggered Fraud Rules
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#fca5a5', lineHeight: '1.4' }}>
                    {tx.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
