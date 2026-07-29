import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Shield, 
  Check, 
  RefreshCw, 
  ShieldAlert, 
  Globe, 
  Smartphone, 
  LockPattern, 
  Lock, 
  Fingerprint, 
  Camera, 
  Video, 
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';

const SecurityModsPanel = ({ onClose }) => {
  const [settings, setSettings] = useState({
    antiBanProtection: false,
    proxySupport: false,
    ipSpoofing: false,
    deviceSpoofing: false,
    appLockPattern: false,
    appLockPIN: false,
    appLockFingerprint: false,
    antiScreenshot: false,
    screenRecordingDetection: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/security-mods/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleToggle = async (key, endpoint) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/security-mods/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
        setSuccess('Setting updated successfully');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.message || 'Failed to update setting');
      }
    } catch (error) {
      setError('Error updating setting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const securityFeatures = [
    {
      key: 'antiBanProtection',
      title: 'Anti-Ban Protection',
      description: 'Protect against account bans',
      icon: ShieldAlert,
      color: 'blue',
      endpoint: 'anti-ban'
    },
    {
      key: 'proxySupport',
      title: 'Proxy Support',
      description: 'Use proxy servers for connection',
      icon: Globe,
      color: 'purple',
      endpoint: 'proxy'
    },
    {
      key: 'ipSpoofing',
      title: 'IP Spoofing',
      description: 'Hide your real IP address',
      icon: Globe,
      color: 'green',
      endpoint: 'ip-spoofing'
    },
    {
      key: 'deviceSpoofing',
      title: 'Device Spoofing',
      description: 'Spoof device information',
      icon: Smartphone,
      color: 'orange',
      endpoint: 'device-spoofing'
    },
    {
      key: 'appLockPattern',
      title: 'App Lock Pattern',
      description: 'Lock app with pattern',
      icon: LockPattern,
      color: 'red',
      endpoint: 'app-lock-pattern'
    },
    {
      key: 'appLockPIN',
      title: 'App Lock PIN',
      description: 'Lock app with PIN code',
      icon: Lock,
      color: 'pink',
      endpoint: 'app-lock-pin'
    },
    {
      key: 'appLockFingerprint',
      title: 'App Lock Fingerprint',
      description: 'Lock app with fingerprint',
      icon: Fingerprint,
      color: 'indigo',
      endpoint: 'app-lock-fingerprint'
    },
    {
      key: 'antiScreenshot',
      title: 'Anti-Screenshot',
      description: 'Prevent screenshots of chats',
      icon: Camera,
      color: 'teal',
      endpoint: 'anti-screenshot'
    },
    {
      key: 'screenRecordingDetection',
      title: 'Screen Recording Detection',
      description: 'Detect screen recording attempts',
      icon: Video,
      color: 'amber',
      endpoint: 'screen-recording-detection'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    pink: 'bg-pink-100 text-pink-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    teal: 'bg-teal-100 text-teal-600',
    amber: 'bg-amber-100 text-amber-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Security MODs</h2>
              <p className="text-xs text-gray-500">9 advanced security features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          {/* Security Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {securityFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.key}
                  onClick={() => handleToggle(feature.key, feature.endpoint)}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    settings[feature.key]
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-gray-50 hover:border-red-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[feature.color]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{feature.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      settings[feature.key]
                        ? 'border-red-500 bg-red-500'
                        : 'border-gray-300'
                    }`}>
                      {settings[feature.key] && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Warning Section */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">Security Warning</p>
                <p className="text-sm text-gray-600 mt-1">
                  Some security features like IP spoofing and device spoofing may violate WhatsApp's terms of service. 
                  Use them at your own risk and responsibility.
                </p>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">About Security MODs</p>
                <p className="text-sm text-gray-600 mt-1">
                  These advanced security features provide enhanced protection for your account and data. 
                  Enable features based on your security needs and risk tolerance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{Object.values(settings).filter(v => v).length} of {securityFeatures.length} features enabled</span>
            <button
              onClick={fetchSettings}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SecurityModsPanel;
