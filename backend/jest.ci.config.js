// Jest config for the fast CI suite: everything from jest.config.js except the
// suites that need a live MongoDB / long-running flows (those run in the
// dedicated `integration-tests` CI job or by hand).
//
// Keeping the ignore list here instead of in a `npx jest --testPathIgnorePatterns=...`
// command line means the same suite selection works on Linux CI and on the
// Windows dev shells, where cmd.exe chokes on the pipes/parentheses.
//
// Run with: npm run test:ci
const base = require('./jest.config.js');

module.exports = {
  ...base,
  testPathIgnorePatterns: [
    '/node_modules/',
    'integration',
    'Integration',
    'viewOnce\\.flow',
    'settingsAudit',
    'blockUnblock\\.audit',
    'auth\\.test',
    'manualPaymentController',
  ],
};
