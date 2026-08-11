/**
 * SECURITY (2.3) guard: server.js must register global error handlers that
 * exit non-zero on uncaughtException / unhandledRejection. We can't import
 * server.js in jest (it boots Mongo + the HTTP/Socket server), so we statically
 * verify the handler source — same pattern as the frontend ctxBundles guard.
 */
const fs = require('fs');
const path = require('path');

const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

describe('process error handlers (SECURITY 2.3)', () => {
  it('registers an uncaughtException handler that exits non-zero', () => {
    const m = serverSource.match(/process\.on\('uncaughtException',\s*\((\w+)\)\s*=>\s*\{([\s\S]*?)\}\);/);
    expect(m).not.toBeNull();
    expect(m[2]).toMatch(/process\.exit\(1\)/);
  });

  it('registers an unhandledRejection handler that exits non-zero', () => {
    const m = serverSource.match(/process\.on\('unhandledRejection',\s*\(([\s\S]*?)\)\s*=>\s*\{([\s\S]*?)\}\);/);
    expect(m).not.toBeNull();
    expect(m[2]).toMatch(/process\.exit\(1\)/);
  });

  it('does not swallow fatal errors (no bare process.exit(0) in the handlers)', () => {
    const handlers = serverSource.match(/process\.on\('uncaughtException'[\s\S]*?\}\);\s*process\.on\('unhandledRejection'[\s\S]*?\}\);/);
    expect(handlers).not.toBeNull();
    expect(handlers[0]).not.toMatch(/process\.exit\(0\)/);
  });
});
