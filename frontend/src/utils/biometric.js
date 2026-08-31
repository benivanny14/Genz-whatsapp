/**
 * biometric.js — Standalone biometric authentication utility for GENZ Messenger.
 *
 * Wraps the Capacitor native biometric bridge (fingerprint / Face ID) with a
 * clean Promise-based API. Falls back to PIN/Pattern when biometric hardware
 * is unavailable or the user cancels.
 *
 * Usage:
 *   import { tryBiometric, isBiometricSupported } from '../utils/biometric';
 *
 *   if (await isBiometricSupported()) {
 *     const result = await tryBiometric('Unlock Genz Messenger');
 *     if (result.success) unlockApp();
 *   }
 */

import {
  isBiometricAvailable,
  authenticateWithBiometric
} from '../services/capacitorBridge';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY_LAST_UNLOCK = 'genz_last_unlock';
const STORAGE_KEY_LOCK_TYPE  = 'genz_lock_type';
const STORAGE_KEY_PIN_HASH   = 'genz_pin_hash';
const STORAGE_KEY_LOCK_PIN   = 'genz_lock_pin';

/**
 * Check if the device supports native biometric authentication.
 * @returns {Promise<{ supported: boolean, hasFaceId?: boolean }>}
 */
export const isBiometricSupported = async () => {
  try {
    const { native, isAvailable, hasFaceId } = await isBiometricAvailable();
    return { supported: native && isAvailable, hasFaceId };
  } catch {
    return { supported: false };
  }
};

/**
 * Get the current lock type saved by the user.
 * @returns {'fingerprint' | 'pin' | null}
 */
export const getLockType = () => {
  try {
    return localStorage.getItem(STORAGE_KEY_LOCK_TYPE) || null;
  } catch {
    return null;
  }
};

/**
 * Check if a PIN backup is configured.
 */
export const hasPinBackup = () => {
  try {
    return (
      !!localStorage.getItem(STORAGE_KEY_LOCK_PIN) ||
      !!localStorage.getItem(STORAGE_KEY_PIN_HASH)
    );
  } catch {
    return false;
  }
};

/**
 * Record a successful unlock timestamp (used for inactivity auto-lock).
 */
export const recordUnlock = () => {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_UNLOCK, Date.now().toString());
  } catch { /* ignore */ }
};

/**
 * Check if inactivity lock should trigger.
 * @param {number} timeoutMs — inactivity threshold (default 5 min)
 * @returns {boolean}
 */
export const shouldAutoLock = (timeoutMs = 5 * 60 * 1000) => {
  try {
    const last = parseInt(localStorage.getItem(STORAGE_KEY_LAST_UNLOCK) || Date.now().toString(), 10);
    return Date.now() - last > timeoutMs;
  } catch {
    return false;
  }
};

// ── Core biometric flow ──────────────────────────────────────────────────────

/**
 * Attempt native biometric authentication (fingerprint / Face ID).
 *
 * Returns immediately if the device has no biometric hardware — the caller
 * should fall back to PIN/Pattern UI.
 *
 * @param {string} reason — shown on the native prompt (e.g. "Unlock Genz Messenger")
 * @returns {Promise<{ success: boolean, used: boolean, error?: string }>}
 *   - success: true if the user was authenticated
 *   - used:    true if the native prompt was actually shown (false on web)
 *   - error:   error message if the attempt failed
 */
export const tryBiometric = async (reason = 'Unlock Genz Messenger') => {
  const { supported } = await isBiometricSupported();

  if (!supported) {
    // No biometrics on this device (or running in a web browser)
    return { success: false, used: false };
  }

  try {
    const result = await authenticateWithBiometric({
      reason,
      description: 'Scan your fingerprint or use Face ID to unlock.',
      negativeButtonText: 'Use PIN instead',
      maxAttempts: 3
    });

    if (result.verified) {
      recordUnlock();
      return { success: true, used: true };
    }

    return { success: false, used: true, error: result.error || 'Authentication failed' };
  } catch (err) {
    return {
      success: false,
      used: true,
      error: err?.message || 'Biometric authentication error'
    };
  }
};

/**
 * Full unlock flow: try biometric first → fall back to checking if PIN
 * backup exists → if no backup, unlock anyway (web with no lock configured).
 *
 * @param {string} reason
 * @returns {Promise<{ unlocked: boolean, needsPin: boolean, error?: string }>}
 */
export const attemptUnlock = async (reason = 'Unlock Genz Messenger') => {
  const lockType = getLockType();

  // PIN-only lock — skip biometric entirely
  if (lockType === 'pin') {
    return { unlocked: false, needsPin: true };
  }

  // Fingerprint lock (or first-time — try biometric if available)
  const result = await tryBiometric(reason);

  if (result.success) {
    return { unlocked: true, needsPin: false };
  }

  // Biometric used but failed → fall back to PIN if configured
  if (result.used && hasPinBackup()) {
    return { unlocked: false, needsPin: true, error: result.error };
  }

  // No biometric available AND no PIN backup → unlock (can't lock user out)
  if (!result.used && !hasPinBackup()) {
    recordUnlock();
    return { unlocked: true, needsPin: false };
  }

  // Biometric failed, no PIN backup — still let user in (safety net)
  if (!hasPinBackup()) {
    recordUnlock();
    return { unlocked: true, needsPin: false };
  }

  return { unlocked: false, needsPin: true, error: result.error };
};

export default {
  tryBiometric,
  attemptUnlock,
  isBiometricSupported,
  getLockType,
  hasPinBackup,
  recordUnlock,
  shouldAutoLock
};
