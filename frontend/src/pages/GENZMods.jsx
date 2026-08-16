import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Ghost, MessageSquare, Eye, EyeOff, Clock, Users, Download, Upload, RefreshCw, Trash2, Settings, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import modsService from '../services/modsService';
import ErrorBoundary from '../components/ErrorBoundary';
import DeletedMessagesList from '../components/DeletedMessagesList';

// Extracted so any render error inside this panel originates in a child's
// render scope and is caught by its scoped <ErrorBoundary minimal>.
const AntiDeletePanel = ({ modsSettings, setModsSettings, deletedMessages, fetchDeletedMessages, updateGhostMode }) => (
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
);

// Extracted so any render error inside this panel originates in a child's
// render scope and is caught by its scoped <ErrorBoundary minimal>.
const AutoReplyPanel = ({ modsSettings, setModsSettings, deletedMessages, fetchDeletedMessages, updateGhostMode }) => (
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
);

// Extracted so any render error inside this panel originates in a child's
// render scope and is caught by its scoped <ErrorBoundary minimal>.
const MediaSettingsPanel = ({ modsSettings, setModsSettings, deletedMessages, fetchDeletedMessages, updateGhostMode }) => (
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
);

// Extracted so any render error inside this panel originates in a child's
// render scope and is caught by its scoped <ErrorBoundary minimal>.
const AdvancedSettingsPanel = ({ modsSettings, setModsSettings, deletedMessages, fetchDeletedMessages, updateGhostMode }) => (
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

          </div>
        </div>
);

// Extracted so any render error inside this panel originates in a child's
// render scope and is caught by its scoped <ErrorBoundary minimal>.
const AntiDeleteStatusPanel = ({ modsSettings, setModsSettings, deletedMessages, fetchDeletedMessages, updateGhostMode }) => (
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
);

