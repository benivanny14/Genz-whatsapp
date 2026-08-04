import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Shield, 
  Check, 
  RefreshCw, 
  EyeOff, 
  Ghost, 
  Clock, 
  Eye, 
  Forward, 
  Image as ImageIcon, 
  MessageSquare, 
  User, 
  Bell, 
  Download, 
  Globe, 
  CheckCircle,
  Smile,
  DollarSign
} from 'lucide-react';

const PrivacyModsPanel = ({ onClose }) => {
  const [settings, setSettings] = useState({
    freezeLastSeen: false,
    ghostMode: false,
    hideOnline: false,
    antiViewOnce: false,
    disableForwardedTag: false,
    hideStatusView: false,
    hideReadReceipts: false,
    whoViewedProfile: false,
    contactOnlineNotifier: false,
    autoDownloadStatus: false,
    languagePerChat: false,
    customTickPerContact: false,
    customEmojiStyle: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/privacy-mods/settings', {
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

  const handleToggle = async (key) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/privacy-mods/${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, {
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

  const privacyFeatures = [
    {
      key: 'freezeLastSeen',
      title: 'Freeze Last Seen',
      description: 'Keep your last seen time frozen',
      icon: Clock,
      color: 'blue'
    },
    {
      key: 'ghostMode',
      title: 'Ghost Mode',
      description: 'Appear offline to everyone',
      icon: Ghost,
      color: 'purple'
    },
    {
      key: 'hideOnline',
      title: 'Hide Online',
      description: 'Hide your online status',
      icon: EyeOff,
      color: 'green'
    },
    {
      key: 'antiViewOnce',
      title: 'Anti-View Once',
      description: 'Bypass view once media restriction',
      icon: Eye,
      color: 'orange'
    },
    {
      key: 'disableForwardedTag',
      title: 'Disable Forwarded Tag',
      description: 'Remove forwarded message tag',
      icon: Forward,
      color: 'red'
    },
    {
      key: 'hideStatusView',
      title: 'Hide Status View',
      description: 'Hide who viewed your status',
      icon: ImageIcon,
      color: 'pink'
    },
    {
      key: 'hideReadReceipts',
      title: 'Hide Read Receipts',
      description: 'Hide blue ticks (read receipts)',
      icon: MessageSquare,
      color: 'indigo'
    },
    {
      key: 'whoViewedProfile',
      title: 'Who Viewed Profile',
      description: 'See who viewed your profile',
      icon: User,
      color: 'teal'
    },
    {
      key: 'contactOnlineNotifier',
      title: 'Contact Online Notifier',
      description: 'Get notified when contacts come online',
      icon: Bell,
      color: 'amber'
    },
    {
      key: 'autoDownloadStatus',
      title: 'Auto-Download Status',
      description: 'Automatically download status media',
      icon: Download,
      color: 'cyan'
    },
    {
      key: 'languagePerChat',
      title: 'Language Per Chat',
      description: 'Set different language per chat',
      icon: Globe,
      color: 'emerald'
    },
    {
      key: 'customTickPerContact',
      title: 'Custom Tick Per Contact',
      description: 'Custom tick style per contact',
      icon: CheckCircle,
      color: 'violet'
    },
    {
      key: 'customEmojiStyle',
      title: 'Custom Emoji Style',
      description: 'Use custom emoji styles',
      icon: Smile,
      color: 'rose'
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
    amber: 'bg-amber-100 text-amber-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    violet: 'bg-violet-100 text-violet-600',
    rose: 'bg-rose-100 text-rose-600'
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
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Privacy MODs</h2>
              <p className="text-xs text-gray-500">14 advanced privacy features</p>
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

          {/* Privacy Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {privacyFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.key}
                  onClick={() => handleToggle(feature.key)}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    settings[feature.key]
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-gray-50 hover:border-indigo-300'
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
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-gray-300'
                    }`}>
                      {settings[feature.key] && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* GENZ AFTER WORK - Premium Feature */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 border border-purple-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <DollarSign size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">GENZ AFTER WORK</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Discover premium features & services</p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/genz-after-work'}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Access
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">About Privacy MODs</p>
                <p className="text-sm text-gray-600 mt-1">
                  These advanced privacy features give you complete control over your WhatsApp privacy. 
                  Use them responsibly and in accordance with WhatsApp's terms of service.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{Object.values(settings).filter(v => v).length} of {privacyFeatures.length} features enabled</span>
            <button
              onClick={fetchSettings}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PrivacyModsPanel;
