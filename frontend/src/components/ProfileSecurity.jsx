import React, { useState } from 'react';
import { Shield, X, Check, RefreshCw, Lock, Eye, EyeOff, AlertTriangle, Fingerprint, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProfileSecurity = ({ user, securitySettings, onUpdateSecurity, onClose }) => {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const securityOptions = [
    {
      id: 'two_factor',
      title: 'Two-Factor Authentication',
      description: 'Add an extra layer of security',
      icon: Smartphone,
      enabled: securitySettings?.twoFactor || false
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
      enabled: securitySettings?.loginAlerts || true
    }
  ];

  const handleToggleSecurity = async (optionId) => {
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);

    onUpdateSecurity?.({
      ...securitySettings,
      passwordChanged: true
    });

    setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowChangePassword(false);
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
