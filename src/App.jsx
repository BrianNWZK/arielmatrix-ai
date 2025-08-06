import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RevenueEngine } from './RevenueEngine';

function App() {
  const [stats, setStats] = useState(null);
  const [walletStatus, setWalletStatus] = useState('Checking...');
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    fetch('/api/cosmoweb3db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stats' })
    })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));

    // Kick off revenue engine
    RevenueEngine.run(setWalletStatus, setRevenue);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">ArielMatrix AI Revenue Dashboard</h1>
      <div className="mb-4">
        <strong>Wallet Status:</strong> <span className={revenue > 0 ? "text-green-600" : "text-red-600"}>{walletStatus}</span>
      </div>
      <div className="mb-4">
        <strong>Total Revenue:</strong> <span className="text-blue-700">${revenue.toLocaleString()}</span>
      </div>
      <Routes>
        <Route
          path="/"
          element={
            <div>
              <h2 className="text-xl">Stats</h2>
              {stats ? (
                <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(stats, null, 2)}</pre>
              ) : (<p>Loading stats...</p>)}
            </div>
          }
        />
        <Route
          path="/deals"
          element={
            <iframe src="/deals.html" className="w-full h-96" title="Deals Page" />
          }
        />
      </Routes>
    </div>
  );
}
export default App;
