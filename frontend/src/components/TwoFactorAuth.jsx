import React, { useState, useEffect } from 'react';
import { Shield, X, QrCode, CheckCircle, AlertCircle, Lock, Copy, Check } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = resolveApiBase();

const TwoFactorAuth = ({ onClose }) => {
  const { generate2FASecret, verify2FASetup, disable2FA } = useChat();
  const [isEnabled, setIsEnabled] = useState(false);
  const [step, setStep] = useState('check'); // check, setup, verify, success
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    check2FAStatus();
  }, []);

  const check2FAStatus = async () => {
    try {
      const response = await authFetch(`${API_URL}/security/2fa/status`);
      const data = await response.json();
      if (data?.success) {
        setIsEnabled(Boolean(data.twoFactorEnabled));
      }
    } catch (_) {
      setIsEnabled(false);
    } finally {
      setStep('check');
    }
  };

  const handleEnable2FA = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generate2FASecret();
      if (result.success) {
        setSecret(result.secret);
        setQrCode(result.qrCode);
        setStep('setup');
      } else {
        setError(result.message || 'Failed to generate 2FA secret');
      }
    } catch (err) {
      setError('Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verify2FASetup(secret, verificationCode);
      if (result.success) {
        setIsEnabled(true);
        setStep('success');
      } else {
        setError(result.message || 'Verification failed');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? Your account will be less secure.')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await disable2FA();
      if (result.success) {
        setIsEnabled(false);
        setStep('check');
      } else {
        setError(result.message || 'Failed to disable 2FA');
      }
    } catch (err) {
      setError('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface rounded-2xl w-full max-w-md border border-dark-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-bold text-dark-text">Two-Factor Authentication</h2>
          </div>
          <button onClick={onClose} className="text-dark-textSecondary hover:text-dark-text" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'check' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Lock className="w-16 h-16 mx-auto mb-4 text-primary-500" />
                <h3 className="text-xl font-bold text-dark-text mb-2">Secure Your Account</h3>
                <p className="text-sm text-dark-textSecondary">
                  Two-factor authentication adds an extra layer of security to your account.
                </p>
              </div>

              {!isEnabled ? (
                <button
                  onClick={handleEnable2FA}
                  disabled={loading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Enable 2FA'}
                </button>
              ) : (
                <button
                  onClick={handleDisable2FA}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              )}
            </div>
          )}

          {step === 'setup' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-dark-text mb-2">Scan QR Code</h3>
                <p className="text-sm text-dark-textSecondary mb-4">
                  Use an authenticator app like Google Authenticator or Authy to scan this QR code
                </p>
              </div>

              {qrCode && (
                <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
              )}

              <div className="bg-dark-bg p-3 rounded-lg">
                <p className="text-xs text-dark-textSecondary mb-2">Or enter this code manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-dark-surface px-3 py-2 rounded text-sm font-mono break-all">
                    {secret}
                  </code>
                  <button
                    onClick={handleCopySecret}
                    className="p-2 text-primary-500 hover:bg-dark-hover rounded transition-colors"
                    title="Copy secret" aria-label="Copy secret"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep('verify')}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors"
              >
                I've Scanned the QR Code
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-dark-text mb-2">Enter Verification Code</h3>
                <p className="text-sm text-dark-textSecondary">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                }}
                placeholder="000000"
                className="w-full bg-dark-bg border border-dark-border rounded-lg p-4 text-center text-2xl font-mono tracking-widest text-dark-text focus:outline-none focus:border-primary-500"
                maxLength={6}
              />

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleVerify2FA}
                disabled={loading || verificationCode.length !== 6}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-dark-text">2FA Enabled!</h3>
              <p className="text-sm text-dark-textSecondary">
                Your account is now protected with two-factor authentication.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth;
