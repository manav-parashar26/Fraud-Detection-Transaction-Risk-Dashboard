import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, ShieldAlert, Network, Shield, X, Radio, Database } from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/monitoring', label: 'Live Operations', icon: Radio },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/alerts', label: 'Fraud Alerts', icon: ShieldAlert },
    { to: '/networks', label: 'Fraud Networks', icon: Network },
    { to: '/history', label: 'History Archive', icon: Database }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">
            <Shield size={22} color="#3b82f6" />
          </div>
          <div className="brand-text">
            <span className="brand-name">RISK SENTINEL</span>
            <span className="brand-badge">CORE C++17</span>
          </div>

          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-title">MONITORING</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''}`
                }
                onClick={() => onClose && onClose()}
              >
                <Icon size={18} className="nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="tech-spec-box">
            <div className="tech-spec-title">ENGINE ARCHITECTURE</div>
            <div className="tech-spec-item">• Graph BFS / DFS / Cycle</div>
            <div className="tech-spec-item">• Disjoint Set Union (DSU)</div>
            <div className="tech-spec-item">• Sliding Window (60s Burst)</div>
            <div className="tech-spec-item">• Rule-Based Multi-tier Scorer</div>
          </div>
        </div>
      </aside>
    </>
  );
}
