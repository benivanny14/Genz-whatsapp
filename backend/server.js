require('dotenv').config();

// Global error handlers to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('FATAL UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { isDeviceAllowed } = require('./utils/deviceSession');
const connectDB = require('./config/db');
const { encrypt, decrypt } = require("./utils/encryption");
const multer = require("multer");
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { logger, logRequest, logError } = require('./config/winston');
const { initSentry, captureException } = require('./config/sentry');
const {
  uploadFile: uploadToMediaStorage,
  getFileType,
  validateFile,
  FILE_SIZE_LIMITS,
  isConfigured: isCloudinaryConfigured
} = require('./config/cloudinary');

// Define uploads directory path (always needed for multer config)
const uploadDir = path.join(__dirname, 'uploads');

// Ensure uploads directory exists (only if Cloudinary is NOT configured)
if (!isCloudinaryConfigured()) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ Uploads directory created:', uploadDir);
    console.warn('[WARNING] Using local storage. Configure Cloudinary for production to avoid data loss on redeploy.');
  }
}

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || Math.max(...Object.values(FILE_SIZE_LIMITS)));
const UPLOAD_DIR_RESOLVED = path.resolve(uploadDir);

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const validation = validateFile({
      ...file,
      size: 0
    });

    if (!validation.valid) {
      return cb(new Error(validation.error), false);
    }

    return cb(null, true);
  }
});
const validateEnv = require('./utils/validateEnv');
const { protect } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const { createClient } = require('redis');
const {
  configureHelmet,
  authRateLimiter,
  apiRateLimiter,
  strictRateLimiter,
  xssProtection,
  sanitizeInput,
  securityHeaders,
  validateOrigin
} = require('./middleware/security');
const mongoSanitize = require('express-mongo-sanitize');
const setupSocket = require('./socket');
const secureUploads = require('./middleware/secureUploads');
const { buildSignedUploadUrl, signLocalUrlIfNeeded } = require('./utils/mediaAccess');

// CRITICAL: JWT secret must be set in environment variables.
// The secrets module throws FATAL at startup if it is missing.
const { JWT_SECRET } = require('./config/secrets');

const DEFAULT_LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const { resolvePublicBaseUrl } = require('./utils/publicBaseUrl');
const getPublicBaseUrl = (req) => resolvePublicBaseUrl(req);
const publicApiOrigin = (process.env.PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
const frontendOrigin = process.env.FRONTEND_URL?.replace(/\/$/, '');

// Shared allowlist of application origins, used by both CORS and the CSRF
// Origin guard so the two policies can never drift apart.
const appOrigins = [
  process.env.FRONTEND_URL,
  process.env.PUBLIC_API_URL,
  // Allow only the specific Render URL
  'https://genz-whatsapp-1.onrender.com',
  // Development origins
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
].filter(Boolean);

const isAllowedAppOrigin = (origin) => {
  if (!origin) return true;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  return appOrigins.includes(origin);
};

const cspConnectSources = ["'self'", "https:", publicApiOrigin, "http://localhost:5000", ...(frontendOrigin ? [frontendOrigin] : [])];

// Validate environment variables on startup
validateEnv();

// Initialize Sentry for error tracking
initSentry();

const isTestEnvironment = process.env.NODE_ENV === 'test';

// Redis client setup for distributed socket architecture. Tests avoid external
// sockets so CI cannot hang waiting for infrastructure that is not part of the test.
let redisClient = null;
let pubClient = null;
let subClient = null;
let redisReadyPromise = null;

// Redis client setup for distributed socket architecture
// Redis is optional - the system works in single-instance mode without it
if (!isTestEnvironment && process.env.REDIS_URL) {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      password: process.env.REDIS_PASSWORD || undefined
    });

    pubClient = redisClient.duplicate();
    subClient = redisClient.duplicate();

    redisClient.on('error', (err) => logger.warn('Redis Client Error:', err.message));
    pubClient.on('error', (err) => logger.warn('Redis Pub Client Error:', err.message));
    subClient.on('error', (err) => logger.warn('Redis Sub Client Error:', err.message));

    redisReadyPromise = (async () => {
      await redisClient.connect();
      await pubClient.connect();
      await subClient.connect();
      if (app) app.set('redisClient', redisClient);
      logger.info('✅ Redis connected for distributed socket architecture');
      return true;
    })().catch((err) => {
      logger.warn('Redis connection failed, running in single-instance mode:', err.message);
      redisClient = null;
      pubClient = null;
      subClient = null;
      if (app) app.set('redisClient', null);
      return false;
    });
  } catch (err) {
    logger.warn('⚠️  Redis setup failed, running in single-instance mode:', err.message);
  }
} else if (!isTestEnvironment && process.env.REDIS_HOST) {
  // Legacy REDIS_HOST support
  try {
    const redisUrl = `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`;
    redisClient = createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD || undefined
    });

    pubClient = redisClient.duplicate();
    subClient = redisClient.duplicate();

    redisClient.on('error', (err) => logger.warn('Redis Client Error:', err.message));

    redisReadyPromise = (async () => {
      await redisClient.connect();
      await pubClient.connect();
      await subClient.connect();
      if (app) app.set('redisClient', redisClient);
      logger.info('✅ Redis connected for distributed socket architecture');
      return true;
    })().catch((err) => {
      logger.warn('Redis connection failed, running in single-instance mode:', err.message);
      redisClient = null;
      pubClient = null;
      subClient = null;
      return false;
    });
  } catch (err) {
    logger.warn('⚠️  Redis setup failed, running in single-instance mode:', err.message);
  }
}