// Extracted so any render error inside this panel originates in a child's
// render scope and is caught by its scoped <ErrorBoundary minimal>.
const GhostModePanel = ({ modsSettings, setModsSettings, deletedMessages, fetchDeletedMessages, updateGhostMode }) => (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Ghost className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ghost Mode</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hide your online activity per option</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {[
              ['hideOnline', 'Hide Online', 'Do not broadcast when you are online'],
              ['hideTyping', 'Hide Typing', 'Do not show the typing indicator'],
              ['hideReadReceipts', 'Hide Read Receipts', 'Do not send read receipts to others'],
              ['hideRecording', 'Hide Recording', 'Do not show when you are recording'],
              ['freezeLastSeen', 'Freeze Last Seen', 'Keep your last seen timestamp frozen']
            ].map(([key, label, desc]) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={!!modsSettings.ghostMode?.[key]}
                    onChange={(e) => updateGhostMode(key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
);

// Extracted so any render error inside this panel originates in a child's
// render scope and is caught by its scoped <ErrorBoundary minimal>.
const PrivacyModsPanel = ({ modsSettings, setModsSettings, deletedMessages, fetchDeletedMessages, updateGhostMode }) => (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <EyeOff className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy & Messaging</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Extra privacy and messaging controls</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {[
              ['hideLastSeen', 'Hide Last Seen', 'Stop sharing your last seen timestamp'],
              ['hideSecondTick', 'Hide Second Tick', 'Hide the double-tick read indicator'],
              ['hideViewStatus', 'Hide View Status', 'Do not notify others when you view their status'],
              ['antiViewOnce', 'Anti View-Once', 'Save a copy of view-once media before it expires'],
              ['readReceipts', 'Read Receipts', 'Send read receipts to other users'],
              ['typingIndicators', 'Typing Indicators', 'Show the typing indicator while you type'],
              ['onlineStatus', 'Online Status', 'Broadcast your online status'],
              ['alwaysOnline', 'Always Online', 'Appear online at all times'],
              ['selfDestruct', 'Self-Destruct', 'Send messages that disappear after 10 seconds'],
              ['noForwardLabel', 'No Forward Label', 'Hide the “forwarded” label on forwarded messages']
            ].map(([key, label, desc]) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={!!modsSettings[key]}
                    onChange={(e) => setModsSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}

            {/* Voice Effect */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Voice Effect</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Apply an effect to your voice messages</p>
              </div>
              <select
                value={modsSettings.voiceEffect || 'none'}
                onChange={(e) => setModsSettings(prev => ({ ...prev, voiceEffect: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm flex-shrink-0"
              >
                <option value="none">None</option>
                <option value="robot">Robot</option>
                <option value="chipmunk">Chipmunk</option>
                <option value="deep">Deep</option>
                <option value="helium">Helium</option>
              </select>
            </div>

            {/* Chat Background Music */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Chat Background Music</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Play music inside chat screens</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={!!modsSettings.chatBackgroundMusic?.enabled}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, chatBackgroundMusic: { ...prev.chatBackgroundMusic, enabled: e.target.checked } }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {modsSettings.chatBackgroundMusic?.enabled && (
              <input
                type="text"
                value={modsSettings.chatBackgroundMusic?.track || ''}
                onChange={(e) => setModsSettings(prev => ({ ...prev, chatBackgroundMusic: { ...prev.chatBackgroundMusic, track: e.target.value } }))}
                placeholder="Paste an audio track URL…"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            )}
          </div>
        </div>
);


const GENZMods = () => {
  const navigate = useNavigate();
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
    linkPreview: true
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
        <ErrorBoundary minimal>
          <AntiDeletePanel
            modsSettings={modsSettings}
            setModsSettings={setModsSettings}
            deletedMessages={deletedMessages}
            fetchDeletedMessages={fetchDeletedMessages}
            updateGhostMode={updateGhostMode}
          />
        </ErrorBoundary>

        {/* Auto-Reply */}
        <ErrorBoundary minimal>
          <AutoReplyPanel
            modsSettings={modsSettings}
            setModsSettings={setModsSettings}
            deletedMessages={deletedMessages}
            fetchDeletedMessages={fetchDeletedMessages}
            updateGhostMode={updateGhostMode}
          />
        </ErrorBoundary>

        {/* Media Settings */}
        <ErrorBoundary minimal>
          <MediaSettingsPanel
            modsSettings={modsSettings}
            setModsSettings={setModsSettings}
            deletedMessages={deletedMessages}
            fetchDeletedMessages={fetchDeletedMessages}
            updateGhostMode={updateGhostMode}
          />
        </ErrorBoundary>

        {/* Advanced Settings */}
        <ErrorBoundary minimal>
          <AdvancedSettingsPanel
            modsSettings={modsSettings}
            setModsSettings={setModsSettings}
            deletedMessages={deletedMessages}
            fetchDeletedMessages={fetchDeletedMessages}
            updateGhostMode={updateGhostMode}
          />
        </ErrorBoundary>

        {/* Anti-Delete Status */}
        <ErrorBoundary minimal>
          <AntiDeleteStatusPanel
            modsSettings={modsSettings}
            setModsSettings={setModsSettings}
            deletedMessages={deletedMessages}
            fetchDeletedMessages={fetchDeletedMessages}
            updateGhostMode={updateGhostMode}
          />
        </ErrorBoundary>

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

        {/* ── Ghost Mode (sub-options) ── */}
        <ErrorBoundary minimal>
          <GhostModePanel
            modsSettings={modsSettings}
            setModsSettings={setModsSettings}
            deletedMessages={deletedMessages}
            fetchDeletedMessages={fetchDeletedMessages}
            updateGhostMode={updateGhostMode}
          />
        </ErrorBoundary>

        {/* ── Privacy & Messaging Mods ── */}
        <ErrorBoundary minimal>
          <PrivacyModsPanel
            modsSettings={modsSettings}
            setModsSettings={setModsSettings}
            deletedMessages={deletedMessages}
            fetchDeletedMessages={fetchDeletedMessages}
            updateGhostMode={updateGhostMode}
          />
        </ErrorBoundary>

      {/* Deleted Messages Modal. The list lives in its own component so a
          render error there is thrown from a child of the boundary below —
          React error boundaries cannot catch errors thrown from the parent's
          own render scope (which is why the original page used to blank). */}
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
            {/* Scoped boundary: a render error in the list must never blank the
                whole GENZMods page — the modal shell (and its close button)
                stay alive and the user can Retry or close. */}
            <ErrorBoundary minimal>
              <DeletedMessagesList
                messages={deletedMessages}
                onRestore={restoreMessage}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default GENZMods;
