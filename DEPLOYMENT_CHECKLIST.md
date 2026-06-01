# GENZ WhatsApp Full System - Deployment Checklist

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Backend Environment Configuration
- [ ] Set `NODE_ENV=production` in `.env` file
- [ ] Configure `FRONTEND_URL` with production domain (e.g., https://yourdomain.com)
- [ ] Set `PUBLIC_API_URL` with production API domain
- [ ] Set `MONGODB_URI` with production MongoDB connection string
- [ ] Set `JWT_SECRET` with strong, unique secret key (CRITICAL)
- [ ] Set `JWT_REFRESH_SECRET` with different strong secret key
- [ ] Set `JWT_EXPIRE` to appropriate value (e.g., 7d)
- [ ] Set `JWT_REFRESH_EXPIRES_IN` to appropriate value (e.g., 30d)
- [ ] Set `ADMIN_BOOTSTRAP_TOKEN` with strong random token for admin creation

### 2. Frontend Environment Configuration
- [ ] Set `VITE_API_URL` with production API domain
- [ ] Set `VITE_SOCKET_URL` with production WebSocket domain
- [ ] Set `VITE_VAPID_PUBLIC_KEY` for push notifications
- [ ] Set `VITE_FIREBASE_API_KEY` for Firebase push notifications
- [ ] Set `VITE_FIREBASE_PROJECT_ID` for Firebase
- [ ] Set `VITE_FIREBASE_MESSAGING_SENDER_ID` for Firebase
- [ ] Set `VITE_FIREBASE_APP_ID` for Firebase
- [ ] Set `VITE_FIREBASE_VAPID_KEY` for Firebase
- [ ] Set `VITE_TURN_SERVER_URL` for WebRTC calls
- [ ] Set `VITE_TURN_USERNAME` for WebRTC calls
- [ ] Set `VITE_TURN_CREDENTIAL` for WebRTC calls

### 3. Cloudinary Media Storage (Optional but Recommended)
- [ ] Set `CLOUDINARY_CLOUD_NAME` with Cloudinary account
- [ ] Set `CLOUDINARY_API_KEY` with Cloudinary API key
- [ ] Set `CLOUDINARY_API_SECRET` with Cloudinary API secret
- [ ] Test Cloudinary upload functionality
- [ ] If not configured, ensure local storage has sufficient disk space

### 4. Firebase Push Notifications (Optional but Recommended)
- [ ] Set `FIREBASE_PROJECT_ID` with Firebase project
- [ ] Set `FIREBASE_PRIVATE_KEY_ID` with Firebase key ID
- [ ] Set `FIREBASE_PRIVATE_KEY` with Firebase private key
- [ ] Set `FIREBASE_CLIENT_EMAIL` with Firebase client email
- [ ] Set `FIREBASE_CLIENT_ID` with Firebase client ID
- [ ] Test push notification functionality

### 5. TURN Server for WebRTC Calls (Optional but Recommended)
- [ ] Set `TURN_SERVER_URL` with TURN server URL
- [ ] Set `TURN_USERNAME` with TURN server username
- [ ] Set `TURN_CREDENTIAL` with TURN server credential
- [ ] Set `TURN_SERVER_URL_TCP` for TCP transport
- [ ] Set `TURN_SERVER_URL_TLS` for TLS transport
- [ ] Test WebRTC call functionality

### 6. Sentry Error Tracking (Optional but Recommended)
- [ ] Set `SENTRY_DSN` with Sentry DSN
- [ ] Set `SENTRY_ENVIRONMENT=production`
- [ ] Set `SENTRY_TRACES_SAMPLE_RATE` to appropriate value
- [ ] Set `SENTRY_PROFILES_SAMPLE_RATE` to appropriate value
- [ ] Test Sentry error reporting

### 7. Email Configuration (Required for Password Reset & Email Verification)
- [ ] Set `SMTP_HOST` with SMTP server
- [ ] Set `SMTP_PORT` with SMTP port (usually 587)
- [ ] Set `SMTP_SECURE=false` for TLS
- [ ] Set `SMTP_USER` with SMTP username
- [ ] Set `SMTP_PASS` with SMTP password
- [ ] Set `MAIL_FROM` with sender email
- [ ] Test email sending functionality

### 8. Redis Configuration (Optional for Multi-Instance Scaling)
- [ ] Set `REDIS_URL` with Redis connection string
- [ ] Or set individual variables: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- [ ] Test Redis connection
- [ ] If not configured, system will run in single-instance mode

### 9. VAPID Configuration (Required for Push Notifications)
- [ ] Set `VAPID_PUBLIC_KEY` with VAPID public key
- [ ] Set `VAPID_PRIVATE_KEY` with VAPID private key
- [ ] Set `VAPID_SUBJECT` with contact email

### 10. OpenAI Configuration (Optional for AI Features)
- [ ] Set `OPENAI_API_KEY` with OpenAI API key
- [ ] Set `OPENAI_MODEL` with desired model (e.g., gpt-4o-mini)
- [ ] Test AI assistant functionality

### 11. Giphy Configuration (Optional for GIF Picker)
- [ ] Set `GIPHY_API_KEY` with Giphy API key
- [ ] Test GIF picker functionality

### 12. Payment Gateway Credentials
- [ ] **M-Pesa:**
  - [ ] `MPESA_CONSUMER_KEY` - Set with live credentials
  - [ ] `MPESA_CONSUMER_SECRET` - Set with live credentials
  - [ ] `MPESA_PASSKEY` - Set with live credentials
  - [ ] `MPESA_SHORTCODE` - Set with live shortcode
  - [ ] `MPESA_ENVIRONMENT=production`

- [ ] **Airtel Money:**
  - [ ] `AIRTEL_CLIENT_ID` - Set with live credentials
  - [ ] `AIRTEL_CLIENT_SECRET` - Set with live credentials
  - [ ] `AIRTEL_ENVIRONMENT=production`

- [ ] **Yas:**
  - [ ] `YAS_API_KEY` - Set with live credentials
  - [ ] `YAS_MERCHANT_ID` - Set with live credentials
  - [ ] `YAS_SECRET_KEY` - Set with live credentials
  - [ ] `YAS_ENVIRONMENT=production`

- [ ] **HaloPesa:**
  - [ ] `HALOPESA_API_KEY` - Set with live credentials
  - [ ] `HALOPESA_MERCHANT_ID` - Set with live credentials
  - [ ] `HALOPESA_SECRET_KEY` - Set with live credentials
  - [ ] `HALOPESA_ENVIRONMENT=production`

### 13. Webhook Configuration
- [ ] **M-Pesa:**
  - [ ] Set `MPESA_WEBHOOK_SECRET` with webhook secret from M-Pesa dashboard
  - [ ] Configure webhook URL: `https://yourdomain.com/api/payment/webhook/mpesa`
  - [ ] Set `MPESA_IP_WHITELIST` with M-Pesa IP addresses (optional but recommended)

- [ ] **Airtel Money:**
  - [ ] Set `AIRTEL_WEBHOOK_SECRET` with webhook secret from Airtel dashboard
  - [ ] Configure webhook URL: `https://yourdomain.com/api/payment/webhook/airtel`
  - [ ] Set `AIRTEL_IP_WHITELIST` with Airtel IP addresses (optional but recommended)

- [ ] **Yas:**
  - [ ] Set `YAS_WEBHOOK_SECRET` with webhook secret from Yas dashboard
  - [ ] Configure webhook URL: `https://yourdomain.com/api/payment/webhook/yas`
  - [ ] Set `YAS_IP_WHITELIST` with Yas IP addresses (optional but recommended)

- [ ] **HaloPesa:**
  - [ ] Set `HALOPESA_WEBHOOK_SECRET` with webhook secret from HaloPesa dashboard
  - [ ] Configure webhook URL: `https://yourdomain.com/api/payment/webhook/halopesa`
  - [ ] Set `HALOPESA_IP_WHITELIST` with HaloPesa IP addresses (optional but recommended)

### 14. Database Setup
- [ ] MongoDB production database created
- [ ] Database indexes created (User, Subscription, AuditLog)
- [ ] Database user with appropriate permissions
- [ ] Database connection tested
- [ ] Backup strategy configured

### 15. Security Configuration
- [ ] HTTPS/SSL certificate installed
- [ ] Firewall configured to allow only necessary ports
- [ ] Database access restricted to application server only
- [ ] API rate limiting configured
- [ ] CORS configured to allow only production frontend domain
- [ ] Environment variables secured (not committed to git)

### 16. Admin Setup
- [ ] Create admin user in database with `role: 'admin'` or `isAdmin: true`
- [ ] Test admin login
- [ ] Test admin endpoints (statistics, payments, user management)
- [ ] Verify audit logging is working

## ✅ DEPLOYMENT STEPS

### 17. Voice Changer & Media Upload Testing
- [ ] Test voice recording without effects
- [ ] Test voice recording with child effect
- [ ] Test voice recording with girl effect
- [ ] Test voice recording with boy effect
- [ ] Test voice recording with robot effect
- [ ] Test voice recording with deep effect
- [ ] Test voice recording with echo effect
- [ ] Test media upload functionality (images, videos, audio)
- [ ] Test file validation and MIME type detection
- [ ] Test WAV file upload from voice changer
- [ ] Test file size limits
- [ ] Test file upload error handling

### 18. WebSocket & Real-Time Features Testing
- [ ] Test WebSocket connection
- [ ] Test real-time message delivery
- [ ] Test typing indicators
- [ ] Test online status updates
- [ ] Test message read receipts
- [ ] Test message deletion sync
- [ ] Test conversation creation sync
- [ ] Test participant addition sync
- [ ] Test Redis adapter (if configured)

### 19. Additional Features Testing
- [ ] Test user registration and login
- [ ] Test 2FA (Two-Factor Authentication)
- [ ] Test password reset functionality
- [ ] Test email verification
- [ ] Test profile picture upload
- [ ] Test status updates
- [ ] Test broadcast messages
- [ ] Test call logs
- [ ] Test starred messages
- [ ] Test message locking
- [ ] Test message editing
- [ ] Test disappearing messages
- [ ] Test device pairing (QR code)
- [ ] Test device management
- [ ] Test encryption/decryption (if configured)

## ✅ DEPLOYMENT STEPS

### Backend Deployment
1. **Code Deployment:**
   - [ ] Push latest code to production server
   - [ ] Install dependencies: `npm install --production`
   - [ ] Verify all dependencies are installed

2. **Environment Setup:**
   - [ ] Copy `.env.example` to `.env`
   - [ ] Fill in all required environment variables
   - [ ] Run environment validation (should pass without errors)

3. **Start Server:**
   - [ ] Start backend server: `npm start`
   - [ ] Verify server starts without errors
   - [ ] Check logs for any warnings
   - [ ] Verify MongoDB connection
   - [ ] Verify subscription expiry checker started

4. **Health Check:**
   - [ ] Test `/api/health` endpoint (if exists)
   - [ ] Test `/api/auth/login` endpoint
   - [ ] Test `/api/payment/subscription` endpoint

### Frontend Deployment
1. **Build:**
   - [ ] Update API base URL to production domain
   - [ ] Build frontend: `npm run build`
   - [ ] Verify build completes without errors

2. **Deploy:**
   - [ ] Deploy build files to production server
   - [ ] Configure web server (Nginx/Apache)
   - [ ] Set up SSL/HTTPS
   - [ ] Configure CORS and security headers

3. **Test:**
   - [ ] Test frontend loads in production
   - [ ] Test login functionality
   - [ ] Test subscription status display
   - [ ] Test payment modal
   - [ ] Test admin page (if accessible)

### Webhook Configuration
1. **M-Pesa:**
   - [ ] Login to M-Pesa developer portal
   - [ ] Navigate to webhook configuration
   - [ ] Add webhook URL: `https://yourdomain.com/api/payment/webhook/mpesa`
   - [ ] Save and test webhook
   - [ ] Verify webhook receives test callbacks

2. **Airtel Money:**
   - [ ] Login to Airtel Money developer portal
   - [ ] Navigate to webhook configuration
   - [ ] Add webhook URL: `https://yourdomain.com/api/payment/webhook/airtel`
   - [ ] Save and test webhook
   - [ ] Verify webhook receives test callbacks

3. **Yas:**
   - [ ] Login to Yas developer portal
   - [ ] Navigate to webhook configuration
   - [ ] Add webhook URL: `https://yourdomain.com/api/payment/webhook/yas`
   - [ ] Save and test webhook
   - [ ] Verify webhook receives test callbacks

4. **HaloPesa:**
   - [ ] Login to HaloPesa developer portal
   - [ ] Navigate to webhook configuration
   - [ ] Add webhook URL: `https://yourdomain.com/api/payment/webhook/halopesa`
   - [ ] Save and test webhook
   - [ ] Verify webhook receives test callbacks

## ✅ POST-DEPLOYMENT TESTING

### Core Functionality Testing
- [ ] Test user registration and login
- [ ] Test 2FA (Two-Factor Authentication)
- [ ] Test password reset via email
- [ ] Test email verification
- [ ] Test profile picture upload
- [ ] Test profile settings update
- [ ] Test conversation creation
- [ ] Test one-on-one messaging
- [ ] Test group messaging
- [ ] Test message sending with attachments
- [ ] Test message editing
- [ ] Test message deletion
- [ ] Test message locking
- [ ] Test starred messages
- [ ] Test disappearing messages
- [ ] Test status updates
- [ ] Test broadcast messages
- [ ] Test call logs

### Voice Changer & Media Upload Testing
- [ ] Test voice recording without effects
- [ ] Test voice recording with child effect
- [ ] Test voice recording with girl effect
- [ ] Test voice recording with boy effect
- [ ] Test voice recording with robot effect
- [ ] Test voice recording with deep effect
- [ ] Test voice recording with echo effect
- [ ] Test media upload functionality (images, videos, audio)
- [ ] Test file validation and MIME type detection
- [ ] Test WAV file upload from voice changer
- [ ] Test file size limits
- [ ] Test file upload error handling

### WebSocket & Real-Time Features Testing
- [ ] Test WebSocket connection
- [ ] Test real-time message delivery
- [ ] Test typing indicators
- [ ] Test online status updates
- [ ] Test message read receipts
- [ ] Test message deletion sync
- [ ] Test conversation creation sync
- [ ] Test participant addition sync
- [ ] Test Redis adapter (if configured)

### Device Management Testing
- [ ] Test device pairing (QR code)
- [ ] Test device authentication
- [ ] Test device logout
- [ ] Test device management
- [ ] Test device capabilities update

### WebRTC Call Testing (if TURN server configured)
- [ ] Test audio call initiation
- [ ] Test video call initiation
- [ ] Test call connection
- [ ] Test call termination
- [ ] Test call quality monitoring

### Payment Flow Testing
- [ ] Test payment initiation with M-Pesa
- [ ] Test payment initiation with Airtel Money
- [ ] Test payment initiation with Yas
- [ ] Test payment initiation with HaloPesa
- [ ] Test payment success webhook processing
- [ ] Test payment failure webhook processing
- [ ] Verify premium status updates after successful payment
- [ ] Verify premium status remains locked after failed payment
- [ ] Test idempotency (duplicate webhook delivery)

### Subscription Testing
- [ ] Test subscription activation on payment
- [ ] Test subscription expiry after 2 months
- [ ] Test subscription validation on login
- [ ] Test subscription validation on feature access
- [ ] Test subscription countdown timer display
- [ ] Test automatic premium revocation on expiry

### Admin Testing
- [ ] Test admin login
- [ ] Test admin statistics endpoint
- [ ] Test admin all-payments endpoint
- [ ] Test admin user payment details endpoint
- [ ] Test manual premium activation
- [ ] Test manual premium deactivation
- [ ] Verify audit logging for admin actions
- [ ] Test admin role validation (non-admin access blocked)

### Security Testing
- [ ] Test rate limiting on payment endpoints
- [ ] Test rate limiting on webhook endpoints
- [ ] Test webhook signature validation
- [ ] Test webhook timestamp validation
- [ ] Test IP whitelist (if configured)
- [ ] Test CORS protection
- [ ] Test authentication on protected routes
- [ ] Test admin role validation

### Edge Case Testing
- [ ] Test duplicate payment processing
- [ ] Test delayed webhook delivery
- [ ] Test concurrent payment requests
- [ ] Test expired subscription mid-session
- [ ] Test payment with invalid phone number
- [ ] Test payment with missing parameters
- [ ] Test webhook with invalid signature
- [ ] Test webhook with old timestamp

## ✅ MONITORING SETUP

### Logging
- [ ] Verify structured logging is working
- [ ] Check logs for payment events
- [ ] Check logs for webhook events
- [ ] Check logs for subscription changes
- [ ] Check logs for errors
- [ ] Set up log aggregation (if needed)

### Monitoring
- [ ] Set up server monitoring (CPU, memory, disk)
- [ ] Set up database monitoring
- [ ] Set up API response time monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Set up uptime monitoring
- [ ] Configure alerts for critical failures

### Backup
- [ ] Configure automated database backups
- [ ] Test backup restoration
- [ ] Configure backup retention policy
- [ ] Document backup procedures

## ✅ DOCUMENTATION

- [ ] Update API documentation with production endpoints
- [ ] Document webhook URLs and formats
- [ ] Document environment variables
- [ ] Document deployment procedures
- [ ] Document rollback procedures
- [ ] Document troubleshooting guide
- [ ] Share admin credentials with authorized personnel

## ✅ FINAL VERIFICATION

- [ ] All environment variables set correctly
- [ ] All payment gateways configured
- [ ] All webhooks configured and tested
- [ ] Admin user created and tested
- [ ] Database indexes created
- [ ] Security measures in place
- [ ] Monitoring configured
- [ ] Backups configured
- [ ] Documentation complete
- [ ] Team trained on system usage
- [ ] Rollback plan documented

## ⚠️ CRITICAL REMINDERS

1. **NEVER** commit `.env` file to version control
2. **NEVER** expose API keys or secrets to frontend
3. **NEVER** use simulated payments in production
4. **ALWAYS** validate webhook signatures
5. **ALWAYS** use HTTPS in production
6. **ALWAYS** keep backups
7. **ALWAYS** monitor system health
8. **ALWAYS** test with real payment gateways before go-live

## 🚨 ROLLBACK PLAN

If critical issues are discovered after deployment:

1. **Immediate Actions:**
   - [ ] Stop incoming payments (disable payment endpoints)
   - [ ] Notify users of temporary outage
   - [ ] Investigate issue logs

2. **Rollback Steps:**
   - [ ] Revert to previous stable version
   - [ ] Restore database from backup if needed
   - [ ] Restart services
   - [ ] Verify system stability

3. **Communication:**
   - [ ] Notify team of rollback
   - [ ] Document root cause
   - [ ] Plan fix for future deployment

---

## 📞 SUPPORT CONTACTS

- **Technical Lead:** [Contact]
- **Database Admin:** [Contact]
- **Payment Gateway Support:**
  - M-Pesa: [Contact]
  - Airtel Money: [Contact]
  - Yas: [Contact]
  - HaloPesa: [Contact]

---

**Deployment Checklist Version:** 1.0  
**Last Updated:** 2026-05-08  
**Status:** Ready for GO-LIVE
