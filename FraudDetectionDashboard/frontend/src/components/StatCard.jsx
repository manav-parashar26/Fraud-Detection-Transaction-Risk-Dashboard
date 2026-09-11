import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = '#3b82f6', isHighRisk = false }) {
  return (
    <div
      className={`stat-card ${isHighRisk ? 'stat-card-danger' : ''}`}
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '20px',
        border: `1px solid ${isHighRisk ? 'rgba(239, 68, 68, 0.4)' : '#334155'}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.2s ease',
        boxShadow: isHighRisk ? '0 4px 14px rgba(239, 68, 68, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.2)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: `${color}20`,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon size={20} />
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}>
          {value !== undefined && value !== null ? value : '—'}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
