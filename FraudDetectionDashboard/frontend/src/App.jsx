import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Monitoring from './pages/Monitoring';
import Transactions from './pages/Transactions';
import Alerts from './pages/Alerts';
import Networks from './pages/Networks';
import History from './pages/History';
import LiveAlertToast from './components/LiveAlertToast';
import TransactionDetailModal from './components/TransactionDetailModal';
import './App.css';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [inspectedTxId, setInspectedTxId] = useState(null);

  const handleAnalysisComplete = () => {
    // Increment counter to signal all active pages to refresh their data
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="app-main-wrapper">
          <Header
            onAnalysisComplete={handleAnalysisComplete}
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          />

          <main className="app-content">
            <Routes>
              <Route path="/" element={<Dashboard refreshTrigger={refreshTrigger} />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route path="/transactions" element={<Transactions refreshTrigger={refreshTrigger} />} />
              <Route path="/alerts" element={<Alerts refreshTrigger={refreshTrigger} />} />
              <Route path="/networks" element={<Networks refreshTrigger={refreshTrigger} />} />
              <Route path="/history" element={<History refreshTrigger={refreshTrigger} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Global Real-Time Critical Alert Toast */}
        <LiveAlertToast onInspectTx={(txId) => setInspectedTxId(txId)} />

        {/* Modal opened from toast inspect action */}
        {inspectedTxId && (
          <TransactionDetailModal
            transactionId={inspectedTxId}
            onClose={() => setInspectedTxId(null)}
          />
        )}
      </div>
    </BrowserRouter>
  );
}
