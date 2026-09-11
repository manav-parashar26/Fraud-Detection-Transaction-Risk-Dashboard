import React from 'react';
import RiskBadge from './RiskBadge';
import { formatCurrency, formatTimestamp } from '../utils/formatters';
import { getRiskConfig } from '../utils/riskColors';
import { AlertOctagon, User, ArrowRight, Clock, ShieldAlert } from 'lucide-react';

export default function AlertCard({ alert, onSelect }) {
  if (!alert) return null;

  const config = getRiskConfig(alert.riskLevel);
  const isCritical = alert.riskLevel === 'CRITICAL';

  return (
    <div
      onClick={() => onSelect && onSelect(alert)}
      style={{
        backgroundColor: '#1e293b',
        border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.4)' : '#334155'}`,
        borderLeft: `4px solid ${config.color}`,
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.2s ease',
        cursor: onSelect ? 'pointer' : 'default',
        boxShadow: isCritical ? '0 4px 14px rgba(239, 68, 68, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.15)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
            {alert.transactionId}
          </span>
          <RiskBadge level={alert.riskLevel} score={alert.riskScore} />
        </div>

        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', fontFamily: 'JetBrains Mono, monospace' }}>
          {formatCurrency(alert.amount)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.825rem', color: '#94a3b8', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <User size={14} color="#64748b" />
          <span>Account: <strong style={{ color: '#cbd5e1' }}>{alert.accountId || 'Unknown'}</strong></span>
        </div>

        {alert.timestamp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="#64748b" />
            <span>{formatTimestamp(alert.timestamp)}</span>
          </div>
        )}
      </div>

      {alert.reasons && alert.reasons.length > 0 && (
        <div style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '6px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
            <ShieldAlert size={12} color={config.color} />
            Flagged Risk Factors:
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
            {alert.reasons.map((reason, idx) => (
              <li key={idx} style={{ marginBottom: '2px' }}>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
