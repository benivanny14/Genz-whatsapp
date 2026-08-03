import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Ghost, MessageSquare, Eye, EyeOff, Clock, Users, Download, Upload, RefreshCw, Trash2, Settings, Zap, Lock, DollarSign, Star, Search, Plus, MapPin, FileText, Camera, Video, Upload as UploadIcon, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import modsService from '../services/modsService';
import { useUser } from '../context/UserContext';

const GENZMods = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const isAdmin = user?.isAdmin === true;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modsSettings, setModsSettings] = useState({
    antiDelete: false,
    antiDeleteStatus: false,
    ghostMode: {
      hideOnline: false,
      hideTyping: false,
      hideReadReceipts: false,
      hideRecording: false,
      freezeLastSeen: false
    },
    hideLastSeen: false,
    hideSecondTick: false,
    hideViewStatus: false,
    hideBlueTickColor: false,
    autoReply: { enabled: false, message: '', keywords: [] },
    antiViewOnce: false,
    voiceEffect: 'none',
    highResMedia: false,
    autoDownloadMedia: false,
    autoSaveMedia: false,
    chatBackgroundMusic: { enabled: false, track: '' },
    readReceipts: true,
    typingIndicators: true,
    onlineStatus: true,
    alwaysOnline: false,
    spamFilter: false,
    selfDestruct: false,
    noForwardLabel: false,
    linkPreview: true,
    clientE2EE: false,
    debugEncryption: false
  });
  const [deletedMessages, setDeletedMessages] = useState([]);
  const [showDeletedMessages, setShowDeletedMessages] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = React.useRef(null);

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
    if (event.target) event.target.value = '';
  };

  const exportSettings = async () => {
    try {
      const data = await modsService.exportModSettings();
      const settings = data?.settings || data?.data || data || {};
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'genz-mods-settings.json';
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Settings exported successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to export settings');
    }
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

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide Second Tick</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Hide message delivery confirmation</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.hideSecondTick}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, hideSecondTick: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <EyeOff className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide View Status</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Hide status view confirmation</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.hideViewStatus}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, hideViewStatus: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide Last Seen</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Hide your last seen timestamp</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.hideLastSeen}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, hideLastSeen: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Zap className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Always Online</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Always appear online to others</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.alwaysOnline}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, alwaysOnline: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Media Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Download className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Media Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Control media handling
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Download className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Auto Download Media</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatically download media files</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.autoDownloadMedia}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, autoDownloadMedia: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Auto Save Media</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatically save media to gallery</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.autoSaveMedia}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, autoSaveMedia: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Zap className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">High Resolution Media</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Send and receive high quality media</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.highResMedia}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, highResMedia: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Additional privacy and security features
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Eye className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Anti View Once</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View view-once media multiple times</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.antiViewOnce}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, antiViewOnce: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">No Forward Label</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Remove forwarded message labels</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.noForwardLabel}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, noForwardLabel: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide Blue Tick Color</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Hide blue tick color on read receipts</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.hideBlueTickColor}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, hideBlueTickColor: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Link Preview</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show link previews in messages</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.linkPreview}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, linkPreview: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Spam Filter</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Filter spam messages automatically</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.spamFilter}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, spamFilter: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Lock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Client E2EE</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable client-side end-to-end encryption</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.clientE2EE}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, clientE2EE: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Settings className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Debug Encryption</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable encryption debugging</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.debugEncryption}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, debugEncryption: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">GENZ AFTER WORK</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Discover premium features & services</p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/genz-after-work'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                Access
              </button>
            </div>
          </div>
        </div>

        {/* Anti-Delete Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
                <Trash2 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Anti-Delete Status</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  See and restore deleted status updates
                </p>
              </div>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!modsSettings.antiDeleteStatus}
                onChange={(e) => setModsSettings(prev => ({ ...prev, antiDeleteStatus: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-pink-600"></div>
            </label>
          </div>
        </div>

        {/* Import/Export Settings */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={16} /> Import Settings
          </button>
          <button
            onClick={exportSettings}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} /> Export Settings
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={importSettings}
          accept=".json"
          className="hidden"
        />
      </div>

      {/* Deleted Messages Modal */}
      {showDeletedMessages && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deleted Messages</h3>
              <button
                onClick={() => setShowDeletedMessages(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {deletedMessages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No deleted messages found</p>
              ) : (
                <div className="space-y-3">
                  {deletedMessages.map((msg) => (
                    <div key={msg.id} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-sm text-gray-900 dark:text-white mb-2">{msg.content}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                        <button
                          onClick={() => restoreMessage(msg.id)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default GENZMods;