// Import MongoDB Models
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const User = require('./models/User');
const { runExpiryCheck } = require('./controllers/manualPaymentController');

const ensureLocalUser = async () => {
  try {
    if (User.db.readyState !== 1) {
      return;
    }

    await User.findByIdAndUpdate(
      DEFAULT_LOCAL_USER_ID,
      {
        $setOnInsert: {
          _id: DEFAULT_LOCAL_USER_ID,
          username: 'GENZ User',
          phoneNumber: 'local-web-device',
          deviceId: 'local-web-device',
          status: 'offline'
        }
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    console.warn('Could not ensure local fallback user:', error.message);
  }
};

let scheduledMessageInterval = null;
let manualPaymentExpiryInterval = null;
let expiredMessageCleanupInterval = null;

const startScheduledMessageDispatcher = (ioInstance) => {
  if (scheduledMessageInterval) {
    return scheduledMessageInterval;
  }

  const ScheduledMessage = require('./models/ScheduledMessage');

  scheduledMessageInterval = setInterval(async () => {
    try {
      if (mongoose.connection.readyState !== 1) return;

      const now = new Date();
      const dueMessages = await ScheduledMessage.find({
        status: 'pending',
        sendAt: { $lte: now }
      })
        .populate('conversationId')
        .limit(50);

      for (const scheduledMsg of dueMessages) {
        try {
          // Create the actual message
          const message = await Message.create({
            conversationId: scheduledMsg.conversationId._id,
            sender: scheduledMsg.sender,
            content: scheduledMsg.content,
            messageType: scheduledMsg.messageType,
            mediaUrl: scheduledMsg.mediaUrl,
            fileName: scheduledMsg.fileName,
            fileSize: scheduledMsg.fileSize
          });

          // Update scheduled message status
          scheduledMsg.status = 'sent';
          scheduledMsg.sentAt = now;
          await scheduledMsg.save();

          // Update conversation
          await Conversation.findByIdAndUpdate(scheduledMsg.conversationId._id, {
            lastMessage: message._id,
            updatedAt: now
          });

          // Emit socket event for real-time delivery
          if (ioInstance) {
            const populatedMessage = await Message.findById(message._id)
              .populate('sender', 'username profilePicture')
              .populate('replyTo');
            ioInstance.to(scheduledMsg.conversationId._id.toString()).emit('message:received', populatedMessage);
          }

          console.log(`[ScheduledMessage] Sent message ${message._id} for conversation ${scheduledMsg.conversationId._id}`);
        } catch (error) {
          console.error('[ScheduledMessage] Failed to send message:', error);
          
          scheduledMsg.status = 'failed';
          scheduledMsg.errorMessage = error.message;
          scheduledMsg.retryCount = (scheduledMsg.retryCount || 0) + 1;
          
          if (scheduledMsg.retryCount < scheduledMsg.maxRetries) {
            scheduledMsg.status = 'pending'; // Retry later
          }
          
          await scheduledMsg.save();
        }
      }
    } catch (error) {
      console.error('Scheduled message dispatcher error:', error.message);
    }
  }, 30 * 1000);

  return scheduledMessageInterval;
};

const startExpiredMessageCleanup = (ioInstance) => {
  if (expiredMessageCleanupInterval) {
    return expiredMessageCleanupInterval;
  }

  expiredMessageCleanupInterval = setInterval(async () => {
    try {
      if (mongoose.connection.readyState !== 1) return;

      const now = new Date();
      
      const expiredSelfDestruct = await Message.find({
        isSelfDestruct: true,
        disappearAt: { $lte: now }
      }).select('_id conversationId').lean();

      if (expiredSelfDestruct.length > 0) {
        await Message.deleteMany({
          _id: { $in: expiredSelfDestruct.map((m) => m._id) }
        });
        if (ioInstance) {
          expiredSelfDestruct.forEach((msg) => {
            ioInstance.to(String(msg.conversationId)).emit('message:consumed', {
              messageId: msg._id,
              conversationId: msg.conversationId,
              isSelfDestruct: true,
              isViewOnce: false
            });
          });
        }
        logger.debug('Deleted expired self-destruct messages', { count: expiredSelfDestruct.length });
      }

      // Also handle view-once messages that should be permanently removed
      const viewOnceResult = await Message.deleteMany({
        isViewOnce: true,
        isConsumed: true,
        createdAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // Delete after 24 hours
      });

      if (viewOnceResult.deletedCount > 0) {
        logger.debug('Deleted old view-once messages', { count: viewOnceResult.deletedCount });
      }
    } catch (error) {
      logger.error('Error cleaning up expired messages', { message: error.message });
    }
  }, 60 * 1000); // Run every minute

  return expiredMessageCleanupInterval;
};

const startBackgroundServices = async (ioInstance) => {
  await connectDB();
  await ensureLocalUser();
  startScheduledMessageDispatcher(ioInstance);
  startExpiredMessageCleanup(ioInstance);

  // Start scheduled user backups (P4): runs hourly by default; only users with
  // backupSettings.enabled and an interval that has elapsed are processed.
  try {
    const { startBackupScheduler } = require('./utils/backupScheduler');
    startBackupScheduler();
  } catch (error) {
    logger.warn('Backup scheduler not started:', error.message);
  }

  // Start manual payment expiry checker (marks expired subscriptions, runs every 6 hours)
  if (!manualPaymentExpiryInterval) {
    manualPaymentExpiryInterval = setInterval(async () => {
      try {
        logger.info('Running manual payment expiry check');
        const result = await runExpiryCheck(ioInstance);
        logger.info('Manual payment expiry check completed', { processed: result });
      } catch (error) {
        logger.error('Manual payment expiry check failed', { message: error.message });
      }
    }, 6 * 60 * 60 * 1000);
  }
};

const app = express();
app.set('trust proxy', process.env.TRUST_PROXY || 1);
if (redisClient) {
  app.set('redisClient', redisClient);
}

// Production diagnostics: every request gets a stable ID for logs, errors,
// client reports, and cross-service tracing.
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// CORS: Simple and robust configuration for development and production
const ALLOWED_CORS_HEADERS = [
  'Content-Type',
  'Authorization',
  'x-device-id',
  'X-Device-ID',
  'x-device-platform',
  'X-Device-Platform',
  'x-device-language',
  'X-Device-Language',
  'X-Requested-With',
  'Accept',
  'Origin',
  'x-admin-bootstrap-token',
  'X-Admin-Bootstrap-Token'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (isAllowedAppOrigin(origin)) {
      return callback(null, true);
    } else {
      console.warn('[CORS] Blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ALLOWED_CORS_HEADERS,
  optionsSuccessStatus: 204
};

// Apply CORS middleware BEFORE all routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(securityHeaders);
// CSRF defense-in-depth: reject state-changing requests from unlisted origins
app.use(validateOrigin(appOrigins));

// Security headers for production
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", publicApiOrigin, "http://localhost:5000"],
      connectSrc: cspConnectSources,
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", publicApiOrigin, "http://localhost:5000"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Compression middleware for performance
app.use(compression());

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased limit to handle recovery from overload
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Split auth rate limiting so a burst of authenticated calls (background
// polling of /auth/me, settings refreshes, etc.) cannot exhaust the budget
// shared with the login endpoint, and so 2FA/security attempts get their own
// budget too.
const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : (process.env.NODE_ENV === 'test' ? 100000 : 20),
  message: {
    success: false,
    error: 'Too many login/registration attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : (process.env.NODE_ENV === 'test' ? 100000 : 500),
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const securityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : (process.env.NODE_ENV === 'test' ? 100000 : 50),
  message: {
    success: false,
    error: 'Too many security requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes (wrapped to avoid crashing on misconfigured limiter)
const safeMiddleware = (mw) => (req, res, next) => {
  try {
    const result = mw(req, res, next);
    // If the middleware returns a promise, catch rejections so they don't bubble
    if (result && typeof result.then === 'function') {
      return result.catch((err) => {
        console.error('Rate limiter promise error:', err && err.message ? err.message : err);
        next();
      });
    }
    return result;
  } catch (err) {
    console.error('Rate limiter sync error:', err && err.message ? err.message : err);
    return next();
  }
};

app.use('/api/', safeMiddleware(apiLimiter));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logRequest(req, res, duration);
  });
  next();
});

app.use(express.json({
  limit: process.env.JSON_BODY_LIMIT || '2mb',
  verify: (req, res, buf) => {
    req.rawBody = buf?.length ? buf.toString('utf8') : '';
  }
}));
app.use(express.urlencoded({ extended: true, limit: process.env.FORM_BODY_LIMIT || '2mb' }));
app.use(cookieParser());
app.use(mongoSanitize({ replaceWith: '_', allowDots: false }));
app.use(sanitizeInput);

const getHealthPayload = () => ({
  success: true,
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  services: {
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redisClient?.isOpen ? 'connected' : 'disabled',
    mediaStorage: isCloudinaryConfigured() ? 'cloudinary' : 'local'
  }
});

app.get('/api/health', (req, res) => {
  res.json(getHealthPayload());
});

app.get('/api/health/live', (req, res) => {
  res.json({ success: true, status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/api/health/ready', (req, res) => {
  const payload = getHealthPayload();
  const ready = payload.services.mongo === 'connected' || process.env.NODE_ENV !== 'production';
  res.status(ready ? 200 : 503).json({
    ...payload,
    status: ready ? 'ready' : 'not_ready'
  });
});

// Serve uploaded files with signed URL or JWT protection in production
app.use('/uploads', secureUploads, (req, res) => {
  // Set CORS headers for all uploaded files
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Remove any socket ID suffix from filename (e.g., -user-h-xxx)
  let cleanPath = req.path;
  const socketIdMatch = cleanPath.match(/-user-[a-zA-Z0-9]+$/);
  if (socketIdMatch) {
    cleanPath = cleanPath.replace(/-user-[a-zA-Z0-9]+$/, '');
    logger.debug('Removed socket ID suffix from path', { requestId: req.id, originalPath: req.path, cleanPath });
  }
  
  const filePath = path.resolve(uploadDir, `.${cleanPath}`);
  if (!filePath.startsWith(`${UPLOAD_DIR_RESOLVED}${path.sep}`) && filePath !== UPLOAD_DIR_RESOLVED) {
    logger.warn('Blocked unsafe upload path traversal attempt', { requestId: req.id, path: req.path });
    return res.status(400).json({
      success: false,
      error: 'Invalid media path'
    });
  }
  
  // Check if file exists before serving
  if (!fs.existsSync(filePath)) {
    logger.warn('Media file not found', { requestId: req.id, filePath });
    return res.status(404).json({
      success: false,
      error: 'Media file not found'
    });
  }
  
  // Set cache headers based on file type
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
  } else if (/\.(mp4|webm|mov)$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
  } else {
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days default
  }
  
  // Serve the file
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('❌ Error serving file:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to serve media file'
        });
      }
    }
  });
});

