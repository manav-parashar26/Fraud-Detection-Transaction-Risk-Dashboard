import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...', inline = false }) {
  if (inline) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
        <Loader2 size={16} className="spin-animation" />
        <span style={{ fontSize: '0.875rem' }}>{message}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        color: '#94a3b8',
        gap: '16px'
      }}
      role="status"
      aria-live="polite"
    >
      <Loader2 size={36} color="#3b82f6" className="spin-animation" />
      <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#cbd5e1' }}>
        {message}
      </div>
    </div>
  );
}
