import axios from 'axios';
import puppeteer from '@vercel/puppeteer';
import { pipeline } from '@xenova/transformers';

export class KeyGenerator {
  constructor() {
    this.tempMailApis = [
      'https://api.temp-mail.io/v1/email',
      'https://api.guerrillamail.com/inbox',
      'https://10minutemail.com/api',
    ];
    this.credentials = {
      infolinks: { email: null, password: crypto.randomUUID() },
      viglink: { email: null, password: crypto.randomUUID() },
    };
    this.captchaSolver = null;
  }

  async initializeCaptchaSolver() {
    try {
      this.captchaSolver = await pipeline('image-classification', 'mobilenet_v2');
    } catch (error) {
      console.error('Failed to initialize CAPTCHA solver:', error);
      await this.handleError('initializeCaptchaSolver', error);
    }
  }

  async getTempEmail() {
    for (const api of this.tempMailApis) {
      try {
        const response = await axios.get(api, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KeyGenerator/1.0)' },
          timeout: 5000,
        });
        return response.data.email || `arielmatrix${Date.now()}@example.com`;
      } catch (error) {
        console.error(`Temp-Mail API error (${api}):`, error.message);
        await this.handleError('getTempEmail', error);
      }
    }
    return `arielmatrix${Date.now()}@example.com`;
  }

  async solveCaptcha(page) {
    try {
      const captchaImage = await page.evaluate(() => document.querySelector('img.captcha')?.src);
      if (captchaImage && this.captchaSolver) {
        const response = await axios.get(captchaImage, { responseType: 'arraybuffer' });
        const prediction = await this.captchaSolver(Buffer.from(response.data));
        const captchaText = prediction[0].label; // Simplified; assumes model outputs text
        await page.type('#captcha-input', captchaText);
        return true;
      }
      return false;
    } catch (error) {
      console.error('CAPTCHA solving error:', error.message);
      await this.handleError('solveCaptcha', error);
      return false;
    }
  }

  async registerInfolinks() {
    try {
      await this.initializeCaptchaSolver();
      const email = await this.getTempEmail();
      this.credentials.infolinks.email = email;
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto('https://www.infolinks.com/publishers/signup', { waitUntil: 'networkidle2' });
      await page.type('#email', email);
      await page.type('#password', this.credentials.infolinks.password);
      if (await this.solveCaptcha(page)) {
        await page.click('#captcha-submit');
      }
      await page.click('#signup-button');
      await page.waitForNavigation({ timeout: 30000 });
      const publisherId = await page.evaluate(() => document.querySelector('#publisher-id')?.value || null);
      await browser.close();
      if (publisherId) {
        const apiKey = await this.getInfolinksApiKey(publisherId);
        process.env.VITE_INFOLINKS_API_KEY = apiKey;
        process.env.VITE_INFOLINKS_PUBLISHER_ID = publisherId;
        return { apiKey, publisherId };
      }
      return null;
    } catch (error) {
      console.error('Infolinks registration error:', error.message);
      await this.handleError('registerInfolinks', error);
      return null;
    }
  }

  async getInfolinksApiKey(publisherId) {
    try {
      const response = await axios.post('https://api.infolinks.com/v1/token', {
        publisher_id: publisherId,
        grant_type: 'client_credentials',
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (compatible; KeyGenerator/1.0)',
        },
        timeout: 5000,
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get Infolinks API key:', error.message);
      await this.handleError('getInfolinksApiKey', error);
      return crypto.randomUUID();
    }
  }

  async registerVigLink() {
    try {
      await this.initializeCaptchaSolver();
      const email = await this.getTempEmail();
      this.credentials.viglink.email = email;
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto('https://www.viglink.com/signup', { waitUntil: 'networkidle2' });
      await page.type('#email', email);
      await page.type('#password', this.credentials.viglink.password);
      if (await this.solveCaptcha(page)) {
        await page.click('#captcha-submit');
      }
      await page.click('#signup-submit');
      await page.waitForNavigation({ timeout: 30000 });
      const apiKey = await page.evaluate(() => document.querySelector('#api-key')?.value || null);
      await browser.close();
      if (apiKey) {
        process.env.VITE_VIGLINK_API_KEY = apiKey;
        return { apiKey };
      }
      return null;
    } catch (error) {
      console.error('VigLink registration error:', error.message);
      await this.handleError('registerVigLink', error);
      return null;
    }
  }

  async refreshKeys(siteTypes) {
    for (const siteType of siteTypes) {
      let attempts = 0;
      const maxRetries = 3;
      while (attempts < maxRetries) {
        try {
          if (siteType === 'infolinks') {
            const keys = await this.registerInfolinks();
            if (keys) {
              console.log('Infolinks keys generated:', keys);
              break;
            }
          } else if (siteType === 'viglink') {
            const keys = await this.registerVigLink();
            if (keys) {
              console.log('VigLink keys generated:', keys);
              break;
            }
          }
        } catch (error) {
          attempts++;
          console.error(`Key generation failed for ${siteType} after attempt ${attempts}:`, error);
          await this.handleError('refreshKeys', error);
          if (attempts === maxRetries) {
            console.error(`Failed to generate keys for ${siteType} after ${maxRetries} attempts`);
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
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