// Import Routes
const chatRoutes = require('./routes/chatRoutes');
const advancedRoutes = require('./routes/advancedRoutes');
const { userRoutes: manualPaymentUserRoutes, adminRoutes: manualPaymentAdminRoutes } = require('./routes/manualPaymentRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const channelRoutes = require('./routes/channelRoutes');
const securityRoutes = require('./routes/securityRoutes');
const genzModsRoutes = require('./routes/genzModsRoutes');
const backupRoutes = require('./routes/backupRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const authRoutes = require('./routes/authRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const mediaRoutes = require('./routes/media');
const encryptionRoutes = require('./routes/encryptionRoutes');
const webrtcRoutes = require('./routes/webrtcRoutes');
const callRoutes = require('./routes/callRoutes');
const productRoutes = require('./routes/productRoutes');
const scheduledMessageRoutes = require('./routes/scheduledMessageRoutes');
const stickerRoutes = require('./routes/stickerRoutes');
const statusRoutes = require('./routes/status');
const statusAdvancedRoutes = require('./routes/status-advanced');
const paymentRoutes = require('./routes/paymentRoutes');
const paymentFeaturesRoutes = require('./routes/payment-features');
const settingsRoutes = require('./routes/settingsRoutes');
const privacyContactsRoutes = require('./routes/privacyContactsRoutes');
const phoneContactsRoutes = require('./routes/phone-contacts');
const communityRoutes = require('./routes/communities');
const groupInviteRoutes = require('./routes/group-invite');
const antiRevokeRoutes = require('./routes/anti-revoke');
const privacyModsRoutes = require('./routes/privacy-mods');
const mediaModsRoutes = require('./routes/media-mods');
const customizationModsRoutes = require('./routes/customization-mods');
const automationModsRoutes = require('./routes/automation-mods');
const securityModsRoutes = require('./routes/security-mods');
const chatListModsRoutes = require('./routes/chat-list-mods');
const messageModsRoutes = require('./routes/message-mods');
const groupModsRoutes = require('./routes/group-mods');

// Newly-wired feature routes (previously orphaned controllers)
const bulkSenderRoutes = require('./routes/bulk-sender');
const businessAccountRoutes = require('./routes/business-account');
const cacheCleanerRoutes = require('./routes/cache-cleaner');
const callBlockerRoutes = require('./routes/call-blocker');
const callFeaturesRoutes = require('./routes/call-features');
const chatAnalyzerRoutes = require('./routes/chat-analyzer');
const chatFilterRoutes = require('./routes/chat-filter');
const chatFoldersRoutes = require('./routes/chat-folders');
const chatSearchRoutes = require('./routes/chat-search');
const chatSortRoutes = require('./routes/chat-sort');
const dataUsageRoutes = require('./routes/data-usage');
const fakeChatRoutes = require('./routes/fake-chat');
const fileManagerRoutes = require('./routes/file-manager');
const gifPlayerRoutes = require('./routes/gif-player');
const groupFeaturesRoutes = require('./routes/group-features');
const liveReactionsRoutes = require('./routes/live-reactions');
const mediaCompressorRoutes = require('./routes/media-compressor');
const mediaEditorRoutes = require('./routes/media-editor');
const messageTranslatorRoutes = require('./routes/message-translator');
const multiAccountsRoutes = require('./routes/multi-accounts');
const quickActionsRoutes = require('./routes/quick-actions');
const statusFeaturesRoutes = require('./routes/status-features');
const storageManagerRoutes = require('./routes/storage-manager');
const storyHighlightsRoutes = require('./routes/story-highlights');
const textRepeaterRoutes = require('./routes/text-repeater');
const themeEngineRoutes = require('./routes/theme-engine');
const whatsappWebRoutes = require('./routes/whatsapp-web');
const antiBanRoutes = require('./routes/anti-ban');
const locationSharingRoutes = require('./routes/location-sharing');

// Mount Routes
app.use('/api/auth', safeMiddleware(authGeneralLimiter), authRoutes);

// Admin auth routes with a single secret base path
const ADMIN_BASE_PATH = process.env.ADMIN_BASE_PATH || '/api/system-gateway-x9k';

app.use(`${ADMIN_BASE_PATH}/auth`, adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/advanced', advancedRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/payment/manual', manualPaymentUserRoutes);
app.use('/api/admin/manual-payments', manualPaymentAdminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/security', safeMiddleware(securityLimiter), securityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/privacy', privacyContactsRoutes);
app.use('/api/contacts', phoneContactsRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/groups', groupInviteRoutes);
app.use('/api/anti-revoke', antiRevokeRoutes);
app.use('/api/privacy-mods', privacyModsRoutes);
app.use('/api/media-mods', mediaModsRoutes);
app.use('/api/customization-mods', customizationModsRoutes);
app.use('/api/automation-mods', automationModsRoutes);
app.use('/api/security-mods', securityModsRoutes);
app.use('/api/chat-list-mods', chatListModsRoutes);
app.use('/api/message-mods', messageModsRoutes);
app.use('/api/group-mods', groupModsRoutes);
app.use('/api/genz-mods', genzModsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/stickers', stickerRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/encryption', encryptionRoutes);
app.use('/api/webrtc', webrtcRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/products', productRoutes);
app.use('/api/scheduled-messages', scheduledMessageRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/status-advanced', statusAdvancedRoutes);
app.use('/api/payment-features', paymentFeaturesRoutes);
app.use('/api/channels', channelRoutes);

// Newly-wired feature routes (previously orphaned controllers)
app.use('/api/bulk-sender', bulkSenderRoutes);
app.use('/api/business-account', businessAccountRoutes);
app.use('/api/cache-cleaner', cacheCleanerRoutes);
app.use('/api/call-blocker', callBlockerRoutes);
app.use('/api/call-features', callFeaturesRoutes);
app.use('/api/chat-analyzer', chatAnalyzerRoutes);
app.use('/api/chat-filter', chatFilterRoutes);
app.use('/api/chat-folders', chatFoldersRoutes);
app.use('/api/chat-search', chatSearchRoutes);
app.use('/api/chat-sort', chatSortRoutes);
app.use('/api/data-usage', dataUsageRoutes);
app.use('/api/fake-chat', fakeChatRoutes);
app.use('/api/file-manager', fileManagerRoutes);
app.use('/api/gif-player', gifPlayerRoutes);
app.use('/api/group-features', groupFeaturesRoutes);
app.use('/api/live-reactions', liveReactionsRoutes);
app.use('/api/media-compressor', mediaCompressorRoutes);
app.use('/api/media-editor', mediaEditorRoutes);
app.use('/api/message-translator', messageTranslatorRoutes);
app.use('/api/multi-accounts', multiAccountsRoutes);
app.use('/api/quick-actions', quickActionsRoutes);
app.use('/api/status-features', statusFeaturesRoutes);
app.use('/api/storage-manager', storageManagerRoutes);
app.use('/api/story-highlights', storyHighlightsRoutes);
app.use('/api/text-repeater', textRepeaterRoutes);
app.use('/api/theme-engine', themeEngineRoutes);
app.use('/api/whatsapp-web', whatsappWebRoutes);
app.use('/api/anti-ban', antiBanRoutes);
app.use('/api/location-sharing', locationSharingRoutes);

// File upload route
app.post('/api/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }


    const validation = validateFile(req.file);
    if (!validation.valid) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    logger.info('File upload accepted', {
      requestId: req.id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    let fileUrl = signLocalUrlIfNeeded(
      `${getPublicBaseUrl(req)}/uploads/${req.file.filename}`,
      getPublicBaseUrl(req)
    );
    let publicId = req.file.filename;
    let storageProvider = 'local';
    let thumbnailUrl = null;

    if (isCloudinaryConfigured() && req.file.path) {
      const fileType = getFileType(req.file.originalname, req.file.mimetype) || (req.file.mimetype || '').split('/')[0] || 'document';
      const uploadResult = await uploadToMediaStorage(req.file.path, fileType, {
        folder: 'genz-whatsapp/general'
      });

      fileUrl = uploadResult.url;
      publicId = uploadResult.publicId;
      storageProvider = uploadResult.storageProvider || 'cloudinary';
      thumbnailUrl = uploadResult.thumbnailUrl || null;
      fs.promises.unlink(req.file.path).catch(() => {});
    }
    
    res.json({ 
      success: true, 
      fileUrl: fileUrl,
      publicId,
      storageProvider,
      thumbnailUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    logger.error('Upload error', { message: error.message, requestId: req.id });
    res.status(500).json({
      success: false,
      error: 'Failed to upload file'
    });
  }
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    },
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: req.app.get('redisClient')?.isOpen ? 'connected' : 'disconnected',
      cloudinary: isCloudinaryConfigured() ? 'configured' : 'not configured'
    }
  };
  res.json(health);
});

// IMPORTANT: API Fallback - Never return HTML for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

// Serve built frontend when deployed as a single service (e.g. genz-whatsapp-1.onrender.com)
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath, { maxAge: '1d', index: false }));
  app.get(/^\/(?!api\/|uploads\/|socket\.io).*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.sendFile(frontendIndexPath);
  });
}

