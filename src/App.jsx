import { useState, useEffect } from 'react';
import { OpportunityBot } from './components/OpportunityBot';
import { KeyGenerator } from './components/KeyGenerator';
import { RevenueTracker } from './components/RevenueTracker';
import { TrafficBot } from './components/TrafficBot';
import axios from 'axios';
import './styles.css';

const App = () => {
  const [evolutionStatus, setEvolutionStatus] = useState({
    revenueScaling: 1.0,
    learningRate: 1.0,
    innovations: 0,
    cycles: 0,
    totalRevenue: 0,
  });
  const [opportunities, setOpportunities] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [dbStats, setDbStats] = useState({ readLatency: 0, writeLatency: 0, ipfsPeers: 0 });
  const [errors, setErrors] = useState([]);
  const [trafficStats, setTrafficStats] = useState({ clicks: 0, conversions: 0 });

  const aggregator = {
    reports: [],
    report: (data) => {
      aggregator.reports.push(data);
      setOpportunities((prev) => [...prev, ...data.findings]);
    },
  };

  useEffect(() => {
    const storeConfigs = [
      { url: 'https://api.infolinks.com', siteType: 'infolinks' },
      { url: 'https://api.viglink.com', siteType: 'viglink' },
    ];

    const keyGenerator = new KeyGenerator();
    const revenueTracker = new RevenueTracker(aggregator);
    const trafficBot = new TrafficBot();

    const initializeCosmoWeb3DB = async () => {
      try {
        await axios.post('/api/cosmoweb3db', { action: 'initialize' });
        console.log('CosmoWeb3DB initialized');
      } catch (err) {
        setErrors((prev) => [...prev, { error: 'Failed to initialize CosmoWeb3DB: ' + err.message, timestamp: new Date().toISOString() }]);
      }
    };

    const fetchDbStats = async () => {
      try {
        const response = await axios.post('/api/cosmoweb3db', { action: 'stats' });
        setDbStats(response.data);
      } catch (err) {
        setErrors((prev) => [...prev, { error: 'Failed to fetch DB stats: ' + err.message, timestamp: new Date().toISOString() }]);
      }
    };

    const fetchPayouts = async () => {
      try {
        const response = await axios.post('/api/cosmoweb3db', {
          action: 'find',
          collection: 'payouts',
          query: {},
        });
        setPayouts(response.data.results);
      } catch (err) {
        setErrors((prev) => [...prev, { error: 'Failed to fetch payouts: ' + err.message, timestamp: new Date().toISOString() }]);
      }
    };

    const fetchTrafficStats = async () => {
      try {
        const response = await axios.post('/api/cosmoweb3db', {
          action: 'find',
          collection: 'traffic',
          query: {},
        });
        const stats = response.data.results.reduce(
          (acc, curr) => ({
            clicks: acc.clicks + (curr.clicks || 0),
            conversions: acc.conversions + (curr.conversions || 0),
          }),
          { clicks: 0, conversions: 0 }
        );
        setTrafficStats(stats);
      } catch (err) {
        setErrors((prev) => [...prev, { error: 'Failed to fetch traffic stats: ' + err.message, timestamp: new Date().toISOString() }]);
      }
    };

    const deployBots = async () => {
      try {
        await initializeCosmoWeb3DB();
        await keyGenerator.refreshKeys(['infolinks', 'viglink']);
        const bots = storeConfigs.map(
          ({ url, siteType }) => new OpportunityBot(url, aggregator, { siteType })
        );
        const results = await Promise.all(bots.map((bot) => bot.scan()));
        setOpportunities(results.flat());
        await revenueTracker.optimizeCampaigns(results.flat());
        await trafficBot.generateTraffic(results.flat());
        await fetchDbStats();
        await fetchPayouts();
        await fetchTrafficStats();
      } catch (err) {
        setErrors((prev) => [...prev, { error: 'Failed to deploy bots: ' + err.message, timestamp: new Date().toISOString() }]);
      }
    };

    const evolve = async () => {
      try {
        setEvolutionStatus((prev) => ({
          ...prev,
          revenueScaling: prev.revenueScaling * (1 + Math.random() * 0.15),
          learningRate: prev.learningRate * (1 + Math.random() * 0.1),
          innovations: prev.innovations + Math.floor(Math.random() * 5),
          cycles: prev.cycles + 1,
          totalRevenue: prev.totalRevenue + opportunities.reduce((sum, opp) => sum + opp.potential_value, 0),
        }));
      } catch (err) {
        setErrors((prev) => [...prev, { error: 'Evolution cycle failed: ' + err.message, timestamp: new Date().toISOString() }]);
      }
    };

    deployBots();
    const interval = setInterval(deployBots, 24 * 60 * 60 * 1000); // Run daily
    return () => clearInterval(interval);
  }, [opportunities]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">ArielMatrix AI Dashboard</h1>
      {errors.length > 0 && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          <h2 className="text-lg font-semibold">Errors</h2>
          {errors.map((err, index) => (
            <p key={index}>{err.error} at {new Date(err.timestamp).toLocaleString()}</p>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Evolution Status</h2>
          <p>Revenue Scaling: {evolutionStatus.revenueScaling.toFixed(2)}x</p>
          <p>Learning Rate: {evolutionStatus.learningRate.toFixed(2)}x</p>
          <p>Innovations: {evolutionStatus.innovations}</p>
          <p>Evolution Cycles: {evolutionStatus.cycles}</p>
          <p>Total Revenue: ${evolutionStatus.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Database Stats</h2>
          <p>Read Latency: {dbStats.readLatency.toFixed(2)} ms</p>
          <p>Write Latency: {dbStats.writeLatency.toFixed(2)} ms</p>
          <p>IPFS Peers: {dbStats.ipfsPeers}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Traffic Stats</h2>
          <p>Clicks: {trafficStats.clicks}</p>
          <p>Conversions: {trafficStats.conversions}</p>
          <p>Conversion Rate: {trafficStats.clicks > 0 ? ((trafficStats.conversions / trafficStats.clicks) * 100).toFixed(2) : 0}%</p>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">USDT Payouts</h2>
          {payouts.length === 0 && <p>No payouts yet.</p>}
          {payouts.map((payout, index) => (
            <div key={index} className="mb-2">
              <p>Amount: {payout.amount} USDT</p>
              <p>Gas Fee: {payout.gasFee} USD</p>
              <p>Wallets: {payout.wallets.join(', ')}</p>
              <p>Timestamp: {new Date(payout.timestamp).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="bg-gray-100 p-4 rounded col-span-2">
          <h2 className="text-xl font-semibold mb-2">Global Opportunities</h2>
          {opportunities.length === 0 && <p>No opportunities found yet.</p>}
          {opportunities.map((opp, index) => (
            <div key={index} className="mb-2 p-2 bg-white rounded">
              <p>Product: {opp.product_name}</p>
              <p>Price: ${opp.price}</p>
              <p>Commission: {opp.commission_rate}%</p>
              <p>Potential Value: ${opp.potential_value}</p>
              <p>Promotion: {opp.promotion}</p>
              <p>Country: {opp.country}</p>
              <a href={opp.affiliate_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                Buy Now
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
