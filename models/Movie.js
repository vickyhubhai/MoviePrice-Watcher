const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  theater: {
    type: String,
    default: 'Unknown',
    trim: true
  },
  currentPrice: {
    type: Number,
    min: 0
  },
  targetPrice: { 
    type: Number, 
    default: 100,
    min: 0
  },
  url: {
    type: String,
    required: true,
    unique: true
  },
  lastChecked: { 
    type: Date, 
    default: Date.now 
  },
  notificationSent: { 
    type: Boolean, 
    default: false 
  },
  lastNotificationSent: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
movieSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
movieSchema.index({ notificationSent: 1, targetPrice: 1 });
movieSchema.index({ lastChecked: -1 });

module.exports = mongoose.model('Movie', movieSchema);