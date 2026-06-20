import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Mail, Key, Copy, Check, AlertCircle, Loader2, QrCode, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import securityService from '../services/securityService';
import E2EEKeysManager from '../components/E2EEKeysManager';

const SecuritySettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [securitySettings, setSecuritySettings] = useState(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  
  // 2FA Setup States
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  
  // Email Verification States
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  useEffect(() => {
    fetchSecuritySettings();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      setLoading(true);
      const [settings, twoFactorStatus, emailStatus] = await Promise.all([
        securityService.getSecuritySettings(),
        securityService.checkTwoFactorStatus(),
        securityService.checkEmailVerification()
      ]);
      
      setSecuritySettings(settings);
      setTwoFactorEnabled(twoFactorStatus.enabled);
      setEmailVerified(emailStatus.verified);
      setVerificationEmail(emailStatus.email);
    } catch (error) {
      console.error('Error fetching security settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      setSetupLoading(true);
      const data = await securityService.setupTwoFactor();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setShow2FAModal(true);
    } catch (error) {
      console.error('Error setting up 2FA:', error);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    try {
      setSetupLoading(true);
      await securityService.verifyTwoFactorSetup(verificationCode, secret);
      setTwoFactorEnabled(true);
      setShow2FAModal(false);
      setVerificationCode('');
      setQrCode(null);
      setSecret('');
    } catch (error) {
      console.error('Error verifying 2FA:', error);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setSetupLoading(true);
      await securityService.disableTwoFactor(disableCode);
      setTwoFactorEnabled(false);
      setShowDisable2FAModal(false);
      setDisableCode('');
    } catch (error) {
      console.error('Error disabling 2FA:', error);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSendEmailVerification = async () => {
    try {
      if (!verificationEmail) return;
      setEmailLoading(true);
      await securityService.sendEmailVerification(verificationEmail);
      setShowEmailModal(true);
    } catch (error) {
      console.error('Error sending email verification:', error);
    } finally {
      setEmailLoading(false);
    }
  };

  const copySecretToClipboard = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading security settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Security Settings</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 pb-20 space-y-6">
        {/* Two-Factor Authentication */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                twoFactorEnabled
                  ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {twoFactorEnabled 
                ? 'Your account is protected with 2FA. You can disable it anytime.'
                : 'Enable 2FA to protect your account with an additional security layer.'
              }
            </p>
            {twoFactorEnabled ? (
              <button
                onClick={() => setShowDisable2FAModal(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={handleSetup2FA}
                disabled={setupLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enable 2FA'}
              </button>
            )}
          </div>
        </div>

        {/* Email Verification */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Verification</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Verify your email address to secure your account
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                emailVerified
                  ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                  : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400'
              }`}>
                {emailVerified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 mr-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {emailVerified 
                    ? `Email verified: ${verificationEmail}`
                    : 'Verify your email to enable account recovery and security notifications.'
                  }
                </p>
                {!emailVerified && (
                  <input
                    type="email"
                    value={verificationEmail || ''}
                    onChange={(e) => setVerificationEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-3 py-2 mt-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                )}
              </div>
              {!emailVerified && (
                <button
                  onClick={handleSendEmailVerification}
                  disabled={emailLoading || !verificationEmail}
                  className="px-4 py-2 mt-8 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Email'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Security Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">Security Tips</h3>
              <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <li>• Use a strong, unique password for your account</li>
                <li>• Enable 2FA for maximum security</li>
                <li>• Keep your recovery email up to date</li>
                <li>• Never share your verification codes with anyone</li>
              </ul>
            </div>
          </div>
        </div>

        {/* E2EE Key Manager */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">End-to-End Encryption (E2EE)</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your client-side keys for end-to-end encrypted chats. Private keys never leave your device.</p>
              <div className="mt-4">
                <E2EEKeysManager />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      <AnimatePresence>
        {show2FAModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShow2FAModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Setup Two-Factor Authentication</h2>
              
              {qrCode && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Scan this QR code with your authenticator app:</p>
                  <div className="flex justify-center">
                    <img
                      src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                      alt="2FA QR Code"
                      className="w-48 h-48 border border-gray-200 dark:border-gray-700 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {secret && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Or enter this secret key manually:</p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={secret}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg font-mono text-sm"
                    />
                    <button
                      onClick={copySecretToClipboard}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Copy secret"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter verification code:
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  maxLength={6}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerify2FA}
                  disabled={setupLoading || verificationCode.length !== 6}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                >
                  {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Enable'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disable 2FA Modal */}
      <AnimatePresence>
        {showDisable2FAModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDisable2FAModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Disable Two-Factor Authentication</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter your current 2FA code to disable two-factor authentication. This will make your account less secure.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verification code:
                </label>
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder="000000"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  maxLength={6}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDisable2FAModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisable2FA}
                  disabled={setupLoading || disableCode.length !== 6}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
                >
                  {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable 2FA'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Verification Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEmailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full w-12 h-12 mx-auto mb-4">
                  <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Check Your Email</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  We've sent a verification email to <strong>{verificationEmail}</strong>. 
                  Click the link in the email to verify your account.
                </p>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SecuritySettings;
