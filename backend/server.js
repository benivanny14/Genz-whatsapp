require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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
  securityHeaders
} = require('./middleware/security');
const mongoSanitize = require('express-mongo-sanitize');
const setupSocket = require('./socket');
const secureUploads = require('./middleware/secureUploads');
const { buildSignedUploadUrl, signLocalUrlIfNeeded } = require('./utils/mediaAccess');

// CRITICAL: JWT secret must be set in environment variables
// System will fail to start if not configured in production
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production');
  }
  console.warn('[SECURITY] JWT_SECRET not set, using development-only default. DO NOT USE IN PRODUCTION!');
}

const JWT_SECRET = process.env.JWT_SECRET || 'genz-development-secret-change-me';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'genz-development-secret-change-me') {
  throw new Error('FATAL: Default JWT secret detected in production. Set JWT_SECRET environment variable.');
}

const DEFAULT_LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const { resolvePublicBaseUrl } = require('./utils/publicBaseUrl');
const getPublicBaseUrl = (req) => resolvePublicBaseUrl(req);
const publicApiOrigin = (process.env.PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
const frontendOrigin = process.env.FRONTEND_URL?.replace(/\/$/, '');
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

if (!isTestEnvironment && (process.env.REDIS_URL || process.env.REDIS_HOST)) {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined
    });

    pubClient = redisClient.duplicate();
    subClient = redisClient.duplicate();

    redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err));
    subClient.on('error', (err) => console.error('Redis Sub Client Error:', err));

    redisReadyPromise = (async () => {
      await redisClient.connect();
      await pubClient.connect();
      await subClient.connect();
      if (app) app.set('redisClient', redisClient);
      console.log('✅ Redis connected for distributed socket architecture');
      return true;
    })().catch((err) => {
      console.warn('Redis connection failed, falling back to single-instance mode:', err.message);
      redisClient = null;
      pubClient = null;
      subClient = null;
      if (app) app.set('redisClient', null);
      return false;
    });
  } catch (err) {
    console.warn('⚠️  Redis connection failed, falling back to single-instance mode:', err.message);
  }
} else if (!isTestEnvironment) {
  console.log('ℹ️  Redis not configured, running in single-instance mode');
}

// Import MongoDB Models
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const User = require('./models/User');
const { startExpiryChecker, stopExpiryChecker } = require('./utils/subscriptionExpiryChecker');
const { checkPaymentTimeouts } = require('./utils/paymentTimeout');

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
          email: 'local-web-device@device.genz.local',
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
let paymentTimeoutInterval = null;

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
  scheduledMessageInterval.unref?.();

  return scheduledMessageInterval;
};

const startBackgroundServices = async (ioInstance) => {
  await connectDB();
  await ensureLocalUser();
  startScheduledMessageDispatcher(ioInstance);

  // Start subscription expiry checker
  startExpiryChecker();

  // Start payment timeout checker (runs every 15 minutes)
  if (!paymentTimeoutInterval) {
    paymentTimeoutInterval = setInterval(async () => {
      try {
        logger.info('Running payment timeout check');
        const result = await checkPaymentTimeouts();
        logger.info('Payment timeout check completed', { processed: result.processed });
      } catch (error) {
        logger.error('Payment timeout check failed', { message: error.message });
      }
    }, 15 * 60 * 1000);
    paymentTimeoutInterval.unref?.();
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
  'Origin'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, only allow the configured frontend URL
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.PUBLIC_API_URL
      ].filter(Boolean);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn('[CORS] Blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'));
      }
    }
    
    // In development, allow all localhost origins
    const devOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      process.env.FRONTEND_URL,
      process.env.PUBLIC_API_URL
    ].filter(Boolean);
    
    if (devOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
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
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 20, // Strict in production
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
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
    console.log('🔧 Removed socket ID suffix from path');
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
    console.log('❌ File not found:', filePath);
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
const paymentRoutes = require('./routes/paymentRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const securityRoutes = require('./routes/securityRoutes');
const genzModsRoutes = require('./routes/genzModsRoutes');
const backupRoutes = require('./routes/backupRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const mediaRoutes = require('./routes/media');
const encryptionRoutes = require('./routes/encryptionRoutes');
const webrtcRoutes = require('./routes/webrtcRoutes');
const callRoutes = require('./routes/callRoutes');
const productRoutes = require('./routes/productRoutes');
const scheduledMessageRoutes = require('./routes/scheduledMessageRoutes');

// Mount Routes
app.use('/api/auth', safeMiddleware(authLimiter), authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/advanced', advancedRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/genz-mods', genzModsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/encryption', encryptionRoutes);
app.use('/api/webrtc', webrtcRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/products', productRoutes);
app.use('/api/scheduled-messages', scheduledMessageRoutes);

// File upload route
app.post('/api/upload', upload.single('file'), async (req, res) => {
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
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file'
    });
  }
});

// IMPORTANT: API Fallback - Never return HTML for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

// Serve built frontend when deployed as a single service (e.g. genz-whatsapp.onrender.com)
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
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
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
  pingInterval: 25000,
  perMessageDeflate: false,
  httpCompression: false,
  maxHttpBufferSize: 2 * 1024 * 1024
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
  });
}

