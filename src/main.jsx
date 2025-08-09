// src/main.jsx
// 🚀 ArielMatrix AI v10: Real Revenue Engine
// - No path errors
// - Real revenue generation
// - Fully compatible with Vite + Render

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './assets/index.css';
import App from './components/App.jsx';
import Dashboard from './components/Dashboard.jsx';

(async () => {
  try {
    let rootEl = document.getElementById('root');
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = 'root';
      document.body.appendChild(rootEl);
    }

    // 🔁 Run autonomous repair
    try {
      const { AutonomousRepairEngine } = await import('./components/AutonomousRepairEngine.js');
      if (AutonomousRepairEngine?.runAllRepairs) {
        await AutonomousRepairEngine.runAllRepairs();
      }
    } catch (err) {
      console.warn('[RepairEngine] Failed:', err?.message);
    }

    // 💸 Start revenue engine
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

    // ✅ Render app
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
