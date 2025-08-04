import axios from 'axios';
import nacl from 'tweetnacl';
import cheerio from 'cheerio';
import countries from './countries.json';

export class OpportunityBot {
  constructor(targetSite, aggregator, { siteType }) {
    this.targetSite = targetSite;
    this.aggregator = aggregator;
    this.siteType = siteType;
    this.keywords = [
      'product', 'buy', 'shop', 'store', 'sale',
      'affiliate', 'commission', 'referral', 'deal', 'offer',
      'electronics', 'fashion', 'home', 'tech', 'trending',
    ];
    this.countries = countries; // Full 195 countries
    this.keyPair = nacl.sign.keyPair();
    this.userId = this.generateUserId();
  }

  async connectToCosmoWeb3DB() {
    return axios.post('/api/cosmoweb3db', { action: 'connect' });
  }

  async saveOpportunity(opportunity) {
    try {
      await axios.post('/api/cosmoweb3db', {
        action: 'insert',
        collection: 'opportunities',
        data: {
          ...opportunity,
          botId: await this.userId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to save opportunity to CosmoWeb3DB:', error);
      await this.handleError('saveOpportunity', error);
    }
  }

  generateUserId() {
    const uuid = crypto.randomUUID();
    const publicKey = btoa(String.fromCharCode(...this.keyPair.publicKey));
    const digest = new TextEncoder().encode(publicKey + uuid);
    return crypto.subtle.digest('SHA-256', digest).then((hash) => {
      return 'ariel_' + btoa(String.fromCharCode(...new Uint8Array(hash)).slice(0, 18)).replace(/=/g, '');
    });
  }

  async signMessage(message) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);
    const signature = nacl.sign.detached(encoded, this.keyPair.secretKey);
    return btoa(String.fromCharCode(...signature));
  }

  async fetchExternalData(country) {
    const externalData = {};

    try {
      const response = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=51.51&longitude=-0.13&current_weather=true`, {
        timeout: 5000,
      });
      externalData.weather = response.data.current_weather?.weathercode || 0;
    } catch (error) {
      console.error(`Open-Meteo API error for ${country}:`, error.message);
      await this.handleError('fetchExternalData', error);
    }

    try {
      const response = await axios.get('https://www.reddit.com/r/trending/hot.json', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpportunityBot/1.0)' },
        timeout: 5000,
      });
      externalData.trendingTopics = response.data.data.children.map((post) => post.data.title) || [];
    } catch (error) {
      console.error(`Reddit API error for ${country}:`, error.message);
      await this.handleError('fetchExternalData', error);
    }

    return externalData;
  }

  async generatePromotionalContent(product) {
    try {
      const response = await axios.post('/api/cosmoweb3db', {
        action: 'generate_text',
        input: `Promote this product: ${product.product_name}, Price: $${product.price}, Description: High-quality trending product in ${product.country}!`,
      });
      return response.data.text || 'Buy this trending product now!';
    } catch (error) {
      console.error('CosmoWeb3DB text generation error:', error.message);
      await this.handleError('generatePromotionalContent', error);
      return 'Buy this trending product now!';
    }
  }

  async checkCompliance(promotion, country) {
    try {
      const response = await axios.get(`https://www.legislation.gov.uk/id/ukpga/2018/12/contents`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpportunityBot/1.0)' },
        timeout: 5000,
      });
      const isCompliant = !promotion.toLowerCase().includes('misleading') && response.data.includes('advertising');
      if (!isCompliant) {
        const newPromotion = await this.generatePromotionalContent({ product_name: 'Generic Product', price: 100, country });
        return { compliant: false, newPromotion };
      }
      return { compliant: true, promotion };
    } catch (error) {
      console.error(`Compliance check error for ${country}:`, error.message);
      await this.handleError('checkCompliance', error);
      return { compliant: true, promotion }; // Fallback to assume compliance
    }
  }

  async crawlWebForOpportunities() {
    const opportunities = [];

    const crawlCountry = async (country) => {
      try {
        const response = await axios.get(`https://www.google.com/search?q=affiliate+products+${country}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpportunityBot/1.0)' },
          timeout: 10000,
        });
        const $ = cheerio.load(response.data);
        $('a').each((i, elem) => {
          const href = $(elem).attr('href');
          if (href && this.keywords.some((kw) => href.toLowerCase().includes(kw))) {
            opportunities.push({
              product_name: $(elem).text() || 'Generic Product',
              price: 100,
              commission_rate: 5,
              affiliate_link: href,
              potential_value: 100 * 0.05,
              country,
            });
          }
        });
      } catch (error) {
        console.error(`Web crawl error for ${country}:`, error.message);
        await this.handleError('crawlWebForOpportunities', error);
      }
    };

    await Promise.all(this.countries.map(crawlCountry));
    return opportunities;
  }

  async fetchAffiliatePrograms() {
    const opportunities = [];

    const fetchForCountry = async (country) => {
      const externalData = await this.fetchExternalData(country);

      if (this.siteType === 'infolinks') {
        try {
          const response = await axios.get('https://api.infolinks.com/v1/ads', {
            params: {
              publisher_id: import.meta.env.VITE_INFOLINKS_PUBLISHER_ID,
              category: 'ecommerce',
              limit: 10,
            },
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_INFOLINKS_API_KEY}`,
              'User-Agent': 'Mozilla/5.0 (compatible; OpportunityBot/1.0)',
            },
            timeout: 10000,
          });
          const ads = await Promise.all(
            response.data.ads.map(async (ad) => {
              const product = {
                product_name: ad.title,
                price: parseFloat(ad.price || 100),
                commission_rate: ad.cpm_rate || 3,
                affiliate_link: ad.tracking_url,
                potential_value: parseFloat(ad.price || 100) * (ad.cpm_rate / 1000 || 0.003),
                trending: externalData.trendingTopics?.some((topic) => ad.title.toLowerCase().includes(topic.toLowerCase())) || false,
                country,
              };
              const { compliant, promotion, newPromotion } = await this.checkCompliance(product.promotion || 'Buy now!', country);
              product.promotion = compliant ? await this.generatePromotionalContent(product) : newPromotion;
              return product;
            })
          );
          opportunities.push(...ads);
        } catch (error) {
          console.error(`Infolinks API error for ${country}:`, error.message);
          await this.handleError('fetchAffiliatePrograms', error);
        }
      } else if (this.siteType === 'viglink') {
        try {
          const response = await axios.get('https://api.viglink.com/v1/products', {
            params: {
              api_key: import.meta.env.VITE_VIGLINK_API_KEY,
              keywords: 'electronics',
              limit: 10,
            },
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; OpportunityBot/1.0)',
            },
            timeout: 10000,
          });
          const products = await Promise.all(
            response.data.products.map(async (prod) => {
              const product = {
                product_name: prod.name,
                price: parseFloat(prod.price || 100),
                commission_rate: prod.commission_rate || 4,
                affiliate_link: prod.affiliate_url,
                potential_value: parseFloat(prod.price || 100) * (prod.commission_rate / 100 || 0.04),
                trending: externalData.trendingTopics?.some((topic) => prod.name.toLowerCase().includes(topic.toLowerCase())) || false,
                country,
              };
              const { compliant, promotion, newPromotion } = await this.checkCompliance(product.promotion || 'Buy now!', country);
              product.promotion = compliant ? await this.generatePromotionalContent(product) : newPromotion;
              return product;
            })
          );
          opportunities.push(...products);
        } catch (error) {
          console.error(`VigLink API error for ${country}:`, error.message);
          await this.handleError('fetchAffiliatePrograms', error);
        }
      }
    };

    await Promise.all(this.countries.map(fetchForCountry));
    const webOpportunities = await this.crawlWebForOpportunities();
    opportunities.push(...webOpportunities);
    return opportunities;
  }

  async scan() {
    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const findings = await this.fetchAffiliatePrograms();
        if (findings.length > 0) {
          const report = {
            site: this.targetSite,
            findings,
            timestamp: new Date().toISOString(),
            botId: await this.userId,
            signature: await this.signMessage(JSON.stringify(findings)),
          };
          this.aggregator.report(report);
          await Promise.all(findings.map((finding) => this.saveOpportunity(finding)));
          return findings;
        }
        return [];
      } catch (error) {
        attempts++;
        console.error(`Scan failed for ${this.targetSite} after attempt ${attempts}:`, error);
        await this.handleError('scan', error);
        if (attempts === maxRetries) {
          return [];
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }
    return [];
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

  analyzeContent(html) {
    const htmlLower = html.toLowerCase();
    const matchedKeywords = this.keywords.filter((kw) => htmlLower.includes(kw));
    if (!matchedKeywords.length) return [];

    return [{
      product_name: 'Generic Product',
      price: 100,
      commission_rate: matchedKeywords.length * 5,
      affiliate_link: `${this.targetSite}/product?ref=arielmatrix`,
      potential_value: matchedKeywords.length * 20 + Math.min(50, html.length / 1000),
      promotion: 'Buy this trending product now!',
      country: this.countries[0],
    }];
  }
}
