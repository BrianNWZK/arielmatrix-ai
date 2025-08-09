// src/components/RevenueTracker.js
import axios from 'axios';
import { Web3 } from 'web3';

export class RevenueTracker {
  constructor(aggregator) {
    this.aggregator = aggregator;
    this.web3 = new Web3('https://bsc-dataseed.binance.org');
    this.usdtContractAddress = '0x55d398326f99059ff775485246999027b3197955';
    this.bnbWallet = '0x00F7C9d119c71F0db1FA5602FC6DabB684923dB2';
    this.revenueWallets = [
      '0x1515a63013cc44c143c3d3cd1fcaeec180b7d076',
      '0xA708F155827C3e542871AE9f273fC7B92e16BBa9',
      '0x3f8d463512f100b62e5d1f543be170acaeac8114',
    ];
  }

  async connectToCosmoWeb3DB() {
    try {
      const res = await axios.post('/api/cosmoweb3db', { action: 'connect' });
      return res.data;
    } catch (err) {
      console.error('CosmoWeb3DB connection failed:', err.message);
      return null;
    }
  }

  async saveCampaign(campaign) {
    try {
      await axios.post('/api/cosmoweb3db', {
        action: 'insert',
        collection: 'campaigns',
        data: {
          ...campaign,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to save campaign:', error.message);
      await this.handleError('saveCampaign', error);
    }
  }

  async swapToBNB(amountUSD) {
    try {
      const privateKey = process.env.VITE_BSC_PRIVATE_KEY;
      if (!privateKey) throw new Error('Missing BSC private key!');

      const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      this.web3.eth.accounts.wallet.add(account);

      const bnbAmount = this.web3.utils.toWei((amountUSD * 0.1).toString(), 'ether');
      const tx = {
        from: account.address,
        to: this.bnbWallet,
        value: bnbAmount,
        gas: 200000,
        gasPrice: await this.web3.eth.getGasPrice()
      };

      const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log(`⛽ Swapped ${amountUSD * 0.1} USD worth of BNB for gas`);
      return receipt;
    } catch (error) {
      console.error('BNB swap error:', error.message);
      await this.handleError('swapToBNB', error);
    }
  }

  async optimizeGas() {
    try {
      const gasPrice = await this.web3.eth.getGasPrice();
      const optimized = this.web3.utils.toBN(gasPrice).mul(this.web3.utils.toBN(80)).div(this.web3.utils.toBN(100));
      return optimized.toString();
    } catch (error) {
      console.error('Gas optimization error:', error.message);
      return this.web3.utils.toWei('5', 'gwei');
    }
  }

  async fetchAffiliateRevenue() {
    let totalRevenue = 0;

    if (process.env.VITE_VIGLINK_API_KEY) {
      try {
        const res = await axios.get('https://api.viglink.com/v1/reports/earnings', {
          params: { key: process.env.VITE_VIGLINK_API_KEY, format: 'json' }
        });
        const earnings = res.data.reports?.reduce((sum, r) => sum + parseFloat(r.earnings || 0), 0) || 0;
        totalRevenue += earnings;
        console.log(`💰 VigLink Revenue: $${earnings}`);
      } catch (err) {
        console.error('VigLink fetch failed:', err.message);
      }
    }

    if (process.env.VITE_INFOLINKS_API_KEY && process.env.VITE_INFOLINKS_PUBLISHER_ID) {
      try {
        const res = await axios.get('https://api.infolinks.com/v1/stats', {
          params: { publisher_id: process.env.VITE_INFOLINKS_PUBLISHER_ID, period: 'today' },
          headers: { Authorization: `Bearer ${process.env.VITE_INFOLINKS_API_KEY}` }
        });
        const revenue = parseFloat(res.data.today?.earnings || 0);
        totalRevenue += revenue;
        console.log(`💰 Infolinks Revenue: $${revenue}`);
      } catch (err) {
        console.error('Infolinks fetch failed:', err.message);
      }
    }

    return totalRevenue;
  }

  async payoutRevenue() {
    try {
      const privateKey = process.env.VITE_BSC_PRIVATE_KEY;
      if (!privateKey) throw new Error('Missing BSC private key!');

      const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      this.web3.eth.accounts.wallet.add(account);

      const liveRevenue = await this.fetchAffiliateRevenue();
      if (liveRevenue <= 0) return;

      await this.swapToBNB(liveRevenue);

      const usdtContract = new this.web3.eth.Contract(
        [{ constant: false, inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'transfer', outputs: [{ name: '', type: 'bool' }], type: 'function' }],
        this.usdtContractAddress
      );

      const amountPerWallet = this.web3.utils.toWei((liveRevenue * 0.9 / this.revenueWallets.length).toFixed(18), 'ether');
      const gasPrice = await this.optimizeGas();

      for (const wallet of this.revenueWallets) {
        const nonce = await this.web3.eth.getTransactionCount(account.address);
        const tx = {
          from: account.address,
          to: this.usdtContractAddress,
          gas: 100000,
          gasPrice,
          nonce,
          data: usdtContract.methods.transfer(wallet, amountPerWallet).encodeABI()
        };

        const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log(`✅ USDT Payout to ${wallet}: Tx ${receipt.transactionHash}`);
      }

      await axios.post('/api/cosmoweb3db', {
        action: 'insert',
        collection: 'payouts',
        data: {
          amount: liveRevenue * 0.9,
          gasFee: liveRevenue * 0.1,
          wallets: this.revenueWallets,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`💸 Total Revenue: $${liveRevenue.toFixed(4)} | Payout Complete`);
    } catch (error) {
      console.error('USDT payout error:', error.message);
      await this.handleError('payoutRevenue', error);
    }
  }

  async optimizeCampaigns(opportunities) {
    try {
      const campaigns = opportunities
        .filter(opp => opp.trending && opp.potential_value > 5)
        .map(opp => ({
          product_name: opp.product_name,
          affiliate_link: opp.affiliate_link,
          commission_rate: opp.commission_rate,
          potential_value: opp.potential_value,
          promotion: opp.promotion,
          country: opp.country,
          clicks: opp.clicks || 0,
          conversions: opp.conversions || 0
        }));

      let totalRevenue = 0;
      for (const campaign of campaigns) {
        console.log(`🚀 Campaign: ${campaign.product_name} | Link: ${campaign.affiliate_link}`);
        await this.saveCampaign(campaign);
        totalRevenue += campaign.potential_value;
      }

      if (totalRevenue > 0) {
        await this.payoutRevenue();
      }

      const report = {
        site: 'campaign_optimizer',
        findings: campaigns,
        timestamp: new Date().toISOString()
      };
      this.aggregator.report(report);
    } catch (error) {
      console.error('Campaign optimization failed:', error.message);
      await this.handleError('optimizeCampaigns', error);
    }
  }

  async handleError(method, error) {
    try {
      await axios.post('/api/cosmoweb3db', {
        action: 'log_error',
        data: {
          method,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }
}

export default RevenueTracker;
