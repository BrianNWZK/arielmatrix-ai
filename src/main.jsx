// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles.css';

// ✅ Fix import paths
import App from './components/App';
import Dashboard from './components/Dashboard';

(async () => {
  try {
    let rootEl = document.getElementById('root');
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = 'root';
      document.body.appendChild(rootEl);
    }

    try {
      const { AutonomousRepairEngine } = await import('./components/AutonomousRepairEngine.js');
      if (AutonomousRepairEngine?.runAllRepairs) {
        await AutonomousRepairEngine.runAllRepairs();
      }
    } catch (err) {
      console.warn('[RepairEngine] Failed:', err?.message);
    }

    try {
      const { RevenueEngine } = await import('./components/RevenueEngine.js');
      const setWalletStatus = (status) => {
        const el = document.querySelector('[data-wallet-status]');
        if (el) el.textContent = status;
      };
      const setRevenue = (amount) => {
        const el = document.querySelector('[data-revenue]');
        if (el) el.textContent = `$${amount.toFixed(4)}`;
      };

      if (RevenueEngine?.run) {
        await RevenueEngine.run(setWalletStatus, setRevenue);
      }
    } catch (err) {
      console.error('[RevenueEngine] Failed:', err?.message);
    }

    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </React.StrictMode>
    );
  } catch (fatal) {
    console.error('[Fatal Bootstrap Error]', fatal);
    document.body.innerHTML = `
      <pre style="color:red;padding:2rem;font-family:monospace;">
🚨 ArielMatrix AI failed to initialize.
Check console for diagnostics.
${fatal?.message || 'Unknown error'}
      </pre>`;
  }
})();
