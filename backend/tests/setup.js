const path = require('path');

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '5001';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-with-enough-length-for-validation';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-with-enough-length-for-validation';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/genz-test-placeholder';
process.env.BACKUP_ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'test-backup-key-with-enough-length';
process.env.ALLOW_REAL_PAYMENT_PROVIDERS = 'false';
process.env.ALLOW_MOCK_PAYMENTS = 'true';
process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR || path.join(__dirname, '..', 'node_modules', '.cache', 'mongodb-memory-server');
process.env.MONGOMS_PREFER_GLOBAL_PATH = process.env.MONGOMS_PREFER_GLOBAL_PATH || 'false';

const mongoose = require('mongoose');

let mongoServer;
const testMongoUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/genz-jest';

const getCurrentTestPath = () => (expect?.getState?.().testPath || '').replace(/\\/g, '/');

const shouldSkipDatabaseSetup = () => {
  if (process.env.SKIP_TEST_DB === 'true') return true;

  const testPath = getCurrentTestPath();
  return (
    testPath.endsWith('.unit.test.js') ||
    testPath.endsWith('/mediaAccess.test.js')
  );
};

beforeAll(async () => {
  if (shouldSkipDatabaseSetup()) {
    return;
  }

  if (process.env.USE_LOCAL_MONGO_FOR_TESTS === 'true') {
    process.env.MONGODB_URI = testMongoUri;
    await mongoose.connect(testMongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    return;
  }

  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  if (mongoServer) {
    await mongoServer.stop().catch(() => {});
  }

  const serverPath = require.resolve('../server');
  if (require.cache[serverPath]) {
    const { server, io, stopBackgroundServices } = require('../server');
    stopBackgroundServices?.();
    io?.close?.();

    await Promise.race([
      new Promise((resolve) => {
        if (!server?.listening) return resolve();
        server.close(() => resolve());
      }),
      new Promise((resolve) => setTimeout(resolve, 5000))
    ]);
  }
}, 30000);

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
