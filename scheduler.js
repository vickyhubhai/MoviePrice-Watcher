const cron = require('node-cron');
const PriceMonitor = require('./services/priceMonitor');
const EmailService = require('./services/emailService');
const Movie = require('./models/Movie');

class PriceScheduler {
  constructor() {
    this.monitor = new PriceMonitor();
    this.emailService = new EmailService();
    this.scheduledTasks = [];
    this.isRunning = false;
  }

  async start() {
    try {
      console.log('🚀 Starting price monitoring scheduler...');
      
      await this.monitor.initialize();
      this.isRunning = true;
      
      // Schedule 1: Check prices every minute for real-time monitoring
      const priceCheckTask = cron.schedule('* * * * *', async () => {
        if (this.isRunning) {
          console.log('⏰ Running real-time price check...', new Date().toLocaleString());
          try {
            const result = await this.monitor.checkPrices();
            console.log('✅ Real-time price check completed:', result.message);
          } catch (error) {
            console.error('❌ Real-time price check failed:', error);
          }
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Kolkata'
      });
      
      // Schedule 1.1: Peak hour checks every 30 seconds during peak hours (9 AM to 11 PM)
      const peakHourCheckTask = cron.schedule('*/30 9-23 * * *', async () => {
        if (this.isRunning) {
          console.log('🚀 Peak hour rapid check...', new Date().toLocaleString());
          try {
            const result = await this.monitor.checkPrices();
            console.log('✅ Peak hour rapid check completed:', result.message);
          } catch (error) {
            console.error('❌ Peak hour rapid check failed:', error);
          }
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Kolkata'
      });
      
      // Schedule 2: Daily summary at 9 AM
      const dailySummaryTask = cron.schedule('0 9 * * *', async () => {
        if (this.isRunning) {
          console.log('📊 Sending daily summary...', new Date().toLocaleString());
          try {
            await this.sendDailySummary();
          } catch (error) {
            console.error('❌ Daily summary failed:', error);
          }
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Kolkata'
      });
      
      // Schedule 3: Weekly maintenance at Sunday 2 AM
      const weeklyMaintenanceTask = cron.schedule('0 2 * * 0', async () => {
        if (this.isRunning) {
          console.log('🔧 Running weekly maintenance...', new Date().toLocaleString());
          try {
            await this.performWeeklyMaintenance();
          } catch (error) {
            console.error('❌ Weekly maintenance failed:', error);
          }
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Kolkata'
      });
      
      // Schedule 4: Health check every 4 hours
      const healthCheckTask = cron.schedule('0 */4 * * *', async () => {
        if (this.isRunning) {
          console.log('🏥 Running health check...', new Date().toLocaleString());
          try {
            await this.performHealthCheck();
          } catch (error) {
            console.error('❌ Health check failed:', error);
          }
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Kolkata'
      });

      // Store tasks for later management
      this.scheduledTasks = [
        { name: 'Real-time Check (Every minute)', task: priceCheckTask, active: false },
        { name: 'Peak Hour Rapid Check (Every 30 seconds 9AM-11PM)', task: peakHourCheckTask, active: false },
        { name: 'Daily Summary (9 AM)', task: dailySummaryTask, active: false },
        { name: 'Weekly Maintenance (Sunday 2 AM)', task: weeklyMaintenanceTask, active: false },
        { name: 'Health Check (Every 4 hours)', task: healthCheckTask, active: false }
      ];
      
      // Start all scheduled tasks
      this.startAllTasks();
      
      console.log('✅ Price monitoring scheduler started successfully');
      console.log('📅 Active schedules:');
      console.log('   • Real-time price checks: Every minute (24/7)');
      console.log('   • Peak hour rapid checks: Every 30 seconds (9 AM - 11 PM)');
      console.log('   • Daily summary: Every day at 9:00 AM');
      console.log('   • Weekly maintenance: Every Sunday at 2:00 AM');
      console.log('   • Health checks: Every 4 hours');
      
      // Run initial price check
      setTimeout(async () => {
        console.log('🎬 Running initial price check...');
        await this.monitor.checkPrices();
      }, 5000);
      
    } catch (error) {
      console.error('❌ Failed to start scheduler:', error);
      throw error;
    }
  }

  startAllTasks() {
    this.scheduledTasks.forEach(({ name, task }) => {
      task.start();
      console.log(`✅ Started: ${name}`);
    });
  }

  stop() {
    console.log('⏹️ Stopping price monitoring scheduler...');
    this.isRunning = false;
    
    this.scheduledTasks.forEach(({ name, task }) => {
      task.stop();
      console.log(`🛑 Stopped: ${name}`);
    });
    
    console.log('✅ Scheduler stopped successfully');
  }

  async sendDailySummary() {
    try {
      const movies = await Movie.find().sort({ lastChecked: -1 });
      const stats = await this.monitor.getTrackingStats();
      
      if (movies.length > 0) {
        await this.emailService.sendDailySummary(movies);
        console.log('📧 Daily summary email sent successfully');
      } else {
        console.log('📋 No movies being tracked - skipping daily summary');
      }
      
      console.log('📊 Current tracking stats:', stats);
    } catch (error) {
      console.error('❌ Failed to send daily summary:', error);
    }
  }

  async performWeeklyMaintenance() {
    try {
      console.log('🔧 Starting weekly maintenance tasks...');
      
      // 1. Clean up old movies that have had notifications sent for more than 7 days
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oldNotifiedMovies = await Movie.find({
        notificationSent: true,
        updatedAt: { $lt: oneWeekAgo }
      });
      
      if (oldNotifiedMovies.length > 0) {
        console.log(`🗑️ Found ${oldNotifiedMovies.length} old notified movies to clean up`);
        // You can choose to delete them or just log them
        // await Movie.deleteMany({ _id: { $in: oldNotifiedMovies.map(m => m._id) } });
        console.log('📝 Old movies logged for review (not deleted automatically)');
      }
      
      // 2. Update stale movie prices (not checked in last 24 hours)
      const stalePriceMovies = await Movie.find({
        notificationSent: false,
        lastChecked: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      
      if (stalePriceMovies.length > 0) {
        console.log(`🔄 Refreshing ${stalePriceMovies.length} movies with stale prices`);
        for (const movie of stalePriceMovies.slice(0, 5)) { // Limit to 5 to avoid overload
          try {
            const scrapedData = await this.monitor.scraper.scrapeMoviePrices(movie.url);
            if (scrapedData && scrapedData.minPrice) {
              movie.currentPrice = scrapedData.minPrice;
              movie.lastChecked = new Date();
              await movie.save();
              console.log(`✅ Updated price for ${movie.title}: ₹${scrapedData.minPrice}`);
            }
            await this.monitor.delay(3000); // Be respectful with requests
          } catch (error) {
            console.error(`❌ Failed to update ${movie.title}:`, error.message);
          }
        }
      }
      
      // 3. Generate weekly stats
      const stats = await this.monitor.getTrackingStats();
      console.log('📊 Weekly maintenance completed. Current stats:', stats);
      
    } catch (error) {
      console.error('❌ Weekly maintenance failed:', error);
    }
  }

  async performHealthCheck() {
    try {
      console.log('🏥 Performing health check...');
      
      // Check services
      const serviceTest = await this.monitor.testServices();
      
      if (!serviceTest.overall) {
        console.log('⚠️ Health check detected issues:');
        console.log(`   Scraper: ${serviceTest.scraper ? '✅' : '❌'}`);
        console.log(`   Email: ${serviceTest.email ? '✅' : '❌'}`);
        
        // Try to reinitialize if there are issues
        if (!serviceTest.scraper || !serviceTest.email) {
          console.log('🔄 Attempting to reinitialize services...');
          try {
            await this.monitor.close();
            await this.monitor.initialize();
            console.log('✅ Services reinitialized successfully');
          } catch (reinitError) {
            console.error('❌ Failed to reinitialize services:', reinitError);
          }
        }
      } else {
        console.log('✅ Health check passed - all services operational');
      }
      
      // Check database connectivity
      const movieCount = await Movie.countDocuments();
      console.log(`📊 Database health: ${movieCount} movies being tracked`);
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }

  // Manual trigger methods
  async triggerPriceCheck() {
    console.log('🎯 Manually triggered price check...');
    return await this.monitor.checkPrices();
  }

  async triggerDailySummary() {
    console.log('📊 Manually triggered daily summary...');
    return await this.sendDailySummary();
  }

  async triggerWeeklyMaintenance() {
    console.log('🔧 Manually triggered weekly maintenance...');
    return await this.performWeeklyMaintenance();
  }

  async triggerHealthCheck() {
    console.log('🏥 Manually triggered health check...');
    return await this.performHealthCheck();
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeSchedules: this.scheduledTasks.map(({ name, task }) => ({
        name,
        running: task.running || false
      })),
      nextExecutions: {
        priceCheck: '*/30 * * * *',
        dailySummary: '0 9 * * *',
        weeklyMaintenance: '0 2 * * 0',
        healthCheck: '0 */4 * * *'
      }
    };
  }

  // Clean shutdown
  async shutdown() {
    console.log('🔄 Shutting down scheduler gracefully...');
    this.stop();
    await this.monitor.close();
    console.log('✅ Scheduler shutdown completed');
  }
}

module.exports = PriceScheduler;