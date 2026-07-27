// Separate Jest config for pure unit tests that mock mongoose models —
// these do NOT need a live MongoDB / mongodb-memory-server instance.
// Run with: npx jest --config jest.unit.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.unit.test.js'],
  testTimeout: 10000,
};