const server = http.createServer(app);

// Socket.IO configuration with Redis adapter support for distributed architecture
const socketCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.PUBLIC_API_URL ? [process.env.PUBLIC_API_URL] : []),
  'https://genz-whatsapp-1.onrender.com'
];

const ioConfig = {
  cors: {
    origin: socketCorsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ALLOWED_CORS_HEADERS
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000
};

const io = new Server(server, ioConfig);
app.set('io', io);

// Attach Redis after all Redis clients are connected. This avoids startup races
// where Socket.IO receives disconnected pub/sub clients.
if (redisReadyPromise) {
  redisReadyPromise.then((ready) => {
    if (!ready || !pubClient || !subClient) return;
    const { createAdapter } = require('@socket.io/redis-adapter');
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter attached');

    // Distribute presence state across instances via the same pub/sub clients.
    const presenceStore = require('./utils/presenceStore');
    presenceStore.init({ pubClient, subClient });
    logger.info('Presence store attached to Redis');
  });
}

// Export onlineUsers map so controllers and other parts of the app can access it
const onlineUsers = new Map();
// Attach to both global (for backward compat) and app (for clean access)
global.onlineUsers = onlineUsers;
app.set('onlineUsers', onlineUsers);

// Socket authentication middleware - JWT required. There is no tokenless
// fallback: every connection must present a valid access token (via the
// handshake auth payload or the httpOnly cookie) or it is rejected.
io.use(async (socket, next) => {
  try {
    const authToken = socket.handshake.auth?.token;
    const headerToken = socket.handshake.headers?.cookie
      ? socket.handshake.headers.cookie
          .split(';')
          .map((part) => part.trim())
          .find((part) => part.startsWith('token='))
          ?.slice('token='.length)
      : undefined;
    const token = (authToken && authToken !== 'null' && authToken !== 'undefined' && authToken !== 'undefined')
      ? authToken
      : headerToken;

    if (!token || token === 'null' || token === 'undefined') {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.typ === 'refresh') {
        return next(new Error('Invalid token type for socket'));
      }
      const user = await User.findById(decoded.id).select('-passwordHash -twoFactorSecret');
      if (!user || user.isBlocked) {
        return next(new Error('User not authorized'));
      }
      const deviceAllowed = await isDeviceAllowed(decoded);
      if (!deviceAllowed) {
        return next(new Error('Session has been logged out on this device'));
      }
      socket.userId = user._id.toString();
      socket.user = user;
      return next();
    } catch (authError) {
      logger.warn('Socket JWT auth failed:', authError.message);
      return next(new Error('Authentication failed'));
    }
  } catch (error) {
    logger.error('Socket connection error', { error: error.message });
    next(new Error('Authentication failed'));
  }
});

