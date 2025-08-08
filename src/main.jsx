// src/main.jsx
// 🚀 main.jsx v4: The Core of ArielMatrix AI
// - Self-healing
// - Real revenue generation
// - Bends system limits (Render, Vite, Python)
// - No breaking rules — just genius-level execution
// - Fully compatible with ESM, serverless, and browser

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './components/App';
import Dashboard from './components/Dashboard';
import './styles.css';

// 🛠 Import repair and revenue engines
import { AutonomousRepairEngine } from './components/AutonomousRepairEngine';
import { RevenueEngine } from './components/RevenueEngine';

(async () => {
  try {
    // ✅ Ensure #root exists (critical for SSR/Vercel/Render)
    let rootEl = document.getElementById('root');
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = 'root';
      document.body.appendChild(rootEl);
      console.warn('[Bootstrap] Created missing #root container.');
    }

    // 🔁 Run autonomous repair sequence
    try {
      if (typeof AutonomousRepairEngine?.runAllRepairs === 'function') {
        await AutonomousRepairEngine.runAllRepairs();
        console.info('[RepairEngine] Autonomous repair sequence completed.');
      }
    } catch (err) {
      console.warn('[RepairEngine] Failed to run repairs:', err?.message || err);
    }

    // 💸 Initialize real revenue engine
    try {
      const setWalletStatus = (status) => {
        const el = document.querySelector('[data-wallet-status]');
        if (el) el.textContent = status;
      };
      const setRevenue = (amount) => {
        const el = document.querySelector('[data-revenue]');
        if (el) el.textContent = `$${amount.toFixed(4)}`;
      };

      await RevenueEngine.run(setWalletStatus, setRevenue);
      console.info('[RevenueEngine] Real revenue generation started.');
    } catch (err) {
      console.error('[RevenueEngine] Failed to start:', err?.message || err);
    }

    // ✅ Render the app
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
