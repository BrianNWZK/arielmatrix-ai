// api/repair.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import KeyGenerator
import { KeyGenerator } from '../src/components/KeyGenerator.js';

export default async function handler(req, res) {
  try {
    console.log('🔧 Running AutonomousRepairEngine...');

    await KeyGenerator.refreshKeys([
      'infolinks',
      'viglink',
      'private_key'
    ]);

    res.status(200).json({
      success: true,
      message: 'Autonomous repair completed',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
