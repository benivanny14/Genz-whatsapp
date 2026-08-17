import { test } from 'node:test';
import assert from 'node:assert/strict';

import { shouldSkipLoginRedirect } from '../utils/loginRedirect.js';

test('user auth pages always skip the redirect (no redirect loop)', () => {
  assert.equal(shouldSkipLoginRedirect('/login'), true);
  assert.equal(shouldSkipLoginRedirect('/register'), true);
  assert.equal(shouldSkipLoginRedirect('/verify-phone'), true);
  assert.equal(shouldSkipLoginRedirect('/login/'), true);
});

test('public pages (no ProtectedRoute) skip the redirect too', () => {
  assert.equal(shouldSkipLoginRedirect('/forgot-password'), true);
  assert.equal(shouldSkipLoginRedirect('/privacy-policy'), true);
  assert.equal(shouldSkipLoginRedirect('/terms'), true);
  assert.equal(shouldSkipLoginRedirect('/install'), true);
  assert.equal(shouldSkipLoginRedirect('/pair-device'), true);
});

test('the public shared-status viewer (/status/:statusId) skips the redirect', () => {
  assert.equal(shouldSkipLoginRedirect('/status/6a8382dd25ec6c9e5cdc6626'), true);
  assert.equal(shouldSkipLoginRedirect('/status/6a8382dd25ec6c9e5cdc6626?share=abc'), true);
  // the protected /status page itself still redirects (ProtectedRoute guards it)
  assert.equal(shouldSkipLoginRedirect('/status'), false);
});

test('admin pages skip the redirect (their own login + guards handle it)', () => {
  assert.equal(shouldSkipLoginRedirect('/system-control-x7k9/login'), true);
  assert.equal(shouldSkipLoginRedirect('/system-control-x7k9'), true);
  assert.equal(shouldSkipLoginRedirect('/system-gateway-x9k/login'), true);
  assert.equal(shouldSkipLoginRedirect('/admin'), true);
  assert.equal(shouldSkipLoginRedirect('/admin/manual-payments'), true);
});

test('regular app pages DO redirect to the user login', () => {
  assert.equal(shouldSkipLoginRedirect('/chat'), false);
  assert.equal(shouldSkipLoginRedirect('/settings'), false);
  assert.equal(shouldSkipLoginRedirect('/genz-mods'), false);
  assert.equal(shouldSkipLoginRedirect('/'), false);
  assert.equal(shouldSkipLoginRedirect(''), false);
});

test('lookalike paths do not false-positive', () => {
  assert.equal(shouldSkipLoginRedirect('/admin-extra'), false);
  assert.equal(shouldSkipLoginRedirect('/login-helper'), false);
  assert.equal(shouldSkipLoginRedirect('/system-control-x7k9-other'), false);
});
