import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { setSocketInstance, clearSocketInstance } from '../services/socket';
import { DB } from '../services/db';
import { registerServiceWorker, notifyNewMessage, notifyIncomingCall, showLocalNotification } from '../services/notifications';
import { isOffline } from '../services/api';
import apiService from '../services/apiService';
import backupService from '../services/backupService';
import { useAuth } from './AuthContext';
import { authFetch } from '../utils/authFetch';
import { playMessageSound, playSentSound } from '../utils/notificationSounds';
import webRTCService from '../services/webrtc';
import api from '../services/api';
import { cleanupLocalBlobUrls, sanitizeBlobUrls } from '../utils/sanitizeStorage';
import encryptionService from '../services/encryptionService';
import { decryptMessageContent, decryptMessagesList } from '../utils/e2eeMessage';
import { isClientE2EEMessageContent } from '../utils/e2eeContent';
import notificationService from '../services/notificationService';
import { resolveApiBase, resolveSocketOrigin } from '../utils/resolveApiBase';

import { applyVoiceEffect } from '../utils/voiceEffects';
import {
  flattenModsFromServer,
  normalizeModsForServer,
  isLikelySpamMessage,
  autoSaveMediaFromMessage
} from '../utils/genzModsNormalize';
import { applyAntiScreenshot, initAntiScreenshotListeners, setScreenshotAttemptCallback } from '../utils/antiScreenshot';

export const ChatContext = createContext();

// Wrap socket event handlers to prevent crashes from propagating
const safeSocketOn = (socket, event, handler) => {
  socket.on(event, async (...args) => {
    try {
      await handler(...args);
    } catch (err) {
      console.error(`[ChatContext] Error in socket event "${event}":`, err?.message || err);
    }
  });
};

const BACKEND_URL = resolveApiBase();
const SOCKET_ORIGIN = resolveSocketOrigin();
/** Mongo-style demo fallback when no JWT user is present (dev / optional demo mode) */
const UNAUTHENTICATED_FALLBACK_USER_ID = '60d5ecb8b392cb371c664c12';
const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH !== 'false';
const ENABLE_DEMO_DATA = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';

const normalizeDisappearingSettings = (value) => {
  const raw = typeof value === 'object' && value !== null
    ? (value.duration ?? value.timer ?? value.enabled)
    : value;
  const text = String(raw ?? '').trim();
  if (!text || /^(false|off|none|0)$/i.test(text)) {
    return { enabled: false, duration: 'Off', timer: 0 };
  }

  if (/^\d+$/.test(text)) {
    const hours = Math.max(1, Number(text));
    return { enabled: true, duration: `${hours}h`, timer: hours };
  }

  const match = text.match(/^(\d+)\s*([hd])$/i);
  if (match) {
    const amount = Math.max(1, Number(match[1]));
    const unit = match[2].toLowerCase();
    return {
      enabled: true,
      duration: `${amount}${unit}`,
      timer: unit === 'd' ? amount * 24 : amount
    };
  }

  const timer = Number(typeof value === 'object' && value !== null ? value.timer : 24) || 24;
  return { enabled: true, duration: text || `${timer}h`, timer };
};

// ─── Debounce Utility ─────────────────────────────────────────────────────
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// ─── GENZ Settings Persistence ─────────────────────────────────────────────
// FIX: Make settings keys user-specific to ensure data isolation between accounts
const getGENZSettingsKey = (userId) => {
  return userId ? `genz_settings_comprehensive:${userId}` : 'genz_settings_comprehensive';
};

const getGENZModsKey = (userId) => {
  return userId ? `genz_mods:${userId}` : 'genz_mods';
};

const GENZ_SETTINGS_VERSION = 2;

const DEFAULT_GENZ_SETTINGS = {
  mods: {
    antiDelete: true,
    ghostMode: false,
    hideLastSeen: true,
    freezeLastSeen: false,
    antiViewOnce: false,
    selfDestruct: false,
    hideReadReceipts: false,
    voiceEffect: 'none',
    autoReply: false,
    autoReplyMsg: "I'm offline, will reply soon.",
    debugEncryption: false,
    clientE2EE: false,
    voiceAutoPlay: false,
    voiceNoiseSuppression: true,
    voiceEchoCancellation: true,
    voiceDefaultSpeed: '1x',
    voiceSaveLocally: true,
    // ── TM WhatsApp Exclusive Features (added) ──
    noForwardLabel: false,
    hideBlueTickColor: false,
    themePack: 'default',
    fontFamily: 'Inter',
    bubbleStyle: 'default',
    tickStyle: 'default',
    bubbleSentColor: '',
    bubbleReceivedColor: '',
    autoSaveMedia: false,
    linkPreview: true,
    spamFilter: false,
    alwaysOnline: false,
    fontSize: 'medium',
    highResMedia: false,
    chatMusic: false,
    chatMusicUrl: '',
    // New features
    autoCaps: false,
    antiDeleteStatus: false,
    hideRecording: false,
    textRepeaterText: '',
    textRepeaterCount: 5,
    // Additional Privacy & Security features
    hideDoubleTick: false,
    hideOnlineStatus: false,
    hideStatusView: false,
    hideStatusReadReceipts: false,
    hideChatsFromList: false,
    incognitoKeyboard: false,
    showBlueTicksAfterReply: false,
    hideNameDateWhenCopying: false
  },
  appTheme: 'dark',
  statusPrivacy: 'everyone',
  notificationSound: 'default',
  isDNDMode: false
};

const buildGENZSettings = (parsed = {}) => ({
  settingsVersion: GENZ_SETTINGS_VERSION,
  mods: { ...DEFAULT_GENZ_SETTINGS.mods, ...(parsed.mods || {}) },
  appTheme: parsed.appTheme || DEFAULT_GENZ_SETTINGS.appTheme,
  statusPrivacy: parsed.statusPrivacy || DEFAULT_GENZ_SETTINGS.statusPrivacy,
  notificationSound: parsed.notificationSound || DEFAULT_GENZ_SETTINGS.notificationSound,
  isDNDMode: parsed.isDNDMode !== undefined ? parsed.isDNDMode : DEFAULT_GENZ_SETTINGS.isDNDMode,
  privacySettings: parsed.privacySettings || {
    lastSeen: 'everyone',
    online: 'same_as_last_seen',
    profilePhoto: 'everyone',
    about: 'everyone',
    status: 'contacts',
    readReceipts: true
  }
});

// Safe load GENZ settings from localStorage
const loadGENZSettings = (userId) => {
  try {
    cleanupLocalBlobUrls();
    const settingsKey = getGENZSettingsKey(userId);
    const saved = localStorage.getItem(settingsKey);
    if (saved) {
      const parsed = sanitizeBlobUrls(JSON.parse(saved)).value;
      if (!parsed.settingsVersion || parsed.settingsVersion < GENZ_SETTINGS_VERSION) {
        const migrated = buildGENZSettings({
          ...parsed,
          mods: { ...(parsed.mods || {}), antiViewOnce: false }
        });
        saveGENZSettings(migrated, userId);
        return migrated;
      }
      return buildGENZSettings(parsed);
    }
  } catch (e) {
    console.error('Failed to load GENZ settings:', e);
  }
  return DEFAULT_GENZ_SETTINGS;
};

// Safe save GENZ settings to localStorage
const saveGENZSettings = (settings, userId) => {
  try {
    const settingsKey = getGENZSettingsKey(userId);
    const modsKey = getGENZModsKey(userId);
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    localStorage.setItem(modsKey, JSON.stringify(settings.mods || {}));
  } catch (e) {
    console.error('Failed to save GENZ settings:', e);
  }
};

const isMongoObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''));
let clientMessageCounter = 0;
const createClientMessageId = (prefix = 'client-message') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    // Generate a MongoDB ObjectId-like string (24 hex chars)
    const hex = crypto.randomUUID().replace(/-/g, '');
    return hex.substring(0, 24);
  }
  clientMessageCounter = (clientMessageCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}-${Date.now()}-${clientMessageCounter}-${Math.random().toString(36).slice(2, 8)}`;
};

export { applyVoiceEffect };

// ─── Audio Processing Utilities ─────────────────────────────────────────────
export const getAudioDuration = async (audioBlob) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(audioBlob);
  });
};

export const compressAudio = async (audioBlob, quality = 'medium') => {
  // For now, return the original blob
  // In production, this would use audio compression libraries
  return audioBlob;
};

export const analyzeAudioForWaveform = async (audioBlob) => {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    // Sample data for waveform (reduce to 100 points)
    const samples = 100;
    const blockSize = Math.floor(channelData.length / samples);
    const waveform = new Uint8Array(samples);

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j]);
      }
      waveform[i] = Math.min(255, (sum / blockSize) * 255);
    }

    await audioCtx.close();
    return waveform;
  } catch (e) {
    console.warn('Waveform analysis failed:', e);
    return null;
  }
};

// ─── Cloud Backup (IndexedDB → JSON download) ─────────────────────────────────
const exportBackup = async () => {
  try {
    const convs = await DB.getConversations();
    const allMsgs = [];
    for (const conv of convs) {
      const msgs = await DB.getMessages(conv._id);
      allMsgs.push(...msgs);
    }
    const payload = JSON.stringify({ conversations: convs, messages: allMsgs, exportedAt: new Date().toISOString() });
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `genz_backup_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('Backup failed:', e);
    return false;
  }
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ChatProvider = ({ children }) => {
  const socketRef = useRef(null);
  const markReadDebouncedRef = useRef(null);
  const modsRef = useRef({});  // keep mods accessible in socket callbacks
  const activeCallRef = useRef(null);  // keep active call state accessible in socket callbacks
  const { isAuthenticated, loading: authLoading, user: authUser, isAuthReady, completeSession } = useAuth();

  const currentUserId = React.useMemo(() => {
    if (authUser?._id) return String(authUser._id);
    if (ENABLE_DEMO_DATA) return UNAUTHENTICATED_FALLBACK_USER_ID;
    return null;
  }, [authUser?._id]);

  // Core state
  const [conversations, setConversations] = useState([]);
  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const [selectedConversation, setSelectedConversation] = useState(null);
  const selectedConversationIdRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);
  const [activeGroupCall, setActiveGroupCall] = useState(null);
  const [onlineNotification, setOnlineNotification] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [statusViewers, setStatusViewers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  // FEATURE ADD: "last seen" was completely wired to nowhere on the frontend —
  // ChatArea had a peerPresence state that was only ever set to null, so the
  // header never showed "online" / "last seen ...". This map tracks the most
  // recent lastSeen timestamp we've observed live for each user (updated the
  // moment they go offline), keyed by userId string.
  const [lastSeenByUser, setLastSeenByUser] = useState({});
  // FEATURE ADD: backs the alwaysOnline mod — tracks which online contacts
  // are currently "away" (idle) so UI can distinguish online vs away.
  const [awayUsers, setAwayUsers] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [profileVisitors, setProfileVisitors] = useState([]);
  const [allMessagesForStats, setAllMessagesForStats] = useState([]);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?._id || null;
  }, [selectedConversation?._id]);

  const selectedConversationStorageKey = React.useMemo(
    () => currentUserId ? `selectedConversationId:${currentUserId}` : 'selectedConversationId',
    [currentUserId]
  );

  const getStoredSelectedConversationId = useCallback(() => {
    try {
      const scoped = localStorage.getItem(selectedConversationStorageKey);
      if (scoped) return scoped;
      return currentUserId ? null : localStorage.getItem('selectedConversationId');
    } catch (e) {
      return null;
    }
  }, [currentUserId, selectedConversationStorageKey]);

  const setStoredSelectedConversationId = useCallback((conversationId) => {
    try {
      if (conversationId) {
        localStorage.setItem(selectedConversationStorageKey, conversationId);
      } else {
        localStorage.removeItem(selectedConversationStorageKey);
      }
      if (currentUserId) {
        localStorage.removeItem('selectedConversationId');
      }
    } catch (e) {
      console.warn('[ChatContext] Failed to persist selected conversation:', e);
    }
  }, [currentUserId, selectedConversationStorageKey]);

  const clearStoredSelectedConversationId = useCallback(() => {
    setStoredSelectedConversationId(null);
  }, [setStoredSelectedConversationId]);

  const refreshAllMessagesForStats = useCallback(async () => {
    try {
      const convs = conversationsRef.current?.length
        ? conversationsRef.current
        : await DB.getConversations();
      const all = [];
      for (const conv of convs || []) {
        if (!conv?._id) continue;
        const msgs = await DB.getMessages(conv._id);
        if (msgs?.length) all.push(...msgs);
      }
      setAllMessagesForStats(all);
    } catch (e) {
      console.warn('[ChatContext] Stats refresh failed:', e?.message || e);
    }
  }, []);

  useEffect(() => {
    refreshAllMessagesForStats();
  }, [conversations.length, messages.length, refreshAllMessagesForStats]);
  const [contacts, setContacts] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const blockedUsersRef = useRef([]);
  const [pinnedMessages, setPinnedMessages] = useState({});
  const [presenceHistory, setPresenceHistory] = useState({});
  const unlockedSessionChatsKey = React.useMemo(
    () => currentUserId ? `unlockedSessionChats:${currentUserId}` : 'unlockedSessionChats',
    [currentUserId]
  );

  // Load unlocked session chats from localStorage on mount
  const [unlockedSessionChats, setUnlockedSessionChats] = useState(() => {
    try {
      const stored = localStorage.getItem(unlockedSessionChatsKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(unlockedSessionChatsKey);
      setUnlockedSessionChats(stored ? new Set(JSON.parse(stored)) : new Set());
    } catch (e) {
      setUnlockedSessionChats(new Set());
    }
  }, [unlockedSessionChatsKey]);
  const [stickerPacks, setStickerPacks] = useState([]);
  const [downloadedStickers, setDownloadedStickers] = useState([]);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isOtherUserRecording, setIsOtherUserRecording] = useState(false);
  const [typingByConversation, setTypingByConversation] = useState({});
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Auth-removed safe states
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Initialize GENZ settings with defaults first
  const [statusPrivacy, setStatusPrivacy] = useState(DEFAULT_GENZ_SETTINGS.statusPrivacy);
  const [backupProgress, setBackupProgress] = useState(null);
  const [notificationSound, setNotificationSound] = useState(DEFAULT_GENZ_SETTINGS.notificationSound);
  const [isDNDMode, setIsDNDMode] = useState(DEFAULT_GENZ_SETTINGS.isDNDMode);
  const isDNDModeRef = useRef(DEFAULT_GENZ_SETTINGS.isDNDMode);
  const [appTheme, setAppTheme] = useState(DEFAULT_GENZ_SETTINGS.appTheme);

  // TM Mods state - initialize with defaults
  const [mods, setModsState] = useState(DEFAULT_GENZ_SETTINGS.mods);

  // Keys that contain large data (base64 images) — keep local only, never send to backend
  const LOCAL_ONLY_KEYS = ['chatWallpaper', 'customWallpapers', 'chatWallpaperZoom'];

  const stripLocalOnlyData = (modsObj) => {
    const stripped = { ...modsObj };
    for (const key of LOCAL_ONLY_KEYS) {
      delete stripped[key];
    }
    return stripped;
  };

  const setMods = useCallback((updater) => {
    setModsState(prev => {
      const newMods = typeof updater === 'function' ? updater(prev) : updater;

      if (JSON.stringify(prev) === JSON.stringify(newMods)) return prev;

      // Save FULL mods (including wallpaper) to localStorage with user-specific key
      try { localStorage.setItem(getGENZModsKey(currentUserId), JSON.stringify(newMods)); } catch (e) { }

      // Sync to IndexedDB (full) and backend (stripped) asynchronously
      Promise.resolve().then(async () => {
        try { await DB.saveSetting('mods', newMods); } catch (e) { }
        try {
          await authFetch(`${BACKEND_URL}/genz-mods/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalizeModsForServer(stripLocalOnlyData(newMods)))
          });
        } catch (e) { }
      });
      return newMods;
    });
  }, [currentUserId]);

  // Scheduled messages store
  const [scheduledMessages, setScheduledMessages] = useState([]);

  // 🚀 Load GENZ settings from localStorage on mount 🚀
  const initialLoadRef = useRef(false);

  // Apply visual mods to CSS variables and classes
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Font family
    if (mods.fontFamily) {
      root.style.setProperty('--chat-font', `'${mods.fontFamily}', sans-serif`);
    } else {
      root.style.setProperty('--chat-font', "'Inter', sans-serif");
    }

    // Font size
    if (mods.fontSize) {
      let size = '15px'; // medium
      if (mods.fontSize === 'small') size = '13px';
      if (mods.fontSize === 'large') size = '18px';
      root.style.setProperty('--chat-font-size', size);
    } else {
      root.style.setProperty('--chat-font-size', '15px');
    }

    // Bubble colors
    if (mods.bubbleSentColor) root.style.setProperty('--bubble-sent-color', mods.bubbleSentColor);
    else root.style.removeProperty('--bubble-sent-color');

    if (mods.bubbleReceivedColor) root.style.setProperty('--bubble-received-color', mods.bubbleReceivedColor);
    else root.style.removeProperty('--bubble-received-color');

    // Body classes for styles
    body.classList.remove('bubble-style-ios', 'bubble-style-3d', 'tick-style-ios', 'bubble-animations');

    if (mods.bubbleStyle === 'ios') body.classList.add('bubble-style-ios');
    if (mods.bubbleStyle === '3d') body.classList.add('bubble-style-3d');
    if (mods.tickStyle === 'ios') body.classList.add('tick-style-ios');
    if (mods.bubbleAnimations) body.classList.add('bubble-animations');
    if (mods.reelMode) body.classList.add('reel-mode-chat');
    else body.classList.remove('reel-mode-chat');
    if (mods.glassMode) body.classList.add('glass-mode-active');
    else body.classList.remove('glass-mode-active');

    initAntiScreenshotListeners();
    applyAntiScreenshot(mods.antiScreenshot);
    
    // Set up screenshot attempt callback to notify via socket
    if (mods.antiScreenshot && socketRef.current) {
      // FIX: this callback used to have its body entirely commented out
      // ("until backend supports conversation-level screenshots"), so the
      // other participant was never actually told someone tried to
      // screenshot/record the chat. socket/index.js now has a
      // 'screenshot:attempt' relay handler, so just emit to it.
      setScreenshotAttemptCallback(() => {
        if (selectedConversation?._id && socketRef.current?.connected) {
          emitSafe('screenshot:attempt', { conversationId: selectedConversation._id });
        }
      });
    }
    
    window.dispatchEvent(new CustomEvent('genz-mods-updated', { detail: mods }));

  }, [mods.fontFamily, mods.fontSize, mods.bubbleSentColor, mods.bubbleReceivedColor, mods.bubbleStyle, mods.tickStyle, mods.bubbleAnimations, mods.reelMode, mods.glassMode, mods.antiScreenshot]);

  // ── Load GENZ settings from localStorage on mount ──
  useEffect(() => {
    const savedSettings = loadGENZSettings(currentUserId);
    if (savedSettings) {
      setModsState(prev => ({ ...prev, ...savedSettings.mods }));
      setStatusPrivacy(savedSettings.statusPrivacy);
      setNotificationSound(savedSettings.notificationSound);
      setIsDNDMode(savedSettings.isDNDMode);
      setAppTheme(savedSettings.appTheme);
    }
  }, [currentUserId]);

  // ── Listen for privacy settings updates from Settings page ──
  useEffect(() => {
    const handlePrivacySettingsUpdate = (event) => {
      const privacySettings = event.detail;
      if (privacySettings) {
        const savedSettings = loadGENZSettings(currentUserId);
        savedSettings.privacySettings = privacySettings;
        saveGENZSettings(savedSettings, currentUserId);
      }
    };

    window.addEventListener('privacy-settings-updated', handlePrivacySettingsUpdate);
    return () => window.removeEventListener('privacy-settings-updated', handlePrivacySettingsUpdate);
  }, [currentUserId]);

  // ── Persist mods ref for socket callbacks ──
  useEffect(() => { modsRef.current = mods; }, [mods]);
  useEffect(() => { blockedUsersRef.current = blockedUsers || []; }, [blockedUsers]);
  useEffect(() => { isDNDModeRef.current = isDNDMode; }, [isDNDMode]);

  // ── Idle/away presence detection (real implementation for the alwaysOnline
  // mod, which was previously a dead toggle — see socket/index.js
  // presence:update handler). When alwaysOnline is on, this never fires and
  // the user simply stays "online" the whole session, same as today's
  // default behavior. When it's off, 5 minutes without mouse/keyboard/touch
  // activity or with the tab hidden marks the user "away" to their contacts,
  // and any activity brings them back to "online".
  useEffect(() => {
    if (mods.alwaysOnline) return undefined;

    const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
    let idleTimer = null;
    let isAway = false;

    const emitPresence = (status) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('presence:update', { status });
      }
    };

    const markAway = () => {
      if (isAway) return;
      isAway = true;
      emitPresence('away');
    };

    const markActive = () => {
      if (isAway) {
        isAway = false;
        emitPresence('online');
      }
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(markAway, IDLE_TIMEOUT_MS);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(markAway, IDLE_TIMEOUT_MS);
      } else {
        markActive();
      }
    };

    const activityEvents = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    activityEvents.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);

    markActive();

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, markActive));
      document.removeEventListener('visibilitychange', handleVisibility);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [mods.alwaysOnline]);

  // ── Persist unlocked session chats to localStorage ──
  useEffect(() => {
    try {
      localStorage.setItem(unlockedSessionChatsKey, JSON.stringify(Array.from(unlockedSessionChats)));
      if (currentUserId) {
        localStorage.removeItem('unlockedSessionChats');
      }
    } catch (e) {
      console.error('Failed to save unlocked session chats:', e);
    }
  }, [currentUserId, unlockedSessionChats, unlockedSessionChatsKey]);

  // ✨ Comprehensive GENZ Settings Auto-Save with Debounce ✨
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const settings = {
        mods,
        statusPrivacy,
        notificationSound,
        isDNDMode,
        appTheme
      };
      saveGENZSettings(settings, currentUserId);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [mods, statusPrivacy, notificationSound, isDNDMode, appTheme, currentUserId]);

  const remoteSettingsSyncReady = useRef(false);

  useEffect(() => {
    if (!isAuthReady || (REQUIRE_AUTH && (authLoading || !isAuthenticated))) return;

    if (!remoteSettingsSyncReady.current) {
      remoteSettingsSyncReady.current = true;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await authFetch(`${BACKEND_URL}/genz-mods/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizeModsForServer(stripLocalOnlyData(mods)))
        });
      } catch (error) {
        console.warn('[ChatContext] Remote GENZ settings sync failed:', error.message);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [mods, isAuthReady, authLoading, isAuthenticated]);

  // Initialize notification services (FCM/Web Push) once authenticated
  useEffect(() => {
    if (!isAuthReady || (REQUIRE_AUTH && (authLoading || !isAuthenticated))) return;

    (async () => {
      try {
        await notificationService.initialize();
        console.log('[ChatContext] Notification service initialized');
      } catch (e) {
        console.warn('[ChatContext] Notification init failed:', e?.message || e);
      }
    })();
  }, [isAuthReady, authLoading, isAuthenticated]);

  // Sync auto-reply bot fields to backend user record
  useEffect(() => {
    if (!isAuthReady || (REQUIRE_AUTH && (authLoading || !isAuthenticated))) return;
    const timer = setTimeout(async () => {
      try {
        await authFetch(`${BACKEND_URL}/genz-mods/auto-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: Boolean(mods.autoReply),
            message: mods.autoReplyMsg || "I'm offline, will reply soon."
          })
        });
      } catch (e) {
        console.warn('[ChatContext] Auto-reply sync failed:', e?.message || e);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [mods.autoReply, mods.autoReplyMsg, isAuthReady, authLoading, isAuthenticated]);

  // Initialize client-side E2EE keys (generate or sync with backend)
  useEffect(() => {
    if (!isAuthReady || (REQUIRE_AUTH && (authLoading || !isAuthenticated))) return;

    (async () => {
      try {
        const ok = await encryptionService.initialize();
        if (ok) console.log('[ChatContext] Encryption service initialized');
        else console.warn('[ChatContext] Encryption service not initialized');
      } catch (e) {
        console.warn('[ChatContext] Encryption init failed:', e?.message || e);
      }
    })();
  }, [isAuthReady, authLoading, isAuthenticated]);

  // ── DEMO SEED DATA (shows when no real data exists) ──────────────────────
  const DEMO_CONVERSATIONS = [
    {
      _id: 'demo-conv-1', isGroup: false, isPinned: true, isArchived: false,
      participants: [{ _id: 'demo-user-1', username: 'Amina Kweli', profilePicture: null, isOnline: true }],
      lastMessage: { content: 'Habari yako! 😊 Umefika nyumbani?', timestamp: new Date(Date.now() - 300000).toISOString(), senderId: 'demo-user-1' },
      unreadCount: 3, name: 'Amina Kweli',
    },
    {
      _id: 'demo-conv-2', isGroup: false, isPinned: false, isArchived: false,
      participants: [{ _id: 'demo-user-2', username: 'Brian Msomi', profilePicture: null, isOnline: false }],
      lastMessage: { content: '✅ Sawa, tutaonana kesho saa tatu', timestamp: new Date(Date.now() - 3600000).toISOString(), senderId: currentUserId },
      unreadCount: 0, name: 'Brian Msomi',
    },
    {
      _id: 'demo-conv-3', isGroup: true, isPinned: false, isArchived: false,
      participants: [
        { _id: 'demo-user-1', username: 'Amina Kweli', profilePicture: null },
        { _id: 'demo-user-3', username: 'Carol Mwangi', profilePicture: null },
        { _id: 'demo-user-4', username: 'David Ochieng', profilePicture: null },
      ],
      lastMessage: { content: '🎉 Hongera sana David!', timestamp: new Date(Date.now() - 7200000).toISOString(), senderId: 'demo-user-1' },
      unreadCount: 12, name: '🎓 GENZ Familia', groupName: '🎓 GENZ Familia',
    },
    {
      _id: 'demo-conv-4', isGroup: false, isPinned: false, isArchived: false,
      participants: [{ _id: 'demo-user-3', username: 'Carol Mwangi', profilePicture: null, isOnline: true }],
      lastMessage: { content: '🎵 [Audio Message - 0:24]', timestamp: new Date(Date.now() - 86400000).toISOString(), senderId: 'demo-user-3' },
      unreadCount: 1, name: 'Carol Mwangi',
    },
    {
      _id: 'demo-conv-5', isGroup: false, isPinned: false, isArchived: false,
      participants: [{ _id: 'demo-user-5', username: 'Edwin Baraka', profilePicture: null, isOnline: false }],
      lastMessage: { content: 'Tuma hii file haraka iwezekanavyo 📎', timestamp: new Date(Date.now() - 172800000).toISOString(), senderId: currentUserId },
      unreadCount: 0, name: 'Edwin Baraka',
    },
    {
      _id: 'demo-conv-6', isGroup: true, isPinned: false, isArchived: false,
      participants: [
        { _id: 'demo-user-2', username: 'Brian Msomi', profilePicture: null },
        { _id: 'demo-user-5', username: 'Edwin Baraka', profilePicture: null },
      ],
      lastMessage: { content: '📍 Nimeshare location yangu', timestamp: new Date(Date.now() - 259200000).toISOString(), senderId: 'demo-user-2' },
      unreadCount: 5, name: '💼 Kazi Team', groupName: '💼 Kazi Team',
    },
    {
      _id: 'demo-conv-7', isGroup: false, isPinned: false, isArchived: false,
      participants: [{ _id: 'demo-user-6', username: 'Fatuma Hassan', profilePicture: null, isOnline: true }],
      lastMessage: { content: 'Je, umefanya assignment ya kesho?', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), senderId: 'demo-user-6' },
      unreadCount: 2, name: 'Fatuma Hassan',
    },
    {
      _id: 'demo-conv-8', isGroup: false, isPinned: false, isArchived: false,
      participants: [{ _id: 'demo-user-7', username: 'George Kamau', profilePicture: null, isOnline: false }],
      lastMessage: { content: '😂😂😂 hiyo ni ya kweli kabisa!', timestamp: new Date(Date.now() - 3600000 * 48).toISOString(), senderId: 'demo-user-7' },
      unreadCount: 0, name: 'George Kamau',
    },
  ];

  const DEMO_MESSAGES = {
    'demo-conv-1': [
      { _id: 'dm1-1', content: 'Habari za asubuhi! ☀️', senderId: 'demo-user-1', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm1-2', content: 'Nzuri sana, wewe je? 😊', senderId: currentUserId, timestamp: new Date(Date.now() - 3600000 * 2.9).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm1-3', content: 'Niko sawa. Leo kuna meeting saa tano asubuhi', senderId: 'demo-user-1', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm1-4', content: 'Okay niko tayari! 👍', senderId: currentUserId, timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm1-5', content: 'Umepata document ile niliyokutumia?', senderId: 'demo-user-1', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm1-6', content: 'Ndiyo nimepata, nitaangalia sasa hivi 📄', senderId: currentUserId, timestamp: new Date(Date.now() - 900000).toISOString(), status: 'delivered', type: 'text' },
      { _id: 'dm1-7', content: 'Habari yako! 😊 Umefika nyumbani?', senderId: 'demo-user-1', timestamp: new Date(Date.now() - 300000).toISOString(), status: 'delivered', type: 'text' },
    ],
    'demo-conv-2': [
      { _id: 'dm2-1', content: 'Wewe bado uko ofisini?', senderId: currentUserId, timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm2-2', content: 'Ndiyo, ninamaliza kazi tu', senderId: 'demo-user-2', timestamp: new Date(Date.now() - 7000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm2-3', content: 'Tutaonana saa ngapi kesho?', senderId: currentUserId, timestamp: new Date(Date.now() - 6000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm2-4', content: 'Saa tatu asubuhi iko sawa?', senderId: 'demo-user-2', timestamp: new Date(Date.now() - 5000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm2-5', content: '✅ Sawa, tutaonana kesho saa tatu', senderId: currentUserId, timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'read', type: 'text' },
    ],
    'demo-conv-3': [
      { _id: 'dm3-1', content: 'Watu wote wamefika kwenye mkutano? 🤔', senderId: 'demo-user-3', timestamp: new Date(Date.now() - 9000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm3-2', content: 'Mimi nipo! ✋', senderId: currentUserId, timestamp: new Date(Date.now() - 8900000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm3-3', content: 'Nipo nipo! 🙋‍♂️', senderId: 'demo-user-4', timestamp: new Date(Date.now() - 8800000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm3-4', content: 'Nilikuwa na habari njema leo — nimepata kazi! 🎉', senderId: 'demo-user-4', timestamp: new Date(Date.now() - 8000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm3-5', content: '🎉 Hongera sana David!', senderId: 'demo-user-1', timestamp: new Date(Date.now() - 7900000).toISOString(), status: 'read', type: 'text', reactions: [{ emoji: '🎊', userId: currentUserId }, { emoji: '❤️', userId: 'demo-user-3' }] },
      { _id: 'dm3-6', content: 'Hongera sana! Mungu akubariki 🙏', senderId: currentUserId, timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'read', type: 'text' },
    ],
    'demo-conv-4': [
      { _id: 'dm4-1', content: 'Unapendezwa na wimbo gani sasa hivi? 🎵', senderId: currentUserId, timestamp: new Date(Date.now() - 90000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm4-2', content: 'Sikiliza hii! 🎶', senderId: 'demo-user-3', timestamp: new Date(Date.now() - 89000000).toISOString(), status: 'read', type: 'audio', duration: 24 },
      { _id: 'dm4-3', content: '😍 Mzuri sana! Ni nani?', senderId: currentUserId, timestamp: new Date(Date.now() - 88000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm4-4', content: '🎵 [Audio Message - 0:24]', senderId: 'demo-user-3', timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'read', type: 'text' },
    ],
  };

  // ── Load offline data from IndexedDB on mount ──
  useEffect(() => {
    const loadOfflineData = async () => {
      try {
        await DB.initDefaultSettings();
        const prunedBlobMessages = await DB.pruneStaleBlobMessages();
        if (prunedBlobMessages > 0) {
          console.info(`[ChatContext] Removed ${prunedBlobMessages} stale local blob media message(s)`);
        }
        const savedMods = await DB.getSetting('mods');
        if (savedMods) setModsState(prev => ({ ...prev, ...savedMods }));
        const offlineConvs = await DB.getConversations();
        if (offlineConvs && offlineConvs.length > 0) {
          setConversations(offlineConvs);
          // FIX: Usifungue chat yoyote kiotomatiki hapa. Awali mfumo ulikuwa
          // unachukua "storedId" (chat ya mwisho kufunguliwa) na kuiweka kama
          // selectedConversation mara moja app inapoanza - hii ndiyo iliyokuwa
          // ikisababisha mfumo "kujifungua wenyewe" ndani ya chat bila mtumiaji
          // kubonyeza chochote (hasa kwenye simu, ambapo skrini moja hubadilika
          // kuonyesha ChatArea badala ya orodha ya chat mara selectedConversation
          // inapokuwa si null). Sasa tunaruhusu tu socket ijiunge na room ya chat
          // iliyokuwa imefunguliwa mwisho (kwa ajili ya notifications/real-time
          // sync) bila kulazimisha UI kuingia ndani ya chat hiyo moja kwa moja.
          const storedId = getStoredSelectedConversationId();
          if (storedId) {
            const matched = offlineConvs.find(c => c._id === storedId);
            if (matched) {
              setTimeout(() => {
                if (socketRef.current?.connected) {
                  socketRef.current.emit('join:conversation', storedId);
                }
              }, 1000);
            }
          }
        } else if (ENABLE_DEMO_DATA) {
          // Seed demo data for testing
          console.log('[GENZ] Seeding demo conversations for testing...');
          setConversations(DEMO_CONVERSATIONS);
          // Store in IndexedDB for persistence
          try { for (const c of DEMO_CONVERSATIONS) { await DB.saveConversation(c); } } catch (e) { /* silent */ }
        } else {
          // Production must never show sample chats unless explicitly enabled.
          setConversations([]);
        }
      } catch (err) {
        console.error('Failed to load offline data:', err);
        setConversations(ENABLE_DEMO_DATA ? DEMO_CONVERSATIONS : []);
      }
    };
    loadOfflineData();

    // Register Service Worker for push notifications on first load
    registerServiceWorker();
  }, []);

  // ── Socket.io Connection (Phase 2) — wait for JWT when app requires auth ──
  useEffect(() => {
    if (REQUIRE_AUTH && (authLoading || !isAuthenticated)) {
      if (socketRef.current) {
        try {
          socketRef.current.removeAllListeners();
          if (socketRef.current.connected) socketRef.current.disconnect();
        } catch (e) {
          console.warn('[ChatContext] Socket cleanup:', e);
        }
        socketRef.current = null;
        setIsSocketConnected(false);
      }
      return;
    }

    if (socketRef.current?.connected || isOffline()) {
      console.log('Socket already connected or offline mode, skipping connection');
      return;
    }

    let socket;
    try {
      const token = localStorage.getItem('token');
      let userId = currentUserId;
      try {
        const u = authUser || JSON.parse(localStorage.getItem('user') || 'null');
        if (u?._id) userId = u._id;
      } catch (_) { /* keep default */ }

      socket = io(SOCKET_ORIGIN, {
        path: '/socket.io/',
        transports: ['websocket'], // Force websocket to prevent Render polling blocks
        upgrade: false,
        withCredentials: true,
        auth: {
          token: token || undefined,
          userId: userId,
          freezeLastSeen: modsRef.current.freezeLastSeen
        },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 5000,
        reconnectionDelayMax: 10000,
        randomizationFactor: 0.5,
        timeout: 20000,
        forceNew: false, // Reuse existing connection
        autoConnect: true // Enable auto-connect for better reliability
      });
      socketRef.current = socket;
      setSocketInstance(socket);

      // Manual connection with error handling
      const connectSocket = () => {
        if (!socket.connected && !isOffline()) {
          socket.connect();
        }
      };

      // Delay connection to prevent immediate 426 errors
      const connectionTimeout = setTimeout(() => {
        connectSocket();
      }, 500);

      socket.on('connect', () => {
        console.log('Socket connected successfully');
        setIsSocketConnected(true);
        socket.emit('user:join', userId);
        
        const currentConvId = getStoredSelectedConversationId();
        if (currentConvId) {
          socket.emit('join:conversation', currentConvId);
        }
        
        window.dispatchEvent(new Event('process-offline-queue'));
        socket.emit('get_profile_visitors');
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsSocketConnected(false);
        // Reconnect automatically unless it's an intentional disconnect or offline mode
        if (reason === 'io server disconnect' && !isOffline()) {
          setTimeout(() => connectSocket(), 2000);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        setIsSocketConnected(false);
        // Don't immediately retry on error to prevent 426 issues
      });

      socket.on('reconnect', async (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setIsSocketConnected(true);
        let uid = currentUserId;
        try {
          const u = authUser || JSON.parse(localStorage.getItem('user') || 'null');
          if (u?._id) uid = u._id;
        } catch (_) { /* */ }
        socket.emit('user:join', uid);

        // Re-confirm push subscription on reconnect (the real subscribe now
        // happens on app startup in App.jsx — this used to be the *only*
        // place it happened, and only fired on 'reconnect', so a normal
        // session that never disconnects never subscribed at all).
        try {
          if ('serviceWorker' in navigator && 'PushManager' in window && Notification.permission === 'granted') {
            const reg = await navigator.serviceWorker.ready;
            const { subscribeToWebPush } = await import('../services/notificationService');
            await subscribeToWebPush(reg);
          }
        } catch (pushErr) {
          console.warn('[Push] Auto-subscribe failed:', pushErr?.message);
        }
        // Re-sync unread counts and conversation list after reconnect
        try {
          const data = await apiService.getConversations();
          if (data?.success && Array.isArray(data.conversations)) {
            const openChatId = getStoredSelectedConversationId();
            const remoteIds = new Set(data.conversations.map((c) => String(c._id)));
            setConversations(prev => {
              const mergedMap = new Map();
              prev.forEach(c => {
                const id = String(c._id || '');
                const isLocalOnly = id.startsWith('conv-') || id.startsWith('temp-');
                // Drop conversations the server no longer returns (deleted/left
                // elsewhere) instead of keeping them around forever.
                if (isLocalOnly || remoteIds.has(id)) {
                  mergedMap.set(c._id, c);
                }
              });
              data.conversations.forEach(c => {
                const isOpen = openChatId && String(c._id) === String(openChatId);
                mergedMap.set(c._id, isOpen ? { ...c, unreadCount: 0 } : c);
              });
              return Array.from(mergedMap.values()).sort(
                (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
              );
            });
          }
        } catch (e) {
          console.warn('[ChatContext] Failed to refresh conversations on reconnect:', e?.message || e);
        }
        try {
          const statusData = await apiService.getStatuses();
          if (statusData?.success && Array.isArray(statusData.statuses)) {
            setStatuses(statusData.statuses);
          }
        } catch (_) { /* best-effort */ }
        socket.emit('get_profile_visitors');
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Socket reconnection attempt:', attemptNumber);
      });

      socket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed');
        setIsSocketConnected(false);
      });

      // ── Message reaction updates ──
      socket.on('message:reaction', (data) => {
        setMessages(prev => prev.map(m => {
          if (m._id === data.messageId) {
            return { ...m, reactions: data.reactions };
          }
          return m;
        }));
      });

      // ── Incoming message ──
      socket.on('message:received', async (msg) => {
        // Play notification sound for incoming messages (if not muted)
        try {
          const muteList = JSON.parse(localStorage.getItem('genz_muted_chats') || '[]');
          const isMuted = muteList.includes(String(msg.conversationId));
          const isDND = JSON.parse(localStorage.getItem('genz_settings_comprehensive') || '{}').isDNDMode;
          if (!isMuted && !isDND) playMessageSound();
        } catch (_) {}
        try {
        const incoming = await decryptMessageContent(msg);
        const senderId = String(incoming.sender?._id || incoming.sender || '');
        if (senderId === String(currentUserId)) {
          return;
        }
        if (blockedUsersRef.current.some((id) => String(id) === senderId)) {
          return;
        }
        if (modsRef.current.spamFilter && isLikelySpamMessage(incoming)) {
          console.log('[ChatContext] Spam message filtered');
          return;
        }
        if (senderId !== String(currentUserId) && modsRef.current.autoSaveMedia) {
          autoSaveMediaFromMessage(incoming);
        }
        setMessages(prev => {
          const serverId = String(incoming._id || '');
          const clientId = incoming.clientMessageId ? String(incoming.clientMessageId) : '';
          const existingIndex = prev.findIndex(m =>
            String(m._id) === serverId ||
            (clientId && String(m._id) === clientId)
          );

          if (existingIndex === -1) {
            const targetConv = conversationsRef.current?.find(c => String(c._id) === String(incoming.conversationId));
            const isMuted = targetConv?.isMuted || false;
            if (!isMuted && !isDNDModeRef.current) {
              const senderName = incoming.sender?.username || 'Someone';
              let preview = typeof incoming.content === 'string' ? incoming.content : 'New message';
              if (incoming.isViewOnce) preview = '🤫 View once message';
              else if (incoming.messageType === 'image') preview = '📷 Photo';
              else if (incoming.messageType === 'video') preview = '🎥 Video';
              else if (incoming.messageType === 'audio') preview = '🎵 Voice note';
              else if (incoming.messageType === 'sticker') preview = '🖼️ Sticker';
              else if (incoming.messageType === 'gif') preview = '🎞️ GIF';
              // BUG FIX: a text message that's just a URL (e.g. a shared group
              // invite link) used to show the whole raw link in the
              // notification body. Other apps never do that — show a clean
              // "🔗 Link" label instead, same as an image/video message.
              else if (/^https?:\/\/\S+$/i.test(preview.trim())) preview = '🔗 Link';
              notifyNewMessage(senderName, preview, incoming.conversationId);
              setOnlineNotification(`New message from ${senderName}`);
              setTimeout(() => setOnlineNotification(null), 3000);
            }
            
            // Only append to active chat view if it's the open chat
            const currentSelectedId = getStoredSelectedConversationId();

            if (String(incoming.conversationId) === String(currentSelectedId)) {
              setConversations(prevConvs => prevConvs.map(c =>
                String(c._id) === String(incoming.conversationId) ? { ...c, unreadCount: 0 } : c
              ));
              clearTimeout(markReadDebouncedRef.current);
              markReadDebouncedRef.current = setTimeout(() => {
                if (socketRef.current?.connected) {
                  const skipReadReceipts = Boolean(
                    modsRef.current.hideReadReceipts || modsRef.current.ghostMode
                  );
                  socketRef.current.emit('mark_as_read', {
                    chatId: incoming.conversationId,
                    skipReadReceipts
                  });
                }
              }, 300);
              return [...prev, incoming].slice(-150); // weka messages 150 tu kwenye memory
            }
            return prev;
          }

          const next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            ...incoming,
            status: incoming.status || 'delivered'
          };
          return next;
        });
        try {
          if (incoming.clientMessageId) {
            await DB.deleteMessages([incoming.clientMessageId]);
          }
          await DB.saveMessage(incoming);
        } catch (e) { }
        setConversations(prev => prev.map(c => {
          if (c._id === incoming.conversationId) {
            return {
              ...c,
              lastMessage: incoming,
              updatedAt: new Date()
            };
          }
          return c;
        }));
        } catch (err) {
          console.error('[ChatContext] message:received handler error:', err);
        }
      });

      // ✅ Badilisha temp message na ile ya kweli kutoka server (TOP-LEVEL, si ndani ya message:received)
      socket.on('message:sent', (confirmedMsg) => {
        try { playSentSound(); } catch (_) {}
        setMessages(prev => {
          const clientId = confirmedMsg.clientMessageId;
          const exists = prev.some(m => String(m._id) === String(confirmedMsg._id));

          if (exists) return prev; // Tayari ipo, usiiongeze tena

          if (clientId) {
            // Badilisha temp message
            return prev.map(m =>
              String(m._id) === String(clientId) || String(m.clientMessageId) === String(clientId)
                ? { ...confirmedMsg, status: 'sent' }
                : m
            );
          }

          // Kama hakuna clientId, ongeza tu kama haipo
          return [...prev, { ...confirmedMsg, status: 'sent' }];
        });
      });

      socket.on('notification:new_message', async (data) => {
        console.log('Ujumbe mpya umeingia kutoka Socket (notification:new_message):', data);
        if (!data || !data.message) return;
        const incoming = await decryptMessageContent(data.message);
        
        setMessages(prev => {
          const serverId = String(incoming._id || '');
          const existingIndex = prev.findIndex(m => String(m._id) === serverId);

          if (existingIndex === -1) {
            const currentSelectedId = getStoredSelectedConversationId();
            if (String(incoming.conversationId) === String(currentSelectedId)) {
              return [...prev, incoming];
            }
            return prev;
          }
          
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], ...incoming };
          return next;
        });

        try {
          await DB.saveMessage(incoming);
        } catch (e) { }

        setConversations(prev => prev.map(c =>
          c._id === incoming.conversationId ? { ...c, lastMessage: incoming, updatedAt: new Date() } : c
        ));
      });

      socket.on('notification:mention', async ({ conversationId, message } = {}) => {
        const senderName = message?.sender?.username || 'Someone';
        let preview = typeof message?.content === 'string'
          ? message.content
          : 'You were mentioned in a message';
        if (message?.isViewOnce) preview = '🤫 View once message';
        else if (message?.messageType === 'image') preview = '📷 Photo';
        else if (message?.messageType === 'video') preview = '🎥 Video';
        else if (message?.messageType === 'audio') preview = '🎵 Voice note';
        const notification = {
          id: `mention-${message?._id || Date.now()}`,
          type: 'mention',
          title: `${senderName} mentioned you`,
          body: preview,
          conversationId,
          messageId: message?._id,
          createdAt: new Date().toISOString(),
          read: false
        };

        setNotifications((prev) => [notification, ...prev].slice(0, 100));
        if (!isDNDModeRef.current) {
          setOnlineNotification(notification.title);
          setTimeout(() => setOnlineNotification(null), 3500);
          await showLocalNotification(notification.title, preview, {
            conversationId,
            tag: notification.id,
            data: { conversationId, messageId: message?._id, type: 'mention', url: '/chat' }
          });
        }
      });

      // ── Anti-Delete (Phase 3): intercept deletion, keep visible ──
      socket.on('message:deleted', ({ messageId, forEveryone, reason } = {}) => {
        if (forEveryone && modsRef.current.antiDelete) {
          setMessages(prev => prev.map(m => {
            if (m._id !== messageId) return m;
            return {
              ...m,
              deletedForEveryone: true,
              _antiDeletePreserved: true,
              // Keep original content visible
              content: m.originalContent || m.content || '🚫 This message was deleted'
            };
          }));
        } else if (forEveryone) {
          setMessages(prev => prev.filter(m => m._id !== messageId));
        } else {
          // Delete for me only
          setMessages(prev => prev.filter(m => m._id !== messageId));
        }
      });

      // ── Message edited ──
      socket.on('message:edited', (updatedMsg) => {
        setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
        try { DB.saveMessage(updatedMsg); } catch (e) { }
      });

      // ── Message starred ──
      socket.on('message:starred', (updatedMsg) => {
        setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
        try { DB.saveMessage(updatedMsg); } catch (e) { }
      });

      // ── Conversation pinned/unpinned ──
      socket.on('conversation:pinned', ({ chatId, messageId } = {}) => {
        setConversations(prev => prev.map(c => c._id === chatId ? { ...c, pinnedMessages: [...(c.pinnedMessages || []), messageId] } : c));
        setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, pinnedMessages: [...(prev.pinnedMessages || []), messageId] } : prev);
      });
      socket.on('conversation:unpinned', ({ chatId } = {}) => {
        setConversations(prev => prev.map(c => c._id === chatId ? { ...c, pinnedMessages: [] } : c));
        setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, pinnedMessages: [] } : prev);
      });

      // ── Brand new conversation (e.g. first message from someone new) ──
      // Without this, a new 1-on-1 chat never appears in the sidebar until
      // the user manually refreshes, since message:received only updates
      // conversations that already exist in local state.
      socket.on('conversation:created', (newConv) => {
        if (!newConv?._id) return;
        setConversations(prev => {
          if (prev.some(c => String(c._id) === String(newConv._id))) return prev;
          return [newConv, ...prev];
        });
      });
      socket.on('conversation:updated', (updatedConv) => {
        if (!updatedConv?._id) return;
        setConversations(prev => {
          const exists = prev.some(c => String(c._id) === String(updatedConv._id));
          if (!exists) return [updatedConv, ...prev];
          return prev.map(c => String(c._id) === String(updatedConv._id) ? { ...c, ...updatedConv } : c);
        });
        setSelectedConversation(prev => (prev && String(prev._id) === String(updatedConv._id)) ? { ...prev, ...updatedConv } : prev);
      });

      // ── Group member joined (via invite link) ──
      socket.on('group:member_joined', ({ chatId, userId, username } = {}) => {
        if (!chatId || !userId) return;
        setConversations(prev => prev.map(c => {
          if (String(c._id) !== String(chatId)) return c;
          const already = (c.participants || []).some(p => String(p?._id || p) === String(userId));
          if (already) return c;
          return { ...c, participants: [...(c.participants || []), { _id: userId, username }] };
        }));
        setSelectedConversation(prev => {
          if (!prev || String(prev._id) !== String(chatId)) return prev;
          const already = (prev.participants || []).some(p => String(p?._id || p) === String(userId));
          if (already) return prev;
          return { ...prev, participants: [...(prev.participants || []), { _id: userId, username }] };
        });
      });

      // ── Chat pinned/unpinned (conversation-level) ──
      socket.on('chat:pinned', ({ chatId, isPinned } = {}) => {
        setConversations(prev => prev.map(c => c._id === chatId ? { ...c, isPinned } : c));
        setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, isPinned } : prev);
      });

      socket.on('chat_pinned_signal', ({ chatId, isPinned } = {}) => {
        setConversations(prev => prev.map(c => c._id === chatId ? { ...c, isPinned } : c));
        setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, isPinned } : prev);
      });

      // ── Chat archived/unarchived ──
      socket.on('chat:archived', ({ chatId, isArchived } = {}) => {
        setConversations(prev => prev.map(c => c._id === chatId ? { ...c, isArchived } : c));
        setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, isArchived } : prev);
      });

      socket.on('chat_archived_signal', ({ chatId, isArchived } = {}) => {
        setConversations(prev => prev.map(c => c._id === chatId ? { ...c, isArchived } : c));
        setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, isArchived } : prev);
      });

      // ── Message forwarded ──
      socket.on('message:forwarded', ({ messageId, targetConversationIds } = {}) => {
        // Update message forward count
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, forwardCount: (m.forwardCount || 0) + 1 } : m));
      });

      // ── Group updated ──
      socket.on('group:updated', ({ groupId, updates } = {}) => {
        setConversations(prev => prev.map(conv =>
          conv._id === groupId ? { ...conv, groupName: updates.groupName || conv.groupName, groupPhoto: updates.groupPhoto || conv.groupPhoto } : conv
        ));
        setSelectedConversation(prev => (prev && prev._id === groupId) ? { ...prev, groupName: updates.groupName || prev.groupName, groupPhoto: updates.groupPhoto || prev.groupPhoto } : prev);
      });

      socket.on('profile:updated', ({ user: updatedUser } = {}) => {
        if (!updatedUser?._id) return;
        const updatedUserId = String(updatedUser._id);
        const mergeParticipant = (participant) => {
          const participantId = String(participant?._id || participant?.id || participant || '');
          return participantId === updatedUserId && typeof participant === 'object'
            ? { ...participant, ...updatedUser }
            : participant;
        };

        setConversations(prev => prev.map(conv => ({
          ...conv,
          participants: Array.isArray(conv.participants) ? conv.participants.map(mergeParticipant) : conv.participants,
          admins: Array.isArray(conv.admins) ? conv.admins.map(mergeParticipant) : conv.admins
        })));
        setSelectedConversation(prev => prev ? {
          ...prev,
          participants: Array.isArray(prev.participants) ? prev.participants.map(mergeParticipant) : prev.participants,
          admins: Array.isArray(prev.admins) ? prev.admins.map(mergeParticipant) : prev.admins
        } : prev);
        setMessages(prev => prev.map(message => {
          const senderId = String(message.sender?._id || message.sender || '');
          return senderId === updatedUserId && typeof message.sender === 'object'
            ? { ...message, sender: { ...message.sender, ...updatedUser } }
            : message;
        }));
      });

      const applyDisappearingUpdate = ({ chatId, duration, disappearingMessages, enabled, timer } = {}) => {
        if (!chatId) return;
        const settings = disappearingMessages || normalizeDisappearingSettings({ duration, enabled, timer });
        const updateConversation = (conv) => (
          String(conv?._id) === String(chatId)
            ? { ...conv, disappearingMessages: settings }
            : conv
        );
        setConversations(prev => prev.map(updateConversation));
        setSelectedConversation(prev => prev && String(prev._id) === String(chatId)
          ? { ...prev, disappearingMessages: settings }
          : prev);
      };

      socket.on('disappearing_messages:set', applyDisappearingUpdate);
      socket.on('group_update_signal', (payload = {}) => {
        if (payload.action === 'update_disappearing') {
          applyDisappearingUpdate(payload);
        }
      });

      // ── Group settings updated by an admin (name/photo/permissions) ──
      socket.on('group:settings:updated', (payload = {}) => {
        const { groupId, ...fields } = payload;
        if (!groupId) return;
        setConversations(prev => prev.map(c => (
          String(c._id) === String(groupId) ? { ...c, ...fields } : c
        )));
        setSelectedConversation(prev => (
          prev && String(prev._id) === String(groupId) ? { ...prev, ...fields } : prev
        ));
      });

      // ── Group membership real-time sync ──
      const updateGroupParticipants = (groupId, updater) => {
        setConversations(prev => prev.map(c =>
          String(c._id) === String(groupId) ? updater(c) : c
        ));
        setSelectedConversation(prev =>
          prev && String(prev._id) === String(groupId) ? updater(prev) : prev
        );
      };

      socket.on('group:participant_added', ({ groupId, userId, user } = {}) => {
        if (!groupId) return;
        updateGroupParticipants(groupId, (c) => {
          const alreadyIn = (c.participants || []).some(p => String(p?._id || p) === String(userId));
          if (alreadyIn) return c;
          return { ...c, participants: [...(c.participants || []), user || userId] };
        });
      });

      socket.on('group:participant_removed', ({ groupId, userId } = {}) => {
        if (!groupId) return;
        updateGroupParticipants(groupId, (c) => ({
          ...c,
          participants: (c.participants || []).filter(p => String(p?._id || p) !== String(userId)),
          admins: (c.admins || []).filter(a => String(a?._id || a) !== String(userId)),
        }));
      });

      socket.on('group:admin_added', ({ groupId, userId } = {}) => {
        if (!groupId) return;
        updateGroupParticipants(groupId, (c) => {
          const admins = c.admins || [];
          if (admins.some(a => String(a?._id || a) === String(userId))) return c;
          return { ...c, admins: [...admins, userId] };
        });
      });

      socket.on('group:admin_removed', ({ groupId, userId } = {}) => {
        if (!groupId) return;
        updateGroupParticipants(groupId, (c) => ({
          ...c,
          admins: (c.admins || []).filter(a => String(a?._id || a) !== String(userId)),
        }));
      });

      socket.on('group:member_left', ({ groupId, userId } = {}) => {
        if (!groupId) return;
        updateGroupParticipants(groupId, (c) => ({
          ...c,
          participants: (c.participants || []).filter(p => String(p?._id || p) !== String(userId)),
          admins: (c.admins || []).filter(a => String(a?._id || a) !== String(userId)),
        }));
      });

      // Current user was added to a new group — fetch the full conversation
      socket.on('group:you_were_added', async ({ groupId } = {}) => {
        if (!groupId) return;
        try {
          const data = await apiService.getConversation(groupId);
          if (data?.conversation) {
            setConversations(prev => {
              const exists = prev.some(c => String(c._id) === String(groupId));
              return exists ? prev : [data.conversation, ...prev];
            });
          }
        } catch (_) {}
      });

      // Current user was removed from a group — hide the conversation
      socket.on('group:you_were_removed', ({ groupId } = {}) => {
        if (!groupId) return;
        setConversations(prev => prev.filter(c => String(c._id) !== String(groupId)));
        setSelectedConversation(prev => (prev && String(prev._id) === String(groupId) ? null : prev));
      });

      // Current user was banned from a group
      socket.on('group:you_were_banned', ({ groupId, groupName, reason } = {}) => {
        if (!groupId) return;
        setConversations(prev => prev.filter(c => String(c._id) !== String(groupId)));
        setSelectedConversation(prev => (prev && String(prev._id) === String(groupId) ? null : prev));
        showLocalNotification?.(`Removed from ${groupName || 'a group'}`, reason ? `Reason: ${reason}` : 'You have been banned');
      });

      // A member was banned (for other group members to update their UI)
      socket.on('group:member_banned', ({ groupId, userId } = {}) => {
        if (!groupId || !userId) return;
        updateGroupParticipants(groupId, (c) => ({
          ...c,
          participants: (c.participants || []).filter(p => String(p?._id || p) !== String(userId)),
        }));
      });

      // Ownership transferred
      socket.on('group:ownership_transferred', ({ groupId, newOwnerId } = {}) => {
        if (!groupId) return;
        updateGroupParticipants(groupId, (c) => ({ ...c, createdBy: newOwnerId, owner: newOwnerId }));
      });

      // Join request approved — user now in group
      socket.on('group:join_approved', async ({ groupId } = {}) => {
        if (!groupId) return;
        try {
          const data = await apiService.getConversation(groupId);
          if (data?.conversation) {
            setConversations(prev => {
              const exists = prev.some(c => String(c._id) === String(groupId));
              return exists ? prev : [data.conversation, ...prev];
            });
          }
        } catch (_) {}
      });

      // Join request rejected
      socket.on('group:join_rejected', ({ groupId, groupName } = {}) => {
        showLocalNotification?.('Join request rejected', `Your request to join ${groupName || 'the group'} was declined`);
      });

      // New join request (for admins)
      socket.on('group:join_request', ({ groupId, groupName } = {}) => {
        showLocalNotification?.(`New join request in ${groupName || 'a group'}`, 'Someone wants to join your group');
      });

      // Group event created
      socket.on('group:event_created', ({ groupId } = {}) => {
        // Could refresh events if the group is currently open
      });

      // Anti-spam updated
      socket.on('group:antispam_updated', ({ groupId, antiSpam } = {}) => {
        if (!groupId) return;
        updateGroupParticipants(groupId, (c) => ({ ...c, antiSpam }));
      });

      // Admin status changes for current user
      socket.on('group:you_are_admin', ({ groupId } = {}) => {
        if (!groupId) return;
        const currentId = socket.userId || authUserRef.current?._id;
        if (!currentId) return;
        updateGroupParticipants(groupId, (c) => {
          const admins = c.admins || [];
          if (admins.some(a => String(a?._id || a) === String(currentId))) return c;
          return { ...c, admins: [...admins, currentId] };
        });
      });

      socket.on('group:your_admin_removed', ({ groupId } = {}) => {
        if (!groupId) return;
        const currentId = socket.userId || authUserRef.current?._id;
        if (!currentId) return;
        updateGroupParticipants(groupId, (c) => ({
          ...c,
          admins: (c.admins || []).filter(a => String(a?._id || a) !== String(currentId)),
        }));
      });

      // ── Admin removed ──
      socket.on('admin:removed', ({ groupId, userId } = {}) => {
        // Refresh group info
        if (selectedConversation?._id === groupId) {
          setSelectedConversation(prev => prev ? { ...prev, admins: prev.admins?.filter(a => a !== userId) } : prev);
        }
      });

      // ── View-once message viewed ──
      socket.on('message:consumed', ({ messageId, conversationId, isViewOnce, isSelfDestruct, consumedBy } = {}) => {
        const removeEntirely = Boolean(isSelfDestruct);
        setMessages(prev => {
          if (removeEntirely) {
            return prev.filter(m => String(m._id || m.id) !== String(messageId));
          }
          return prev.map(m => {
            if (m._id === messageId || m.id === messageId) {
              return { ...m, isConsumed: true, content: '👁️ Opened', mediaUrl: '', fileName: '' };
            }
            return m;
          });
        });

        setConversations(prev => prev.map(c => {
          if (c.lastMessage && (c.lastMessage._id === messageId || c.lastMessage.id === messageId)) {
            if (removeEntirely) {
              return { ...c, lastMessage: { ...c.lastMessage, content: '💥 Message self-destructed', isConsumed: true } };
            }
            return { ...c, lastMessage: { ...c.lastMessage, isConsumed: true, content: '👁️ Opened', mediaUrl: '', fileName: '' } };
          }
          return c;
        }));
        try { DB.deleteMessages([messageId]); } catch (_) { /* cache cleanup */ }
      });

      // ── Message viewed notification for sender ──
      socket.on('message:viewed', ({ messageId, conversationId, viewedBy, viewedAt, isViewOnce, isSelfDestruct } = {}) => {
        // Notification is mostly redundant if UI updates instantly, but we can keep a toast for self destruct.
        if (isSelfDestruct) {
          setOnlineNotification('💥 Your self-destruct message was read and destroyed');
          setTimeout(() => setOnlineNotification(null), 4000);
        }
      });

      // ── Screenshot attempted notification ──
      socket.on('message:screenshot-attempted', ({ messageId, userId, username }) => {
        const screenshotUser = username || userId || 'Someone';
        setOnlineNotification(`📸 ${screenshotUser} took a screenshot`);
        setTimeout(() => setOnlineNotification(null), 4000);
        console.log(`[ChatContext] Screenshot attempt detected: ${screenshotUser} on message ${messageId}`);
      });

      // Read receipts — update state AND IndexedDB ──
      socket.on('message:read_receipt', async ({ messageId } = {}) => {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'read' } : m));
        setConversations(prev => prev.map(c => 
          (c.lastMessage && c.lastMessage._id === messageId) ? { ...c, lastMessage: { ...c.lastMessage, status: 'read' } } : c
        ));
        try { await DB.saveMessage({ _id: messageId, status: 'read' }); } catch (e) { }
      });

      // Bulk Read receipt ──
      socket.on('messages:read', async ({ chatId, userId } = {}) => {
        if (userId !== currentUserId) {
          setMessages(prev => prev.map(m => 
            (String(m.conversationId) === String(chatId) && (String(m.sender?._id || m.sender) === String(currentUserId))) 
              ? { ...m, status: 'read' } 
              : m
          ));
          setConversations(prev => prev.map(c => 
            (String(c._id) === String(chatId) && c.lastMessage && (String(c.lastMessage.sender?._id || c.lastMessage.sender) === String(currentUserId))) 
              ? { ...c, lastMessage: { ...c.lastMessage, status: 'read' } } 
              : c
          ));
        }
      });

      // ── Delivered receipt ──
      socket.on('message:delivered', async ({ messageId, serverMessageId } = {}) => {
        const clientId = messageId;
        const serverId = serverMessageId || messageId;
        setMessages(prev => prev.map(m =>
          (m._id === clientId || m._id === serverId)
            ? { ...m, _id: serverId, status: 'delivered' }
            : m
        ));
        setConversations(prev => prev.map(c =>
          (c.lastMessage && (c.lastMessage._id === clientId || c.lastMessage._id === serverId))
            ? { ...c, lastMessage: { ...c.lastMessage, _id: serverId, status: 'delivered' } }
            : c
        ));
        try { await DB.saveMessage({ _id: serverId, status: 'delivered' }); } catch (e) { }
      });

      socket.on('message:error', ({ error, messageId } = {}) => {
        console.error('[Socket] message:error', error);
        if (!messageId) return;
        setMessages(prev => prev.map(m =>
          m._id === messageId ? { ...m, status: 'failed', errorMessage: error || 'Failed to send' } : m
        ));
      });

      // ── Typing indicators ──
      socket.on('user:typing', ({ userId, isTyping, conversationId, username } = {}) => {
        if (userId !== currentUserId) {
          setIsOtherUserTyping(isTyping);
          if (conversationId) {
            setTypingByConversation(prev => {
              const next = { ...prev };
              if (isTyping) {
                // Resolve username from conversations if not provided
                let name = username;
                if (!name) {
                  const conv = conversationsRef.current?.find(c => String(c._id) === String(conversationId));
                  const participant = conv?.participants?.find(p => String(p._id || p) === String(userId));
                  name = participant?.username || participant?.name || 'Someone';
                }
                next[conversationId] = { userId, type: 'typing', username: name };
              } else {
                delete next[conversationId];
              }
              return next;
            });
          }
        }
      });

      socket.on('user:recording', ({ userId, conversationId } = {}) => {
        if (userId !== currentUserId) {
          setIsOtherUserRecording(true);
          if (conversationId) {
            setTypingByConversation(prev => ({
              ...prev,
              [conversationId]: { userId, type: 'recording' }
            }));
            setTimeout(() => {
              setTypingByConversation(prev => {
                const next = { ...prev };
                if (next[conversationId]?.type === 'recording') delete next[conversationId];
                return next;
              });
            }, 3000);
          }
        }
        setTimeout(() => setIsOtherUserRecording(false), 3000);
      });

      // ── Calls (Phase 8 WebRTC signaling) ──
      socket.on('group_call:incoming', (data) => {
        setActiveGroupCall({ ...data, status: 'incoming' });
        notifyIncomingCall(data.callerName, data.callType);
      });

      socket.on('call:incoming', ({ callerId, callType, conversationId, offer, callerName: socketCallerName, callerPicture: socketCallerPicture, callerSocketId } = {}) => {
        // Use server-provided name first, fallback to conversations list
        let callerName = socketCallerName || 'Unknown';
        let callerPicture = socketCallerPicture || '';
        if (!socketCallerName) {
          const matchingConv = conversationsRef.current?.find(c =>
            c.participants?.some(p => (p?._id || p)?.toString() === callerId?.toString())
          );
          if (matchingConv) {
            const p = matchingConv.participants.find(p => (p?._id || p)?.toString() === callerId?.toString());
            callerName = p?.username || 'Unknown';
            callerPicture = p?.profilePicture || '';
          }
        }
        setActiveCall({
          type: callType,
          callerId,
          callerName,
          callerPicture,
          callerSocketId,
          conversationId,
          status: 'incoming',
          offer,
          user: { _id: callerId, username: callerName, profilePicture: callerPicture }
        });
        notifyIncomingCall(callerName, callType);
      });

      // ── Block / Unblock (live sync) ──
      // Without this, a participant's cached `blockedUsers` array inside
      // `conversations`/`selectedConversation` (fetched once when the chat
      // was opened) never updates in real time. That left a stale "blocked"
      // state on screen after someone unblocked you (or the reverse) until
      // a full page reload — messages silently refused to send even though
      // the block had already been lifted server-side.
      const applyBlockChange = (blockerId, targetUserId, blocked) => {
        const updateParticipants = (participants = []) =>
          participants.map((p) => {
            const pid = String(p?._id || p?.id || p);
            if (pid !== String(blockerId)) return p;
            if (typeof p !== 'object') return p;
            const current = Array.isArray(p.blockedUsers) ? p.blockedUsers : [];
            const already = current.some((id) => String(id) === String(targetUserId));
            const nextBlockedUsers = blocked
              ? (already ? current : [...current, targetUserId])
              : current.filter((id) => String(id) !== String(targetUserId));
            return { ...p, blockedUsers: nextBlockedUsers };
          });

        setConversations((prev) =>
          prev.map((c) => ({ ...c, participants: updateParticipants(c.participants) }))
        );
        setSelectedConversation((prev) =>
          prev ? { ...prev, participants: updateParticipants(prev.participants) } : prev
        );

        // If this device initiated the change (or another of our own
        // devices did), keep our own `blockedUsers` list in sync too.
        if (String(blockerId) === String(currentUserId)) {
          setBlockedUsers((prev) => {
            const list = prev || [];
            const already = list.some((id) => String(id) === String(targetUserId));
            if (blocked) return already ? list : [...list, targetUserId];
            return list.filter((id) => String(id) !== String(targetUserId));
          });
        }
      };

      socket.on('user:blocked', ({ blockerId, userId } = {}) => {
        if (!blockerId || !userId) return;
        applyBlockChange(blockerId, userId, true);
      });

      socket.on('user:unblocked', ({ blockerId, userId } = {}) => {
        if (!blockerId || !userId) return;
        applyBlockChange(blockerId, userId, false);
      });

      // ── Presence ──
      socket.on('user:online', ({ userId, username } = {}) => {
        setOnlineUsers(prev => [...new Set([...prev, String(userId)])]);
        if (username) {
          setOnlineNotification(`${username} is now online`);
          setTimeout(() => setOnlineNotification(null), 3000);
        }
      });

      socket.on('user:offline', ({ userId, lastSeen } = {}) => {
        if (!userId) return;
        setOnlineUsers(prev => prev.filter((id) => String(id) !== String(userId)));
        setAwayUsers(prev => prev.filter((id) => String(id) !== String(userId)));
        setLastSeenByUser(prev => ({ ...prev, [String(userId)]: lastSeen || new Date().toISOString() }));
      });

      // FEATURE ADD: real backing for the alwaysOnline mod (see socket/index.js
      // presence:update handler — this was previously a dead toggle with no
      // "away" concept anywhere in the app).
      socket.on('presence:changed', ({ userId, status } = {}) => {
        if (!userId) return;
        setAwayUsers(prev => {
          const withoutUser = prev.filter((id) => String(id) !== String(userId));
          return status === 'away' ? [...withoutUser, String(userId)] : withoutUser;
        });
      });

      // ── Reactions ──
      socket.on('reaction:added', (updatedMsg) => {
        setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
      });
      socket.on('reaction:removed', (updatedMsg) => {
        setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
      });

      // ── Polls ──
      // Without these, creating a poll never appeared in anyone's chat (not
      // even the creator's) until a manual refresh, and votes never updated live.
      socket.on('poll:created', (pollMessage) => {
        if (!pollMessage?._id) return;
        setMessages(prev => {
          if (prev.some(m => String(m._id) === String(pollMessage._id))) return prev;
          const currentSelectedId = getStoredSelectedConversationId();
          if (String(pollMessage.conversationId) !== String(currentSelectedId)) return prev;
          return [...prev, pollMessage].slice(-150);
        });
        setConversations(prev => prev.map(c =>
          String(c._id) === String(pollMessage.conversationId)
            ? { ...c, lastMessage: pollMessage, updatedAt: new Date() }
            : c
        ));
      });
      socket.on('poll:voted', (updatedMsg) => {
        if (!updatedMsg?._id) return;
        setMessages(prev => prev.map(m => String(m._id) === String(updatedMsg._id) ? updatedMsg : m));
      });

      // ── Calls (Phase 8 WebRTC signaling) ──
      socket.on('call:accepted', ({ answer } = {}) => {
        // Only advance to 'connected' when a real SDP answer arrived.
        // Bare 'call:accepted' without answer must not flip the UI early —
        // CallScreen/WebRTC still need to finish negotiation first.
        if (answer?.type && answer?.sdp) {
          setActiveCall(prev => prev ? { ...prev, status: 'connected' } : prev);
        } else {
          setActiveCall(prev => prev && prev.status === 'calling'
            ? { ...prev, status: 'connecting' }
            : prev);
        }
      });
      socket.on('call:rejected', () => setActiveCall(null));
      socket.on('call:ended', () => setActiveCall(null));

      socket.on('call:log:created', (log) => {
        if (!log?._id) return;
        setCallLogs((prev) => {
          if (prev.some((c) => c._id === log._id)) return prev;
          return [log, ...prev];
        });
      });

      // ── WebRTC signaling ──
      socket.on('webrtc:offer', async (data) => {
        // Handle renegotiation if already connected
        if (activeCallRef.current?.status === 'connected' && 
            String(activeCallRef.current.callerId) === String(data.from || data.callerId)) {
          try {
            await webRTCService.handleRenegotiation(data.offer, data.from || data.callerId);
          } catch (err) {
            console.error('Renegotiation failed', err);
          }
          return;
        }

        setActiveCall(prev => {
          if (prev) {
            return { ...prev, offer: data.offer };
          }
          // If webrtc:offer arrives before call:incoming
          return {
            type: data.callType || 'audio',
            callerId: data.from || data.callerId,
            status: 'incoming',
            offer: data.offer,
            conversationId: data.conversationId,
            user: { _id: data.from || data.callerId }
          };
        });
      });

      // ── Unread count sync (server is source of truth) ──
      socket.on('conversation:unread-update', ({ conversationId, unreadCount }) => {
        if (!conversationId) return;
        const openChatId = getStoredSelectedConversationId();
        const isOpenChat = openChatId && String(conversationId) === String(openChatId);
        const effectiveCount = isOpenChat ? 0 : (unreadCount ?? 0);
        setConversations(prev => prev.map(c =>
          String(c._id) === String(conversationId)
            ? { ...c, unreadCount: effectiveCount }
            : c
        ));
      });

      socket.on('profile_visitors', (visitors = []) => {
        setProfileVisitors(Array.isArray(visitors) ? visitors : []);
      });

      socket.on('profile:visited', (payload) => {
        if (!payload?.visitedUserId || String(payload.visitedUserId) !== String(currentUserId)) return;
        setProfileVisitors((prev) => {
          const entry = {
            visitorId: payload.visitorId,
            visitorName: payload.visitorName || 'Someone',
            visitorPicture: payload.visitorPicture || null,
            timestamp: payload.timestamp || new Date()
          };
          const filtered = prev.filter((v) => String(v.visitorId) !== String(entry.visitorId));
          return [entry, ...filtered].slice(0, 50);
        });
      });

      // ── Status ──
      socket.on('status:deleted', ({ statusId } = {}) => {
        if (!statusId) return;
        // Mark as deleted but keep visible if antiDeleteStatus is enabled
        setStatuses((prev) => prev.map((s) => {
          if (String(s._id) !== String(statusId) && String(s.id) !== String(statusId)) return s;
          // If antiDeleteStatus mod is on, keep it but mark as deleted
          if (modsRef.current?.antiDeleteStatus) {
            return { ...s, wasDeletedByOwner: true };
          }
          return null; // will be filtered
        }).filter(Boolean));
      });

      socket.on('status:created', (status) => {
        setStatuses(prev => {
          const serverId = String(status._id || '');
          const clientId = status.clientStatusId ? String(status.clientStatusId) : '';

          const existingIndex = prev.findIndex(s =>
            String(s._id) === serverId ||
            (clientId && String(s._id) === clientId)
          );

          if (existingIndex === -1) {
            // Check if there is already a status that is extremely similar to deduplicate loose cases
            const looselySimilar = prev.some(s =>
              s.content === status.content &&
              String(s.userId || s.sender?._id) === String(status.userId || status.sender?._id) &&
              Math.abs(new Date(s.createdAt) - new Date(status.createdAt)) < 5000
            );
            if (looselySimilar) return prev;
            return [status, ...prev];
          }

          const next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            ...status
          };
          return next;
        });
      });

      socket.on('status_liked_signal', (data) => {
        setStatuses(prev => prev.map(s => {
          if (String(s._id) === String(data.statusId)) {
            const currentLikes = s.reactions || [];
            let newLikes = [...currentLikes];
            if (data.liked) {
              if (!newLikes.some(r => String(r.user) === String(data.userId))) {
                newLikes.push({ user: data.userId, emoji: '❤️' });
              }
            } else {
              newLikes = newLikes.filter(r => String(r.user) !== String(data.userId));
            }
            return { ...s, reactions: newLikes, likeCount: data.likeCount };
          }
          return s;
        }));
      });

      socket.on('status:viewed', (data) => {
        setStatuses(prev => prev.map(s => {
          if (String(s._id) === String(data._id)) {
            return { ...s, views: data.views, viewsCount: data.viewsCount };
          }
          return s;
        }));
      });

      // FEATURE ADD: tells the anti-screenshot user when the person they're
      // chatting with tried to screenshot/record the conversation.
      socket.on('screenshot:attempted', (data = {}) => {
        toast(`⚠️ ${data.byUsername || 'They'} tried to screenshot this chat`, { icon: '📵', duration: 3000 });
      });

      // FEATURE ADD: lets the sender know their view-once media was
      // screenshotted/recorded, mirroring WhatsApp's view-once screenshot notice.
      socket.on('viewonce:screenshotted', (data = {}) => {
        toast(`📸 ${data.byUsername || 'They'} screenshotted your view-once media`, { icon: '⚠️', duration: 4000 });
      });

      return () => {
        clearTimeout(connectionTimeout);
        clearTimeout(markReadDebouncedRef.current);
        if (socket) {
          socket.removeAllListeners();
          if (socket.connected) {
            socket.disconnect();
          }
        }
        socketRef.current = null;
        clearSocketInstance();
        setIsSocketConnected(false);
      };
    } catch (err) {
      console.warn('Socket connection failed (offline mode active):', err);
      if (socket) {
        socket.removeAllListeners();
        socketRef.current = null;
      }
      clearSocketInstance();
    }
  }, [isAuthenticated, authLoading, authUser?._id, currentUserId]);

  useEffect(() => {
    const handleReconnectRequest = () => {
      const sock = socketRef.current;
      if (sock && !sock.connected && !isOffline()) {
        sock.connect();
      }
    };
    window.addEventListener('socket-reconnect-request', handleReconnectRequest);
    return () => window.removeEventListener('socket-reconnect-request', handleReconnectRequest);
  }, []);


  // ── Ghost Mode: block typing/presence emissions ──
  const emitSafe = (event, data) => {
    if (!socketRef.current) return;
    const { ghostMode } = modsRef.current;
    if (ghostMode && (event === 'message:typing' || event === 'user_online')) return;
    socketRef.current.emit(event, data);
  };

  // ── Offline Queue Processor ──
  const isProcessingQueueRef = useRef(false);
  const processOfflineQueue = useCallback(async () => {
    // FIX: on socket connect, this used to be triggered twice almost
    // simultaneously — once directly here because `isSocketConnected` just
    // flipped true, and again via the 'process-offline-queue' event the
    // 'connect' handler dispatches. Both calls read the same pending queue
    // before either had removed an item, so a queued message could be
    // re-emitted a second time. Guard against overlapping runs.
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;
    try {
      const queue = await DB.getOfflineQueue();
      if (!queue || queue.length === 0) return;

      console.log(`[ChatContext] Processing ${queue.length} offline actions...`);
      for (const action of queue) {
        if (action.type === 'sendMessage') {
          if (socketRef.current?.connected) {
            emitSafe('message:send', action.payload);
            await DB.removeFromQueue(action.id);
          } else if (navigator.onLine && isMongoObjectId(action.payload.conversationId)) {
            try {
              const data = await apiService.sendMessage(
                action.payload.conversationId,
                action.payload.content,
                action.payload.messageType,
                { ...action.payload }
              );
              if (data?.success) await DB.removeFromQueue(action.id);
            } catch (e) { console.warn('Offline sync api fail', e); }
          }
        }
      }
    } catch (e) {
      // Ignore errors if the offline_queue store doesn't exist yet (DB upgrade in progress)
      if (e.name === 'NotFoundError' || e.message?.includes('object store')) {
        console.warn('[ChatContext] Offline queue store not ready, skipping queue processing');
      } else {
        console.error('[ChatContext] Queue process error', e);
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, [emitSafe]);

  useEffect(() => {
    const handleOnline = () => processOfflineQueue();
    window.addEventListener('online', handleOnline);
    window.addEventListener('process-offline-queue', handleOnline);

    if (navigator.onLine && isSocketConnected) {
      processOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('process-offline-queue', handleOnline);
    };
  }, [isSocketConnected, processOfflineQueue]);


  // ── Auto-Reply Bot (Item 3) ──
  // ── Auto-Reply removed as requested ──

  useEffect(() => {
    const expiringMessages = (messages || []).filter(m => m.disappearAt);
    if (!expiringMessages.length) return undefined;

    const now = Date.now();
    const expiredIds = expiringMessages
      .filter(m => new Date(m.disappearAt).getTime() <= now)
      .map(m => m._id || m.id)
      .filter(Boolean);

    if (expiredIds.length) {
      const expiredSet = new Set(expiredIds.map(String));
      setMessages(prev => prev.filter(m => !expiredSet.has(String(m._id || m.id))));
      try { DB.deleteMessages(expiredIds); } catch (_) { /* cache cleanup is best-effort */ }
    }

    const timers = expiringMessages
      .map((message) => {
        const messageId = message._id || message.id;
        const delay = new Date(message.disappearAt).getTime() - now;
        if (!messageId || delay <= 0) return null;
        return setTimeout(() => {
          setMessages(prev => prev.filter(m => String(m._id || m.id) !== String(messageId)));
          try { DB.deleteMessages([messageId]); } catch (_) { /* cache cleanup is best-effort */ }
        }, Math.min(delay, 2147483647));
      })
      .filter(Boolean);

    return () => timers.forEach(clearTimeout);
  }, [messages]);

  // ── Core messaging ──
  const sendMessage = async (content, senderName, options = {}) => {
    if (options.isSelfDestruct) {
      options = { ...options, isViewOnce: false };
    }
    const messageType = options.messageType || 'text';
    let outboundContent = content;

    const e2eeEnabled = mods.clientE2EE !== false;
    if (
      e2eeEnabled &&
      messageType === 'text' &&
      typeof content === 'string' &&
      content.length > 0 &&
      selectedConversation &&
      !selectedConversation.isGroup &&
      isAuthenticated &&
      isMongoObjectId(selectedConversation._id)
    ) {
      const parts = selectedConversation.participants || [];
      const other = parts.find((p) => String(p._id || p.id || p) !== String(currentUserId));
      const otherId = other?._id || other?.id || other;
      if (otherId && isMongoObjectId(otherId)) {
        try {
          await encryptionService.initialize();
          const keys = await encryptionService.getUserPublicKeys(String(otherId));
          if (keys?.publicKey) {
            const enc = await encryptionService.encryptMessage(content, keys.publicKey);
            outboundContent = JSON.stringify(enc.encryptedData);
          }
        } catch (e) {
          console.warn('[ChatContext] E2EE encrypt failed, sending plaintext:', e?.message || e);
        }
      }
    }

    // Optimistic update — one client ID for UI, socket, and HTTP
    const clientMessageId = createClientMessageId();
    const optimisticMsg = {
      _id: clientMessageId,
      content: typeof outboundContent === 'string' ? outboundContent : '',
      sender: { _id: currentUserId, username: senderName || authUser?.username },
      messageType: messageType || 'text',
      status: 'sending',
      createdAt: new Date().toISOString(),
      conversationId: selectedConversation?._id,
      clientMessageId,
      ...(options.mediaPreview ? { localPreview: options.mediaPreview } : {}),
      ...options,
      ...(outboundContent !== content ? { isClientE2EE: true } : {}),
    };

    setMessages(prev => [...prev, optimisticMsg]);

    const newMessage = {
      _id: clientMessageId,
      conversationId: selectedConversation?._id || '1',
      sender: { _id: currentUserId, username: senderName || 'Me' },
      createdAt: new Date(),
      status: 'sent',
      clientMessageId,
      ...options,
      messageType,
      content: outboundContent,
      structuredContent: options.structuredContent || [],
      ...(outboundContent !== content ? { isClientE2EE: true } : {}),
    };

    try {
      await DB.saveMessage(newMessage);
      if (selectedConversation) {
        const updatedConv = { ...selectedConversation, lastMessage: newMessage, updatedAt: new Date() };
        setConversations(prev => prev.map(c => c._id === updatedConv._id ? updatedConv : c));
        await DB.saveConversation(updatedConv);
      }
      const payload = {
        conversationId: newMessage.conversationId,
        content: newMessage.content,
        messageType: newMessage.messageType,
        messageId: newMessage._id,
        isClientE2EE: isClientE2EEMessageContent(newMessage.content),
        isViewOnce: Boolean(options.isViewOnce),
        isSelfDestruct: Boolean(options.isSelfDestruct),
        selfDestructTimer: options.selfDestructTimer ?? null,
        mediaUrl: options.mediaUrl || '',
        fileName: options.fileName || '',
        fileSize: options.fileSize || 0,
        duration: options.duration || 0,
        replyTo: options.replyTo?._id || options.replyTo?.id || options.replyTo || null,
        mentions: options.mentions || [],
        isForwarded: Boolean(options.isForwarded),
        caption: typeof options.caption === 'string' ? options.caption : '',
        structuredContent: options.structuredContent || []
      };

      console.log("Inatuma ujumbe kwenda DB kwa chumba cha:", newMessage.conversationId);

      let messageSent = false;
      let savedMessage = newMessage;

      // 1. Kipaumbele: Tumia Socket kwanza (real-time) — wait for delivery ack
      if (socketRef.current?.connected) {
        console.log("Natumia Socket kutuma ujumbe...");
        try {
          emitSafe('message:send', payload);
          messageSent = await new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              cleanup();
              resolve(false);
            }, 15000);
            const onDelivered = ({ messageId, serverMessageId }) => {
              if (String(messageId) !== String(clientMessageId)) return;
              cleanup();
              const serverId = serverMessageId || messageId;
              setMessages((prev) => prev.map((m) =>
                m._id === clientMessageId ? { ...m, _id: serverId, status: 'delivered' } : m
              ));
              resolve(true);
            };
            const onError = ({ messageId, error }) => {
              if (messageId && String(messageId) !== String(clientMessageId)) return;
              cleanup();
              setMessages((prev) => prev.map((m) =>
                m._id === clientMessageId ? { ...m, status: 'failed', errorMessage: error } : m
              ));
              resolve(false);
            };
            const cleanup = () => {
              clearTimeout(timeoutId);
              socketRef.current?.off('message:delivered', onDelivered);
              socketRef.current?.off('message:error', onError);
            };
            socketRef.current.on('message:delivered', onDelivered);
            socketRef.current.on('message:error', onError);
          });
          if (messageSent) console.log("Ujumbe umetumwa kupitia Socket");
        } catch (e) {
          console.error("Socket emit imefeli:", e);
        }
      }

      // 2. Njia mbadala: Kama Socket haifanyi kazi, tumia HTTP API
      if (!messageSent && navigator.onLine && isMongoObjectId(newMessage.conversationId)) {
        console.log("Socket haifanyi kazi, natumia HTTP API...");
        try {
          const data = await apiService.sendMessage(
            newMessage.conversationId,
            newMessage.content,
            newMessage.messageType,
            { ...options, messageId: newMessage._id }
          );

          if (data?.success && data.message) {
            savedMessage = data.message;
            messageSent = true;
            try { await DB.deleteMessages([newMessage._id]); } catch (e) { }

            // Iweke kwenye skrini (User A ataona)
            setMessages(prev => prev.map(m => m._id === clientMessageId ? savedMessage : m));
            await DB.saveMessage(savedMessage);
            console.log("Meseji imehifadhiwa kikamilifu kwenye Database:", savedMessage._id);
          } else {
            console.error("API response success false:", data);
          }
        } catch (e) {
          console.error("API error wakati wa kutuma:", e);
        }
      }

      // 4. Kama imefail, onyesha error kwenye message
      if (!messageSent) {
        setMessages(prev => prev.map(m =>
          m._id === clientMessageId ? { ...m, status: 'failed' } : m
        ));
      }

      // 3. Kama zote zimefeli, weka foleni
      if (!messageSent) {
        console.error("Meseji imegoma kwenda, hakuna mtandao au server iko chini!");
        await DB.enqueueAction({ type: 'sendMessage', payload });
      }
    } catch (err) {
      console.error('Send message error:', err);
      setMessages(prev => prev.map(m =>
        m._id === clientMessageId ? { ...m, status: 'failed' } : m
      ));
    }
  };

  // Listen for SW notification clicks to open a conversation
  useEffect(() => {
    const handler = (e) => {
      const { conversationId } = e.detail || {};
      if (!conversationId) return;
      const conv = conversationsRef.current?.find(c => String(c._id) === String(conversationId));
      if (conv) selectConversation(conv);
    };
    window.addEventListener('open-chat', handler);
    return () => window.removeEventListener('open-chat', handler);
  }, []);

  const selectConversation = async (conv) => {
    setSelectedConversation(conv);
    if (!conv) {
      clearStoredSelectedConversationId();
      setMessages([]);
      return;
    }
    if (conv._id) {
      setStoredSelectedConversationId(conv._id);
    }
    try {
      // Check for demo messages first
      if (ENABLE_DEMO_DATA && DEMO_MESSAGES[conv._id]) {
        setMessages(DEMO_MESSAGES[conv._id]);
        return;
      }

      const convId = conv._id;
      let showedCache = false;

      if (isMongoObjectId(convId)) {
        const offlineMsgs = await DB.getMessages(convId);
        if (offlineMsgs?.length) {
          setMessages(await decryptMessagesList(offlineMsgs));
          showedCache = true;
        } else if (!showedCache) {
          setMessages([]);
        }

        if (socketRef.current) socketRef.current.emit('join:conversation', convId);

        // Background sync — keeps chat active without clearing the UI
        apiService.getMessages(convId).then(async (remoteData) => {
          if (String(selectedConversationIdRef.current) !== String(convId)) return;
          if (!remoteData?.success) return;
          const decrypted = await decryptMessagesList(remoteData.messages || []);
          setMessages(decrypted);
          try {
            await Promise.all(decrypted.map((message) => DB.saveMessage(message)));
          } catch (_) { /* IndexedDB cache is best-effort */ }
        }).catch((apiError) => {
          console.warn('[ChatContext] Background message sync failed:', apiError?.message || apiError);
        });
        return;
      }

      const offlineMsgs = await DB.getMessages(conv._id);
      if (offlineMsgs?.length) {
        setMessages(await decryptMessagesList(offlineMsgs));
      } else {
        setMessages([]);
      }
      if (socketRef.current) socketRef.current.emit('join:conversation', conv._id);
    } catch (err) {
      console.error('Error loading messages:', err);
      setMessages([]);
    }
  };

  useEffect(() => {
    if (!conversations.length) return;
    const params = new URLSearchParams(window.location.search);
    const targetConversationId = params.get('conversationId') || params.get('chatId');
    if (!targetConversationId) return;
    if (String(selectedConversation?._id) === String(targetConversationId)) return;

    const targetConversation = conversations.find(
      (conversation) => String(conversation._id) === String(targetConversationId)
    );
    if (!targetConversation) return;

    selectConversation(targetConversation);
    window.history.replaceState({}, '', window.location.pathname);
  }, [conversations, selectedConversation?._id]);

  const editMessage = async (id, newContent) => {
    setMessages(prev => prev.map(m => m._id === id ? { ...m, content: newContent, editedAt: new Date(), isEdited: true } : m));
    emitSafe('message:edit', { messageId: id, content: newContent });
  };

  const deleteMessage = async (id) => {
    setMessages(prev => prev.filter(m => m._id !== id));
    emitSafe('message:delete', { messageId: id, forEveryone: true });
  };

  const clearChat = async (chatId = selectedConversation?._id) => {
    if (!chatId) return { success: false, message: 'No chat selected' };

    try {
      const data = await apiService.clearChat(chatId);
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to clear chat');
      }

      if (selectedConversation?._id === chatId) {
        setMessages([]);
      }
      setConversations(prev => prev.map(c =>
        c._id === chatId ? { ...c, lastMessage: null, unreadCount: 0 } : c
      ));
      setSelectedConversation(prev =>
        prev?._id === chatId ? { ...prev, lastMessage: null, unreadCount: 0 } : prev
      );
      try { await DB.deleteMessagesForConversation(chatId); } catch (e) { }
      apiService.clearCache();
      return data;
    } catch (err) {
      console.error('Clear chat error:', err);
      return { success: false, message: err.message || 'Failed to clear chat' };
    }
  };

  const deleteChat = async (chatId = selectedConversation?._id) => {
    if (!chatId) return { success: false, message: 'No chat selected' };

    try {
      const data = await apiService.deleteChat(chatId);
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to delete chat');
      }

      setConversations(prev => prev.filter(c => c._id !== chatId));
      if (selectedConversation?._id === chatId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      try {
        await DB.deleteMessagesForConversation(chatId);
        await DB.deleteConversation(chatId);
      } catch (e) { }
      apiService.clearCache();
      return data;
    } catch (err) {
      console.error('Delete chat error:', err);
      return { success: false, message: err.message || 'Failed to delete chat' };
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emoji })
      });
      const data = await response.json();
      if (data.success) {
        setMessages(prev => prev.map(m => {
          if (m._id === messageId) {
            return { ...m, reactions: data.reactions };
          }
          return m;
        }));
      }
      return data;
    } catch (err) {
      console.error('Add reaction error:', err);
      return { success: false, message: 'Failed to add reaction' };
    }
  };

  const markAsRead = (chatId) => {
    setConversations(prev => prev.map(c =>
      c._id === chatId ? { ...c, unreadCount: 0 } : c
    ));
    setSelectedConversation(prev =>
      prev && String(prev._id) === String(chatId) ? { ...prev, unreadCount: 0 } : prev
    );

    const skipReadReceipts = Boolean(
      modsRef.current.hideReadReceipts || modsRef.current.ghostMode
    );
    emitSafe('mark_as_read', { chatId, userId: currentUserId, skipReadReceipts });
  };

  // ── Typing (Ghost Mode aware) ──
  const sendTypingStatus = (isTyping) => {
    if (!modsRef.current.ghostMode) {
      emitSafe('message:typing', { conversationId: selectedConversation?._id, isTyping });
    }
  };
  const sendRecordingStatus = (isRecording) => {
    if (!modsRef.current.ghostMode) {
      emitSafe('recording', { conversationId: selectedConversation?._id });
    }
    setIsOtherUserRecording(isRecording);
  };

  // ── Calls (Phase 8) ──
  const getOtherParticipant = useCallback((conversation) => {
    if (!conversation?.participants?.length) return null;
    const me = currentUserId;
    return conversation.participants.find((p) => {
      const id = p?._id || p;
      return id?.toString() !== me?.toString();
    }) || null;
  }, [currentUserId]);

  const getOtherParticipantId = useCallback((conversation) => {
    const other = getOtherParticipant(conversation);
    return other?._id || other || null;
  }, [getOtherParticipant]);

  const initiateCall = (type, conversationOrUser) => {
    const conversation = conversationOrUser?.participants
      ? conversationOrUser
      : selectedConversation;
    const callee = getOtherParticipant(conversation) || conversationOrUser;
    const calleeId = getOtherParticipantId(conversation);
    if (!conversation?._id || !calleeId) {
      console.warn('[ChatContext] Cannot start call without conversation and callee');
      return;
    }
    const callData = {
      type,
      user: callee,
      status: 'calling',
      conversationId: conversation?._id,
      calleeId
    };
    setActiveCall(callData);
    emitSafe('call:start', {
      conversationId: conversation?._id,
      callType: type,
      calleeId,
      targetUserId: calleeId
    });
  };

  const endCall = () => {
    if (activeCall) {
      const targetUserId = activeCall.calleeId || activeCall.callerId;
      emitSafe('call:end', {
        conversationId: activeCall.conversationId,
        targetUserId,
        callType: activeCall.type
      });
    }
    webRTCService.endCall();
    setActiveCall(null);
  };

  const fetchCallLogs = useCallback(async () => {
    try {
      const data = await apiService.getCallLogs();
      if (data?.success) setCallLogs(data.callLogs || []);
    } catch (err) {
      console.warn('[ChatContext] Failed to load call logs:', err?.message);
    }
  }, []);
  // NOTE: the actual WebRTC answer (real SDP negotiation) happens inside
  // CallScreen's own handleAccept, which calls this afterwards purely to let
  // the caller-side "call:accepted" notice go out and to mark the call no
  // longer 'incoming'. It's guarded to run only once (status must still be
  // 'incoming') so a second call — e.g. from CallScreen re-notifying — can't
  // clobber the status and doesn't re-emit 'call:accept' twice.
  const acceptCall = () => {
    if (activeCall && activeCall.status === 'incoming') {
      emitSafe('call:accept', { conversationId: activeCall.conversationId, callerId: activeCall.callerId });
      setActiveCall(prev => (prev && prev.status === 'incoming') ? { ...prev, status: 'connecting' } : prev);
    }
  };
  const rejectCall = () => {
    if (activeCall) {
      emitSafe('call:reject', {
        conversationId: activeCall.conversationId,
        callerId: activeCall.callerId,
        callerSocketId: activeCall.callerSocketId,
        callType: activeCall.type || 'audio'
      });
    }
    webRTCService.endCall();
    setActiveCall(null);
  };

  // ── DND Mode: Real socket disconnect/reconnect (Item 16) ──
  const toggleDNDMode = () => {
    setIsDNDMode(prev => {
      const next = !prev;
      if (next) {
        // Disconnect socket — no messages or calls received
        if (socketRef.current?.connected) {
          socketRef.current.disconnect();
          setIsSocketConnected(false);
        }
      } else {
        // Reconnect socket
        if (socketRef.current && !socketRef.current.connected) {
          socketRef.current.connect();
        }
      }
      return next;
    });
  };

  // ── Message Statistics (Item 15) ──
  const getMessageStats = useCallback(() => {
    const statsMessages = allMessagesForStats.length ? allMessagesForStats : messages;
    const total = statsMessages.length;
    const statsUserId = String(currentUserId || '');
    const statsUsername = authUser?.username || localStorage.getItem('username') || 'GENZ User';
    
    const byType = statsMessages.reduce((acc, m) => {
      const type = m.messageType || 'text';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    const sentByMe = statsMessages.filter(m =>
      String(m.sender?._id || m.sender || '') === statsUserId ||
      String(m.sender?.username || '') === String(statsUsername) ||
      String(m.senderId || '') === statsUserId
    ).length;
    
    const received = total - sentByMe;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = statsMessages.filter(m => {
      const msgDate = new Date(m.createdAt || m.timestamp);
      return msgDate >= today;
    }).length;
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekCount = statsMessages.filter(m => {
      const msgDate = new Date(m.createdAt || m.timestamp);
      return msgDate >= thisWeek;
    }).length;
    
    const thisMonth = new Date();
    thisMonth.setDate(thisMonth.getDate() - 30);
    const monthCount = statsMessages.filter(m => {
      const msgDate = new Date(m.createdAt || m.timestamp);
      return msgDate >= thisMonth;
    }).length;
    
    const activeStatuses = (statuses || []).filter(s => {
      const statusDate = new Date(s.createdAt || s.timestamp);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return statusDate >= oneDayAgo;
    }).length;
    
    return { 
      total, 
      byType, 
      sentByMe, 
      received, 
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      activeStatuses,
      images: byType.image || 0,
      videos: byType.video || 0,
      audio: byType.audio || 0,
      documents: byType.file || 0,
      stickers: byType.sticker || 0,
      gifs: byType.gif || 0
    };
  }, [allMessagesForStats, messages, currentUserId, authUser?.username, statuses]);

  // ── Dark/Light Theme Toggle (Item 26) ──
  const toggleAppTheme = () => {
    const next = appTheme === 'dark' ? 'light' : 'dark';
    setAppTheme(next);
    localStorage.setItem('genz_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.classList.toggle('light-mode', next === 'light');
  };
  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appTheme);
    document.documentElement.classList.toggle('light-mode', appTheme === 'light');
  }, []);

  // ── Disappearing Messages Real Timer (Item 29) ──
  const disappearingTimersRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(disappearingTimersRef.current).forEach((timerId) => {
        if (timerId) clearInterval(timerId);
      });
      disappearingTimersRef.current = {};
    };
  }, []);

  const setDisappearingTimer = (conversationId, durationMs) => {
    // Clear old timer for this conversation
    if (disappearingTimersRef.current[conversationId]) {
      clearInterval(disappearingTimersRef.current[conversationId]);
    }
    if (!durationMs) return;
    // Every 30s: check all messages older than durationMs and delete them
    disappearingTimersRef.current[conversationId] = setInterval(() => {
      const cutoff = Date.now() - durationMs;
      setMessages(prev => prev.filter(m => {
        const age = new Date(m.createdAt).getTime();
        return age > cutoff;
      }));
    }, 30000);
  };

  // ── Cloud Backup (Phase 5 — real IndexedDB export) ──

  const startCloudBackup = async () => {
    if (backupService.isBackingUp()) {
      return { success: false, message: 'Backup already in progress' };
    }

    setBackupProgress(5);
    try {
      setBackupProgress(35);
      const result = await backupService.backupChat({
        source: 'web-client',
        includeLocalExport: false
      });
      setBackupProgress(100);
      setTimeout(() => setBackupProgress(null), 2000);
      return result;
    } catch (error) {
      console.error('Cloud backup failed:', error);
      setBackupProgress(null);
      return { success: false, message: error.message || 'Cloud backup failed' };
    }
  };

  const listCloudBackups = async () => {
    try {
      return await backupService.listBackups();
    } catch (error) {
      console.error('Failed to list cloud backups:', error);
      throw error;
    }
  };

  const restoreCloudBackup = async (backupId) => {
    if (backupService.isRestoring()) {
      return { success: false, message: 'Kurejesha tayari kunaendelea' };
    }
    try {
      const result = await backupService.restoreChat(backupId);
      // Reload page to reflect restored state immediately
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      return result;
    } catch (error) {
      console.error('Cloud restore failed:', error);
      return { success: false, message: error.message || 'Kurejesha kumeshindwa' };
    }
  };

  const deleteCloudBackup = async (backupId) => {
    try {
      await backupService.deleteBackup(backupId);
      return { success: true };
    } catch (error) {
      console.error('Cloud delete failed:', error);
      return { success: false, message: error.message || 'Kufuta kumeshindwa' };
    }
  };

  // ── Mods persist on change ──
  const updateMods = async (newMods) => {
    setMods(newMods);
    try { await DB.saveSetting('mods', newMods); } catch (e) { }
    try { await saveGENZModsSettings(newMods); } catch (e) { }
  };

  // ── Scheduled messages ──
  const scheduleMessage = async (content, conversationId, sendAt, options = {}) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/scheduled-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content,
          sendAt,
          messageType: options.messageType || 'text',
          mediaUrl: options.mediaUrl || '',
          fileName: options.fileName || '',
          fileSize: options.fileSize || 0
        })
      });
      const data = await response.json();
      if (data.success) {
        // Add to local state for immediate UI update
        setScheduledMessages(prev => [...prev, data.scheduledMessage]);
        return data;
      } else {
        throw new Error(data.message || 'Failed to schedule message');
      }
    } catch (error) {
      console.error('[ChatContext] Schedule message error:', error);
      throw error;
    }
  };

  const cancelScheduledMessage = async (scheduledMessageId) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/scheduled-messages/${scheduledMessageId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        // Remove from local state
        setScheduledMessages(prev => prev.filter(msg => msg._id !== scheduledMessageId));
        return data;
      } else {
        throw new Error(data.message || 'Failed to cancel scheduled message');
      }
    } catch (error) {
      console.error('[ChatContext] Cancel scheduled message error:', error);
      throw error;
    }
  };

  const getScheduledMessages = async (conversationId = null) => {
    try {
      const url = conversationId
        ? `${BACKEND_URL}/scheduled-messages?conversationId=${conversationId}`
        : `${BACKEND_URL}/scheduled-messages`;
      const response = await authFetch(url);
      const data = await response.json();
      if (data.success) {
        setScheduledMessages(data.scheduledMessages || []);
        return data.scheduledMessages;
      } else {
        throw new Error(data.message || 'Failed to fetch scheduled messages');
      }
    } catch (error) {
      console.error('[ChatContext] Get scheduled messages error:', error);
      throw error;
    }
  };

  // ── Status ──
  const uploadStatusMedia = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await authFetch(`${BACKEND_URL}/advanced/status/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        return data;
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading status media:', error);
      throw error;
    }
  };

  const addStatus = (statusDataOrType, contentArg) => {
    // Support both addStatus(obj) and addStatus('text', 'content') call styles
    let statusData;
    if (typeof statusDataOrType === 'string') {
      statusData = { type: statusDataOrType, content: contentArg };
    } else {
      statusData = statusDataOrType || {};
    }
    if (!statusData.content && !statusData.mediaUrl) return; // Don't create empty status
    const clientStatusId = createClientMessageId('status');
    const newStatus = { _id: clientStatusId, userId: currentUserId, ...statusData, createdAt: new Date() };
    setStatuses(prev => [newStatus, ...prev]);
    emitSafe('status:create', { ...statusData, clientStatusId });
  };
  const viewStatus = (statusId) => {
    setStatuses(prev => prev.map(s => s._id === statusId ? { ...s, views: (s.views || 0) + 1 } : s));
    emitSafe('status:view', { statusId });
  };

  const hasLoadedInitialData = useRef(false);
  const lastBootstrapUserId = useRef(null);

  // ── Re-fetch server state when a different account logs in (same tab) ──
  useEffect(() => {
    if (!isAuthReady || !authUser?._id) return;
    const id = String(authUser._id);
    if (lastBootstrapUserId.current && lastBootstrapUserId.current !== id) {
      hasLoadedInitialData.current = false;
      try {
        apiService.clearCache();
      } catch (_) { /* noop */ }
    }
    lastBootstrapUserId.current = id;
  }, [isAuthReady, authUser?._id]);

  // ── Reset API bootstrap when session ends (JWT mode) ──
  useEffect(() => {
    if (REQUIRE_AUTH && !isAuthenticated && !authLoading) {
      hasLoadedInitialData.current = false;
      lastBootstrapUserId.current = null;
      try {
        apiService.clearCache();
      } catch (_) { /* noop */ }
      try {
        encryptionService.cleanup();
      } catch (_) { /* noop */ }
    }
  }, [isAuthenticated, authLoading]);

  // ── Per-device E2EE: create/sync key pair and register public key on server ──
  useEffect(() => {
    if (!isAuthReady) return;
    if (REQUIRE_AUTH && (!isAuthenticated || authLoading)) return;

    let cancelled = false;
    (async () => {
      try {
        const ok = await encryptionService.initialize();
        if (!cancelled && ok) {
          console.log('[ChatContext] Client E2EE key material ready');
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('[ChatContext] E2EE initialization skipped:', e?.message || e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, isAuthenticated, authLoading, authUser?._id]);

  // ── Load initial data with optimized API service ──
  useEffect(() => {
    // Wait for auth restoration to complete before making API calls
    if (!isAuthReady) {
      console.log('[ChatContext] Waiting for auth restoration to complete...');
      return;
    }

    if (REQUIRE_AUTH && (authLoading || !isAuthenticated)) {
      return;
    }
    if (hasLoadedInitialData.current) {
      console.log('[ChatContext] Initial data already loaded, skipping...');
      return;
    }

    hasLoadedInitialData.current = true;

    const loadInitialData = async () => {
      try {
        console.log('[ChatContext] Loading initial data with optimized API service...');

        // Use Promise.all for parallel loading instead of sequential
        const [devicesData, modsData, broadcastsData, statusesData, conversationsData, callsData] = await Promise.allSettled([
          apiService.getDevices(),
          apiService.getGENZSettings(),
          apiService.getBroadcasts(),
          apiService.getStatuses(),
          apiService.getConversations(),
          apiService.getCallLogs()
        ]);

        // Process results
        if (devicesData.status === 'fulfilled' && devicesData.value) {
          setConnectedDevices(devicesData.value.devices || []);
          console.log('[ChatContext] Devices loaded successfully');
        }

        if (modsData.status === 'fulfilled' && modsData.value?.success) {
          // MERGE backend settings with local state — never replace, to preserve local-only data
          setModsState(prev => ({ ...prev, ...(modsData.value.settings || {}) }));
          console.log('[ChatContext] GENZ settings loaded successfully');
        }

        if (broadcastsData.status === 'fulfilled' && broadcastsData.value?.success) {
          setBroadcasts(broadcastsData.value.broadcasts || []);
          console.log('[ChatContext] Broadcasts loaded successfully');
        }

        if (statusesData.status === 'fulfilled' && statusesData.value?.success) {
          setStatuses(statusesData.value.statuses || []);
          console.log('[ChatContext] Statuses loaded successfully');
        }

        if (conversationsData.status === 'fulfilled' && conversationsData.value?.success) {
          const remoteConversations = conversationsData.value.conversations || [];
          if (remoteConversations.length > 0 || !ENABLE_DEMO_DATA) {
            setConversations(prev => {
              const localOnlyConvs = prev.filter(c => c._id && (c._id.startsWith('conv-') || c._id.startsWith('temp-')));
              const mergedMap = new Map();
              localOnlyConvs.forEach(c => mergedMap.set(c._id, c));
              remoteConversations.forEach(c => mergedMap.set(c._id, c));
              return Array.from(mergedMap.values()).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
            });
            try {
              await Promise.all(remoteConversations.map((conversation) => DB.saveConversation(conversation)));
              // FIX: Prune any locally-cached conversation the server no longer returns
              // (deleted, left, or removed on another device) so it doesn't reappear
              // on next app open/refresh, matching WhatsApp behavior.
              const remoteIds = new Set(remoteConversations.map((c) => String(c._id)));
              const cachedConvs = await DB.getConversations();
              const staleConvs = (cachedConvs || []).filter((c) => {
                const id = String(c._id || '');
                const isLocalOnly = id.startsWith('conv-') || id.startsWith('temp-');
                return !isLocalOnly && !remoteIds.has(id);
              });
              if (staleConvs.length > 0) {
                await Promise.all(staleConvs.map(async (c) => {
                  try {
                    await DB.deleteConversation(c._id);
                    await DB.deleteMessagesForConversation(c._id);
                  } catch (_) { /* best-effort cleanup */ }
                }));
              }
            } catch (_) { /* IndexedDB cache is best-effort */ }
            const storedId = getStoredSelectedConversationId();
            if (storedId) {
              const matched = remoteConversations.find(c => String(c._id) === String(storedId));
              if (matched) {
                setTimeout(() => {
                  if (socketRef.current?.connected) {
                    socketRef.current.emit('join:conversation', matched._id);
                  }
                }, 300);
              }
            }
          }
          console.log('[ChatContext] Conversations loaded successfully');
        }

        if (callsData.status === 'fulfilled' && callsData.value?.success) {
          setCallLogs(callsData.value.callLogs || []);
          console.log('[ChatContext] Call logs loaded successfully');
        }

        // Fetch scheduled messages
        try {
          const scheduledData = await apiService.getScheduledMessages();
          if (scheduledData?.success) {
            setScheduledMessages(scheduledData.scheduledMessages || []);
            console.log('[ChatContext] Scheduled messages loaded successfully');
          }
        } catch (err) {
          console.error('[ChatContext] Failed to load scheduled messages:', err);
        }

        // Fetch contacts from backend
        try {
          const contactsResponse = await authFetch(`${BACKEND_URL}/chat/contacts`);
          const contactsData = await contactsResponse.json();
          if (contactsData?.success) {
            setContacts(contactsData.contacts || []);
            console.log('[ChatContext] Contacts loaded successfully:', (contactsData.contacts || []).length);
          }
        } catch (err) {
          console.error('[ChatContext] Failed to load contacts:', err);
        }

        // Log any errors
        const errors = [devicesData, modsData, broadcastsData, statusesData, conversationsData, callsData]
          .filter(result => result.status === 'rejected')
          .map(result => result.reason);

        if (errors.length > 0) {
          console.error('[ChatContext] Some initial data failed to load:', errors);
        }

      } catch (err) {
        console.error('[ChatContext] Critical error loading initial data:', err);
      }
    };

    loadInitialData();
  }, [isAuthReady, isAuthenticated, authLoading, authUser?._id]);

  // ── Device Management Functions ──
  const isLoadingDevices = useRef(false);
  const isLoadingSettings = useRef(false);
  const isLoadingBroadcasts = useRef(false);
  const isLoadingStatuses = useRef(false);

  const generateQRCode = useCallback(async (deviceInfo = {}) => {
    if (isLoadingDevices.current) {
      console.log('[ChatContext] QR generation already in progress');
      return { success: false, message: 'Request already in progress' };
    }

    isLoadingDevices.current = true;
    try {
      const data = await apiService.generateQR(deviceInfo);
      console.log('[ChatContext] QR code generated successfully');
      return data;
    } catch (err) {
      console.error('[ChatContext] Generate QR error:', err);
      return { success: false, message: 'Failed to generate QR code' };
    } finally {
      isLoadingDevices.current = false;
    }
  }, []);

  const pairDevice = useCallback(async (pairingToken) => {
    if (isLoadingDevices.current) {
      console.log('[ChatContext] Device pairing already in progress');
      return { success: false, message: 'Request already in progress' };
    }

    isLoadingDevices.current = true;
    try {
      const data = await apiService.pairDevice(pairingToken);
      if (data?.success) {
        // The device that scanned the QR had no session at all — the pairing
        // response carries real login tokens for the account, so log this
        // device in now, before calling any endpoint that requires auth.
        if (data.token && data.user && completeSession) {
          await completeSession(data);
        }
        const devices = await apiService.getDevices();
        setConnectedDevices(devices?.devices || []);
      }
      console.log('[ChatContext] Device paired successfully');
      return data;
    } catch (err) {
      console.error('[ChatContext] Pair device error:', err);
      return { success: false, message: 'Failed to pair device' };
    } finally {
      isLoadingDevices.current = false;
    }
  }, []);

  const getDevices = useCallback(async () => {
    if (isLoadingDevices.current) {
      console.log('[ChatContext] Get devices already in progress');
      return [];
    }

    isLoadingDevices.current = true;
    try {
      const data = await apiService.getDevices();
      setConnectedDevices(data?.devices || []);
      console.log('[ChatContext] Devices retrieved successfully');
      return data?.devices || [];
    } catch (err) {
      console.error('[ChatContext] Get devices error:', err);
      return [];
    } finally {
      isLoadingDevices.current = false;
    }
  }, []);

  const logoutDevice = useCallback(async (deviceId) => {
    if (isLoadingDevices.current) {
      console.log('[ChatContext] Device logout already in progress');
      return { success: false, message: 'Request already in progress' };
    }

    isLoadingDevices.current = true;
    try {
      const data = await apiService.logoutDevice(deviceId);
      const devices = await apiService.getDevices();
      setConnectedDevices(devices?.devices || []);
      console.log('[ChatContext] Device logged out successfully');
      return data;
    } catch (err) {
      console.error('[ChatContext] Logout device error:', err);
      return { success: false, message: 'Failed to logout device' };
    } finally {
      isLoadingDevices.current = false;
    }
  }, []);

  const logoutAllDevices = async () => {
    try {
      const data = await apiService.logoutAllDevices(localStorage.getItem('genz_device_id'));
      const devices = await apiService.getDevices();
      setConnectedDevices(devices?.devices || []);
      return data;
    } catch (err) {
      console.error('Logout all devices error:', err);
      return { success: false };
    }
  };

  const updateDeviceCapabilities = async (deviceId, capabilities) => {
    try {
      const data = await apiService.updateDeviceCapabilities(deviceId, capabilities);
      const devicesData = await apiService.getDevices();
      setConnectedDevices(devicesData.devices || []);
      return Boolean(data?.success);
    } catch (err) {
      console.error('Update device capabilities error:', err);
      return false;
    }
  };

  // ── Security Functions ──
  const generate2FASecret = async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/security/2fa/generate`, {
        method: 'POST'
      });
      const data = await response.json();
      return { ...data, data: data.data || data.messages || [] };
    } catch (err) {
      console.error('Generate 2FA error:', err);
      return { success: false, message: 'Failed to generate 2FA secret' };
    }
  };

  const verify2FASetup = async (secret, token) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/security/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, token })
      });
      const data = await response.json();
      return { ...data, data: data.data || data.messages || [] };
    } catch (err) {
      console.error('Verify 2FA setup error:', err);
      return { success: false, message: 'Failed to verify 2FA' };
    }
  };

  const disable2FA = async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/security/2fa/disable`, {
        method: 'POST'
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Disable 2FA error:', err);
      return { success: false, message: 'Failed to disable 2FA' };
    }
  };


  // ── GENZ Mods Functions ──
  const fetchGENZModsSettings = async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/genz-mods/settings`);
      const data = await response.json();
      if (data.success) {
        const flat = flattenModsFromServer(data.settings || {});
        setModsState(prev => ({ ...prev, ...flat }));
      }
      return data;
    } catch (err) {
      console.error('Fetch GENZ mods settings error:', err);
      return { success: false };
    }
  };

  const saveGENZModsSettings = async (settings) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/genz-mods/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizeModsForServer(stripLocalOnlyData(settings)))
      });
      const data = await response.json();
      if (data.success) {
        const flat = flattenModsFromServer(data.settings || {});
        setModsState(prev => ({ ...prev, ...flat }));
      }
      return data;
    } catch (err) {
      console.error('Save GENZ mods settings error:', err);
      return { success: false };
    }
  };

  const fetchDeletedMessages = async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/genz-mods/deleted-messages`);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Fetch deleted messages error:', err);
      return { success: false, messages: [] };
    }
  };

  const restoreDeletedMessage = async (messageId) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/genz-mods/restore-message/${messageId}`, {
        method: 'POST'
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Restore deleted message error:', err);
      return { success: false };
    }
  };

  const processAutoReply = async (userId, message) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/genz-mods/auto-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Process auto-reply error:', err);
      return { success: false };
    }
  };

  const getUserStatusWithGhostMode = useCallback(async (userId) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/genz-mods/user-status/${userId}`);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Get user status error:', err);
      return { success: false };
    }
  }, [BACKEND_URL]);

  // ── Broadcast Functions ──
  const fetchBroadcasts = async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/advanced/broadcast`);
      const data = await response.json();
      if (data.success) {
        setBroadcasts(data.broadcasts || []);
      }
      return data;
    } catch (err) {
      console.error('Fetch broadcasts error:', err);
      return { success: false, broadcasts: [] };
    }
  };

  const createBroadcast = async (broadcastData) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/advanced/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastData)
      });
      const data = await response.json();
      if (data.success) {
        setBroadcasts(prev => [...prev, data.broadcast]);
      }
      return data;
    } catch (err) {
      console.error('Create broadcast error:', err);
      return { success: false };
    }
  };

  const updateBroadcast = async (broadcastId, updateData) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/advanced/broadcast/${broadcastId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const data = await response.json();
      if (data.success) {
        setBroadcasts(prev => prev.map(b => b._id === broadcastId ? data.broadcast : b));
      }
      return data;
    } catch (err) {
      console.error('Update broadcast error:', err);
      return { success: false };
    }
  };

  const deleteBroadcast = async (broadcastId) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/advanced/broadcast/${broadcastId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setBroadcasts(prev => prev.filter(b => b._id !== broadcastId));
      }
      return data;
    } catch (err) {
      console.error('Delete broadcast error:', err);
      return { success: false };
    }
  };

  const sendBroadcastMessage = async (broadcastId, message) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/advanced/broadcast/${broadcastId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Send broadcast message error:', err);
      return { success: false };
    }
  };

  // ── Status Functions ──
  const fetchStatuses = useCallback(async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/advanced/status`);
      const data = await response.json();
      if (data.success) {
        setStatuses(data.statuses || []);
      }
      return data;
    } catch (err) {
      console.error('Fetch statuses error:', err);
      return { success: false, statuses: [] };
    }
  }, []);

  const createStatus = useCallback(async (statusData) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/advanced/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusData)
      });
      const data = await response.json();
      if (data.success) {
        setStatuses(prev => [...prev, data.status]);
      }
      return data;
    } catch (err) {
      console.error('Create status error:', err);
      return { success: false };
    }
  }, []);

  const deleteStatus = useCallback(async (statusId) => {
    try {
      const sid = encodeURIComponent(statusId);
      emitSafe('status:delete', { statusId });
      const response = await authFetch(`${BACKEND_URL}/advanced/status/${sid}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setStatuses(prev => prev.filter(s => String(s._id) !== String(statusId) && String(s.id) !== String(statusId)));
      }
      return data;
    } catch (err) {
      console.error('Delete status error:', err);
      return { success: false };
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady || (REQUIRE_AUTH && (authLoading || !isAuthenticated))) return;
    fetchGENZModsSettings();
    fetchBroadcasts();
    fetchCallLogs();
    fetchStatuses();
  }, [isAuthReady, authLoading, isAuthenticated, fetchCallLogs, fetchStatuses]);

  // ── Auto-refresh system like WhatsApp ─────────────────────────────────────
  useEffect(() => {
    if (!isAuthReady || (REQUIRE_AUTH && (authLoading || !isAuthenticated)) || isOffline()) return;

    const refreshData = async () => {
      setIsAutoRefreshing(true);
      try {
        const [conversationsData, statusesData] = await Promise.allSettled([
          apiService.getConversations(),
          apiService.getStatuses()
        ]);

        if (conversationsData.status === 'fulfilled' && conversationsData.value?.success) {
          const remoteConversations = conversationsData.value.conversations || [];
          const openChatId = getStoredSelectedConversationId();
          setConversations(prev => {
            const localOnlyConvs = prev.filter(c => c._id && (c._id.startsWith('conv-') || c._id.startsWith('temp-')));
            const mergedMap = new Map();
            localOnlyConvs.forEach(c => mergedMap.set(c._id, c));
            remoteConversations.forEach(c => {
              const isOpen = openChatId && String(c._id) === String(openChatId);
              mergedMap.set(c._id, isOpen ? { ...c, unreadCount: 0 } : c);
            });
            return Array.from(mergedMap.values()).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
          });
        }

        if (statusesData.status === 'fulfilled' && statusesData.value?.success) {
          setStatuses(statusesData.value.statuses || []);
        }
      } catch (err) {
        console.warn('[ChatContext] Auto-refresh error:', err);
      } finally {
        setIsAutoRefreshing(false);
      }
    };

    // Refresh every 5 minutes like WhatsApp
    const refreshInterval = setInterval(refreshData, 5 * 60 * 1000);

    // Refresh when app becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isOffline()) {
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthReady, authLoading, isAuthenticated]);

  const replyToStatus = useCallback(async (statusId, replyData, statusOwner = null) => {
    try {
      const body = typeof replyData === 'string' ? { content: replyData } : (replyData || {});
      const replyContent = body.content || '';

      // ── Route reply into chat area (WhatsApp behavior) ──────────────────
      // Find or create conversation with status owner
      const ownerId = statusOwner?._id || statusOwner?.userId || statusId;
      const ownerName = statusOwner?.username || statusOwner?.name || 'User';

      let targetConv = conversations.find(c =>
        !c.isGroup &&
        c.participants?.some(p => String(p._id) === String(ownerId))
      );

      if (!targetConv) {
        // Create a local conversation for the reply
        targetConv = {
          _id: `conv-status-${ownerId}-${createClientMessageId('conversation')}`,
          isGroup: false,
          participants: [{ _id: ownerId, username: ownerName, profilePicture: null }],
          name: ownerName,
          lastMessage: { content: replyContent, timestamp: new Date().toISOString(), senderId: currentUserId },
          unreadCount: 0,
        };
        setConversations(prev => [targetConv, ...prev]);
        try { await DB.saveConversation(targetConv); } catch (e) { }
      }

      // Create the reply message with status quote
      const statusReplyMsg = {
        _id: createClientMessageId('status-reply'),
        conversationId: targetConv._id,
        content: replyContent,
        senderId: currentUserId,
        timestamp: new Date().toISOString(),
        status: 'sent',
        type: 'text',
        // Quoted status reference (shows status preview in chat)
        quotedStatus: {
          statusId,
          ownerName,
          preview: statusOwner?.content || statusOwner?.caption || '📸 Status',
          type: statusOwner?.type || 'text',
          mediaUrl: statusOwner?.mediaUrl || null,
        },
      };

      // Show in chat if this conversation is selected
      if (selectedConversation?._id === targetConv._id) {
        setMessages(prev => [...prev, statusReplyMsg]);
      }

      // Select the conversation to show the reply in chat area
      setSelectedConversation(targetConv);
      if (messages.length === 0 || selectedConversation?._id !== targetConv._id) {
        setTimeout(() => setMessages([statusReplyMsg]), 100);
      }

      // Save the transient status reply message to IndexedDB
      try { await DB.saveMessage(statusReplyMsg); } catch (e) { }

      // Update last message in conversation list
      setConversations(prev => {
        const next = prev.map(c =>
          c._id === targetConv._id
            ? { ...c, lastMessage: { content: replyContent, timestamp: new Date().toISOString(), senderId: currentUserId } }
            : c
        );
        const updated = next.find(c => c._id === targetConv._id);
        if (updated) {
          DB.saveConversation(updated).catch(e => { });
        }
        return next;
      });

      // Emit socket event for real-time delivery
      // FIX: the backend's 'status_reply' handler reads `data.statusOwnerId`
      // (see backend/socket/index.js) but this used to send `recipientId`
      // instead. The handler's very first line is
      // `if (!statusOwnerId || !socket.userId) return;`, so with the wrong
      // key the event always silently did nothing — the recipient never got
      // the instant "someone replied to your status" signal and the reply
      // only ever showed up once the slower REST call below finished.
      emitSafe('status_reply', {
        statusId,
        statusOwnerId: ownerId,
        replyText: replyContent,
        content: replyContent,
        conversationId: targetConv._id,
        quotedStatus: statusReplyMsg.quotedStatus,
      });

      // Try to persist via API (best-effort) and update local IndexedDB + State
      try {
        const sid = encodeURIComponent(statusId);
        const response = await authFetch(`${BACKEND_URL}/advanced/status/${sid}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, conversationId: targetConv._id.startsWith('conv-status-') ? undefined : targetConv._id })
        });
        const resData = await response.json();
        if (resData.success && resData.message) {
          // If the backend returns a string for a local status, skip replacing the local conversation IDs
          if (typeof resData.message === 'string') {
            console.log('[ChatContext] Local status reply processed:', resData.message);
            return { success: true };
          }

          const realMsg = {
            ...resData.message,
            quotedStatus: statusReplyMsg.quotedStatus // preserve front-end formatting
          };
          const realConvId = realMsg.conversationId;
          const oldConvId = targetConv._id;

          // Save the real message to IndexedDB and prune the transient reply message
          try {
            await DB.deleteMessages([statusReplyMsg._id]);
            await DB.saveMessage(realMsg);
          } catch (e) { }

          // Delete the temporary conversation from IndexedDB if the ID changed
          if (oldConvId !== realConvId) {
            try { await DB.deleteConversation(oldConvId); } catch (e) { }
          }

          // Update conversations list
          setConversations(prev => {
            let exists = prev.some(c => c._id === realConvId);
            let nextConvs;
            if (exists) {
              const existingConv = prev.find(c => c._id === realConvId);
              if (existingConv) {
                const updatedExisting = { ...existingConv, lastMessage: realMsg, updatedAt: new Date() };
                nextConvs = prev.map(c => c._id === realConvId ? updatedExisting : c);
                try { DB.saveConversation(updatedExisting); } catch (e) { }
              } else {
                nextConvs = prev;
              }
              if (oldConvId.startsWith('conv-status-')) {
                nextConvs = nextConvs.filter(c => c._id !== oldConvId); // remove temp
              }
            } else {
              const updatedConv = {
                ...targetConv,
                _id: realConvId,
                lastMessage: realMsg,
                updatedAt: new Date()
              };
              nextConvs = prev.map(c => c._id === oldConvId ? updatedConv : c);
              try { DB.saveConversation(updatedConv); } catch (e) { }
            }
            return nextConvs;
          });

          // Check if user has switched chats to prevent leakage
          const currentSelectedId = getStoredSelectedConversationId();
          const isStillActive = currentSelectedId === oldConvId || currentSelectedId === realConvId;

          if (isStillActive) {
            // Update messages state if currently selected
            setMessages(prev => {
              const filtered = prev.filter(m => m._id !== statusReplyMsg._id);
              const belongsHere = realMsg.conversationId === currentSelectedId || realMsg.conversationId === realConvId;
              return belongsHere ? [...filtered, realMsg] : filtered;
            });

            // Update selected conversation state
            setSelectedConversation(prev => {
              if (prev && (prev._id === oldConvId || prev._id === realConvId)) {
                return { ...prev, _id: realConvId, lastMessage: realMsg };
              }
              return prev;
            });

            // Persist the selected conversation ID
            setStoredSelectedConversationId(realConvId);
          }
        }
      } catch (err) {
        console.error('Failed to persist status reply:', err);
      }

      return { success: true, conversationId: targetConv._id };
    } catch (err) {
      console.error('Reply to status error:', err);
      return { success: false };
    }
  }, [conversations, selectedConversation, messages, currentUserId]);

  // ── Misc ──
  const updateAutoReply = (enabled, msg) => setMods(prev => ({ ...prev, autoReply: enabled, autoReplyMsg: msg }));
  const sendMassMessage = (userIds, content) => {
    return new Promise((resolve) => {
      if (!socketRef.current || !socketRef.current.connected) {
        resolve({ success: false, error: 'Hauna mtandao kwa sasa (not connected)' });
        return;
      }

      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({ success: false, error: 'Muda umeisha, jaribu tena (timeout)' });
      }, 15000);

      socketRef.current.emit('send_mass_message', {
        recipients: userIds,
        message: content,
        sender: currentUserId
      }, (ackResponse) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(ackResponse || { success: false, error: 'Hakuna jibu kutoka server' });
      });
    });
  };
  const createBroadcastList = (name, recipients) => {
    const newBroadcast = { _id: createClientMessageId('broadcast'), name, recipients, createdAt: new Date() };
    setBroadcasts(prev => [...prev, newBroadcast]);
    emitSafe('create_broadcast_list', { name, recipients });
  };
  const createPoll = (question, options) => {
    emitSafe('poll:create', { conversationId: selectedConversation?._id, question, options });
  };
  const votePoll = (messageId, optionIndex) => {
    emitSafe('poll:vote', { messageId, optionIndex });
  };

  // Group
  const updateGroupMember = async (groupId, memberId, updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/groups/${groupId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Update group member error:', err);
      return { success: false };
    }
  };

  const joinGroup = async (groupId, inviteCode) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inviteCode: inviteCode || '' })
      });
      const data = await response.json();
      if (data.success) {
        emitSafe('join:conversation', groupId);
      }
      return data;
    } catch (err) {
      console.error('Join group error:', err);
      return { success: false };
    }
  };

  const updateDisappearingMessages = async (chatId, duration) => {
    if (!chatId) return { success: false, message: 'No chat selected' };
    const settings = normalizeDisappearingSettings(duration);

    const applyLocalUpdate = (nextSettings) => {
      setConversations(prev => prev.map(c => (
        String(c._id) === String(chatId) ? { ...c, disappearingMessages: nextSettings } : c
      )));
      setSelectedConversation(prev => prev && String(prev._id) === String(chatId)
        ? { ...prev, disappearingMessages: nextSettings }
        : prev);
    };

    applyLocalUpdate(settings);

    try {
      const response = await authFetch(`${BACKEND_URL}/advanced/conversations/${encodeURIComponent(chatId)}/disappearing-messages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Failed to update disappearing messages');
      }
      const savedSettings = data.disappearingMessages || settings;
      applyLocalUpdate(savedSettings);
      emitSafe('disappearing_messages:set', { chatId, ...savedSettings });
      return { success: true, disappearingMessages: savedSettings };
    } catch (err) {
      console.error('Update disappearing messages error:', err);
      return { success: false, message: err.message || 'Failed to update disappearing messages' };
    }
  };
  const updateGroupPermission = async (groupId, field, value) => {
    if (!groupId || !field) return { success: false, message: 'Missing groupId or field' };
    // Optimistic local update so the toggle feels instant, like WhatsApp.
    setConversations(prev => prev.map(c => (
      String(c._id) === String(groupId) ? { ...c, [field]: value } : c
    )));
    setSelectedConversation(prev => (
      prev && String(prev._id) === String(groupId) ? { ...prev, [field]: value } : prev
    ));
    try {
      const result = await updateGroupInfo(groupId, { [field]: value });
      if (result?.success === false) {
        // Revert on failure (e.g. permission denied)
        setConversations(prev => prev.map(c => (
          String(c._id) === String(groupId) ? { ...c, [field]: !value } : c
        )));
        setSelectedConversation(prev => (
          prev && String(prev._id) === String(groupId) ? { ...prev, [field]: !value } : prev
        ));
      }
      return result;
    } catch (err) {
      console.error('Update group permission error:', err);
      return { success: false, message: 'Failed to update group permission' };
    }
  };
  const toggleAdminOnlyMessaging = (groupId, nextValue) => {
    const conv = conversations.find(c => String(c._id) === String(groupId)) || selectedConversation;
    const next = typeof nextValue === 'boolean' ? nextValue : !conv?.adminOnlyMessaging;
    return updateGroupPermission(groupId, 'adminOnlyMessaging', next);
  };
  const createCustomRole = (chatId, roleName, permissions) => { if (chatId) emitSafe('create_custom_role', { chatId, roleName, permissions }); };
  const assignRole = (chatId, userId, roleId) => { if (chatId && userId) emitSafe('assign_role', { chatId, userId, roleId }); };

  // Chat actions
  const togglePinChat = (chatId) => {
    if (chatId) {
      // Optimistic update
      setConversations(prev => prev.map(c => {
        if (c._id === chatId) {
          const newState = !c.isPinned;
          return { ...c, isPinned: newState };
        }
        return c;
      }));
      setSelectedConversation(prev => prev && prev._id === chatId ? { ...prev, isPinned: !prev.isPinned } : prev);

      // API call
      const token = localStorage.getItem('token');
      const apiUrl = BACKEND_URL;
      if (token && apiUrl) {
        fetch(`${apiUrl}/api/chat/conversations/${chatId}/pin`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }).catch(err => console.error('Failed to pin chat:', err));
      }

      // Also emit socket for real-time updates
      emitSafe('pin_chat', { chatId });
    }
  };

  const toggleMuteChat = (chatId) => {
    if (chatId) {
      // Optimistic update
      setConversations(prev => prev.map(c => {
        if (c._id === chatId) {
          return { ...c, isMuted: !c.isMuted };
        }
        return c;
      }));
      setSelectedConversation(prev => prev && prev._id === chatId ? { ...prev, isMuted: !prev.isMuted } : prev);

      emitSafe('mute_chat', { chatId });
    }
  };

  const toggleArchiveChat = async (chatId) => {
    if (chatId) {
      const chat = conversations.find(c => c._id === chatId);
      const isArchiving = !chat?.isArchived;

      // Optimistic update
      setConversations(prev => prev.map(c => {
        if (c._id === chatId) {
          const newState = !c.isArchived;
          return { ...c, isArchived: newState };
        }
        return c;
      }));
      setSelectedConversation(prev => prev && prev._id === chatId ? { ...prev, isArchived: !prev.isArchived } : prev);

      // emit socket for real-time updates
      emitSafe('archive_chat', { chatId, isArchived });

      // FIX: Also make API call to persist the archive state to backend.
      // Previously this only emitted a socket event, so the archive state
      // was lost on page refresh. Now we call the backend API to ensure
      // the state persists across sessions.
      try {
        const token = localStorage.getItem('token');
        const apiUrl = BACKEND_URL;
        if (token && apiUrl) {
          await fetch(`${apiUrl}/api/chat/conversations/${chatId}/archive`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ isArchived })
          });
        }
      } catch (err) {
        console.error('Failed to archive/unarchive chat:', err);
        // Revert optimistic update on error
        setConversations(prev => prev.map(c => {
          if (c._id === chatId) {
            return { ...c, isArchived: chat?.isArchived };
          }
          return c;
        }));
        setSelectedConversation(prev => prev && prev._id === chatId ? { ...prev, isArchived: chat?.isArchived } : prev);
      }

      // If unarchiving, return to main chat list by resetting archived view
      if (!isArchiving) {
        console.log('[ChatContext] Unarchived chat, returning to main list');
        // This will be handled by the Sidebar component via navigation
      }
    }
  };

  const pinMessage = (id) => {
    const chatId = selectedConversation?._id;
    if (chatId && id) {
      setConversations(prev => prev.map(c => c._id === chatId ? { ...c, pinnedMessages: [...(c.pinnedMessages || []), id] } : c));
      setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, pinnedMessages: [...(prev.pinnedMessages || []), id] } : prev);
      emitSafe('pin_message', { chatId, messageId: id });
    }
  };
  const unpinMessage = (id) => {
    const chatId = selectedConversation?._id;
    if (chatId) {
      setConversations(prev => prev.map(c => c._id === chatId ? { ...c, pinnedMessages: (c.pinnedMessages || []).filter(p => p !== id) } : c));
      setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, pinnedMessages: (prev.pinnedMessages || []).filter(p => p !== id) } : prev);
      emitSafe('unpin_message', { chatId, messageId: id });
    }
  };
  const verifyChatUnlock = (chatId, enteredPin) => {
    const storedPin = localStorage.getItem('genz_lock_pin') || '1234';
    if (enteredPin === storedPin) {
      setUnlockedSessionChats(prev => {
        const next = new Set(prev);
        next.add(String(chatId));
        return next;
      });
      return true;
    }
    return false;
  };
  const toggleChatLock = (chatId, isLocked, pin) => {
    if (chatId) {
      const storedPin = localStorage.getItem('genz_lock_pin') || '1234';
      // Optimistic update
      setConversations(prev => prev.map(c => {
        if (c._id === chatId) {
          return { ...c, isLocked: isLocked };
        }
        return c;
      }));
      setSelectedConversation(prev => prev && prev._id === chatId ? { ...prev, isLocked: isLocked } : prev);

      // If unlocking, add to session unlocked set
      if (!isLocked) { setUnlockedSessionChats(prev => { const next = new Set(prev); next.add(String(chatId)); return next; }); } else { setUnlockedSessionChats(prev => { const next = new Set(prev); next.delete(String(chatId)); return next; }); }

      emitSafe('toggle_chat_lock', { chatId, isLocked, pin: pin || storedPin });
    }
  };
  const downloadStickerPack = useCallback(async (pack) => {
    const packId = pack?.id || pack;
    if (!packId) return;
    try {
      const res = await apiService.downloadStickerPack(packId);
      if (res?.success) {
        setStickerPacks(prev => prev.map(p => p.id === packId ? { ...p, isDownloaded: true } : p));
        const downloadedPack = stickerPacks.find(p => p.id === packId) || res.pack;
        const newUrls = (downloadedPack?.stickers || []).map(s => s.url).filter(Boolean);
        setDownloadedStickers(prev => Array.from(new Set([...prev, ...newUrls])));
      }
    } catch (err) {
      console.warn('[ChatContext] downloadStickerPack failed:', err?.message || err);
    }
  }, [stickerPacks]);

  const removeStickerPack = useCallback(async (packId) => {
    if (!packId) return;
    try {
      const res = await apiService.removeStickerPack(packId);
      if (res?.success) {
        const pack = stickerPacks.find(p => p.id === packId);
        setStickerPacks(prev => prev.map(p => p.id === packId ? { ...p, isDownloaded: false } : p));
        const removedUrls = new Set((pack?.stickers || []).map(s => s.url));
        setDownloadedStickers(prev => prev.filter(url => !removedUrls.has(url)));
      }
    } catch (err) {
      console.warn('[ChatContext] removeStickerPack failed:', err?.message || err);
    }
  }, [stickerPacks]);

  const fetchStickerPacks = useCallback(async () => {
    try {
      const res = await apiService.getStickerPacks();
      if (res?.success) {
        setStickerPacks(res.packs || []);
        const downloadedUrls = (res.packs || [])
          .filter(p => p.isDownloaded)
          .flatMap(p => (p.stickers || []).map(s => s.url));
        setDownloadedStickers(downloadedUrls);
      }
    } catch (err) {
      console.warn('[ChatContext] fetchStickerPacks failed:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady || (REQUIRE_AUTH && (authLoading || !isAuthenticated))) return;
    fetchStickerPacks();
  }, [isAuthReady, authLoading, isAuthenticated, fetchStickerPacks]);

  const sendSticker = (stickerUrl, options = {}) => { if (stickerUrl) sendMessage(stickerUrl, authUser?.username || 'Me', { messageType: 'sticker', ...options }); };
  const [favoriteStickers, setFavoriteStickers] = useState([]);
  const addFavoriteSticker = useCallback(async (stickerId, url) => {
    const key = stickerId || url;
    if (!key) return;
    try {
      const res = await apiService.toggleFavoriteSticker(key, url);
      if (res?.success) setFavoriteStickers(res.favorites || []);
    } catch (err) {
      console.warn('[ChatContext] addFavoriteSticker failed:', err?.message || err);
    }
  }, []);
  const toggleStarMessage = async (messageId, desiredStarred) => {
    if (messageId) {
      const currentMessage = messages.find(m => m._id === messageId || m.id === messageId);
      const nextStarred = typeof desiredStarred === 'boolean'
        ? desiredStarred
        : !currentMessage?.isStarred;

      setMessages(prev => prev.map(m =>
        m._id === messageId || m.id === messageId ? { ...m, isStarred: nextStarred } : m
      ));

      try {
        const data = await apiService.toggleStarMessage(messageId, nextStarred);
        if (!data?.success) {
          throw new Error(data?.message || 'Failed to toggle star');
        }

        const updatedMessage = data.message;
        if (updatedMessage?._id) {
          setMessages(prev => prev.map(m =>
            m._id === updatedMessage._id || m.id === updatedMessage._id ? updatedMessage : m
          ));
          try { await DB.saveMessage(updatedMessage); } catch (e) { }
        }
        apiService.clearCache();
        return data;
      } catch (err) {
        console.error('Failed to toggle star:', err);
        setMessages(prev => prev.map(m =>
          m._id === messageId || m.id === messageId ? { ...m, isStarred: currentMessage?.isStarred } : m
        ));
      }
    }
  };

  const toggleMessageLock = async (messageId, desiredLocked) => {
    if (messageId) {
      const currentMessage = messages.find(m => m._id === messageId || m.id === messageId);
      const nextLocked = typeof desiredLocked === 'boolean'
        ? desiredLocked
        : !currentMessage?.isLocked;

      setMessages(prev => prev.map(m =>
        m._id === messageId || m.id === messageId ? { ...m, isLocked: nextLocked } : m
      ));

      try {
        const data = await apiService.toggleMessageLock(messageId, nextLocked);
        if (!data?.success) {
          throw new Error(data?.message || 'Failed to toggle lock');
        }

        const updatedMessage = data.message;
        if (updatedMessage?._id) {
          setMessages(prev => prev.map(m =>
            m._id === updatedMessage._id || m.id === updatedMessage._id ? updatedMessage : m
          ));
          try { await DB.saveMessage(updatedMessage); } catch (e) { }
        }
        apiService.clearCache();
        return data;
      } catch (err) {
        console.error('Failed to toggle lock:', err);
        setMessages(prev => prev.map(m =>
          m._id === messageId || m.id === messageId ? { ...m, isLocked: currentMessage?.isLocked } : m
        ));
      }
    }
  };
  const transcribeAudio = async (audioBlob) => {
    try {
      if (!audioBlob) return '';
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      const res = await authFetch(`${BACKEND_URL}/advanced/transcribe-audio`, { method: 'POST', body: formData });
      if (res.ok) { const data = await res.json(); return data?.text || ''; }
    } catch (e) { console.warn('Transcription failed:', e); }
    return '';
  };
  const viewProfile = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/users/${userId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        emitSafe('visit_profile', {
          visitedUserId: userId,
          visitorId: currentUserId,
          visitorName: authUser?.username || localStorage.getItem('username') || 'Someone'
        });
      }
      return data;
    } catch (err) {
      console.error('View profile error:', err);
      return { success: false };
    }
  };
  const addContact = async (phone, savedName) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/chat/contacts/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, savedName })
      });
      const data = await response.json();
      if (data.success) {
        setContacts(prev => [...prev, data.contact]);
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Imeshindikana kuongeza contact' };
    }
  };

  const removeContact = async (contactId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setContacts(prev => prev.filter(c => c._id !== contactId));
      }
      return data;
    } catch (err) {
      console.error('Remove contact error:', err);
      return { success: false };
    }
  };

  const updateContact = async (contactId, updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (data.success) {
        setContacts(prev => prev.map(c => c._id === contactId ? { ...c, ...data.contact } : c));
      }
      return data;
    } catch (err) {
      console.error('Update contact error:', err);
      return { success: false };
    }
  };
  const blockUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/users/${userId}/block`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setBlockedUsers(prev => [...(prev || []), userId]);
        emitSafe('block_user', { userId, blockerId: currentUserId });
      }
      return data;
    } catch (err) {
      console.error('Block user error:', err);
      return { success: false };
    }
  };

  const unblockUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/users/${userId}/block`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setBlockedUsers(prev => (prev || []).filter(id => id !== userId));
        emitSafe('unblock_user', { userId, blockerId: currentUserId });
      }
      return data;
    } catch (err) {
      console.error('Unblock user error:', err);
      return { success: false };
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (data.success) {
        if (updates.username) localStorage.setItem('username', updates.username);
        if (updates.profilePicture) localStorage.setItem('profilePicture', updates.profilePicture);
        if (updates.bio) localStorage.setItem('bio', updates.bio);
      }
      return data;
    } catch (err) {
      console.error('Update profile error:', err);
      return { success: false };
    }
  };

  // ──── NEW WHATSAPP FEATURES ────
  const searchMessages = async (conversationId, query) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/conversations/${conversationId}/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return { ...data, data: data.data || data.messages || [] };
    } catch (err) {
      console.error('Search messages error:', err);
      return { success: false, message: 'Search failed' };
    }
  };

  const getMediaGallery = async (conversationId, mediaType = 'all') => {
    try {
      const response = await authFetch(`${BACKEND_URL}/chat/conversations/${conversationId}/media?mediaType=${mediaType}`);
      const data = await response.json();
      const items = data.data || data.media || [];
      const normalizedItems = items.map(item => ({
        ...item,
        mediaUrl: item.mediaUrl || item.content || item.url || ''
      }));
      return { ...data, data: normalizedItems, media: normalizedItems };
    } catch (err) {
      console.error('Get media gallery error:', err);
      return { success: false, message: 'Failed to fetch media' };
    }
  };

  const getMessageInfo = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/messages/${messageId}/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return { ...data, data: data.data || data.messageInfo };
    } catch (err) {
      console.error('Get message info error:', err);
      return { success: false, message: 'Failed to fetch message info' };
    }
  };

  const markViewOnceViewed = async (messageId) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/chat/messages/${messageId}/view-once-viewed`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      // Update local state to mark as consumed
      setMessages(prev => {
        const target = prev.find(m => m._id === messageId || m.id === messageId);
        if (target?.isSelfDestruct) {
          return prev.filter(m => m._id !== messageId && m.id !== messageId);
        }
        return prev.map(m => {
          if (m._id === messageId || m.id === messageId) {
            return {
              ...m,
              isConsumed: true,
              viewedAt: new Date(),
              content: 'View Once message opened',
              mediaUrl: '',
              fileName: ''
            };
          }
          return m;
        });
      });
      
      return data;
    } catch (err) {
      console.error('Mark view once viewed error:', err);
      return { success: false };
    }
  };

  const forwardMessage = async (messageIdOrContent, targetConversationIdsOrSenderName) => {
    if (!Array.isArray(targetConversationIdsOrSenderName)) {
      return sendMessage(messageIdOrContent, targetConversationIdsOrSenderName, { isForwarded: true });
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/messages/${messageIdOrContent}/forward`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetConversationIds: targetConversationIdsOrSenderName })
      });
      const data = await response.json();
      if (data.success) {
        emitSafe('message:forwarded', {
          messageId: messageIdOrContent,
          targetConversationIds: targetConversationIdsOrSenderName
        });
      }
      return { ...data, data: data.data || data.forwardedMessages || [] };
    } catch (err) {
      console.error('Forward message error:', err);
      return { success: false, message: 'Failed to forward message' };
    }
  };

  const reportMessage = async (messageId, reason, details = '') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/messages/${messageId}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason, details })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Report message error:', err);
      return { success: false, message: 'Failed to report message' };
    }
  };

  const getGroupInfo = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/groups/${groupId}/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return { ...data, data: data.data || data.groupInfo };
    } catch (err) {
      console.error('Get group info error:', err);
      return { success: false, message: 'Failed to fetch group info' };
    }
  };

  const regenerateGroupInvite = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/groups/${groupId}/invite/regenerate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return await response.json();
    } catch (err) {
      console.error('Regenerate invite error:', err);
      return { success: false, message: 'Failed to regenerate invite code' };
    }
  };

  const updateGroupInfo = async (groupId, updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/groups/${groupId}/info`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (data.success) {
        // Update conversations if group name/photo changed
        setConversations(prev => prev.map(conv =>
          conv._id === groupId ? { ...conv, groupName: updates.groupName || conv.groupName, groupPhoto: updates.groupPhoto || conv.groupPhoto } : conv
        ));
        emitSafe('group:updated', { groupId, updates });
      }
      return { ...data, data: data.data || data.conversation };
    } catch (err) {
      console.error('Update group info error:', err);
      return { success: false, message: 'Failed to update group' };
    }
  };

  const removeAdmin = async (groupId, userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/groups/${groupId}/admins/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        emitSafe('admin:removed', { groupId, userId });
      }
      return data;
    } catch (err) {
      console.error('Remove admin error:', err);
      return { success: false, message: 'Failed to remove admin' };
    }
  };

  const makeAdmin = async (groupId, userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/groups/${groupId}/admins/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setConversations(prev => prev.map(conv => {
          if (conv._id !== groupId) return conv;
          const admins = [...(conv.admins || [])];
          if (!admins.some(a => String(a) === String(userId))) admins.push(userId);
          return { ...conv, admins };
        }));
        emitSafe('admin:added', { groupId, userId });
      }
      return data;
    } catch (err) {
      console.error('Make admin error:', err);
      return { success: false, message: 'Failed to promote member' };
    }
  };

  // ─── BAN/UNBAN MEMBER ──────────────────────────────────────────────────────
  const banGroupMember = async (groupId, userId, reason = '') => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, reason })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const unbanGroupMember = async (groupId, userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/ban`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const getGroupBannedMembers = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/banned`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, bannedMembers: [] };
    }
  };

  // ─── TRANSFER OWNERSHIP ────────────────────────────────────────────────────
  const transferGroupOwnership = async (groupId, newOwnerId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/transfer-ownership`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newOwnerId })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── PENDING JOIN REQUESTS ─────────────────────────────────────────────────
  const getGroupPendingRequests = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/pending-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, requests: [] };
    }
  };

  const approveGroupJoinRequest = async (groupId, userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/pending-requests/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const rejectGroupJoinRequest = async (groupId, userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/pending-requests/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── ANTI-SPAM ─────────────────────────────────────────────────────────────
  const updateGroupAntiSpam = async (groupId, settings) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/anti-spam`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const updateGroupJoinApproval = async (groupId, requireApproval) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/join-approval`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requireApproval })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── GROUP QR CODE ─────────────────────────────────────────────────────────
  const getGroupQRCode = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/qr`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ─── GROUP EVENTS ──────────────────────────────────────────────────────────
  const fetchGroupEvents = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/events`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, events: [] };
    }
  };

  const createGroupEventFn = async (groupId, eventData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const rsvpGroupEventFn = async (groupId, eventId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const addParticipant = async (groupId, userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/groups/${groupId}/participants`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (data.success) {
        setConversations(prev => prev.map(conv => {
          if (conv._id !== groupId) return conv;
          const alreadyIn = (conv.participants || []).some(p => String(p?._id || p) === String(userId));
          if (alreadyIn) return conv;
          return {
            ...conv,
            participants: [...(conv.participants || []), data.participant || userId]
          };
        }));
        emitSafe('participant:added', { groupId, userId });
      }
      return data;
    } catch (err) {
      console.error('Add participant error:', err);
      return { success: false, message: 'Failed to add member' };
    }
  };

  const leaveGroup = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/groups/${groupId}/leave`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setConversations(prev => prev.filter(conv => conv._id !== groupId));
        setSelectedConversation(prev => (prev?._id === groupId ? null : prev));
        // Delete from IndexedDB to prevent reappearing after refresh
        try {
          await DB.deleteConversation(groupId);
          await DB.deleteMessagesForConversation(groupId);
        } catch (e) { }
        emitSafe('group:left', { groupId });
      }
      return data;
    } catch (err) {
      console.error('Leave group error:', err);
      return { success: false, message: 'Failed to leave group' };
    }
  };

  const refreshConversations = async () => {
    try {
      const data = await apiService.getConversations();
      if (data?.success && Array.isArray(data.conversations)) {
        const remoteIds = new Set(data.conversations.map((c) => String(c._id)));
        setConversations(prev => {
          // Keep local-only (not-yet-synced) conversations, but drop anything
          // the server no longer returns (deleted/left elsewhere) instead of
          // merging forever — otherwise removed chats never disappear.
          const mergedMap = new Map();
          prev.forEach(c => {
            const id = String(c._id || '');
            const isLocalOnly = id.startsWith('conv-') || id.startsWith('temp-');
            if (isLocalOnly || remoteIds.has(id)) {
              mergedMap.set(c._id, c);
            }
          });
          data.conversations.forEach(c => mergedMap.set(c._id, c));
          return Array.from(mergedMap.values());
        });
        try {
          const cachedConvs = await DB.getConversations();
          const staleConvs = (cachedConvs || []).filter((c) => {
            const id = String(c._id || '');
            const isLocalOnly = id.startsWith('conv-') || id.startsWith('temp-');
            return !isLocalOnly && !remoteIds.has(id);
          });
          await Promise.all(staleConvs.map(async (c) => {
            try {
              await DB.deleteConversation(c._id);
              await DB.deleteMessagesForConversation(c._id);
            } catch (_) { /* best-effort */ }
          }));
        } catch (_) { /* best-effort */ }
      }
      return data;
    } catch (err) {
      console.error('Refresh conversations error:', err);
      return { success: false };
    }
  };

  const removeParticipant = async (groupId, userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/chat/groups/${groupId}/participants/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setConversations(prev => prev.map(conv => {
          if (conv._id !== groupId) return conv;
          return {
            ...conv,
            participants: (conv.participants || []).filter(p => String(p?._id || p) !== String(userId)),
            admins: (conv.admins || []).filter(a => String(a?._id || a) !== String(userId))
          };
        }));
        emitSafe('participant:removed', { groupId, userId });
      }
      return data;
    } catch (err) {
      console.error('Remove participant error:', err);
      return { success: false, message: 'Failed to remove member' };
    }
  };

  // ── User object (prefer logged-in user from AuthContext) ──
  const user = React.useMemo(() => ({
    ...(authUser && typeof authUser === 'object' ? authUser : {}),
    _id: currentUserId,
    id: currentUserId,
    username: authUser?.username || localStorage.getItem('username') || 'GENZ User',
    profilePicture: authUser?.profilePicture || localStorage.getItem('profilePicture') || '',
    bio: authUser?.bio || localStorage.getItem('bio') || 'Using GENZ Ultra',
    updateUserProfile
  }), [currentUserId, authUser, updateUserProfile]);

  const contextValue = React.useMemo(() => ({
    user, conversations, setConversations,
    selectedConversation, selectConversation,
    messages, setMessages,
    loading, setLoading,
    sendMessage, editMessage, deleteMessage, clearChat, deleteChat,
    addReaction, forwardMessage, markAsRead,
    isOtherUserTyping, sendTypingStatus, typingByConversation,
    isOtherUserRecording, sendRecordingStatus,
    isAutoRefreshing,
    activeCall, initiateCall, endCall, acceptCall, rejectCall,
    activeGroupCall, setActiveGroupCall,
    onlineNotification, broadcasts, sendMassMessage, createBroadcastList,
    statuses, addStatus, uploadStatusMedia, statusViewers, viewStatus,
    onlineUsers, awayUsers, lastSeenByUser, callLogs, fetchCallLogs, profileVisitors,
    showProfileEditor, setShowProfileEditor,
    contacts, addContact, removeContact, updateContact,
    blockedUsers, blockUser, unblockUser,
    createPoll, votePoll, scheduleMessage, scheduledMessages,
    updateGroupMember, joinGroup, updateDisappearingMessages,
    toggleAdminOnlyMessaging, updateGroupPermission, createCustomRole, assignRole,
    togglePinChat, toggleMuteChat, toggleArchiveChat,
    pinMessage, unpinMessage, pinnedMessages,
    presenceHistory, unlockedSessionChats, verifyChatUnlock, toggleChatLock,
    stickerPacks, downloadedStickers, downloadStickerPack, removeStickerPack, sendSticker, addFavoriteSticker, favoriteStickers,
    toggleStarMessage, toggleMessageLock, transcribeAudio, viewProfile,
    // New WhatsApp features
    searchMessages, getMediaGallery, getMessageInfo, markViewOnceViewed,
    reportMessage, getGroupInfo, regenerateGroupInvite, updateGroupInfo, removeAdmin, makeAdmin, addParticipant, removeParticipant, leaveGroup, refreshConversations, setStoredSelectedConversationId,
    // Advanced group management
    banGroupMember, unbanGroupMember, getGroupBannedMembers,
    transferGroupOwnership,
    getGroupPendingRequests, approveGroupJoinRequest, rejectGroupJoinRequest,
    updateGroupAntiSpam, updateGroupJoinApproval,
    getGroupQRCode,
    fetchGroupEvents, createGroupEventFn, rsvpGroupEventFn,
    connectedDevices, sessions, notifications, statusPrivacy, setStatusPrivacy,
    backupProgress, setBackupProgress, notificationSound, setNotificationSound,
    startCloudBackup, listCloudBackups, restoreCloudBackup, deleteCloudBackup, logoutDevice, logoutAllDevices, generateQRCode, pairDevice, getDevices, updateDeviceCapabilities, updateAutoReply,
    // Security functions
    generate2FASecret, verify2FASetup, disable2FA,
    // GENZ Mods functions
    fetchGENZModsSettings, saveGENZModsSettings,
    fetchDeletedMessages, restoreDeletedMessage,
    processAutoReply, getUserStatusWithGhostMode,
    // Broadcast functions
    fetchBroadcasts, createBroadcast, updateBroadcast,
    deleteBroadcast, sendBroadcastMessage,
    // Status functions
    fetchStatuses, createStatus, deleteStatus,
    replyToStatus,
    // Scheduled messages functions
    cancelScheduledMessage, getScheduledMessages,
    mods, updateMods, setMods,
    isSocketConnected, applyVoiceEffect,
    // Tier 2 new exports
    isDNDMode, toggleDNDMode,
    getMessageStats,
    appTheme, toggleAppTheme,
    setDisappearingTimer
  }), [
    user, conversations, selectedConversation, messages, loading,
    isOtherUserTyping, isOtherUserRecording, typingByConversation, activeCall, activeGroupCall,
    onlineNotification, broadcasts, statuses, statusViewers,
    onlineUsers, awayUsers, lastSeenByUser, callLogs, fetchCallLogs, profileVisitors, showProfileEditor,
    contacts, blockedUsers, scheduledMessages, pinnedMessages,
    presenceHistory, unlockedSessionChats, stickerPacks,
    downloadedStickers, connectedDevices, sessions, notifications,
    statusPrivacy, backupProgress, notificationSound, mods,
    isSocketConnected, isDNDMode, appTheme,
    fetchStatuses, createStatus, deleteStatus, replyToStatus,
    listCloudBackups, restoreCloudBackup, deleteCloudBackup
  ]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
