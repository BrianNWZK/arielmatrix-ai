// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './components/App';
import Dashboard from './components/Dashboard';
import './styles.css';

// Ensure consistent module type
// Add `"type": "module"` to package.json to prevent CJS warnings

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

    // 🔁 Dynamically run autonomous repair if available
    try {
      const { default: AutonomousRepairEngine } = await import('./components/AutonomousRepairEngine');
      if (typeof AutonomousRepairEngine?.runAllRepairs === 'function') {
        await AutonomousRepairEngine.runAllRepairs();
        console.info('[RepairEngine] Autonomous repair sequence completed.');
      }
    } catch (err) {
      console.warn('[RepairEngine] Skipped: No AutonomousRepairEngine loaded.', err?.message || err);
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
