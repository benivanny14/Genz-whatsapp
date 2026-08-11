import { test } from 'node:test';
import assert from 'node:assert/strict';

import { shouldSkipLoginRedirect } from '../utils/loginRedirect.js';

test('user auth pages always skip the redirect (no redirect loop)', () => {
  assert.equal(shouldSkipLoginRedirect('/login'), true);
  assert.equal(shouldSkipLoginRedirect('/register'), true);
  assert.equal(shouldSkipLoginRedirect('/verify-phone'), true);
  assert.equal(shouldSkipLoginRedirect('/login/'), true);
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
