const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const PriceMonitor = require('./services/priceMonitor');
const PriceScheduler = require('./scheduler');
const Movie = require('./models/Movie');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Global variables
let priceMonitor;
let scheduler;

// Connect to MongoDB
console.log('🔌 Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
  initializeServices();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Initialize services
async function initializeServices() {
  try {
    console.log('🚀 Initializing services...');
    
    priceMonitor = new PriceMonitor();
    scheduler = new PriceScheduler();
    
    // Start the scheduler
    await scheduler.start();
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
  }
}

// Routes

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes

// Get all tracked movies
app.get('/api/movies', async (req, res) => {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: movies,
      count: movies.length
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch movies',
      message: error.message 
    });
  }
});

// Get a specific movie
app.get('/api/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'Movie not found'
      });
    }
    res.json({
      success: true,
      data: movie
    });
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch movie',
      message: error.message 
    });
  }
});

// Add a new movie to track
app.post('/api/movies', async (req, res) => {
  try {
    if (!priceMonitor || !priceMonitor.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Services not yet initialized',
        message: 'Please try again in a few seconds'
      });
    }

    const { url, theater, targetPrice } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'Movie URL is required' 
      });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }
    
    const result = await priceMonitor.addMovieToTrack(
      url, 
      theater || 'Unknown',
      targetPrice ? parseInt(targetPrice) : null
    );
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.movie
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        details: result.error
      });
    }
  } catch (error) {
    console.error('Error adding movie:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add movie',
      message: error.message 
    });
  }
});

// Update movie target price
app.put('/api/movies/:id/target-price', async (req, res) => {
  try {
    if (!priceMonitor || !priceMonitor.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Services not yet initialized',
        message: 'Please try again in a few seconds'
      });
    }

    const { targetPrice } = req.body;
    
    if (!targetPrice || isNaN(targetPrice) || targetPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid target price is required'
      });
    }
    
    const result = await priceMonitor.updateMovieTargetPrice(req.params.id, parseInt(targetPrice));
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.movie
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error updating target price:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update target price',
      message: error.message 
    });
  }
});

// Remove movie from tracking
app.delete('/api/movies/:id', async (req, res) => {
  try {
    if (!priceMonitor || !priceMonitor.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Services not yet initialized',
        message: 'Please try again in a few seconds'
      });
    }

    const result = await priceMonitor.removeMovieFromTracking(req.params.id);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error removing movie:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove movie',
      message: error.message 
    });
  }
});

// Manual price check
app.post('/api/check-prices', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: 'Scheduler not yet initialized',
        message: 'Please try again in a few seconds'
      });
    }

    const result = await scheduler.triggerPriceCheck();
    
    res.json({
      success: result.success,
      message: result.message,
      data: {
        checkedCount: result.checkedCount,
        alertsSent: result.alertsSent,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error('Error checking prices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check prices',
      message: error.message 
    });
  }
});

// Get tracking statistics
app.get('/api/stats', async (req, res) => {
  try {
    if (!priceMonitor || !priceMonitor.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Services not yet initialized',
        message: 'Please try again in a few seconds'
      });
    }

    const stats = await priceMonitor.getTrackingStats();
    const schedulerStatus = scheduler ? scheduler.getStatus() : null;

    res.json({
      success: true,
      data: {
        ...stats,
        scheduler: schedulerStatus
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

// Test services
app.post('/api/test-services', async (req, res) => {
  try {
    if (!priceMonitor || !priceMonitor.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Services not yet initialized',
        message: 'Please try again in a few seconds'
      });
    }

    const testResults = await priceMonitor.testServices();
    
    res.json({
      success: true,
      data: testResults
    });
  } catch (error) {
    console.error('Error testing services:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test services',
      message: error.message 
    });
  }
});

// Send test email
app.post('/api/test-email', async (req, res) => {
  try {
    const emailService = require('./services/emailService');
    const emailSender = new emailService();
    
    const result = await emailSender.sendTestEmail();
    
    res.json({
      success: result,
      message: result ? 'Test email sent successfully' : 'Failed to send test email'
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test email',
      message: error.message 
    });
  }
});

// Manual daily summary
app.post('/api/daily-summary', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: 'Scheduler not yet initialized',
        message: 'Please try again in a few seconds'
      });
    }

    await scheduler.triggerDailySummary();
    
    res.json({
      success: true,
      message: 'Daily summary sent successfully'
    });
  } catch (error) {
    console.error('Error sending daily summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send daily summary',
      message: error.message 
    });
  }
});

// Reset all notifications
app.post('/api/reset-notifications', async (req, res) => {
  try {
    if (!priceMonitor || !priceMonitor.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Services not yet initialized',
        message: 'Please try again in a few seconds'
      });
    }

    const result = await priceMonitor.resetNotifications();
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Error resetting notifications:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset notifications',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: 'Scheduler not yet initialized',
        message: 'Please try again in a few seconds',
        timestamp: new Date().toISOString(),
        status: 'initializing'
      });
    }

    const healthCheck = await scheduler.triggerHealthCheck();
    
    res.json({
      success: true,
      message: 'Health check completed',
      timestamp: new Date().toISOString(),
      status: 'healthy'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      status: 'unhealthy'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Received SIGINT. Shutting down gracefully...');
  
  if (scheduler) {
    await scheduler.shutdown();
  }
  
  if (priceMonitor) {
    await priceMonitor.close();
  }
  
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM. Shutting down gracefully...');
  
  if (scheduler) {
    await scheduler.shutdown();
  }
  
  if (priceMonitor) {
    await priceMonitor.close();
  }
  
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log('🌟 Movie Price Tracker Server Started 🌟');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Access the application at: http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at: http://localhost:${PORT}/api`);
  console.log('📧 Email notifications will be sent to:', process.env.NOTIFICATION_EMAIL);
  console.log('🎯 Default target price: ₹' + (process.env.TARGET_PRICE || 100));
});

module.exports = app;