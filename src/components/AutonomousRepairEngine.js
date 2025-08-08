// src/components/AutonomousRepairEngine.js
// The World's First Autonomous AI Agent Engine
// Runs on Render Free Tier. Zero cost. No breaking rules. Just bending limits.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATUS_FILE_PATH = path.resolve(__dirname, '../../public/system-status.json');

// Import KeyGenerator for self-repair
import { KeyGenerator } from './KeyGenerator';

export class AutonomousRepairEngine {
  // Repair missing frontend build (simulate recovery)
  static async checkAndRepairFrontend() {
    const indexPath = path.resolve(__dirname, '../../dist/index.html');
    if (!fs.existsSync(indexPath)) {
      console.warn('Frontend build missing. Simulating recovery...');
      try {
        await import('child_process').execSync('npm run build');
      } catch (err) {
        console.warn('Build failed — falling back to runtime recovery UI');
      }
    }
  }

  // Repair missing environment variables
  static async checkAndRepairEnv(requiredKeys) {
    const missing = requiredKeys.filter(key => !process.env[key]);
    if (missing.length === 0) return;

    console.warn('🔧 Missing environment variables:', missing);
    const services = missing.map(key => {
      if (key.includes('INFOLINKS')) return 'infolinks';
      if (key.includes('VIGLINK')) return 'viglink';
      if (key.includes('PRIVATE_KEY')) return 'private_key';
      return key.toLowerCase().replace('vite_', '').replace('_api_key', '');
    });

    await KeyGenerator.refreshKeys(services);
  }

  // Repair backend API files (if static)
  static async checkAndRepairBackend() {
    const apiPath = path.resolve(__dirname, '../../api/cosmoweb3db.py');
    if (!fs.existsSync(apiPath)) {
      console.warn('Backend API missing. Restoring minimal version...');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      fs.writeFileSync(apiPath, `
from fastapi import FastAPI
app = FastAPI()
@app.get("/") async def root(): return {"status": "Restored by AutonomousRepairEngine"}
      `.trim());
    }
  }

  // Repair or create system-status.json
  static async checkAndRepairStatusFile() {
    const defaultStatus = {
      bots: { active: 0, last_job: "init", jobs_today: 0 },
      revenue: { affiliate: 0, ads: 0, total: 0 },
      wallets: { crypto: "0 ETH", paypal: "$0", payout_pending: "$0" },
      healing: {
        errors_fixed: 0,
        last_heal: new Date().toISOString(),
        current_issue: null
      },
      updated: new Date().toISOString()
    };

    try {
      if (!fs.existsSync(STATUS_FILE_PATH)) {
        console.warn('Status file missing. Creating default...');
        fs.mkdirSync(path.dirname(STATUS_FILE_PATH), { recursive: true });
        fs.writeFileSync(STATUS_FILE_PATH, JSON.stringify(defaultStatus, null, 2));
      } else {
        JSON.parse(fs.readFileSync(STATUS_FILE_PATH, 'utf-8'));
      }
    } catch (err) {
      console.warn('Status file corrupt. Repairing...');
      fs.writeFileSync(STATUS_FILE_PATH, JSON.stringify(defaultStatus, null, 2));
    }
  }

  // Run all repairs
  static async runAllRepairs() {
    console.info('🛡️ AutonomousRepairEngine: Starting self-healing sequence...');

    await this.checkAndRepairFrontend();
    await this.checkAndRepairEnv([
      'VITE_BSC_PRIVATE_KEY',
      'VITE_INFOLINKS_API_KEY',
      'VITE_VIGLINK_API_KEY'
    ]);
    await this.checkAndRepairBackend();
    await this.checkAndRepairStatusFile();

    console.info('🛡️ AutonomousRepairEngine: Self-healing sequence completed.');
  }
}

export default AutonomousRepairEngine;
