// src/components/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// ✅ Clean URL — no trailing spaces
const STATUS_URL = "https://raw.githubusercontent.com/BrianNWZK/arielmatrix-ai/main/public/system-status.json";

const Dashboard = () => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [trafficBotStatus, setTrafficBotStatus] = useState('running');
  const [payouts, setPayouts] = useState([]);
  const [trafficStats, setTrafficStats] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(STATUS_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("Status file not found or broken");
        const data = await res.json();
        setStatus(data);
        setError(null);
        setRetryCount(0);
      } catch (err) {
        setError(`Dashboard data unavailable: ${err.message}. Retrying (${retryCount + 1}/3)...`);
        if (retryCount < 3) {
          setTimeout(() => setRetryCount(retryCount + 1), 5000);
        } else {
          logErrorToOrchestrator(err.message);
        }
      }
    };
    fetchStatus();
  }, [retryCount]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [payoutRes, trafficRes] = await Promise.all([
          axios.post('/api/cosmoweb3db', { action: 'find', collection: 'payouts', query: {} }),
          axios.post('/api/cosmoweb3db', { action: 'find', collection: 'traffic', query: {} }),
        ]);
        setPayouts(payoutRes.data.results || []);
        setTrafficStats(trafficRes.data.results || []);
      } catch (err) {
        setError(`API error: ${err.message}. System is healing...`);
        logErrorToOrchestrator(err.message);
      }
    };
    const interval = setInterval(fetchData, 60000);
    fetchData();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkTrafficBot = async () => {
      try {
        const res = await axios.post('/api/trafficbot', { action: 'status' });
        setTrafficBotStatus(res.data.status || 'running');
      } catch (err) {
        setError(`TrafficBot status check failed: ${err.message}`);
        logErrorToOrchestrator(err.message);
      }
    };
    checkTrafficBot();
  }, []);

  const logErrorToOrchestrator = async (error) => {
    try {
      await axios.post('/api/orchestrator', {
        action: 'log_error',
        error: `Dashboard error: ${error}`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to log error to orchestrator:', err);
    }
  };

  const toggleTrafficBot = async () => {
    try {
      const action = trafficBotStatus === 'running' ? 'stop' : 'start';
      const res = await axios.post('/api/trafficbot', { action });
      setTrafficBotStatus(res.data.status);
    } catch (err) {
      setError(`TrafficBot control failed: ${err.message}`);
      logErrorToOrchestrator(err.message);
    }
  };

  const refreshKeys = async () => {
    try {
      await axios.post('/api/cosmoweb3db', {
        action: 'refresh_keys',
        services: ['infolinks', 'viglink', 'adsense', 'amazon', 'bscscan', 'trustwallet', 'groq'],
      });
      setError(null);
      alert('API keys refreshed successfully');
    } catch (err) {
      setError(`Key refresh failed: ${err.message}`);
      logErrorToOrchestrator(err.message);
    }
  };

  const chartData = payouts.map(p => ({
    time: new Date(p.timestamp).toLocaleTimeString(),
    amount: p.amount,
  }));

  const usdToNgn = (usd) => (usd * 1600).toFixed(2);

  if (error) {
    return (
      <div className="container mx-auto p-6 bg-red-100 min-h-screen">
        <h2 className="text-2xl font-bold text-red-600">{error}</h2>
        <p className="mt-2 text-gray-700">
          The system is autonomously repairing the issue. No manual action needed.
        </p>
      </div>
    );
  }

  if (!status) {
    return <div className="container mx-auto p-6 text-center">Loading system status...</div>;
  }

  return (
    <div className="container mx-auto p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">🛡️ ArielMatrix Autonomous Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">🤖 Bot Activity</h2>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(status.bots, null, 2)}
          </pre>
          <button
            onClick={toggleTrafficBot}
            className={`mt-4 px-4 py-2 rounded text-white ${
              trafficBotStatus === 'running' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {trafficBotStatus === 'running' ? 'Stop TrafficBot' : 'Start TrafficBot'}
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">💸 Revenue (USD/NGN)</h2>
          <p className="text-sm">Affiliate: ${status.revenue.affiliate} (₦{usdToNgn(status.revenue.affiliate)})</p>
          <p className="text-sm">Ads: ${status.revenue.ads} (₦{usdToNgn(status.revenue.ads)})</p>
          <p className="text-sm font-bold">Total: ${status.revenue.total} (₦{usdToNgn(status.revenue.total)})</p>
          <LineChart width={500} height={300} data={chartData} className="mt-4">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="amount" stroke="#8884d8" />
          </LineChart>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">👛 Wallets</h2>
          <p className="text-sm">Crypto: {status.wallets.crypto}</p>
          <p className="text-sm">PayPal: {status.wallets.paypal}</p>
          <p className="text-sm">Payout Pending: {status.wallets.payout_pending}</p>
          <a
            href="https://bscscan.com/address/0x04eC5979f05B76d334824841B8341AFdD78b2aFC"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            View BscScan Transactions
          </a>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">🚑 Healing Events & Errors</h2>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(status.healing, null, 2)}
          </pre>
          <button
            onClick={refreshKeys}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh API Keys
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">📊 Traffic Stats</h2>
          <p className="text-sm">Visitors: {trafficStats.length}</p>
          <p className="text-sm">Countries: {[...new Set(trafficStats.map(t => t.country))].join(', ')}</p>
          <p className="text-sm">Last Update: {status.updated}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
