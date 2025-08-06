import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './components/App';
import Dashboard from './components/Dashboard';
import AutonomousRepairEngine from './components/AutonomousRepairEngine';
import './styles.css';

/**
 * Fully autonomous bootstrap for Vercel deployment.
 * - Repairs frontend files and environment variables.
 * - Refreshes affiliate API keys if needed.
 * - Self-heals root DOM element for React.
 * - Provides fallback and dashboard route.
 */
const bootstrap = async () => {
  // Self-heal: ensure #root exists (for Vercel SSR and edge cases)
  let rootEl = document.getElementById('root');
  if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.id = 'root';
    document.body.appendChild(rootEl);
  }

  // Autonomous self-repair (frontend, env, files)
  if (AutonomousRepairEngine?.runAllRepairs) {
    await AutonomousRepairEngine.runAllRepairs();
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
};

// Vercel: always use async bootstrap for edge/serverless compatibility
bootstrap();