setupSocket(io);

// Legacy socket handlers have been removed. All socket functionality is now
// handled by the modern socket layer in backend/socket/index.js which provides:
// - Proper database integration
// - Better error handling
// - Memory leak prevention
// - Distributed architecture support

// If you need to enable legacy mode for testing, set ENABLE_LEGACY_SOCKET=true
// but note this may cause instability and is not recommended for production.
// Legacy socket handlers have been completely removed.
// All socket functionality is now handled by the modern socket layer
// in backend/socket/index.js for better stability and performance.

// Error handling middleware (must be after all routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('Graceful shutdown started', { signal });

  if (scheduledMessageInterval) clearInterval(scheduledMessageInterval);
  if (manualPaymentExpiryInterval) clearInterval(manualPaymentExpiryInterval);
  if (expiredMessageCleanupInterval) clearInterval(expiredMessageCleanupInterval);

  await new Promise((resolve) => {
    server.close(() => resolve());
    setTimeout(resolve, 10000).unref();
  });

  io.close();

  await Promise.allSettled([
    redisClient?.quit?.(),
    pubClient?.quit?.(),
    subClient?.quit?.(),
    mongoose.connection.readyState ? mongoose.connection.close(false) : Promise.resolve()
  ]);

  logger.info('Graceful shutdown completed', { signal });

  // Exit non-zero when the shutdown was triggered by a failure (startup error,
  // uncaught exception) so the process manager / Render restarts the service
  // instead of treating a crash as a clean stop.
  const isFailureShutdown = signal === 'uncaughtException' || signal === 'startupFailure';
  process.exit(isFailureShutdown ? 1 : 0);
};

