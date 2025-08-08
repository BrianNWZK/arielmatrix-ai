// src/main.jsx
// 🚀 main.jsx v5: The Core of ArielMatrix AI
// - Self-healing
// - Real revenue generation
// - No fs, path, child_process — browser-safe
// - Fully compatible with Vite + Render

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles.css';

// ✅ Dynamically import components to avoid Vite resolve issues
const loadComponent = async (path) => {
  try {
    return await import(`./components/${path}`);
  } catch (err) {
    console.error(`Failed to load component: ${path}`, err.message);
    return null;
  }
};

(async () => {
  try {
    // ✅ Ensure #root exists
    let rootEl = document.getElementById('root');
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = 'root';
      document.body.appendChild(rootEl);
      console.warn('[Bootstrap] Created missing #root container.');
    }

    // 🔁 Run autonomous repair sequence
    try {
      const { AutonomousRepairEngine } = await loadComponent('AutonomousRepairEngine.js');
      if (AutonomousRepairEngine?.runAllRepairs) {
        await AutonomousRepairEngine.runAllRepairs();
        console.info('[RepairEngine] Autonomous repair sequence completed.');
      }
    } catch (err) {
      console.warn('[RepairEngine] Failed to run repairs:', err?.message || err);
    }

    // 💸 Initialize real revenue engine
    try {
      const { RevenueEngine } = await loadComponent('RevenueEngine.js');
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
        console.info('[RevenueEngine] Real revenue generation started.');
      }
    } catch (err) {
      console.error('[RevenueEngine] Failed to start:', err?.message || err);
    }

    // ✅ Render the app
    const App = (await loadComponent('App.jsx'))?.default;
    const Dashboard = (await loadComponent('Dashboard.jsx'))?.default;

    if (!App) {
      console.error('❌ App component failed to load');
    }

    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={App ? <App /> : <div>Loading App...</div>} />
            <Route path="/dashboard" element={Dashboard ? <Dashboard /> : <div>Loading Dashboard...</div>} />
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
