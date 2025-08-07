import { useEffect, useState, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RevenueEngine } from './RevenueEngine';

function App() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [walletStatus, setWalletStatus] = useState('Checking...');
  const [revenue, setRevenue] = useState(0);

  // Determine status color class once
  const walletStatusClass = useMemo(() => {
    return revenue > 0 ? 'text-green-600' : 'text-red-600';
  }, [revenue]);

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/cosmoweb3db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stats' })
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Stats fetch failed:', err);
        setStatsError('Failed to load stats.');
      }
    };
    fetchStats();
  }, []);

  // Kick off revenue engine only once
  useEffect(() => {
    RevenueEngine.run(setWalletStatus, setRevenue);
  }, []);

  return (
    <main className="container mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold text-gray-800">
          ArielMatrix AI Revenue Dashboard
        </h1>
        <p className="text-sm text-gray-500">Real-time analytics & earnings</p>
      </header>

      <section className="grid gap-4">
        <div>
          <strong>Wallet Status: </strong>
          <span className={walletStatusClass} role="status">{walletStatus}</span>
        </div>
        <div>
          <strong>Total Revenue: </strong>
          <span className="text-blue-700 font-medium">${revenue.toLocaleString()}</span>
        </div>
      </section>

      <Routes>
        <Route
          path="/"
          element={
            <section className="mt-6">
              <h2 className="text-2xl font-semibold mb-2">📊 Stats</h2>
              {statsError ? (
                <div className="text-red-500">⚠ {statsError}</div>
              ) : stats ? (
                <pre className="bg-gray-100 p-4 rounded border border-gray-200 overflow-auto max-h-96">
                  {JSON.stringify(stats, null, 2)}
                </pre>
              ) : (
                <div className="text-gray-500 animate-pulse">Loading stats...</div>
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
