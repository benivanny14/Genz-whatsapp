/**
 * Unit Tests for Bug Fixes: authStrictLimiter, safeHandler
 * Run: node tests/unit-bugfixes.test.js
 */
process.env.JWT_SECRET = 'test-unit';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'production';

const http = require('http');
const express = require('express');
let passed = 0;
let failed = 0;
const results = [];

function assert(name, condition, detail) {
  if (condition) {
    passed++;
    results.push('  ✅ ' + name);
  } else {
    failed++;
    results.push('  ❌ ' + name + (detail ? ' — ' + detail : ''));
  }
}

async function makeRequest(port, path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ════════════════════════════════════════
// Test Suite 1: safeHandler
// ════════════════════════════════════════
async function testSafeHandler() {
  console.log('\n═══ safeHandler Unit Tests ═══');

  const { safeHandler } = require('../socket/chatHandlers');

  // Test: exports correctly
  assert('safeHandler is exported from chatHandlers', typeof safeHandler === 'function');

  // Test: wraps async handler that succeeds
  await new Promise(resolve => {
    const mockSocket = { emit: () => {} };
    const handler = async (data, cb) => cb({ success: true, data });
    const wrapped = safeHandler(mockSocket, 'test', handler);
    wrapped('hello', (result) => {
      assert('safeHandler passes through success result', result.success === true && result.data === 'hello');
      resolve();
    });
  });

  // Test: wraps async handler that throws (with callback)
  await new Promise(resolve => {
    const mockSocket = { emit: () => {} };
    const handler = async () => { throw new Error('boom'); };
    const wrapped = safeHandler(mockSocket, 'failing', handler);
    wrapped(null, (result) => {
      assert('safeHandler returns { success: false } on throw', result.success === false);
      assert('safeHandler includes error message', result.error === 'boom');
      resolve();
    });
  });

  // Test: wraps async handler that throws (without callback, emits error event)
  await new Promise(resolve => {
    const errors = [];
    const mockSocket = { emit: (event, data) => errors.push({ event, data }) };
    const handler = async () => { throw new Error('boom-no-cb'); };
    const wrapped = safeHandler(mockSocket, 'failing-no-cb', handler);
    wrapped(null);
    setTimeout(() => {
      assert('safeHandler emits error event when no callback', errors.some(e => e.event === 'error'));
      resolve();
    }, 50);
  });

  // Test: works without acknowledgement callback
  await new Promise(resolve => {
    let errorEmitted = false;
    const mockSocket = { emit: (event) => { if (event === 'error') errorEmitted = true; } };
    const handler = async () => { throw new Error('no-cb'); };
    const wrapped = safeHandler(mockSocket, 'nocb', handler);
    wrapped({});
    setTimeout(() => {
      assert('safeHandler emits error when no callback provided', errorEmitted);
      resolve();
    }, 50);
  });

  // Test: handler with multiple arguments
  await new Promise(resolve => {
    const mockSocket = { emit: () => {} };
    const handler = async (a, b, cb) => cb({ sum: a + b });
    const wrapped = safeHandler(mockSocket, 'multi', handler);
    wrapped(3, 7, (result) => {
      assert('safeHandler passes multiple arguments correctly', result.sum === 10);
      resolve();
    });
  });

  // Test: synchronous handler (non-async)
  await new Promise(resolve => {
    const mockSocket = { emit: () => {} };
    const handler = (data, cb) => cb({ sync: true });
    const wrapped = safeHandler(mockSocket, 'sync', handler);
    wrapped('test', (result) => {
      assert('safeHandler handles synchronous handlers', result.sync === true);
      resolve();
    });
  });
}

// ════════════════════════════════════════
// Test Suite 2: authStrictLimiter
// ════════════════════════════════════════
async function testAuthStrictLimiter() {
  console.log('\n═══ authStrictLimiter Unit Tests ═══');

  const { authStrictLimiter } = require('../middleware/rateLimiters');

  // Test: exports correctly
  assert('authStrictLimiter is exported', typeof authStrictLimiter === 'function');

  // Create fresh server for each test to avoid shared IP state
  function createTestServer() {
    const app = express();
    app.use(express.json());
    app.use('/auth', authStrictLimiter, (req, res) => res.json({ ok: true }));
    return new Promise(resolve => {
      const server = http.createServer(app);
      server.listen(0, () => resolve(server));
    });
  }

  // Test: allows first 5 requests
  {
    const server = await createTestServer();
    const port = server.address().port;
    let allowed = 0;
    for (let i = 0; i < 5; i++) {
      const res = await makeRequest(port, '/auth', 'POST', { u: 'test' });
      if (res.status === 200) allowed++;
    }
    assert('authStrictLimiter allows first 5 requests', allowed === 5);
    server.close();
  }

  // Test: blocks 6th request with 429
  {
    const server = await createTestServer();
    const port = server.address().port;
    for (let i = 0; i < 5; i++) await makeRequest(port, '/auth', 'POST', { u: 'test' });
    const res6 = await makeRequest(port, '/auth', 'POST', { u: 'test' });
    assert('authStrictLimiter blocks 6th request (429)', res6.status === 429);
    assert('authStrictLimiter 429 includes retry message', res6.body.error.includes('15 minutes'));
    server.close();
  }

  // Test: response format includes standard headers
  {
    const server = await createTestServer();
    const port = server.address().port;
    const res = await new Promise(resolve => {
      http.get(`http://127.0.0.1:${port}/auth`, (r) => {
        let data = '';
        r.on('data', c => data += c);
        r.on('end', () => resolve({ headers: r.headers, status: r.statusCode }));
      });
    });
    assert('authStrictLimiter includes RateLimit-Limit header', 'ratelimit-limit' in res.headers);
    assert('authStrictLimiter includes RateLimit-Remaining header', 'ratelimit-remaining' in res.headers);
    server.close();
  }
}

// ════════════════════════════════════════
// Test Suite 3: registerAllHandlers
// ════════════════════════════════════════
async function testRegisterAllHandlers() {
  console.log('\n═══ registerAllHandlers Unit Tests ═══');

  const { registerAllHandlers } = require('../socket/chatHandlers');
  assert('registerAllHandlers is exported', typeof registerAllHandlers === 'function');

  // Test: registers handlers without throwing
  let threw = false;
  try {
    const mockCtx = {
      socket: {
        id: 'test-socket-id',
        userId: 'test-user',
        on: () => {},
        emit: () => {},
        listeners: () => [],
        join: () => {},
        leave: () => {},
        disconnect: () => {},
        data: {},
        to: () => ({ emit: () => {} }),
        broadcast: { emit: () => {} },
      },
      io: { to: () => ({ emit: () => {} }) },
      models: {},
    };
    registerAllHandlers(mockCtx);
  } catch (err) {
    threw = true;
  }
  assert('registerAllHandlers does not throw with mock context', !threw);
}

// ════════════════════════════════════════
// Run all
// ════════════════════════════════════════
async function main() {
  await testSafeHandler();
  await testAuthStrictLimiter();
  await testRegisterAllHandlers();

  console.log('\n═══════════════════════════════════════');
  console.log('  TOTAL: ' + (passed + failed) + ' | ✅ PASSED: ' + passed + ' | ❌ FAILED: ' + failed);
  console.log('═══════════════════════════════════════');
  results.forEach(r => console.log(r));
  console.log('═══════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
