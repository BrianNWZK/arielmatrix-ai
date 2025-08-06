import React, { useEffect, useState } from 'react';

// Zero-cost: GitHub raw URL for status file (no API keys needed)
const STATUS_URL = "https://raw.githubusercontent.com/BrianNWZK/arielmatrix-ai/main/public/system-status.json";

const Dashboard = () => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(STATUS_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("Status file not found or broken");
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        setError("Dashboard data unavailable or damaged. System is healing. Please wait…");
      }
    };
    fetchStatus();
  }, []);

  // Autonomous fallback UI if status file is missing/corrupt
  if (error) return (
    <div style={{ padding: 32 }}>
      <h2>{error}</h2>
      <p>
        If this persists, the system will automatically repair the dashboard file.<br />
        No manual action needed.
      </p>
    </div>
  );

  if (!status) return <div style={{ padding: 32 }}>Loading system status…</div>;

  return (
    <div style={{ padding: 32, fontFamily: "monospace" }}>
      <h1>🛡️ Autonomous System Dashboard</h1>
      <h2>🤖 Bot Activity</h2>
      <pre>{JSON.stringify(status.bots, null, 2)}</pre>
      <h2>💸 Revenue</h2>
      <pre>{JSON.stringify(status.revenue, null, 2)}</pre>
      <h2>👛 Wallets</h2>
      <pre>{JSON.stringify(status.wallets, null, 2)}</pre>
      <h2>🚑 Healing Events & Errors</h2>
      <pre>{JSON.stringify(status.healing, null, 2)}</pre>
      <h2>🕒 Last Update</h2>
      <pre>{status.updated || "Unknown"}</pre>
    </div>
  );
};

export default Dashboard;
