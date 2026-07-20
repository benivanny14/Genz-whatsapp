import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowIncomingCallPopup, shouldShowCallScreen } from '../utils/callUi.js';

test('incoming call popup is retired - CallScreen owns the whole call lifecycle now', () => {
  assert.equal(shouldShowIncomingCallPopup({ status: 'incoming' }), false);
  assert.equal(shouldShowIncomingCallPopup({ status: 'calling' }), false);
  assert.equal(shouldShowIncomingCallPopup(null), false);
});

test('shows call screen for every active call state, including incoming', () => {
  assert.equal(shouldShowCallScreen({ status: 'incoming' }), true);
  assert.equal(shouldShowCallScreen({ status: 'calling' }), true);
  assert.equal(shouldShowCallScreen({ status: 'connecting' }), true);
  assert.equal(shouldShowCallScreen({ status: 'connected' }), true);
  assert.equal(shouldShowCallScreen(null), false);
});
