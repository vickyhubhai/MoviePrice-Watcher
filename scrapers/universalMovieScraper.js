const puppeteer = require('puppeteer');

class UniversalMovieScraper {
  constructor() {
    this.browser = null;
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
      console.log('✅ Universal Movie Scraper initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize universal scraper:', error);
      throw error;
    }
  }

  // Detect which platform the URL belongs to
  detectPlatform(url) {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('bookmyshow.com')) {
      return 'bookmyshow';
    } else if (urlLower.includes('pvr.com') || urlLower.includes('pvrcinemas.com')) {
      return 'pvr';
    } else if (urlLower.includes('inox.com') || urlLower.includes('inoxmovies.com')) {
      return 'inox';
    } else if (urlLower.includes('cinepolis.com')) {
      return 'cinepolis';
    } else if (urlLower.includes('paytm.com')) {
      return 'paytm';
    } else if (urlLower.includes('fandango.com')) {
      return 'fandango';
    } else if (urlLower.includes('ticketnew.com')) {
      return 'ticketnew';
    } else if (urlLower.includes('justtickets.in')) {
      return 'justtickets';
    }
    
    return 'unknown';
  }

  async scrapeMoviePrices(movieUrl) {
    try {
      if (!this.browser) {
        await this.init();
      }

      const platform = this.detectPlatform(movieUrl);
      console.log(`🎬 Detected platform: ${platform} for URL: ${movieUrl}`);

      const page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1366, height: 768 });
      
      console.log(`🌐 Navigating to: ${movieUrl}`);
      await page.goto(movieUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for the page to load completely
      await page.waitForTimeout(3000);
      
      // Universal scraping approach
      const movieData = await page.evaluate(() => {
        // Define selectors based on platform
        let priceSelectors = [];
        let titleSelectors = [];
        
        const currentUrl = window.location.href.toLowerCase();
        
        if (currentUrl.includes('bookmyshow')) {
          priceSelectors = ['.Price', '[data-testid="price"]', '.price', '.seat-price', '.ticket-price', '[class*="price"]', '.showtime-price'];
          titleSelectors = ['h1', '[data-testid="movie-title"]', '.movie-title', '.title', '[class*="title"]'];
        } else if (currentUrl.includes('pvr')) {
          priceSelectors = ['.ticket-price', '.price', '.cost', '[class*="price"]', '.show-price', '.cinema-price'];
          titleSelectors = ['h1', '.movie-name', '.film-title', '.movie-title'];
        } else if (currentUrl.includes('inox')) {
          priceSelectors = ['.ticket-price', '.price', '.amount', '[class*="price"]', '.show-price'];
          titleSelectors = ['h1', '.movie-title', '.film-name', '.title'];
        } else if (currentUrl.includes('cinepolis')) {
          priceSelectors = ['.price', '.ticket-price', '.cost', '[class*="price"]'];
          titleSelectors = ['h1', '.movie-title', '.film-title'];
        } else if (currentUrl.includes('paytm')) {
          priceSelectors = ['.price', '.ticket-price', '[class*="price"]', '.amount'];
          titleSelectors = ['h1', '.movie-name', '.title'];
        } else {
          // Generic selectors
          priceSelectors = ['.price', '.ticket-price', '.cost', '.amount', '[class*="price"]', '[id*="price"]'];
          titleSelectors = ['h1', 'h2', '.title', '.movie-title', '.film-title', '[class*="title"]'];
        }
        
        // Helper function to extract prices
        function extractPrices(selectors) {
          const prices = [];
          
          for (const selector of selectors) {
            try {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                Array.from(elements).forEach(el => {
                  const priceText = el.textContent.replace(/[^\d]/g, '');
                  const price = parseInt(priceText);
                  if (price && price > 0 && price < 10000) {
                    prices.push(price);
                  }
                });
                if (prices.length > 0) break;
              }
            } catch (e) {
              // Continue to next selector
            }
          }
          
          // Fallback: search for currency patterns in text
          if (prices.length === 0) {
            const allText = document.body.textContent;
            const patterns = [
              /₹\s*(\d{2,4})/g,
              /\$\s*(\d{1,3})/g,
              /Rs\.?\s*(\d{2,4})/g,
              /\b(\d{2,3})\b/g
            ];
            
            patterns.forEach(pattern => {
              const matches = allText.match(pattern) || [];
              matches.forEach(match => {
                const price = parseInt(match.replace(/[^\d]/g, ''));
                if (price >= 50 && price <= 2000) {
                  prices.push(price);
                }
              });
            });
          }
          
          return [...new Set(prices)].sort((a, b) => a - b);
        }
        
        // Helper function to extract title
        function extractTitle(selectors) {
          for (const selector of selectors) {
            try {
              const element = document.querySelector(selector);
              if (element && element.textContent.trim()) {
                return element.textContent.trim();
              }
            } catch (e) {
              // Continue to next selector
            }
          }
          
          // Fallback to page title
          const pageTitle = document.title;
          if (pageTitle && pageTitle !== 'Movie Booking' && !pageTitle.includes('404')) {
            return pageTitle.split('|')[0].split('-')[0].split('–')[0].trim();
          }
          
          return 'Unknown Movie';
        }
        
        const prices = extractPrices(priceSelectors);
        const title = extractTitle(titleSelectors);
        
        return {
          title: title,
          prices: prices,
          minPrice: prices.length > 0 ? Math.min(...prices) : null,
          maxPrice: prices.length > 0 ? Math.max(...prices) : null,
          avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null
        };
      });
      
      movieData.platform = platform;
      await page.close();
      
      console.log('📊 Scraped data:', movieData);
      return movieData;
      
    } catch (error) {
      console.error('❌ Scraping error for URL:', movieUrl, error);
      return {
        title: 'Unknown Movie',
        prices: [],
        minPrice: null,
        maxPrice: null,
        avgPrice: null,
        error: error.message,
        platform: this.detectPlatform(movieUrl)
      };
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        console.log('🔒 Universal Movie Scraper closed successfully');
      }
    } catch (error) {
      console.error('❌ Error closing universal scraper:', error);
    }
  }

  // Test method for different platforms
  async testScraper(testUrls = []) {
    try {
      await this.init();
      const results = [];
      
      const defaultTestUrls = [
        'https://in.bookmyshow.com/',
        'https://www.pvrcinemas.com/',
        'https://www.inoxmovies.com/',
        'https://www.cinepolis.com/india/',
        'https://paytm.com/movies'
      ];
      
      const urlsToTest = testUrls.length > 0 ? testUrls : defaultTestUrls;
      
      for (const url of urlsToTest) {
        try {
          const page = await this.browser.newPage();
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
          const title = await page.title();
          await page.close();
          
          results.push({
            url,
            platform: this.detectPlatform(url),
            success: true,
            title
          });
          
          console.log(`✅ ${this.detectPlatform(url).toUpperCase()}: ${title}`);
        } catch (error) {
          results.push({
            url,
            platform: this.detectPlatform(url),
            success: false,
            error: error.message
          });
          
          console.log(`❌ ${this.detectPlatform(url).toUpperCase()}: ${error.message}`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      await this.close();
      
      console.log('🧪 Universal scraper test completed:', results);
      return results;
      
    } catch (error) {
      console.error('❌ Universal scraper test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = UniversalMovieScraper;