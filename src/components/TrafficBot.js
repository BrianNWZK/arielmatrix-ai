import axios from 'axios';

export class TrafficBot {
  constructor() {
    this.platforms = [
      { name: 'reddit', url: 'https://www.reddit.com/api/v1', auth: null },
      { name: 'x', url: 'https://api.x.com/2', auth: null },
    ];
  }

  async initializeAuth(platform) {
    try {
      const response = await axios.post('/api/cosmoweb3db', {
        action: 'generate_text',
        input: `Generate OAuth credentials for ${platform.name}`,
      });
      platform.auth = response.data.text;
      console.log(`Initialized auth for ${platform.name}`);
    } catch (error) {
      console.error(`Failed to initialize auth for ${platform.name}:`, error.message);
      await this.handleError('initializeAuth', error);
    }
  }

  async generateContent(opportunity) {
    try {
      const response = await axios.post('/api/cosmoweb3db', {
        action: 'generate_text',
        input: `Create a viral post for ${opportunity.product_name} in ${opportunity.country}: ${opportunity.promotion}`,
      });
      return response.data.text;
    } catch (error) {
      console.error('Content generation error:', error.message);
      await this.handleError('generateContent', error);
      return `Check out ${opportunity.product_name}! ${opportunity.promotion}`;
    }
  }

  async postToPlatform(platform, content, affiliateLink) {
    try {
      const response = await axios.post(`${platform.url}/posts`, {
        content,
        link: affiliateLink,
        auth: platform.auth,
      }, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrafficBot/1.0)' },
        timeout: 5000,
      });
      const postId = response.data.id;
      await axios.post('/api/cosmoweb3db', {
        action: 'insert',
        collection: 'traffic',
        data: {
          platform: platform.name,
          postId,
          affiliateLink,
          clicks: 0,
          conversions: 0,
          timestamp: new Date().toISOString(),
        },
      });
      console.log(`Posted to ${platform.name}: ${content}`);
    } catch (error) {
      console.error(`Failed to post to ${platform.name}:`, error.message);
      await this.handleError('postToPlatform', error);
    }
  }

  async optimizeTraffic() {
    try {
      const response = await axios.post('/api/cosmoweb3db', {
        action: 'find',
        collection: 'traffic',
        query: {},
      });
      const trafficData = response.data.results;
      const highPerforming = trafficData.filter((data) => (data.conversions / (data.clicks || 1)) > 0.05);
      if (highPerforming.length > 0) {
        const bestPost = highPerforming.reduce((prev, curr) => (curr.conversions / (curr.clicks || 1)) > (prev.conversions / (prev.clicks || 1)) ? curr : prev);
        await axios.post('/api/cosmoweb3db', {
          action: 'generate_text',
          input: `Optimize post: ${bestPost.content}`,
        });
        console.log('Traffic optimized based on high-performing post');
      }
    } catch (error) {
      console.error('Traffic optimization error:', error.message);
      await this.handleError('optimizeTraffic', error);
    }
  }

  async generateTraffic(opportunities) {
    for (const platform of this.platforms) {
      if (!platform.auth) {
        await this.initializeAuth(platform);
      }
      for (const opp of opportunities) {
        const content = await this.generateContent(opp);
        await this.postToPlatform(platform, content, opp.affiliate_link);
      }
    }
    await this.optimizeTraffic();
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
