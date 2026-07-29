import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  RotateCcw, 
  Shield, 
  Trash2, 
  Check, 
  AlertTriangle,
  Clock,
  Bell
} from 'lucide-react';

const AntiRevokePanel = ({ onClose }) => {
  const [antiRevokeEnabled, setAntiRevokeEnabled] = useState(false);
  const [cacheDeletedMessages, setCacheDeletedMessages] = useState(true);
  const [showDeletedMessages, setShowDeletedMessages] = useState(true);
  const [markAsDeleted, setMarkAsDeleted] = useState(true);
  const [autoDeleteCache, setAutoDeleteCache] = useState(true);
  const [cacheRetentionDays, setCacheRetentionDays] = useState(7);
  const [notifyOnDelete, setNotifyOnDelete] = useState(false);
  const [cachedMessages, setCachedMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchCachedMessages();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/anti-revoke/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAntiRevokeEnabled(data.settings.antiRevokeEnabled);
        setCacheDeletedMessages(data.settings.cacheDeletedMessages);
        setShowDeletedMessages(data.settings.showDeletedMessages);
        setMarkAsDeleted(data.settings.markAsDeleted);
        setAutoDeleteCache(data.settings.autoDeleteCache);
        setCacheRetentionDays(data.settings.cacheRetentionDays);
        setNotifyOnDelete(data.settings.notifyOnDelete);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchCachedMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/anti-revoke/cached', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCachedMessages(data.cachedMessages);
      }
    } catch (error) {
      console.error('Error fetching cached messages:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/anti-revoke/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          antiRevokeEnabled,
          cacheDeletedMessages,
          showDeletedMessages,
          markAsDeleted,
          autoDeleteCache,
          cacheRetentionDays,
          notifyOnDelete
        })
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Settings saved successfully');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.message || 'Failed to save settings');
      }
    } catch (error) {
      setError('Error saving settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all cached deleted messages?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/anti-revoke/cached', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCachedMessages([]);
        setSuccess('Cache cleared successfully');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (error) {
      setError('Error clearing cache: ' + error.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Anti-Revoke (Anti-Delete)</h2>
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
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          {/* Main Toggle */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-gray-800">Enable Anti-Revoke</h3>
                  <p className="text-xs text-gray-600">Save deleted messages locally</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={antiRevokeEnabled}
                  onChange={(e) => setAntiRevokeEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Settings</h4>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Cache deleted messages</p>
                <p className="text-xs text-gray-500">Store deleted messages locally</p>
              </div>
              <input
                type="checkbox"
                checked={cacheDeletedMessages}
                onChange={(e) => setCacheDeletedMessages(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Show deleted messages</p>
                <p className="text-xs text-gray-500">Display cached deleted messages</p>
              </div>
              <input
                type="checkbox"
                checked={showDeletedMessages}
                onChange={(e) => setShowDeletedMessages(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Mark as deleted</p>
                <p className="text-xs text-gray-500">Show "This message was deleted" label</p>
              </div>
              <input
                type="checkbox"
                checked={markAsDeleted}
                onChange={(e) => setMarkAsDeleted(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Auto-delete cache</p>
                <p className="text-xs text-gray-500">Automatically delete old cached messages</p>
              </div>
              <input
                type="checkbox"
                checked={autoDeleteCache}
                onChange={(e) => setAutoDeleteCache(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Notify on delete</p>
                <p className="text-xs text-gray-500">Get notification when message is deleted</p>
              </div>
              <input
                type="checkbox"
                checked={notifyOnDelete}
                onChange={(e) => setNotifyOnDelete(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="text-sm text-gray-800 mb-2 block">Cache retention (days)</label>
              <input
                type="number"
                value={cacheRetentionDays}
                onChange={(e) => setCacheRetentionDays(parseInt(e.target.value))}
                min="1"
                max="30"
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Cached Messages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-700">Cached Messages ({cachedMessages.length})</h4>
              <button
                onClick={handleClearCache}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            </div>

            {cachedMessages.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No cached messages</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {cachedMessages.slice(0, 10).map((msg, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-700 truncate">{msg.content || '[Media]'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(msg.cachedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
                {cachedMessages.length > 10 && (
                  <p className="text-xs text-gray-500 text-center">...and {cachedMessages.length - 10} more</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AntiRevokePanel;
