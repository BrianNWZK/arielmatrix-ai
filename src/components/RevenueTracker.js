import axios from 'axios';
import Web3 from 'web3';

export class RevenueTracker {
  constructor(aggregator) {
    this.aggregator = aggregator;
    this.web3 = new Web3('https://bsc-dataseed.binance.org/');
    this.usdtContractAddress = '0x55d398326f99059fF775485246999027B3197955'; // USDT on BSC
    this.bnbWallet = '0x00F7C9d119c71F0db1FA5602FC6DabB684923dB2'; // Your BNB wallet
    this.revenueWallets = [
      '0x1515a63013cc44c143c3d3cd1fcaeec180b7d076',
      '0xA708F155827C3e542871AE9f273fC7B92e16BBa9',
      '0x3f8d463512f100b62e5d1f543be170acaeac8114',
    ];
    this.pancakeSwapRouter = '0x10ED43C718714eb63d5aA57B78B54704E256024E'; // PancakeSwap Router
  }

  async connectToCosmoWeb3DB() {
    return axios.post('/api/cosmoweb3db', { action: 'connect' });
  }

  async saveCampaign(campaign) {
    try {
      await axios.post('/api/cosmoweb3db', {
        action: 'insert',
        collection: 'campaigns',
        data: {
          ...campaign,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to save campaign to CosmoWeb3DB:', error);
      await this.handleError('saveCampaign', error);
    }
  }

  async swapToBNB(amountUSD) {
    try {
      const privateKey = process.env.VITE_BSC_PRIVATE_KEY;
      const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      this.web3.eth.accounts.wallet.add(account);

      const pancakeSwap = new this.web3.eth.Contract(
        [
          {
            constant: false,
            inputs: [
              { name: 'amountOutMin', type: 'uint256' },
              { name: 'path', type: 'address[]' },
              { name: 'to', type: 'address' },
              { name: 'deadline', type: 'uint256' },
            ],
            name: 'swapExactETHForTokens',
            outputs: [{ name: 'amounts', type: 'uint256[]' }],
            type: 'function',
          },
        ],
        this.pancakeSwapRouter
      );

      const bnbAmount = this.web3.utils.toWei((amountUSD * 0.1).toString(), 'ether'); // 10% of revenue
      const tx = {
        from: account.address,
        to: this.pancakeSwapRouter,
        value: bnbAmount,
        gas: 200000,
        data: pancakeSwap.methods.swapExactETHForTokens(
          0, // Accept any amount of BNB
          [this.usdtContractAddress, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'], // USDT -> WBNB
          this.bnbWallet,
          Math.floor(Date.now() / 1000) + 60 * 20
        ).encodeABI(),
      };
      const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
      await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log(`Swapped ${amountUSD * 0.1} USD to BNB for gas fees, sent to ${this.bnbWallet}`);
    } catch (error) {
      console.error('BNB swap error:', error.message);
      await this.handleError('swapToBNB', error);
    }
  }

  async optimizeGas() {
    try {
      const gasPrice = await this.web3.eth.getGasPrice();
      const lowGasPrice = this.web3.utils.toBN(gasPrice).mul(this.web3.utils.toBN(80)).div(this.web3.utils.toBN(100)); // 80% of current
      return lowGasPrice.toString();
    } catch (error) {
      console.error('Gas optimization error:', error.message);
      await this.handleError('optimizeGas', error);
      return this.web3.utils.toWei('5', 'gwei'); // Fallback
    }
  }

  async payoutRevenue(amount) {
    try {
      const privateKey = process.env.VITE_BSC_PRIVATE_KEY;
      const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      this.web3.eth.accounts.wallet.add(account);

      const gasFee = amount * 0.1; // 10% for gas
      await this.swapToBNB(amount); // Fund BNB wallet

      const usdtContract = new this.web3.eth.Contract(
        [
          {
            constant: false,
            inputs: [
              { name: '_to', type: 'address' },
              { name: '_value', type: 'uint256' },
            ],
            name: 'transfer',
            outputs: [{ name: '', type: 'bool' }],
            type: 'function',
          },
        ],
        this.usdtContractAddress
      );

      const amountPerWallet = (amount * 0.9) / this.revenueWallets.length; // 90% split evenly
      const amountWei = this.web3.utils.toWei(amountPerWallet.toString(), 'ether');
      const gasPrice = await this.optimizeGas();
      for (const wallet of this.revenueWallets) {
        const tx = {
          from: account.address,
          to: this.usdtContractAddress,
          gas: 100000,
          gasPrice,
          data: usdtContract.methods.transfer(wallet, amountWei).encodeABI(),
        };
        const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
        await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log(`Payout of ${amountWei} USDT sent to ${wallet}`);
      }

      await axios.post('/api/cosmoweb3db', {
        action: 'insert',
        collection: 'payouts',
        data: {
          amount: amount * 0.9,
          gasFee,
          wallets: this.revenueWallets,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('USDT payout error:', error.message);
      await this.handleError('payoutRevenue', error);
    }
  }

  async optimizeCampaigns(opportunities) {
    try {
      const campaigns = opportunities
        .filter((opp) => opp.trending && opp.potential_value > 5)
        .map((opp) => ({
          product_name: opp.product_name,
          affiliate_link: opp.affiliate_link,
          commission_rate: opp.commission_rate,
          potential_value: opp.potential_value,
          promotion: opp.promotion,
          country: opp.country,
          clicks: 0,
          conversions: 0,
        }));

      let totalRevenue = 0;
      for (const campaign of campaigns) {
        console.log(`Deploying campaign: ${campaign.product_name}, Link: ${campaign.affiliate_link}, Country: ${campaign.country}`);
        await this.saveCampaign(campaign);
        totalRevenue += campaign.potential_value;
      }

      if (totalRevenue > 0) {
        await this.payoutRevenue(totalRevenue);
      }

      const report = {
        site: 'campaign_optimizer',
        findings: campaigns,
        timestamp: new Date().toISOString(),
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
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }
}
