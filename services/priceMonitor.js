const BookMyShowScraper = require('../scrapers/bookMyShowScraper');
const UniversalMovieScraper = require('../scrapers/universalMovieScraper');
const EmailService = require('./emailService');
const Movie = require('../models/Movie');

class PriceMonitor {
  constructor() {
    this.scraper = new BookMyShowScraper(); // Legacy scraper for BookMyShow
    this.universalScraper = new UniversalMovieScraper(); // Universal scraper for all platforms
    this.emailService = new EmailService();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      if (!this.isInitialized) {
        await this.scraper.init();
        await this.universalScraper.init();
        await this.emailService.verifyConnection();
        this.isInitialized = true;
        console.log('✅ Price monitor initialized successfully (BookMyShow + Universal scrapers)');
      }
    } catch (error) {
      console.error('❌ Failed to initialize price monitor:', error);
      throw error;
    }
  }

  async checkPrices() {
    try {
      console.log('🔍 Starting price check...', new Date().toLocaleString());
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Get all movies for checking (both notified and non-notified)
      const moviesToCheck = await Movie.find({});
      
      if (moviesToCheck.length === 0) {
        console.log('📋 No movies to check at this time');
        return { success: true, message: 'No movies to check', checkedCount: 0 };
      }

      console.log(`📝 Found ${moviesToCheck.length} movies to check`);
      let checkedCount = 0;
      let alertsSent = 0;
      let errors = [];

      for (const movie of moviesToCheck) {
        try {
          console.log(`🎬 Checking prices for: ${movie.title} (${movie.url})`);
          
          // Use universal scraper for better platform support
          const scrapedData = await this.universalScraper.scrapeMoviePrices(movie.url);
          
          if (scrapedData && scrapedData.minPrice) {
            // Update movie data in database
            movie.currentPrice = scrapedData.minPrice;
            movie.lastChecked = new Date();
            
            console.log(`💰 Current price for ${movie.title}: ₹${scrapedData.minPrice} (Target: ₹${movie.targetPrice})`);
            
            // Send notification based on price status
            const shouldSendAlert = this.shouldSendNotification(movie, scrapedData.minPrice);
            const isTargetPrice = scrapedData.minPrice === 100; // Special notification for ₹100
            
            if (shouldSendAlert || isTargetPrice) {
              const isTargetMet = scrapedData.minPrice <= movie.targetPrice;
              const notificationType = isTargetPrice ? 'target_price_alert' : (isTargetMet ? 'target_met' : 'price_update');
              
              console.log(`📧 Sending ${notificationType} alert for ${movie.title}: ₹${scrapedData.minPrice}`);
              
              const alertData = {
                title: movie.title,
                theater: movie.theater,
                currentPrice: scrapedData.minPrice,
                targetPrice: movie.targetPrice,
                url: movie.url,
                notificationType: notificationType
              };
              
              const emailSent = await this.emailService.sendPriceAlert(alertData);
              
              if (emailSent) {
                if (isTargetMet) {
                  movie.notificationSent = true;
                }
                movie.lastNotificationSent = new Date();
                alertsSent++;
                console.log(`✅ Email alert sent successfully for ${movie.title}`);
              } else {
                console.log(`❌ Failed to send email alert for ${movie.title}`);
                errors.push(`Failed to send email for ${movie.title}`);
              }
            } else {
              console.log(`⏳ No notification needed for ${movie.title} at this time`);
            }
            
            await movie.save();
            checkedCount++;
            
            // Add short delay between requests to be respectful (reduced for frequent checks)
            await this.delay(500);
          } else {
            console.log(`⚠️ Failed to scrape price for ${movie.title}`);
            errors.push(`Failed to scrape ${movie.title}: ${scrapedData?.error || 'Unknown error'}`);
            
            // Update last checked time even if scraping failed
            movie.lastChecked = new Date();
            await movie.save();
          }
          
          // Add delay between requests to be respectful to the website
          await this.delay(3000);
          
        } catch (movieError) {
          console.error(`❌ Error checking movie ${movie.title}:`, movieError);
          errors.push(`Error checking ${movie.title}: ${movieError.message}`);
        }
      }
      
      const result = {
        success: true,
        message: `Price check completed. Checked ${checkedCount} movies, sent ${alertsSent} alerts`,
        checkedCount,
        alertsSent,
        errors: errors.length > 0 ? errors : null
      };
      
      console.log('✅ Price check completed:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Price check error:', error);
      return {
        success: false,
        message: 'Price check failed',
        error: error.message
      };
    }
  }

  async addMovieToTrack(movieUrl, theater = 'Unknown', customTargetPrice = null) {
    try {
      console.log(`➕ Adding movie to track: ${movieUrl}`);
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if movie already exists
      const existingMovie = await Movie.findOne({ url: movieUrl });
      if (existingMovie) {
        console.log(`⚠️ Movie already being tracked: ${existingMovie.title}`);
        return {
          success: false,
          message: 'Movie is already being tracked',
          movie: existingMovie
        };
      }

      const scrapedData = await this.universalScraper.scrapeMoviePrices(movieUrl);
      
      if (scrapedData && scrapedData.title !== 'Unknown Movie') {
        const targetPrice = customTargetPrice || parseInt(process.env.TARGET_PRICE) || 100;
        
        const movie = new Movie({
          title: scrapedData.title,
          theater: theater,
          currentPrice: scrapedData.minPrice,
          targetPrice: targetPrice,
          url: movieUrl,
          lastChecked: new Date(),
          notificationSent: false
        });
        
        await movie.save();
        
        console.log(`✅ Added movie to tracking: ${scrapedData.title} (Current: ₹${scrapedData.minPrice}, Target: ₹${targetPrice})`);
        
        // If current price is already at or below target, send immediate alert
        if (scrapedData.minPrice && scrapedData.minPrice <= targetPrice) {
          console.log(`🎯 Price already at target! Sending immediate alert.`);
          
          const alertData = {
            title: movie.title,
            theater: movie.theater,
            currentPrice: scrapedData.minPrice,
            targetPrice: targetPrice,
            url: movieUrl
          };
          
          const emailSent = await this.emailService.sendPriceAlert(alertData);
          if (emailSent) {
            movie.notificationSent = true;
            await movie.save();
          }
        }
        
        return {
          success: true,
          message: 'Movie added to tracking successfully',
          movie: movie
        };
      } else {
        console.log(`❌ Failed to scrape movie data from URL: ${movieUrl}`);
        return {
          success: false,
          message: 'Failed to scrape movie data. Please check the URL.',
          error: scrapedData?.error
        };
      }
      
    } catch (error) {
      console.error('❌ Error adding movie:', error);
      return {
        success: false,
        message: 'Failed to add movie to tracking',
        error: error.message
      };
    }
  }

  async removeMovieFromTracking(movieId) {
    try {
      const movie = await Movie.findByIdAndDelete(movieId);
      if (movie) {
        console.log(`🗑️ Removed movie from tracking: ${movie.title}`);
        return {
          success: true,
          message: `Removed ${movie.title} from tracking`
        };
      } else {
        return {
          success: false,
          message: 'Movie not found'
        };
      }
    } catch (error) {
      console.error('Error removing movie:', error);
      return {
        success: false,
        message: 'Failed to remove movie',
        error: error.message
      };
    }
  }

  async updateMovieTargetPrice(movieId, newTargetPrice) {
    try {
      const movie = await Movie.findById(movieId);
      if (movie) {
        movie.targetPrice = newTargetPrice;
        movie.notificationSent = false; // Reset notification status
        await movie.save();
        
        console.log(`💰 Updated target price for ${movie.title}: ₹${newTargetPrice}`);
        return {
          success: true,
          message: `Updated target price for ${movie.title}`,
          movie: movie
        };
      } else {
        return {
          success: false,
          message: 'Movie not found'
        };
      }
    } catch (error) {
      console.error('Error updating target price:', error);
      return {
        success: false,
        message: 'Failed to update target price',
        error: error.message
      };
    }
  }

  async getTrackingStats() {
    try {
      const totalMovies = await Movie.countDocuments();
      const pendingNotifications = await Movie.countDocuments({ notificationSent: false });
      const sentNotifications = await Movie.countDocuments({ notificationSent: true });
      const recentlyChecked = await Movie.countDocuments({
        lastChecked: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      return {
        totalMovies,
        pendingNotifications,
        sentNotifications,
        recentlyChecked
      };
    } catch (error) {
      console.error('Error getting tracking stats:', error);
      return null;
    }
  }

  async resetNotifications() {
    try {
      const result = await Movie.updateMany(
        { notificationSent: true },
        { notificationSent: false }
      );
      
      console.log(`🔄 Reset notifications for ${result.modifiedCount} movies`);
      return {
        success: true,
        message: `Reset notifications for ${result.modifiedCount} movies`
      };
    } catch (error) {
      console.error('Error resetting notifications:', error);
      return {
        success: false,
        message: 'Failed to reset notifications',
        error: error.message
      };
    }
  }

  shouldSendNotification(movie, currentPrice) {
    const now = new Date();
    const isTargetMet = currentPrice <= movie.targetPrice;
    
    // Always send if target is met and no notification sent yet
    if (isTargetMet && !movie.notificationSent) {
      return true;
    }
    
    // Send regular updates for non-target prices (every 4 hours instead of daily)
    if (!isTargetMet) {
      // Send updates for prices above target every 4 hours
      const lastNotificationTime = movie.lastNotificationSent || movie.createdAt;
      const timeSinceLastNotification = now - new Date(lastNotificationTime);
      const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
      
      if (timeSinceLastNotification >= fourHours) {
        return true;
      }
    }
    
    // Send weekly updates even for target-met movies to keep user informed
    if (isTargetMet && movie.notificationSent) {
      const lastNotificationTime = movie.lastNotificationSent || movie.updatedAt;
      const timeSinceLastNotification = now - new Date(lastNotificationTime);
      const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      
      if (timeSinceLastNotification >= oneWeek) {
        return true;
      }
    }
    
    return false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    try {
      await this.scraper.close();
      await this.universalScraper.close();
      this.isInitialized = false;
      console.log('🔒 Price monitor closed successfully');
    } catch (error) {
      console.error('❌ Error closing price monitor:', error);
    }
  }

  // Test method to verify all services are working
  async testServices() {
    try {
      console.log('🧪 Testing price monitor services...');
      
      // Test scrapers
      const scraperTest = await this.scraper.testScraper();
      const universalScraperTest = await this.universalScraper.testScraper();
      console.log('BookMyShow scraper test:', scraperTest.success ? '✅ Passed' : '❌ Failed');
      console.log('Universal scraper test:', Array.isArray(universalScraperTest) ? '✅ Passed' : '❌ Failed');
      
      // Test email service
      const emailTest = await this.emailService.verifyConnection();
      console.log('Email service test:', emailTest ? '✅ Passed' : '❌ Failed');
      
      const universalScraperSuccess = Array.isArray(universalScraperTest) && universalScraperTest.length > 0;
      
      return {
        scraper: scraperTest.success,
        universalScraper: universalScraperSuccess,
        email: emailTest,
        overall: scraperTest.success && universalScraperSuccess && emailTest
      };
    } catch (error) {
      console.error('Service test error:', error);
      return {
        scraper: false,
        universalScraper: false,
        email: false,
        overall: false,
        error: error.message
      };
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = PriceMonitor;