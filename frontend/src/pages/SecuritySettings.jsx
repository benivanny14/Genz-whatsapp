import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, KeyRound, Lock, Bell, QrCode, Smartphone, Check, Shield, X, Fingerprint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';
import { isBiometricAvailable, authenticateWithBiometric } from '../services/capacitorBridge';

// Ask for the real device biometric (APK) before a sensitive security action.
// On the web (no native biometric) this simply allows the action.
const confirmWithBiometric = async (reason) => {
  const { native, isAvailable } = await isBiometricAvailable();
  if (!native || !isAvailable) return true;
  const result = await authenticateWithBiometric({ reason });
  return result.verified === true;
};

const API_URL = resolveApiBase();

const SecuritySettings = () => {
  const navigate = useNavigate();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [qrSetup, setQrSetup] = useState(null);
  const [verifyToken, setVerifyToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadTwoFactorStatus = async () => {
    try {
      const res = await authFetch(`${API_URL}/security/2fa/status`);
      const data = await res.json();
      if (data.success) setTwoFactorEnabled(data.twoFactorEnabled);
    } catch (e) {
      console.error('Error loading 2FA status:', e);
    }
  };

  useEffect(() => { loadTwoFactorStatus(); }, []);

  const enableTwoFactor = async () => {
    // Sensitive action: confirm identity with the device fingerprint in the APK.
    const ok = await confirmWithBiometric('Confirm your identity to enable two-factor authentication');
    if (!ok) { setErrorMsg('Biometric authentication failed. Please try again.'); return; }
    setTwoFactorLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch(`${API_URL}/security/2fa/generate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setQrSetup({ secret: data.secret, qr: data.qr, qrCode: data.qrCode });
      } else {
        setErrorMsg(data.message || 'Failed to generate 2FA secret');
      }
    } catch (e) {
      setErrorMsg('Network error');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const confirmTwoFactor = async () => {
    if (!verifyToken || verifyToken.length < 6) {
      setErrorMsg('Please enter a valid 6-digit code');
      return;
    }
    setTwoFactorLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch(`${API_URL}/security/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken })
      });
      const data = await res.json();
      if (data.success) {
        setTwoFactorEnabled(true);
        setQrSetup(null);
        setVerifyToken('');
      } else {
        setErrorMsg(data.message || 'Invalid verification code');
      }
    } catch (e) {
      setErrorMsg('Network error');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    // Sensitive action: confirm identity with the device fingerprint in the APK.
    const ok = await confirmWithBiometric('Confirm your identity to disable two-factor authentication');
    if (!ok) { setErrorMsg('Biometric authentication failed. Please try again.'); return; }
    if (!window.confirm('Disable two-factor authentication? You will no longer need an authenticator app to log in.')) return;
    setTwoFactorLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch(`${API_URL}/security/2fa/disable`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTwoFactorEnabled(false);
      } else {
        setErrorMsg(data.message || 'Failed to disable 2FA');
      }
    } catch (e) {
      setErrorMsg('Network error');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Back to settings">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Security</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <KeyRound className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Security</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                  Manage your account security preferences.
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Security notifications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Get alerts about security events</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Lock className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Passkeys</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Sign in securely without a password</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Two-factor authentication</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                  <Fingerprint size={12} /> Enabled/disabled actions confirm with your device fingerprint inside the APK
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Add an extra layer of security to your account using an authenticator app (TOTP).
                </p>
                {errorMsg && <p className="text-sm text-red-500 mt-2">{errorMsg}</p>}
              </div>
            </div>

            {qrSetup ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Scan this QR code with your authenticator app, then enter the 6-digit code below.
                </p>
                {qrSetup.qrCode ? (
                  <img src={qrSetup.qrCode} alt="2FA QR code" className="w-32 h-32" />
                ) : qrSetup.qr ? (
                  <img src={qrSetup.qr} alt="2FA QR code" className="w-32 h-32" />
                ) : (
                  <QrCode className="w-24 h-24 text-gray-400" />
                )}
                <p className="text-xs text-gray-500 break-all">Secret: {qrSetup.secret}</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="6-digit code from authenticator"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmTwoFactor}
                    disabled={twoFactorLoading || !verifyToken}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {twoFactorLoading ? 'Verifying...' : <><Check size={16} /> Verify & enable</>}
                  </button>
                  <button type="button" onClick={() => { setQrSetup(null); setVerifyToken(''); setErrorMsg(''); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">
                    Cancel
                  </button>
                </div>
              </div>
            ) : twoFactorEnabled ? (
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <Shield size={18} />
                  <span className="font-medium">Two-factor authentication is ON</span>
                </div>
                <button
                  type="button"
                  onClick={disableTwoFactor}
                  disabled={twoFactorLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-2"
                >
                  {twoFactorLoading ? 'Disabling...' : 'Disable'}
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={enableTwoFactor}
                  disabled={twoFactorLoading}
                  className="px-4 py-2 bg-[#00a884] hover:bg-[#029676] text-white rounded-md flex items-center gap-2"
                >
                  {twoFactorLoading ? 'Loading...' : <><Smartphone size={16} /> Enable two-factor authentication</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
