import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        color: '#f87171'
      }}
      role="alert"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <AlertTriangle size={22} color="#ef4444" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ display: 'block', fontSize: '0.9rem', color: '#fca5a5' }}>
            Connection Error
          </strong>
          <span style={{ fontSize: '0.85rem', color: '#f87171' }}>
            {message || 'Unable to connect to the fraud detection backend server. Please verify the Node.js API is running.'}
          </span>
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            flexShrink: 0
          }}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
