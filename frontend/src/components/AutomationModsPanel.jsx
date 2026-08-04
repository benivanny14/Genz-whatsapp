import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Bot, 
  Check, 
  RefreshCw, 
  MessageSquare, 
  Trash2, 
  Archive, 
  VolumeX, 
  LogIn, 
  LogOut, 
  Clock,
  Settings,
  Sparkles
} from 'lucide-react';

const AutomationModsPanel = ({ onClose }) => {
  const [settings, setSettings] = useState({
    autoReplyEnabled: false,
    autoReplyAIEnabled: false,
    autoDeleteMessages: false,
    autoDeleteAfterDays: 30,
    autoArchiveChats: false,
    autoArchiveAfterDays: 90,
    autoMuteGroups: false,
    welcomeMessageEnabled: false,
    welcomeMessageText: '',
    goodbyeMessageEnabled: false,
    goodbyeMessageText: ''
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
      const response = await fetch('/api/automation-mods/settings', {
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
      const response = await fetch(`/api/automation-mods/${endpoint}`, {
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

  const handleUpdateDays = async (key, endpoint, value) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/automation-mods/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ days: value })
      });
      const data = await response.json();
      if (data.success) {
        setSettings(prev => ({ ...prev, [key]: value }));
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

  const handleUpdateText = async (key, endpoint, value) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/automation-mods/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: value })
      });
      const data = await response.json();
      if (data.success) {
        setSettings(prev => ({ ...prev, [key]: value }));
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
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Automation MODs</h2>
              <p className="text-xs text-gray-500">Smart automation features</p>
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

          {/* Auto-Reply Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Auto-Reply</h4>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-800">Enable Auto-Reply</p>
                  <p className="text-xs text-gray-500">Automatically reply to messages</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoReplyEnabled}
                onChange={() => handleToggle('autoReplyEnabled', 'auto-reply')}
                className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-800">AI-Powered Replies</p>
                  <p className="text-xs text-gray-500">Use AI to generate smart replies</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoReplyAIEnabled}
                onChange={() => handleToggle('autoReplyAIEnabled', 'auto-reply-ai')}
                className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
            </label>
          </div>

          {/* Auto-Delete Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Auto-Delete</h4>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-800">Auto-Delete Messages</p>
                  <p className="text-xs text-gray-500">Automatically delete old messages</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoDeleteMessages}
                onChange={() => handleToggle('autoDeleteMessages', 'auto-delete')}
                className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
            </label>

            {settings.autoDeleteMessages && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="text-sm text-gray-800 mb-2 block">Delete after (days)</label>
                <input
                  type="number"
                  value={settings.autoDeleteAfterDays}
                  onChange={(e) => handleUpdateDays('autoDeleteAfterDays', 'auto-delete-days', parseInt(e.target.value))}
                  min="1"
                  max="365"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Auto-Archive Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Auto-Archive</h4>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <Archive className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-800">Auto-Archive Chats</p>
                  <p className="text-xs text-gray-500">Automatically archive inactive chats</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoArchiveChats}
                onChange={() => handleToggle('autoArchiveChats', 'auto-archive')}
                className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
            </label>

            {settings.autoArchiveChats && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="text-sm text-gray-800 mb-2 block">Archive after (days)</label>
                <input
                  type="number"
                  value={settings.autoArchiveAfterDays}
                  onChange={(e) => handleUpdateDays('autoArchiveAfterDays', 'auto-archive-days', parseInt(e.target.value))}
                  min="1"
                  max="365"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Auto-Mute Groups */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Group Automation</h4>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <VolumeX className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-800">Auto-Mute Groups</p>
                  <p className="text-xs text-gray-500">Automatically mute all group chats</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoMuteGroups}
                onChange={() => handleToggle('autoMuteGroups', 'auto-mute-groups')}
                className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
            </label>
          </div>

          {/* Welcome/Goodbye Messages */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Welcome & Goodbye Messages</h4>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <LogIn className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-800">Welcome Message</p>
                  <p className="text-xs text-gray-500">Auto-send to new contacts</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.welcomeMessageEnabled}
                onChange={() => handleToggle('welcomeMessageEnabled', 'welcome-message')}
                className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
            </label>

            {settings.welcomeMessageEnabled && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="text-sm text-gray-800 mb-2 block">Welcome message text</label>
                <textarea
                  value={settings.welcomeMessageText}
                  onChange={(e) => handleUpdateText('welcomeMessageText', 'welcome-message-text', e.target.value)}
                  placeholder="Enter welcome message..."
                  rows={3}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-800">Goodbye Message</p>
                  <p className="text-xs text-gray-500">Auto-send when contact leaves</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.goodbyeMessageEnabled}
                onChange={() => handleToggle('goodbyeMessageEnabled', 'goodbye-message')}
                className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
            </label>

            {settings.goodbyeMessageEnabled && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="text-sm text-gray-800 mb-2 block">Goodbye message text</label>
                <textarea
                  value={settings.goodbyeMessageText}
                  onChange={(e) => handleUpdateText('goodbyeMessageText', 'goodbye-message-text', e.target.value)}
                  placeholder="Enter goodbye message..."
                  rows={3}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">About Automation MODs</p>
                <p className="text-sm text-gray-600 mt-1">
                  These automation features help you manage your WhatsApp more efficiently. 
                  Use them responsibly to enhance your productivity.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{Object.values(settings).filter(v => typeof v === 'boolean' ? v : false).length} features enabled</span>
            <button
              onClick={fetchSettings}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AutomationModsPanel;
