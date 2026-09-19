// Separate Jest config for pure unit tests that mock mongoose models —
// these do NOT need a live MongoDB / mongodb-memory-server instance.
// Run with: npx jest --config jest.unit.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.unit.test.js'],
  // Secrets only (no DB/mongoose wiring) so suites that reach
  // config/secrets.js through a route import still run on a bare machine.
  setupFiles: ['<rootDir>/tests/unitEnv.setup.js'],
  testTimeout: 10000,
};
