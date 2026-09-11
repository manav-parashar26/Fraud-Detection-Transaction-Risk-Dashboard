import React from 'react';
import { getRiskConfig } from '../utils/riskColors';

export default function RiskBadge({ level, score }) {
  const config = getRiskConfig(level);

  return (
    <span
      className="risk-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        backgroundColor: config.bgColor,
        color: config.textColor,
        border: `1px solid ${config.borderColor}`,
        userSelect: 'none'
      }}
      title={`Risk Tier: ${config.label}${score !== undefined ? ` (Score: ${score}/100)` : ''}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
      {score !== undefined && (
        <span style={{ opacity: 0.85, fontWeight: 500 }}>• {score}</span>
      )}
    </span>
  );
}
