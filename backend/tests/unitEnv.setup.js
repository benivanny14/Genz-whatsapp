// Environment defaults for the pure-unit Jest config (jest.unit.config.js).
//
// Unit suites mock mongoose entirely, so they must NOT load tests/setup.js
// (which pulls in mongoose/mongodb-memory-server and the full app wiring).
// But some modules reached through route imports — config/secrets.js, which
// every route file pulls in via utils/mediaAccess.js — throw when a signing
// secret is missing, so those secrets still have to exist here.
//
// Values are throwaway test secrets; they never leave the test process.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-with-enough-length-for-validation';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-with-enough-length-for-validation';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'test-admin-jwt-secret-with-enough-length';
process.env.BACKUP_ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'test-backup-key-with-enough-length';
