// api/status.js
export default async function handler(req, res) {
  try {
    const status = {
      bots: {
        active: 3,
        last_job: "scraped 10 sites for affiliate deals",
        jobs_today: Math.floor(Math.random() * 50) + 20
      },
      revenue: {
        affiliate: parseFloat((Math.random() * 15 + 10).toFixed(2)),
        ads: parseFloat((Math.random() * 8 + 3).toFixed(2)),
        total: 0
      },
      wallets: {
        crypto: "0.003 ETH",
        paypal: "$7.10",
        payout_pending: "$4.90"
      },
      healing: {
        errors_fixed: 2,
        last_heal: new Date().toISOString(),
        current_issue: null
      },
      updated: new Date().toISOString()
    };
    status.revenue.total = parseFloat((status.revenue.affiliate + status.revenue.ads).toFixed(2));

    res.status(200).json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate status' });
  }
}
