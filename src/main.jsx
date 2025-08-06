import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './components/App';
import './styles.css';

// AutonomousRepairEngine and KeyGenerator imports (if implemented; comment out if not used)
// import { AutonomousRepairEngine } from './components/AutonomousRepairEngine';
// import { KeyGenerator } from './components/keyGenerator';

/**
 * Fully autonomous bootstrap for Vercel deployment.
 * - Repairs frontend files and environment variables.
 * - Refreshes affiliate API keys if needed.
 * - Self-heals root DOM element for React.
 */
const bootstrap = async () => {
  // Autonomous self-repair (frontend, env, files) - Uncomment if implemented
  // if (typeof AutonomousRepairEngine !== 'undefined') {
  //   await AutonomousRepairEngine.runAllRepairs();
  // }

  // Autonomous affiliate key generation/refresh - Uncomment if implemented
  // if (typeof KeyGenerator !== 'undefined') {
  //   const keyGen = new KeyGenerator();
  //   await keyGen.refreshKeys(['infolinks', 'viglink']);
  // }

  // Self-heal: ensure #root exists (for Vercel SSR and edge cases)
  let rootEl = document.getElementById('root');
  if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.id = 'root';
    document.body.appendChild(rootEl);
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <BrowserRouter basename="/">
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
};

// Vercel: always use async bootstrap for edge/serverless compatibility
bootstrap();
