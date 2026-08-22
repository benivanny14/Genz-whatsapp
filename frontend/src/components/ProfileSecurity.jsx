import React, { useState, useEffect } from 'react';
import { Shield, X, Check, RefreshCw, Lock, Eye, EyeOff, AlertTriangle, Fingerprint, Smartphone, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = resolveApiBase();

const ProfileSecurity = ({ user, securitySettings, onUpdateSecurity, onClose }) => {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState('status'); // 'status', 'setup', 'verify', 'enabled'
  const [twoFactorData, setTwoFactorData] = useState({ qrCode: null, secret: null });
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchTwoFactorStatus();
  }, []);

  const fetchTwoFactorStatus = async () => {
    try {
      const res = await authFetch(`${API_URL}/security/2fa/status`);
      const data = await res.json();
      if (data.success) {
        setTwoFactorEnabled(data.enabled || false);
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    }
  };

  const handleGenerateTwoFactor = async () => {
    setIsProcessing(true);
    try {
      const res = await authFetch(`${API_URL}/security/2fa/generate`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setTwoFactorData({ qrCode: data.qrCodeDataUrl, secret: data.secret });
        setTwoFactorStep('verify');
      } else {
        alert(data.message || 'Failed to generate 2FA secret');
      }
    } catch (error) {
      console.error('Generate 2FA error:', error);
      alert('Failed to connect to the server');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      alert('Please enter a valid 6-digit code');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await authFetch(`${API_URL}/security/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: twoFactorToken })
      });
      const data = await res.json();
      if (data.success) {
        setTwoFactorEnabled(true);
        setTwoFactorStep('enabled');
        setTwoFactorToken('');
        onUpdateSecurity?.({ ...securitySettings, twoFactor: true });
      } else {
        alert(data.message || 'Invalid code. Please try again.');
      }
    } catch (error) {
      console.error('Verify 2FA error:', error);
      alert('Failed to verify code');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication?')) return;

    setIsProcessing(true);
    try {
      const res = await authFetch(`${API_URL}/security/2fa/disable`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setTwoFactorEnabled(false);
        setTwoFactorStep('status');
        onUpdateSecurity?.({ ...securitySettings, twoFactor: false });
      } else {
        alert(data.message || 'Failed to disable 2FA');
      }
    } catch (error) {
      console.error('Disable 2FA error:', error);
      alert('Failed to disable 2FA');
    } finally {
      setIsProcessing(false);
    }
  };

  const securityOptions = [
    {
      id: 'two_factor',
      title: 'Two-Factor Authentication',
      description: 'Add an extra layer of security',
      icon: Smartphone,
      enabled: twoFactorEnabled
    },
    {
      id: 'biometric',
      title: 'Biometric Login',
      description: 'Use fingerprint or face recognition',
      icon: Fingerprint,
      enabled: securitySettings?.biometric || false
    },
    {
      id: 'login_alerts',
      title: 'Login Alerts',
      description: 'Get notified of new logins',
      icon: Eye,
      enabled: securitySettings?.loginAlerts !== false
    }
  ];

  const handleToggleSecurity = async (optionId) => {
    if (optionId === 'two_factor') {
      if (twoFactorEnabled) {
        handleDisableTwoFactor();
      } else {
        setShowTwoFactor(true);
        setTwoFactorStep('setup');
      }
      return;
    }

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsProcessing(false);

    const updatedSettings = {
      ...securitySettings,
      [optionId]: !securitySettings?.[optionId]
    };

    onUpdateSecurity?.(updatedSettings);
  };

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await authFetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'Failed to change password');
        return;
      }
      alert('Password imebadilishwa kwa mafanikio');
      onUpdateSecurity?.({
        ...securitySettings,
        passwordChanged: true
      });
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowChangePassword(false);
    } catch (err) {
      alert('Failed to connect to the server. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-2">
            <Shield className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Security Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Change Password */}
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-[#00a884]" />
                <p className="text-white font-medium">Change Password</p>
              </div>
              <button
                onClick={() => setShowChangePassword(!showChangePassword)}
                className="text-[#00a884] text-sm hover:text-[#008f72] transition-colors"
              >
                {showChangePassword ? 'Cancel' : 'Change'}
              </button>
            </div>

            {showChangePassword && (
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Current password</p>
                  <input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    className="w-full bg-[#1a2e35] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">New password</p>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full bg-[#1a2e35] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Confirm password</p>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full bg-[#1a2e35] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={isProcessing}
                  className="w-full bg-[#00a884] text-white py-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:cursor-not-allowed text-sm"
                >
                  {isProcessing ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            )}
          </div>

          {/* 2FA Setup Modal */}
          <AnimatePresence>
            {showTwoFactor && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowTwoFactor(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6 border border-[#00a884]/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="text-[#00a884]" size={20} />
                      <h3 className="text-white font-semibold">Two-Factor Authentication</h3>
                    </div>
                    <button
                      onClick={() => setShowTwoFactor(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {twoFactorStep === 'setup' && (
                    <div className="space-y-4">
                      <p className="text-gray-300 text-sm">
                        Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) to enable 2FA.
                      </p>
                      <button
                        onClick={handleGenerateTwoFactor}
                        disabled={isProcessing}
                        className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Generating...' : 'Generate QR Code'}
                      </button>
                    </div>
                  )}

                  {twoFactorStep === 'verify' && (
                    <div className="space-y-4">
                      {twoFactorData.qrCode && (
                        <div className="flex justify-center">
                          <img src={twoFactorData.qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
                        </div>
                      )}
                      {twoFactorData.secret && (
                        <div className="bg-[#0b141a] rounded-lg p-3">
                          <p className="text-gray-400 text-xs mb-1">Secret key (manual entry):</p>
                          <p className="text-white font-mono text-sm break-all">{twoFactorData.secret}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Enter 6-digit code</p>
                        <input
                          type="text"
                          value={twoFactorToken}
                          onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-center text-2xl tracking-widest"
                          maxLength={6}
                        />
                      </div>
                      <button
                        onClick={handleVerifyTwoFactor}
                        disabled={isProcessing || twoFactorToken.length !== 6}
                        className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Verifying...' : 'Verify & Enable'}
                      </button>
                    </div>
                  )}

                  {twoFactorStep === 'enabled' && (
                    <div className="space-y-4 text-center">
                      <div className="w-16 h-16 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto">
                        <Check className="text-[#00a884]" size={32} />
                      </div>
                      <p className="text-white font-medium">2FA Enabled Successfully!</p>
                      <p className="text-gray-400 text-sm">Your account is now protected with two-factor authentication.</p>
                      <button
                        onClick={() => setShowTwoFactor(false)}
                        className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Security Options */}
          {securityOptions.map(option => {
            const Icon = option.icon;
            return (
              <div
                key={option.id}
                className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${option.enabled ? 'bg-[#00a884]/20' : 'bg-gray-500/20'}`}>
                      <Icon size={20} className={option.enabled ? 'text-[#00a884]' : 'text-gray-400'} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{option.title}</p>
                      <p className="text-gray-400 text-xs">{option.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleSecurity(option.id)}
                    disabled={isProcessing}
                    className={`w-12 h-6 rounded-full transition-all ${
                      option.enabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                    } disabled:opacity-50`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-all ${
                        option.enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Warning */}
        <div className="p-4 border-t border-[#00a884]/20 bg-yellow-500/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
            <p className="text-yellow-500 text-xs">
              Security settings help protect your account. Make sure to use a strong password and enable two-factor authentication.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Security Button Component
export const SecurityButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Security settings"
    >
      <Shield size={18} />
    </button>
  );
};

export default ProfileSecurity;
