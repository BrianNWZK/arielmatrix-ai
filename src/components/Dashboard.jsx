import React, { useState } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { KeyGenerator } from '../keyGenerator.js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const queryClient = new QueryClient();

const Dashboard = () => {
  const [trafficBotStatus, setTrafficBotStatus] = useState('stopped');
  const kg = new KeyGenerator();

  const { data: payouts } = useQuery({
    queryKey: ['payouts'],
    queryFn: async () => {
      const response = await axios.post('/api/cosmoweb3db', {
        action: 'find',
        collection: 'payouts',
        query: {},
      });
      return response.data.results;
    },
    refetchInterval: 60000,
  });

  const { data: bscTransactions } = useQuery({
    queryKey: ['bscTransactions'],
    queryFn: async () => {
      const response = await axios.get(
        `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=0x55d398326f99059ff775485246999027b3197955&address=0x04eC5979f05B76d334824841B8341AFdD78b2aFC&sort=desc&apikey=${process.env.VITE_BSCSCAN_API_KEY}`
      );
      return response.data.result.slice(0, 10);
    },
    refetchInterval: 60000,
  });

  const { data: trafficStats } = useQuery({
    queryKey: ['trafficStats'],
    queryFn: async () => {
      const response = await axios.post('/api/cosmoweb3db', {
        action: 'find',
        collection: 'traffic',
        query: {},
      });
      return response.data.results;
    },
    refetchInterval: 60000,
  });

  const toggleTrafficBot = async () => {
    try {
      const response = await axios.post('/api/trafficbot', {
        action: trafficBotStatus === 'running' ? 'stop' : 'start',
      });
      setTrafficBotStatus(response.data.status);
    } catch (error) {
      console.error('TrafficBot toggle error:', error);
    }
  };

  const refreshKeys = async () => {
    try {
      await kg.refreshKeys(['infolinks', 'viglink', 'adsense', 'bscscan', 'trustwallet', 'groq']);
    } catch (error) {
      console.error('Key refresh error:', error);
    }
  };

  const chartData = payouts?.map(p => ({
    time: new Date(p.timestamp).toLocaleTimeString(),
    amount: p.amount,
  })) || [];

  return (
    <div className="container mx-auto p-4 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-center">ArielMatrix Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Revenue (USDT)</h2>
          <LineChart width={500} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="amount" stroke="#8884d8" />
          </LineChart>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">BscScan Transactions</h2>
          <ul>
            {bscTransactions?.map(tx => (
              <li key={tx.hash} className="mb-2">
                <a href={`https://bscscan.com/tx/${tx.hash}`} target="_blank" className="text-blue-500">
                  {tx.hash.slice(0, 10)}... - {parseFloat(tx.value) / 1e18} USDT
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">TrafficBot Control</h2>
          <button
            onClick={toggleTrafficBot}
            className={`px-4 py-2 rounded ${trafficBotStatus === 'running' ? 'bg-red-500' : 'bg-green-500'} text-white`}
          >
            {trafficBotStatus === 'running' ? 'Stop TrafficBot' : 'Start TrafficBot'}
          </button>
          <div className="mt-4">
            <h3 className="font-semibold">Traffic Stats</h3>
            <p>Visitors: {trafficStats?.length || 0}</p>
            <p>Countries: {[...new Set(trafficStats?.map(t => t.country))].join(', ')}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Key Generation</h2>
          <button onClick={refreshKeys} className="px-4 py-2 bg-blue-500 text-white rounded">
            Refresh All Keys
          </button>
          <div className="mt-4">
            <h3 className="font-semibold">Credentials</h3>
            <p>Infolinks: {kg.credentials.infolinks.email || 'N/A'}</p>
            <p>VigLink: {kg.credentials.viglink.email || 'N/A'}</p>
            <p>AdSense: {kg.credentials.adsense.email || 'N/A'}</p>
            <p>BscScan: {kg.credentials.bscscan.email || 'N/A'}</p>
            <p>Trust Wallet: {kg.credentials.trustwallet.email || 'N/A'}</p>
            <p>Groq: {kg.credentials.groq.email || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Dashboard />
  </QueryClientProvider>
);

export default App;
