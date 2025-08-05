import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';

function App() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/cosmoweb3db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stats' })
    })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ArielMatrix AI Dashboard</h1>
      <Routes>
        <Route
          path="/"
          element={
            <div>
              <h2 className="text-xl">Stats</h2>
              {stats ? (
                <pre className="bg-gray-100 p-4 rounded">
                  {JSON.stringify(stats, null, 2)}
                </pre>
              ) : (
                <p>Loading stats...</p>
              )}
            </div>
          }
        />
        <Route
          path="/deals"
          element={
            <div>
              <h2 className="text-xl">Deals</h2>
              <iframe src="/deals.html" className="w-full h-96" title="Deals Page" />
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
