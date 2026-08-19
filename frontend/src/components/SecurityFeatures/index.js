/**
 * Security & Lock Features - Grouped Exports
 * 
 * Components serve different purposes:
 * - AppLock: Lock the entire application
 * - ChatLock: Lock individual chat conversations
 * - BiometricAuth: Generic WebAuthn biometric authentication
 * - BiometricLock: Native device biometric lock (Capacitor)
 * - LockScreen: The lock screen UI
 * 
 * Import from this module:
 *   import { AppLock, ChatLock, BiometricLock } from '../components/SecurityFeatures';
 */

// App-Level Lock
export { default as AppLock } from '../AppLock';

// Chat-Level Lock
export { default as ChatLock } from '../ChatLock';

// Biometric Authentication
export { default as BiometricAuth } from '../BiometricAuth';
export { default as BiometricLock, BiometricLockSettings, BiometricLockButton, BiometricLockIndicator, BiometricAuthPrompt } from '../BiometricLock';

// Lock Screen UI
export { default as LockScreen } from '../LockScreen';

// Two-Factor Authentication
export { default as TwoFactorAuth } from '../TwoFactorAuth';

// Passkeys
export { default as PasskeysSettings } from '../PasskeysSettings';

// Profile Security
export { default as ProfileSecurity } from '../ProfileSecurity';

// Security Notifications
export { default as SecurityNotifications } from '../SecurityNotifications';

// Login Alerts
export { default as LoginAlerts } from '../LoginAlerts';
