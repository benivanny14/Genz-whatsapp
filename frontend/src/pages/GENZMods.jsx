import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Ghost, MessageSquare, Eye, EyeOff, Clock, Users, Download, Upload, RefreshCw, Trash2, Settings, Zap, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import modsService from '../services/modsService';
import WhoViewedProfile from '../components/WhoViewedProfile';

const GENZMods = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modsSettings, setModsSettings] = useState({
    antiDelete: false,
    autoReply: { enabled: false, message: '' },
    ghostMode: {
      hideOnline: false,
      hideTyping: false,
      hideReadReceipts: false,
      freezeLastSeen: false
    },
    readReceipts: true,
    typingIndicators: true,
    onlineStatus: true
  });
  const [deletedMessages, setDeletedMessages] = useState([]);
  const [showDeletedMessages, setShowDeletedMessages] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showWhoViewed, setShowWhoViewed] = useState(false);

  useEffect(() => {
    fetchModsSettings();
  }, []);

  const fetchModsSettings = async () => {
    try {
      setLoading(true);
      const data = await modsService.getModsSettings();
      setModsSettings(data.settings || {});
    } catch (error) {
      setError('Failed to load mods settings');
    } finally {
      setLoading(false);
    }
  };

  const saveModsSettings = async () => {
    try {
      setSaving(true);
      setError('');
      await modsService.updateModsSettings(modsSettings);
      
      // Sync with frontend ChatContext by saving to localStorage
      try {
        const existingLocalMods = JSON.parse(localStorage.getItem('genz_mods') || '{}');
        const updatedLocalMods = {
          ...existingLocalMods,
          antiDelete: modsSettings.antiDelete,
          autoReply: modsSettings.autoReply?.enabled,
          autoReplyMsg: modsSettings.autoReply?.message,
          ghostMode: modsSettings.ghostMode?.hideOnline || modsSettings.ghostMode?.hideTyping || modsSettings.ghostMode?.hideReadReceipts
        };
        localStorage.setItem('genz_mods', JSON.stringify(updatedLocalMods));
        // Force refresh in App/ChatContext by dispatching event
        window.dispatchEvent(new Event('storage'));
      } catch(e) {}
      
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const fetchDeletedMessages = async () => {
    try {
      const data = await modsService.getDeletedMessages();
      setDeletedMessages(data.messages || []);
      setShowDeletedMessages(true);
    } catch (error) {
      setError('Failed to load deleted messages');
    }
  };

  const restoreMessage = async (messageId) => {
    try {
      await modsService.restoreMessage(messageId);
      setDeletedMessages(prev => prev.filter(msg => msg.id !== messageId));
      setSuccess('Message restored successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to restore message');
    }
  };


  const importSettings = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      const text = await file.text();
      const settings = JSON.parse(text);
      await modsService.importModSettings(settings);
      await fetchModsSettings();
      setSuccess('Settings imported successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to import settings');
    }
    event.target.value = '';
  };

  const updateGhostMode = (key, value) => {
    setModsSettings(prev => ({
      ...prev,
      ghostMode: {
        ...prev.ghostMode,
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading GENZ Mods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
               aria-label="Back">
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">GENZ Mods</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer" title="Import Settings">
                <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <input
                  type="file"
                  accept=".json"
                  onChange={importSettings}
                  className="hidden"
                />
              </label>
              <button
                onClick={fetchModsSettings}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Refresh Settings" aria-label="Refresh Settings"
              >
                <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={saveModsSettings}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full overflow-y-auto px-4 py-6 pb-20">
        <div className="mx-auto max-w-4xl space-y-6">
        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
            >
              <p className="text-green-600 dark:text-green-400">{success}</p>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Anti-Delete */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Anti-Delete</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  See and restore deleted messages
                </p>
              </div>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!modsSettings.antiDelete}
                onChange={(e) => setModsSettings(prev => ({ ...prev, antiDelete: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {modsSettings.antiDelete && (
            <div className="mt-4">
              <button
                onClick={fetchDeletedMessages}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                View Deleted Messages ({deletedMessages.length})
              </button>
            </div>
          )}
        </div>

        {/* Auto-Reply */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Auto-Reply</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Automatically reply to messages when you're busy
                </p>
              </div>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!modsSettings.autoReply?.enabled}
                onChange={(e) => setModsSettings(prev => ({
                  ...prev,
                  autoReply: { ...prev.autoReply, enabled: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {modsSettings.autoReply?.enabled && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Auto-Reply Message
              </label>
              <textarea
                value={modsSettings.autoReply?.message || ''}
                onChange={(e) => setModsSettings(prev => ({
                  ...prev,
                  autoReply: { ...prev.autoReply, message: e.target.value }
                }))}
                placeholder="I'm currently busy. I'll get back to you soon."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Ghost Mode */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Ghost className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ghost Mode</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Control your privacy and visibility
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide Online Status</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Others won't see when you're online</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.ghostMode?.hideOnline}
                  onChange={(e) => updateGhostMode('hideOnline', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide Typing Indicators</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Others won't see when you're typing</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.ghostMode?.hideTyping}
                  onChange={(e) => updateGhostMode('hideTyping', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Eye className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide Read Receipts</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Others won't see when you've read messages</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.ghostMode?.hideReadReceipts}
                  onChange={(e) => updateGhostMode('hideReadReceipts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Freeze Last Seen</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your last seen time won't update</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.ghostMode?.freezeLastSeen}
                  onChange={(e) => updateGhostMode('freezeLastSeen', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Control what others can see
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Eye className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Read Receipts</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show when you've read messages</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.readReceipts}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, readReceipts: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Typing Indicators</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show when you're typing</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.typingIndicators}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, typingIndicators: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Online Status</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show when you're online</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.onlineStatus}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, onlineStatus: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Deleted Messages Modal */}

      {/* ── Privacy Extras: Hide View Status, Who Viewed My Profile, Auto-Download Status, Fake Location ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-4 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            <EyeOff className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Privacy Extras</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Hide View Status, Who Viewed Profile, Fake Location na zaidi</p>
          </div>
        </div>

        {/* Hide View Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Eye className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Hide View Status</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Angalia Status/profile za watu bila jina lako kuonekana</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!!modsSettings.hideViewStatus}
              onChange={(e) => setModsSettings(prev => ({ ...prev, hideViewStatus: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Who Viewed My Profile */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Who Viewed My Profile</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ona orodha ya waliotazama profile yako</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!!modsSettings.whoViewedProfileEnabled}
              onChange={(e) => setModsSettings(prev => ({ ...prev, whoViewedProfileEnabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>
        {modsSettings.whoViewedProfileEnabled && (
          <button
            onClick={() => setShowWhoViewed(true)}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Ona Waliotazama Profile Yangu
          </button>
        )}

        {/* Auto-Download Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Download className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Auto-Download Status</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status za marafiki zijihifadhi gallery kiotomatiki</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!!modsSettings.autoDownloadStatus}
              onChange={(e) => setModsSettings(prev => ({ ...prev, autoDownloadStatus: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Fake Location */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <Zap className="w-4 h-4 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Fake Location</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Badili location unayotuma kwenye chat</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!modsSettings.fakeLocation?.enabled}
                onChange={(e) => setModsSettings(prev => ({
                  ...prev,
                  fakeLocation: { ...(prev.fakeLocation || {}), enabled: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          {modsSettings.fakeLocation?.enabled && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <input
                type="text"
                placeholder="Jina la mahali"
                value={modsSettings.fakeLocation?.label || ''}
                onChange={(e) => setModsSettings(prev => ({
                  ...prev,
                  fakeLocation: { ...(prev.fakeLocation || {}), label: e.target.value }
                }))}
                className="col-span-3 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={modsSettings.fakeLocation?.lat ?? ''}
                onChange={(e) => setModsSettings(prev => ({
                  ...prev,
                  fakeLocation: { ...(prev.fakeLocation || {}), lat: e.target.value === '' ? null : parseFloat(e.target.value) }
                }))}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={modsSettings.fakeLocation?.lng ?? ''}
                onChange={(e) => setModsSettings(prev => ({
                  ...prev,
                  fakeLocation: { ...(prev.fakeLocation || {}), lng: e.target.value === '' ? null : parseFloat(e.target.value) }
                }))}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>
      </div>

      {showWhoViewed && (
        <WhoViewedProfile onClose={() => setShowWhoViewed(false)} />
      )}


      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <span className="text-purple-400 text-lg font-bold">Aa</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Custom Fonts</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Change the app font style</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'default', label: 'Default', preview: 'Hello there!', cssFont: '' },
            { id: 'serif', label: 'Serif', preview: 'Hello there!', cssFont: "Georgia, serif" },
            { id: 'mono', label: 'Monospace', preview: 'Hello there!', cssFont: "'Courier New', monospace" },
            { id: 'rounded', label: 'Rounded', preview: 'Hello there!', cssFont: "'Trebuchet MS', sans-serif" },
            { id: 'elegant', label: 'Elegant', preview: 'Hello there!', cssFont: "Palatino, serif" },
            { id: 'bold', label: 'Bold', preview: 'Hello there!', cssFont: "'Arial Black', sans-serif" },
          ].map(font => {
            const isActive = (modsSettings?.customFont || 'default') === font.id;
            return (
              <button
                key={font.id}
                onClick={() => {
                  const newMods = { ...modsSettings, customFont: font.id };
                  setModsSettings(newMods);
                  saveModsSettings();
                  document.body.style.fontFamily = font.cssFont || '';
                }}
                className={`p-3 rounded-xl border-2 text-center transition-all ${isActive ? 'border-purple-500 bg-purple-500/10' : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'}`}
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: font.cssFont || 'inherit' }}>{font.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" style={{ fontFamily: font.cssFont || 'inherit' }}>{font.preview}</p>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showDeletedMessages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeletedMessages(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Deleted Messages ({deletedMessages.length})
                  </h2>
                  <button
                    onClick={() => setShowDeletedMessages(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                   aria-label="Back">
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[60vh] p-4">
                {deletedMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <Trash2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No deleted messages found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deletedMessages.map((message) => (
                      <div key={message.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {message.sender?.name || 'Unknown'}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(message.deletedAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">{message.content}</p>
                            {message.media && (
                              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                📎 Media: {message.media.type}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => restoreMessage(message.id)}
                            className="ml-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title="Restore Message" aria-label="Restore Message"
                          >
                            <RefreshCw className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GENZMods;