if (!isTestEnvironment) {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      message: reason?.message || String(reason),
      stack: reason?.stack
    });
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { message: error.message, stack: error.stack });
    gracefulShutdown('uncaughtException');
  });
}

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    logger.info('TM Backend started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      publicApiUrl: process.env.PUBLIC_API_URL || process.env.BACKEND_URL || `http://localhost:${PORT}`,
      frontendUrl: process.env.FRONTEND_URL || null,
      mediaStorage: isCloudinaryConfigured() ? 'cloudinary' : 'local',
      redisConfigured: Boolean(process.env.REDIS_URL || process.env.REDIS_HOST)
    });
    startBackgroundServices(io).catch((error) => {
      console.error('Failed to start background services:', error && error.message);
      if (process.env.NODE_ENV === 'production') {
        gracefulShutdown('startupFailure');
      }
    });
  });
}

const stopBackgroundServices = () => {
  if (scheduledMessageInterval) {
    clearInterval(scheduledMessageInterval);
    scheduledMessageInterval = null;
  }
  if (manualPaymentExpiryInterval) {
    clearInterval(manualPaymentExpiryInterval);
    manualPaymentExpiryInterval = null;
  }
  if (expiredMessageCleanupInterval) {
    clearInterval(expiredMessageCleanupInterval);
    expiredMessageCleanupInterval = null;
  }
};

module.exports = {
  app,
  server,
  io,
  startBackgroundServices,
  stopBackgroundServices,
  startScheduledMessageDispatcher
};
