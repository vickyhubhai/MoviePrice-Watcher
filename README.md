# 🎬 Movie Price Tracker

A comprehensive movie ticket price monitoring system that tracks prices across multiple Indian booking platforms and sends email notifications when prices reach your target or hit special thresholds like ₹100.

## ✨ Features

- **Multi-Platform Support**: Monitors prices on BookMyShow, PVR, INOX, Cinepolis, and Paytm
- **₹100 Price Alerts**: Special notifications when ticket prices reach exactly ₹100
- **Target Price Monitoring**: Get notified when prices drop to your specified target
- **24/7 Monitoring**: Continuous price checking with different intervals (every 30 seconds during peak hours, every minute otherwise)
- **Email Notifications**: Rich HTML email alerts with platform information and price details
- **Web Interface**: Simple web dashboard to manage tracked movies
- **REST API**: Full API for programmatic access
- **Automatic Scheduling**: Built-in cron jobs for regular price checks and maintenance

## 🚀 Installation

### Dependencies

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Gmail account (for email notifications)
- Puppeteer (uses new headless Chrome mode)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd movie-price-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**

   Create a `.env` file in the root directory:

   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/movie-price-tracker

   # Email Configuration (Gmail)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password

   # Notification Settings
   NOTIFICATION_EMAIL=your-notification-email@gmail.com

   # Application Settings
   PORT=3000
   TARGET_PRICE=100
   NODE_ENV=development
   ```

4. **Gmail App Password Setup**

   For Gmail notifications, you need to:
   - Enable 2-factor authentication on your Gmail account
   - Generate an App Password: [Google Account Settings](https://myaccount.google.com/apppasswords)
   - Use the App Password in the `EMAIL_PASS` field

5. **Start the application**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

## 📖 Usage

### Web Interface

1. Open `http://localhost:3000` in your browser
2. Add movie URLs from supported platforms
3. Set target prices (optional, defaults to ₹100)
4. Monitor prices in real-time

### API Usage

#### Get All Movies
```bash
GET /api/movies
```

#### Add Movie to Track
```bash
POST /api/movies
Content-Type: application/json

{
  "url": "https://bookmyshow.com/movie-url",
  "theater": "PVR Forum Mall",
  "targetPrice": 150
}
```

#### Update Target Price
```bash
PUT /api/movies/:id/target-price
Content-Type: application/json

{
  "targetPrice": 120
}
```

#### Manual Price Check
```bash
POST /api/check-prices
```

#### Get Statistics
```bash
GET /api/stats
```

#### Health Check
```bash
GET /api/health
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Web interface |
| GET | `/api/movies` | Get all tracked movies |
| GET | `/api/movies/:id` | Get specific movie |
| POST | `/api/movies` | Add movie to track |
| PUT | `/api/movies/:id/target-price` | Update target price |
| DELETE | `/api/movies/:id` | Remove movie from tracking |
| POST | `/api/check-prices` | Manual price check |
| GET | `/api/stats` | Get tracking statistics |
| POST | `/api/test-services` | Test all services |
| POST | `/api/test-email` | Send test email |
| POST | `/api/daily-summary` | Send daily summary |
| POST | `/api/reset-notifications` | Reset all notifications |
| GET | `/api/health` | Health check |

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/movie-price-tracker` |
| `EMAIL_USER` | Gmail address for notifications | - |
| `EMAIL_PASS` | Gmail app password | - |
| `NOTIFICATION_EMAIL` | Email to receive notifications | - |
| `PORT` | Server port | `3000` |
| `TARGET_PRICE` | Default target price | `100` |
| `NODE_ENV` | Environment mode | `development` |

### Supported Platforms

- **BookMyShow**: `https://bookmyshow.com/*`
- **PVR**: `https://www.pvrcinemas.com/*`
- **INOX**: `https://www.inoxmovies.com/*`
- **Cinepolis**: `https://www.cinepolisindia.com/*`
- **Paytm**: `https://paytm.com/movies/*`

## 🔔 Notification Types

1. **₹100 Price Alert**: Triggered when any movie price reaches exactly ₹100
2. **Target Price Reached**: Triggered when price drops to or below your target
3. **Price Update**: Regular updates for prices above target (every 4 hours)

## 🛠️ Development

### Project Structure

```
movie-price-tracker/
├── app.js                 # Main Express server
├── scheduler.js           # Cron job scheduler
├── models/
│   └── Movie.js          # MongoDB movie schema
├── services/
│   ├── priceMonitor.js   # Core price monitoring logic
│   ├── emailService.js   # Email notification service
│   └── ...
├── scrapers/
│   ├── universalMovieScraper.js  # Multi-platform scraper
│   └── bookMyShowScraper.js      # Legacy BookMyShow scraper
├── public/
│   └── index.html        # Web interface
└── package.json
```

### Running Tests

```bash
# Test all services
curl -X POST http://localhost:3000/api/test-services

# Send test email
curl -X POST http://localhost:3000/api/test-email
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Adding New Platforms

1. Update the universal scraper in `scrapers/universalMovieScraper.js`
2. Add platform detection logic
3. Test with real URLs
4. Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for personal use only. Please respect the terms of service of the platforms being monitored and avoid excessive requests that could impact their services.

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Include error logs and your environment details

---

**Happy Movie Hunting! 🎭**</content>
<filePath>C:\Users\Vicky\OneDrive\Desktop\DBSM\New folder\movie-price-tracker\README.md