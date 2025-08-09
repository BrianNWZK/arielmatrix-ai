import React, { useEffect, useState, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios';

function App() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [walletStatus, setWalletStatus] = useState('Initializing...');
  const [revenue, setRevenue] = useState(0);

  const walletStatusClass = useMemo(() => {
    return revenue > 0 ? 'text-green-600' : 'text-red-600';
  }, [revenue]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.post('/api/cosmoweb3db', {
          action: 'find',
          collection: 'payouts',
          query: {}
        });

        const payouts = res.data.results || [];
        const total = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
        setRevenue(total);
        setStats(res.data);
        setError(null);
      } catch (err) {
        setError(`Failed to load real revenue: ${err.message}`);
        setWalletStatus('Offline');
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const checkWallet = async () => {
      const address = process.env.VITE_BSC_WALLET_ADDRESS || '0x04eC5979f05B76d334824841B8341AFdD78b2aFC';
      const apiKey = process.env.VITE_BSCSCAN_API_KEY;

      if (!apiKey) return;

      try {
        const res = await axios.get(
          `https://api.bscscan.com/api?module=account&action=balance&address=${address}&apikey=${apiKey}`
        );
        const balanceInBNB = parseFloat(res.data.result) / 1e18;
        const usdValue = balanceInBNB * 550;

        if (usdValue > 0.01) {
          setWalletStatus('Active');
          setRevenue(prev => prev + usdValue * 0.1);
        } else {
          setWalletStatus('No funds');
        }
      } catch (err) {
        console.error('Wallet check failed:', err.message);
      }
    };

    checkWallet();
    const interval = setInterval(checkWallet, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="container mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold text-gray-800">
          💸 ArielMatrix AI Revenue Dashboard
        </h1>
        <p className="text-sm text-gray-500">Real-time earnings from real affiliate traffic</p>
      </header>

      <section className="grid gap-4">
        <div>
          <strong>Wallet Status: </strong>
          <span className={walletStatusClass} role="status">{walletStatus}</span>
        </div>
        <div>
          <strong>Total Revenue: </strong>
          <span className="text-blue-700 font-medium">${revenue.toFixed(2)}</span>
        </div>
      </section>

      <Routes>
        <Route
          path="/"
          element={
            <section className="mt-6">
              <h2 className="text-2xl font-semibold mb-2">📊 Real Payouts</h2>
              {error ? (
                <div className="text-red-500">⚠ {error}</div>
              ) : stats ? (
                <pre className="bg-gray-100 p-4 rounded border border-gray-200 overflow-auto max-h-96">
                  {JSON.stringify(stats, null, 2)}
                </pre>
              ) : (
                <div className="text-gray-500 animate-pulse">Loading real payouts...</div>
              )}
            </section>
          }
        />
        <Route
          path="/deals"
          element={
            <iframe
              src="/deals.html"
              className="w-full h-[500px] border rounded-lg"
              title="Deals Page"
              loading="lazy"
            />
          }
        />
      </Routes>
    </main>
  );
}

export default App;