// Socket authentication middleware - JWT required
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token || token === 'null' || token === 'undefined') {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.typ === 'refresh') {
        return next(new Error('Invalid token type for socket'));
      }
      const user = await User.findById(decoded.id)
        .select('_id username profilePicture isBlocked settings.privacy')
        .lean();

      if (user && !user.isBlocked) {
        socket.userId = user._id.toString();
        socket.user = {
          _id: socket.userId,
          username: user.username,
          profilePicture: user.profilePicture || '',
          settings: user.settings || {}
        };
        return next();
      }
      return next(new Error('User not authorized'));
    } catch (authError) {
      return next(new Error('Authentication failed'));
    }
  } catch (error) {
    logger.error('Socket connection error', { error: error.message });
    next(new Error('Authentication failed'));
  }
});

setupSocket(io);

if (process.env.ENABLE_LEGACY_SOCKET === 'true') {
console.warn('ENABLE_LEGACY_SOCKET=true: running legacy in-memory socket handlers alongside the persistent socket layer.');

// In-memory storage for messages (fallback when MongoDB is not available)
let messages = [];
// TM MOD: Track online users and pinned chats
let onlineUsers = new Set();
// TM MOD: Map socket IDs to user data for presence tracking
let socketToUser = {};
// TM MOD: Profile Visitors storage
let profileVisitors = []; // { visitorId, visitorName, timestamp }
// TM MOD: Online Presence History (Last 24 hours)
let presenceHistory = {}; // { userId: [{ status, time }] }
// TM MOD: Active Group Live Streams
let activeLiveStreams = {}; // { chatId: { host, viewers: [], startTime } }
// TM MOD: User Settings for Auto-Reply
let userAppSettings = {}; // { userId: { autoReplyEnabled, autoReplyMessage } }
// TM MOD: Group settings (for admin-only messaging, disappearing messages, permissions, etc.)
let groups = [
  {
    _id: "g1",
    adminOnlyMessaging: false,
    disappearingDuration: "Off",
    // New: Custom Group Permissions
    canSendMedia: true,
    canCreatePolls: true,
    canChangeGroupInfo: true,
    customRoles: [], // TM MOD: Store custom roles here
  },
  // Add other group settings here
];
// TM MOD: Scheduled Messages storage
let scheduledMessages = [];
// TM MOD: Mock statuses storage for anti-delete
let statuses = [];
// TM MOD: Sticker Store Simulation Data
let stickerStore = [
  {
    id: "p1",
    name: "TM Memes",
    author: "TM Dev",
    stickers: [
      "https://cdn-icons-png.flaticon.com/512/3532/3532827.png",
      "https://cdn-icons-png.flaticon.com/512/3532/3532840.png",
    ],
  },
  {
    id: "p2",
    name: "Love & Hearts",
    author: "TM Designer",
    stickers: [
      "https://cdn-icons-png.flaticon.com/512/2589/2589175.png",
      "https://cdn-icons-png.flaticon.com/512/2107/2107845.png",
    ],
  },
  {
    id: "p3",
    name: "Tech Life",
    author: "Genz Tech",
    stickers: [
      "https://cdn-icons-png.flaticon.com/512/4257/4257487.png",
      "https://cdn-icons-png.flaticon.com/512/2165/2165249.png",
    ],
  },
];

// Helper function to parse disappearing duration
function parseDisappearingDuration(duration) {
  switch (duration) {
    case "24h":
      return 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    case "7d":
      return 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    case "90d":
      return 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
    default:
      return 0;
  }
}

// Periodically check for scheduled messages
setInterval(() => {
  const now = new Date();
  scheduledMessages = scheduledMessages.filter((item) => {
    if (new Date(item.scheduleTime) <= now) {
      const newMessage = {
        ...item.messageData,
        timestamp: new Date(),
        id: Date.now(),
      };
      messages.push(newMessage);
      io.emit("receive_message", {
        ...newMessage,
        message: item.plainText,
      });
      return false; // Remove from scheduled
    }
    return true;
  });
}, 5000); // Check every 5 seconds

io.on("connection", async (socket) => {
  console.log("User Connected:", socket.id, "User ID:", socket.userId);

  // Update user online status (no database)
  if (socket.userId && !socket.handshake.auth.freezeLastSeen) {
    onlineUsers.add(socket.userId);
    socketToUser[socket.id] = { userId: socket.userId, username: socket.user?.username || 'GENZ User' };
    
    // Notify others user is online
    socket.broadcast.emit("user:online", { userId: socket.userId });
  } else if (socket.userId && socket.handshake.auth.freezeLastSeen) {
    socketToUser[socket.id] = { userId: socket.userId, username: socket.user?.username || 'GENZ Ghost' };
  }

  socket.on("send_message", async (data) => {
    try {
      console.log("Received send_message:", data);
      const group = data.isGroup
        ? groups.find((g) => g._id === data.chatId)
        : null; // Find group here

      // 1. Encrypt Message for Security
      const encryptedMsg = data.message ? encrypt(data.message) : null;

      const newMessage = {
        id: Date.now(),
        sender: data.sender,
        content: encryptedMsg,
        messageType: data.messageType || "text",
        mediaUrl: data.mediaUrl || null,
        caption: data.caption || null, // TM MOD: Added caption support
        voiceEffect: data.voiceEffect || "none",
        timestamp: new Date(),
        isDeleted: false,
        editedAt: null,
        isAdmin: data.sender === "TM Admin",
        ghostMode: data.ghostMode || false,
        isSelfDestruct: data.isSelfDestruct || false,
        chatId: data.chatId, // Ensure chatId is passed
        isGroup: data.isGroup || false,
        isLiveLocation: data.isLiveLocation || false,
      };

      // TM MOD: Admin-Only Messaging Check
      if (data.isGroup && group) {
        if (group.adminOnlyMessaging) {
          if (data.senderRole !== "admin") {
            // Optionally, send an error back to the sender
            return; // Block message from non-admin
          }
        }
        // TM MOD: Custom Group Permissions - Media
        if (
          data.messageType &&
          (data.messageType === "image" ||
            data.messageType === "audio" ||
            data.messageType === "file" ||
            data.messageType === "location")
        ) {
          if (!group.canSendMedia && data.senderRole !== "admin") {
            return; // Block media from non-permitted members
          }
        }
      }

      // TM MOD: Disappearing Messages Logic (server-side deletion simulation)
      if (data.isGroup && group && group.disappearingDuration !== "Off") {
        const durationMs = parseDisappearingDuration(
          group.disappearingDuration,
        );
        if (durationMs > 0 && newMessage.id) {
          setTimeout(async () => {
            // Find and mark message as disappeared (or remove it)
            const msgIndex = messages.findIndex((m) => m.id === newMessage.id);
            if (msgIndex !== -1) {
              messages[msgIndex].isDisappeared = true;
              // Also update in MongoDB
              try {
                await Message.updateOne(
                  { id: newMessage.id },
                  { $set: { isDisappeared: true } }
                );
              } catch (err) {
                console.error("Error updating disappeared message:", err);
              }
              io.emit("message_disappeared_signal", { id: newMessage.id });
            }
          }, durationMs);
        }
      }

      // Save message to MongoDB (Database Integration)
      try {
        // Find conversation to get proper sender reference
        const conversation = await Conversation.findOne({ _id: data.chatId });
        
        if (conversation) {
          // Find the sender user
          const senderUser = await User.findOne({ username: data.sender });
          
          if (senderUser) {
            const messageDoc = await Message.create({
              conversationId: conversation._id,
              sender: senderUser._id,
              content: data.message, // Store plain text for now (encrypted version in content field)
              messageType: data.messageType || "text",
              mediaUrl: data.mediaUrl || "",
              fileName: data.fileName || "",
              fileSize: data.fileSize || 0,
              duration: data.duration || 0,
            });

            newMessage.dbId = messageDoc._id;
            console.log("Message saved to MongoDB:", messageDoc._id);
          }
        }
      } catch (dbError) {
        console.error("Error saving message to database:", dbError.message);
        // Continue with in-memory storage as fallback
      }

      messages.push(newMessage); // Push message after all checks

      // TM MOD: AI Auto-Reply Check (Only for 1-on-1 chats)
      if (!data.isGroup) {
        // In this mock, conversation ID '1' is between user '1' and '2'
        // We find the recipient (the one who is NOT the sender)
        const recipientId = data.sender === "TM User" ? "2" : "1";
        
        // Check if recipient is offline and has auto-reply enabled
        if (!onlineUsers.has(recipientId)) {
          const settings = userAppSettings[recipientId];
          if (settings && settings.autoReplyEnabled) {
            setTimeout(() => {
              const autoReplyMsg = {
                id: Date.now() + 1,
                sender: recipientId === "2" ? "TM Admin" : "TM User",
                content: encrypt(settings.autoReplyMessage),
                messageType: "text",
                timestamp: new Date(),
                isDeleted: false,
                isAutoReply: true,
                chatId: data.chatId
              };
              messages.push(autoReplyMsg);
              io.emit("receive_message", { ...autoReplyMsg, message: settings.autoReplyMessage });
            }, 2000); // 2 second delay for realistic feel
          }
        }
      }

      io.emit("receive_message", {
        ...newMessage,
        ...data,
        message: data.message,
      });
    } catch (error) {
      console.error("Error in send_message:", error);
      socket.emit("send_message_error", { error: "Failed to send message." });
    }
  });

  // TM MOD: Anti-Delete Logic
  socket.on("delete_message", (messageId) => {
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex !== -1) {
      messages[msgIndex].isDeleted = true;
      // Tuma taarifa kuwa imefutwa, lakini TM Mod itaitunza
      io.emit("message_deleted_signal", {
        id: messageId,
        adminOverride: false,
      });
    }
  });

  // TM MOD: Mass Message Sender Logic
  socket.on("send_mass_message", (data) => {
    const { recipients, message, sender } = data;
    recipients.forEach(recipientId => {
      const encryptedMsg = encrypt(message);
      const massMsg = {
        id: Date.now() + Math.random(),
        sender: sender,
        content: encryptedMsg,
        timestamp: new Date(),
        isDeleted: false,
        chatId: recipientId // Assuming chatId is userId for 1-on-1
      };
      messages.push(massMsg);
      io.emit("receive_message", { ...massMsg, message: message });
    });
  });

  // TM MOD: Status Deletion logic for Anti-Delete
  socket.on("delete_status", (statusId) => { // Fixed: Ensure statusId is passed
    // In reality, statuses would be in a DB. Here we signal a delete event.
    io.emit("status_deleted_signal", { statusId });
  });

  // TM MOD: Live Stream Logic
  socket.on("start_live_stream", ({ chatId, hostName }) => {
    activeLiveStreams[chatId] = { host: hostName, viewers: [socket.id], startTime: new Date() };
    io.emit("live_stream_started", { chatId, host: hostName });
    
    // Simulation: Tuma maoni ya uongo kila baada ya muda (Fixed: Use GENZ instead of TM)
    const comments = ["🔥 Kaa kilele!", "TM WhatsApp is the best", "Looking good admin!", "Noma sana 🚀", "Hii feature ni fire", "Greeting from Arusha!"];
    const interval = setInterval(() => {
      if (!activeLiveStreams[chatId]) {
        clearInterval(interval);
        return;
      }
      const randomComment = comments[Math.floor(Math.random() * comments.length)];
      io.emit("live_stream_comment", { chatId, user: "Guest_" + Math.floor(Math.random() * 100), text: randomComment });
    }, 3000);
  }); // Fixed: Ensure live_stream_started is emitted

  socket.on("join_live_stream", (chatId) => {
    if (activeLiveStreams[chatId]) {
      activeLiveStreams[chatId].viewers.push(socket.id);
      io.emit("live_viewers_update", { chatId, count: activeLiveStreams[chatId].viewers.length });
    }
  });

  socket.on("stop_live_stream", (chatId) => {
    delete activeLiveStreams[chatId];
    io.emit("live_stream_ended", chatId);
  }); // Fixed: Ensure live_stream_ended is emitted

  // TM MOD: Message Editing Logic
  socket.on("edit_message", ({ messageId, newContent }) => {
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex !== -1) {
      const message = messages[msgIndex];
      // Allow editing within 5 minutes (300,000 ms)
      if (Date.now() - message.timestamp < 300000) {
        message.content = encrypt(newContent); // Re-encrypt new content
        message.editedAt = new Date();
        io.emit("message_edited_signal", {
          id: messageId,
          newContent: newContent, // Send plain text for client display
        });
      }
    }
  });

  // TM MOD: Star Message Logic
  socket.on("star_message", (messageId) => {
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex !== -1) {
      messages[msgIndex].isStarred = !messages[msgIndex].isStarred;
      // Tuma mabadiliko kwa wote
      io.emit("message_starred_signal", {
        id: messageId,
        isStarred: messages[msgIndex].isStarred,
      });
    }
  });

  // TM MOD: Forward Message Logic
  socket.on("forward_message", (data) => {
    // 1. Encrypt Message for Security
    const encryptedMsg = encrypt(data.message);

    const newMessage = {
      id: Date.now(),
      sender: data.sender,
      content: encryptedMsg,
      timestamp: new Date(),
      isDeleted: false,
      isForwarded: true, // Mark as forwarded
    };

    messages.push(newMessage);

    io.emit("receive_message", {
      ...newMessage,
      message: data.message,
    });
  });

  // TM MOD: Broadcast Message Logic
  socket.on("send_broadcast", (data) => {
    const encryptedMsg = encrypt(data.message);

    // Katika maisha halisi, tungetuma kwa kila recipient mmoja mmoja
    // Hapa tunasimulate kwa ku-emit ujumbe wenye alama ya "broadcast"
    const broadcastMsg = {
      id: Date.now(),
      sender: data.sender,
      content: encryptedMsg,
      timestamp: new Date(),
      isDeleted: false,
      isBroadcast: true,
      recipients: data.recipients, // ID za watumiaji
    };

    messages.push(broadcastMsg);
    io.emit("receive_message", {
      ...broadcastMsg,
      message: data.message,
    });
  });

  socket.on("disconnect", async () => {
    const userData = socketToUser[socket.id];
    if (userData) {
      onlineUsers.delete(userData.userId);
      
      if (!presenceHistory[userData.userId])
        presenceHistory[userData.userId] = [];
      presenceHistory[userData.userId].push({
        status: "offline",
        time: new Date(),
      });

      io.emit("update_online_users", Array.from(onlineUsers));
      delete socketToUser[socket.id];
    }
    console.log("User Disconnected:", socket.id);
  });

  // TM MOD: Mark messages as read
  socket.on("mark_as_read", ({ chatId, userId }) => {
    // Katika production ungesasisha DB status = 'read'
    io.emit("messages_read_signal", { chatId, userId });
  });

  // Handle typing status
  socket.on("typing", (data) => {
    // In a real app, you'd use data.conversationId to target specific room
    socket.broadcast.emit("typing_status", {
      sender: data.sender,
      isTyping: data.isTyping,
    });
  });

  // TM MOD: Poll System Logic
  socket.on("create_poll", (data) => {
    const group = data.isGroup
      ? groups.find((g) => g._id === data.chatId)
      : null;
    // TM MOD: Custom Group Permissions - Polls
    if (
      data.isGroup &&
      group &&
      group.canCreatePolls === false &&
      data.senderRole !== "admin"
    ) {
      // Corrected check
      return; // Block poll creation from non-permitted members
    }

    const pollMessage = {
      id: Date.now(),
      sender: data.sender,
      timestamp: new Date(),
      isPoll: true,
      question: data.question,
      options: data.options.map((opt) => ({ text: opt, votes: [] })),
      isDeleted: false,
      chatId: data.chatId,
      isGroup: data.isGroup,
    };
    messages.push(pollMessage);
    io.emit("receive_message", pollMessage);
  });

  socket.on("vote_poll", ({ messageId, optionIndex, userId }) => {
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex !== -1 && messages[msgIndex].isPoll) {
      // Remove user from any other options (allow only one vote)
      messages[msgIndex].options.forEach((opt) => {
        opt.votes = opt.votes.filter((id) => id !== userId);
      });
      // Add vote
      messages[msgIndex].options[optionIndex].votes.push(userId);

      io.emit("poll_updated", {
        id: messageId,
        options: messages[msgIndex].options,
      });
    }
  });

  // TM MOD: Message Scheduling Logic
  socket.on("schedule_message", (data) => {
    const encryptedMsg = encrypt(data.message);
    scheduledMessages.push({
      scheduleTime: data.scheduleTime,
      plainText: data.message,
      messageData: {
        sender: data.sender,
        content: encryptedMsg,
        isScheduled: true,
      },
    });
  });

  // TM MOD: Online Status Logic
  socket.on("user_online", (data) => {
    if (socket.handshake.auth.freezeLastSeen) return;

    onlineUsers.add(data.userId);
    socketToUser[socket.id] = { userId: data.userId, username: data.username };
    io.emit("update_online_users", Array.from(onlineUsers));

    // Log presence
    if (!presenceHistory[data.userId]) presenceHistory[data.userId] = [];
    presenceHistory[data.userId].push({ status: "online", time: new Date() });

    // Safisha data za zamani (> 24h)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    presenceHistory[data.userId] = presenceHistory[data.userId].filter(
      (h) => new Date(h.time) > oneDayAgo,
    );

    // Tuma history kwa yule anayeihitaji
    socket.emit("presence_history_update", {
      userId: data.userId,
      history: presenceHistory[data.userId],
    });

    // TM MOD: Broadcast online notification to others
    socket.broadcast.emit("friend_online_notification", {
      username: data.username,
    });
  }); // Fixed: Ensure friend_online_notification is emitted

  // TM MOD: Request History Logic
  socket.on("request_presence_history", (userId) => {
    socket.emit("presence_history_update", {
      userId,
      history: presenceHistory[userId] || [],
    });
  });

  // TM MOD: Mute Chat Logic
  socket.on("mute_chat", (payload) => {
    const chatId = typeof payload === 'object' ? payload.chatId : payload;
    io.emit("chat_muted_signal", { chatId });
  });

  // TM MOD: Chat Lock Logic (Fixed: Use isLocked and pin)
  socket.on("toggle_chat_lock", ({ chatId, isLocked, pin }) => {
    io.emit("chat_locked_signal", { chatId, isLocked, pin });
  });

  // TM MOD: Update Auto-Reply Settings
  socket.on("update_auto_reply", (data) => {
    userAppSettings[data.userId] = {
      autoReplyEnabled: data.autoReplyEnabled,
      autoReplyMessage: data.autoReplyMessage
    };
    console.log("Auto-reply settings updated for user:", data.userId);
  });

  // TM MOD: Archive Chat Logic
  socket.on("archive_chat", (chatId) => {
    io.emit("chat_archived_signal", { chatId });
  });

  // TM MOD: Pin Message Logic
  socket.on("pin_message", ({ chatId, messageId }) => {
    // Kwenye mfumo wa kweli ungehifadhi pinnedMessageId kwenye DB
    io.emit("message_pinned_signal", { chatId, messageId });
  });

  socket.on("unpin_message", ({ chatId }) => {
    io.emit("message_unpinned_signal", { chatId });
  });

  // TM MOD: Group Admin Tools Logic
  socket.on("group_admin_action", (data) => {
    io.emit("group_update_signal", data);
  });

  // TM MOD: Custom Group Roles Logic
  socket.on("create_custom_role", ({ chatId, roleName, permissions }) => {
    const groupIndex = groups.findIndex((g) => g._id === chatId);
    if (groupIndex !== -1) {
      if (!groups[groupIndex].customRoles) groups[groupIndex].customRoles = [];
      const newRole = { id: "r" + Date.now(), name: roleName, permissions };
      groups[groupIndex].customRoles.push(newRole);
      io.emit("group_update_signal", {
        chatId,
        action: "add_role",
        role: newRole,
      });
    }
  });

  socket.on("assign_role", ({ chatId, userId, roleId }) => {
    // Kwenye production hii ingehifadhiwa kwenye database
    io.emit("group_update_signal", {
      chatId,
      userId,
      action: "assign_role",
      roleId,
    });
  });

  // TM MOD: Update Group Setting (e.g., adminOnlyMessaging)
  socket.on("update_group_setting", ({ chatId, setting, value }) => {
    io.emit("group_update_signal", {
      chatId,
      action: "update_setting",
      setting,
      value,
    });
  });

  // TM MOD: Profile Visitors Logic
  socket.on("visit_profile", ({ visitorId, visitorName, visitedUserId }) => {
    // In a real app, you'd store this in a database and filter by visitedUserId
    const newVisitor = { visitorId, visitorName, timestamp: new Date() };
    profileVisitors.push(newVisitor);
    // For simulation, we'll just send the full list to all for simplicity
    io.emit("profile_visitors_update", profileVisitors);
  });

  // Send current visitors on connection (for initial load)
  socket.on("get_profile_visitors", () => {
    socket.emit("profile_visitors_update", profileVisitors);
  });

  // TM MOD: Disappearing Messages Logic
  socket.on("update_disappearing_messages", ({ chatId, duration }) => {
    io.emit("group_update_signal", {
      chatId,
      action: "update_disappearing",
      duration,
    });
  });

  // TM MOD: Join Group via Link Logic
  socket.on("join_group", ({ chatId, userId, username }) => {
    io.emit("group_update_signal", {
      chatId,
      userId,
      action: "add",
      username,
    });
  });

  // TM MOD: Cloud Backup Simulation Logic
  socket.on("start_backup", () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      socket.emit("backup_progress", progress);
    }, 800);
  });

  // TM MOD: Call Simulation Logic
  socket.on("call_user", (data) => {
    // Tuma signal ya simu kwa wengine
    socket.broadcast.emit("incoming_call_signal", data);
  });

  socket.on("end_call", (data) => {
    socket.broadcast.emit("call_ended_signal", data);
  });

  // TM MOD: Message Reaction Logic
  socket.on("message_reaction", ({ messageId, emoji, userId }) => {
    const msgIndex = messages.findIndex(
      (m) => m._id === messageId || m.id === messageId,
    );
    if (msgIndex !== -1) {
      if (!messages[msgIndex].reactions) messages[msgIndex].reactions = [];

      // Check if user already reacted
      const existingReactionIndex = messages[msgIndex].reactions.findIndex(
        (r) => r.userId === userId,
      );
      if (existingReactionIndex !== -1) {
        messages[msgIndex].reactions[existingReactionIndex].emoji = emoji;
      } else {
        messages[msgIndex].reactions.push({ userId, emoji });
      }

      io.emit("message_reaction_signal", {
        messageId,
        reactions: messages[msgIndex].reactions,
      });
    }
  });

  // TM MOD: Status View Signal Handling
  socket.on("view_status", (data) => {
    io.emit("status_view_signal", data);
  });

  // ── GENZ: Status Like (real-time) ──
  socket.on("status_like", (data) => {
    // Broadcast to all so like counters sync live
    socket.broadcast.emit("status_liked_signal", {
      statusId: data.statusId,
      liked: data.liked,
      userId: socket.userId || socket.id
    });
  });

  // ── GENZ: Status Comment / Reply (real-time) ──
  socket.on("status_comment", (data) => {
    socket.broadcast.emit("status_comment_signal", {
      statusId: data.statusId,
      content: data.content,
      userId: socket.userId || socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // ── GENZ: Live Reactions (floating emojis) ──
  socket.on("live_reaction", (data) => {
    socket.broadcast.emit("live_reaction_signal", {
      chatId: data.chatId,
      emoji: data.emoji,
      userId: socket.userId || socket.id
    });
  });

  socket.on("recording", (data) => {
    // Sambaza hali ya kurekodi sauti
    socket.broadcast.emit("recording_status", {
      sender: data.sender,
      isRecording: data.isRecording,
    });
  });

  // TM MOD: Pin Chat Logic
  socket.on("pin_chat", (chatId) => {
    // Kwenye mfumo huu wa mock, tunatafuta conversation na ku-toggle pin
    // Note: Kwenye production hii ingehifadhiwa kwenye Database kwa kila mtumiaji
    io.emit("chat_pinned_signal", { chatId });
  });

  socket.on("stop_typing", (data) => {
    socket.broadcast.emit("typing_status", {
      sender: data.sender,
      isTyping: data.isTyping,
    });
  });
});
}

// Error handling middleware (must be after all routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('Graceful shutdown started', { signal });

  if (scheduledMessageInterval) clearInterval(scheduledMessageInterval);
  if (paymentTimeoutInterval) clearInterval(paymentTimeoutInterval);
  stopExpiryChecker();

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
  process.exit(0);
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

// Robust server start: if the chosen port is busy, try the next ones.
const DEFAULT_PORT = Number(process.env.PORT || PORT);
const MAX_PORT_ATTEMPTS = Number(process.env.PORT_ATTEMPTS) || 10;

const startServerOnPort = (port, attemptsLeft = MAX_PORT_ATTEMPTS) => {
  // Remove previous error listeners to avoid duplicate handling
  server.removeAllListeners('error');

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      logger.warn('Port in use, trying next port', { port, attemptsLeft });
      setTimeout(() => startServerOnPort(port + 1, attemptsLeft - 1), 200);
      return;
    }

    logger.error('Server failed to start', { error: err && err.message });
    // If we can't recover, exit so orchestrators can restart with correct config
    process.exit(1);
  });

  server.listen(port, () => {
    // Ensure env reflects the actual chosen port
    process.env.PORT = String(port);
    logger.info('TM Backend started', {
      port,
      environment: process.env.NODE_ENV || 'development',
      publicApiUrl: process.env.PUBLIC_API_URL || process.env.BACKEND_URL || `http://localhost:${port}`,
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
};

if (require.main === module) {
  startServerOnPort(DEFAULT_PORT);
}

const stopBackgroundServices = () => {
  if (scheduledMessageInterval) {
    clearInterval(scheduledMessageInterval);
    scheduledMessageInterval = null;
  }
  if (paymentTimeoutInterval) {
    clearInterval(paymentTimeoutInterval);
    paymentTimeoutInterval = null;
  }
  stopExpiryChecker();
};

module.exports = {
  app,
  server,
  io,
  startBackgroundServices,
  stopBackgroundServices,
  startScheduledMessageDispatcher
};
