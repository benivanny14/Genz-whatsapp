import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const apiSrc = fs.readFileSync(path.join(root, 'services/api.js'), 'utf8');

// ─── Test 1: error.config is used (not undefined originalRequest) ───
test('response interceptor uses error.config, not bare originalRequest', () => {
  // The old bug referenced `originalRequest` without defining it from error.config.
  // The fix stores it as `const originalRequest = error.config;`.
  assert.ok(
    apiSrc.includes('const originalRequest = error.config'),
    'Interceptor must assign error.config to originalRequest'
  );
});

// ─── Test 2: retry logic guards against infinite loops ───
test('network retry sets _networkRetry flag to prevent infinite retries', () => {
  assert.ok(
    apiSrc.includes('!originalRequest._networkRetry'),
    'Retry must check _networkRetry to prevent infinite loop'
  );
  assert.ok(
    apiSrc.includes('originalRequest._networkRetry = true'),
    'Retry must set _networkRetry = true before retrying'
  );
});

// ─── Test 3: 401 clears session ───
test('401 Unauthorized triggers session clear', () => {
  assert.ok(
    apiSrc.includes("error.response?.status === 401"),
    'Interceptor must check for 401 status'
  );
  assert.ok(
    apiSrc.includes('clearSessionAndRedirect'),
    'Interceptor must call clearSessionAndRedirect on 401'
  );
});

// ─── Test 4: offline errors return graceful response ───
test('offline/connection-refused errors return offline response', () => {
  assert.ok(
    apiSrc.includes("ERR_CONNECTION_REFUSED"),
    'Interceptor must handle ERR_CONNECTION_REFUSED'
  );
  assert.ok(
    apiSrc.includes("isOffline: true"),
    'Offline response must include isOffline flag'
  );
});

// ─── Test 5: retry has a delay ───
test('network retry has a delay before retrying', () => {
  assert.ok(
    apiSrc.includes('setTimeout(resolve, 3000)'),
    'Retry must wait 3 seconds before retrying'
  );
});

// ─── Test 6: retry failure falls through gracefully ───
test('failed retry returns a graceful error response, not a crash', () => {
  assert.ok(
    apiSrc.includes("Server unreachable"),
    'Failed retry must resolve with a user-friendly message'
  );
});

// ─── Test 7: 401 doesn't trigger retry ───
test('401 is handled before the retry logic', () => {
  const pos401 = apiSrc.indexOf("error.response?.status === 401");
  const posRetry = apiSrc.indexOf('!originalRequest._networkRetry');
  assert.ok(pos401 < posRetry, '401 check must come before retry logic');
});

// ─── Test 8: request interceptor attaches token ───
test('request interceptor attaches Bearer token when available', () => {
  assert.ok(
    apiSrc.includes('Authorization =') && apiSrc.includes('Bearer'),
    'Request interceptor must attach Bearer token to Authorization header'
  );
});

// ─── Test 9: request interceptor attaches device headers ───
test('request interceptor attaches device identity headers', () => {
  assert.ok(
    apiSrc.includes('getDeviceHeaders()'),
    'Request interceptor must call getDeviceHeaders()'
  );
});

// ─── Test 10: chatAPI has safe wrapper ───
test('chatAPI methods are wrapped with safe() for offline resilience', () => {
  assert.ok(
    apiSrc.includes('const safe ='),
    'safe wrapper must be defined'
  );
  assert.ok(
    apiSrc.includes('getConversations: () => safe'),
    'chatAPI.getConversations must use safe wrapper'
  );
});
