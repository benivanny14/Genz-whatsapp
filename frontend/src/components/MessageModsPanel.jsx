import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MessageSquare, 
  Check, 
  RefreshCw, 
  File, 
  HardDrive, 
  Edit3, 
  Trash2, 
  Lock, 
  Languages, 
  Mic,
  Sparkles
} from 'lucide-react';

const MessageModsPanel = ({ onClose }) => {
  const [settings, setSettings] = useState({
    sendAnyFileType: false,
    fileSizeLimitIncrease: false,
    editSentMessages: false,
    deleteForEveryoneBypass: false,
    messageEncryptionToggle: false,
    messageTranslation: false,
    messageTranscription: false
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
      const response = await fetch('/api/message-mods/settings', {
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
      const token = getAuthToken();
      const response = await fetch(`/api/message-mods/${endpoint}`, {
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

  const messageFeatures = [
    {
      key: 'sendAnyFileType',
      title: 'Send Any File Type',
      description: 'Send any file format including APK, EXE',
      icon: File,
      color: 'blue',
      endpoint: 'send-any-file'
    },
    {
      key: 'fileSizeLimitIncrease',
      title: 'File Size Limit Increase',
      description: 'Send files larger than default limit',
      icon: HardDrive,
      color: 'purple',
      endpoint: 'file-size-limit'
    },
    {
      key: 'editSentMessages',
      title: 'Edit Sent Messages',
      description: 'Edit messages after sending',
      icon: Edit3,
      color: 'green',
      endpoint: 'edit-sent'
    },
    {
      key: 'deleteForEveryoneBypass',
      title: 'Delete for Everyone Bypass',
      description: 'View deleted messages',
      icon: Trash2,
      color: 'orange',
      endpoint: 'delete-bypass'
    },
    {
      key: 'messageEncryptionToggle',
      title: 'Message Encryption Toggle',
      description: 'Toggle end-to-end encryption',
      icon: Lock,
      color: 'red',
      endpoint: 'encryption'
    },
    {
      key: 'messageTranslation',
      title: 'Message Translation',
      description: 'Auto-translate messages',
      icon: Languages,
      color: 'pink',
      endpoint: 'translation'
    },
    {
      key: 'messageTranscription',
      title: 'Message Transcription',
      description: 'Transcribe voice messages to text',
      icon: Mic,
      color: 'indigo',
      endpoint: 'transcription'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    pink: 'bg-pink-100 text-pink-600',
    indigo: 'bg-indigo-100 text-indigo-600'
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
            <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Message MODs</h2>
              <p className="text-xs text-gray-500">7 advanced message features</p>
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

          {/* Message Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {messageFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.key}
                  onClick={() => handleToggle(feature.key, feature.endpoint)}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    settings[feature.key]
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 bg-gray-50 hover:border-violet-300'
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
                        ? 'border-violet-500 bg-violet-500'
                        : 'border-gray-300'
                    }`}>
                      {settings[feature.key] && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Info Section */}
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-violet-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">About Message MODs</p>
                <p className="text-sm text-gray-600 mt-1">
                  These advanced message features enhance your messaging capabilities. 
                  Send any file type, edit sent messages, translate, and transcribe voice messages.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{Object.values(settings).filter(v => v).length} of {messageFeatures.length} features enabled</span>
            <button
              onClick={fetchSettings}
              className="text-violet-600 hover:text-violet-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MessageModsPanel;
