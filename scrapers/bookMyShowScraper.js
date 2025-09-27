const puppeteer = require('puppeteer');

class BookMyShowScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    try {
      this.browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      console.log('Browser initialized successfully');
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  async scrapeMoviePrices(movieUrl) {
    try {
      if (!this.browser) {
        await this.init();
      }

      const page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1366, height: 768 });
      
      console.log(`Navigating to: ${movieUrl}`);
      await page.goto(movieUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for the page to load completely
      await page.waitForTimeout(3000);
      
      const movieData = await page.evaluate(() => {
        // Try multiple selectors for price elements
        const priceSelectors = [
          '.Price',
          '[data-testid="price"]',
          '.price',
          '.seat-price',
          '.ticket-price',
          '[class*="price"]',
          '[class*="Price"]'
        ];
        
        let priceElements = [];
        for (const selector of priceSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            priceElements = elements;
            break;
          }
        }
        
        // Try multiple selectors for movie title
        const titleSelectors = [
          'h1',
          '[data-testid="movie-title"]',
          '.movie-title',
          '.title',
          '[class*="title"]',
          '[class*="Title"]'
        ];
        
        let titleElement = null;
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            titleElement = element;
            break;
          }
        }
        
        // Extract prices
        const prices = [];
        if (priceElements.length > 0) {
          Array.from(priceElements).forEach(el => {
            const priceText = el.textContent.replace(/[^\d]/g, '');
            const price = parseInt(priceText);
            if (price && price > 0 && price < 10000) { // Reasonable price range
              prices.push(price);
            }
          });
        }
        
        // If no prices found with specific selectors, try to find any number that looks like a price
        if (prices.length === 0) {
          const allText = document.body.textContent;
          const priceMatches = allText.match(/₹\s*(\d{2,4})/g) || allText.match(/\b(\d{2,3})\b/g);
          if (priceMatches) {
            priceMatches.forEach(match => {
              const price = parseInt(match.replace(/[^\d]/g, ''));
              if (price >= 50 && price <= 2000) { // Reasonable movie ticket price range
                prices.push(price);
              }
            });
          }
        }
        
        const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);
        
        return {
          title: titleElement ? titleElement.textContent.trim() : 'Unknown Movie',
          prices: uniquePrices,
          minPrice: uniquePrices.length > 0 ? Math.min(...uniquePrices) : null,
          maxPrice: uniquePrices.length > 0 ? Math.max(...uniquePrices) : null,
          avgPrice: uniquePrices.length > 0 ? Math.round(uniquePrices.reduce((a, b) => a + b, 0) / uniquePrices.length) : null
        };
      });
      
      await page.close();
      
      console.log('Scraped data:', movieData);
      return movieData;
      
    } catch (error) {
      console.error('Scraping error for URL:', movieUrl, error);
      return {
        title: 'Unknown Movie',
        prices: [],
        minPrice: null,
        maxPrice: null,
        avgPrice: null,
        error: error.message
      };
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        console.log('Browser closed successfully');
      }
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }

  // Method to test if the scraper is working
  async testScraper(testUrl = 'https://in.bookmyshow.com/') {
    try {
      await this.init();
      const page = await this.browser.newPage();
      await page.goto(testUrl, { waitUntil: 'networkidle2' });
      const title = await page.title();
      await page.close();
      await this.close();
      
      console.log('Scraper test successful. Page title:', title);
      return { success: true, title };
    } catch (error) {
      console.error('Scraper test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = BookMyShowScraper;