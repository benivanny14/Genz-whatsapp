import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { setSocketInstance, clearSocketInstance } from '../services/socket';
import { DB } from '../services/db';
import { registerServiceWorker, notifyNewMessage, showLocalNotification } from '../services/notifications';
import { isOffline } from '../services/api';
import apiService from '../services/apiService';
import backupService from '../services/backupService';
import { useAuth } from './AuthContext';
import { authFetch } from '../utils/authFetch';
import { playMessageSound, playSentSound } from '../utils/notificationSounds';
import api, { mediaAPI } from '../services/api';
import { cleanupLocalBlobUrls, sanitizeBlobUrls } from '../utils/sanitizeStorage';
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
// Native FLAG_SECURE: on the Android APK this truly blocks screenshots AND
// screen recording (WhatsApp-style black capture) while the Anti-Screenshot
// mod is on. Safe to import on web — the plugin only acts on native.
import { PrivacyScreen } from '@capacitor-community/privacy-screen';

export const ChatContext = createContext();

// WhatsApp behavior: a 1:1 conversation with a blocked user is hidden from the
// chat list until the user is unblocked. Group chats always stay visible (you
// just stop receiving that user's messages).
const isOneToOneWithUser = (conv, targetUserId, selfId) => {
  if (!conv || conv.isGroup) return false;
  return (conv.participants || [])
    .map((p) => String(p?._id || p?.id || p))
    .some((id) => id && id !== String(selfId) && id === String(targetUserId));
};

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
// Demo data is only allowed in development mode for security
const ENABLE_DEMO_DATA = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';

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
    antiDelete: false,
    ghostMode: false,
    hideLastSeen: true,
    freezeLastSeen: false,
    antiViewOnce: false,
    selfDestruct: false,
    hideReadReceipts: false,
    voiceEffect: 'none',
    autoReply: false,
    autoReplyMsg: "I'm offline, will reply soon.",
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
    defaultMessageFont: 'default',
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
    // Keys shared with the GENZ Mods page / backend (kept in sync so a save
    // from either side never drops the other side's toggles).
    antiDeleteStatus: false,
    hideSecondTick: false,
    hideViewStatus: false,
    typingIndicators: true,
    onlineStatusVisible: true,
    hideOnline: false,
    hideTyping: false,
    hideRecording: false,
    autoReplyKeywords: [],
    // ── GENZ Exclusive — TikTok/Instagram features ──
    // Paid features are opt-in and remain disabled until enabled in Settings.
    storyHighlights: false,
    liveReactions: false,
    collabStatus: true,
    bubbleAnimations: false,
    reelMode: false,
    glassMode: false,
    // WINGA + Status activity toasts (someone posted a status / a business)
    activityNotifications: true
  },
  appTheme: 'dark',
  statusPrivacy: 'contacts',
  notificationSound: 'default',
  isDNDMode: false
};

const buildGENZSettings = (parsed = {}) => ({
  settingsVersion: GENZ_SETTINGS_VERSION,
  mods: { ...DEFAULT_GENZ_SETTINGS.mods, ...(parsed.mods || {}) },
  appTheme: parsed.appTheme || DEFAULT_GENZ_SETTINGS.appTheme,
  statusPrivacy: parsed.statusPrivacy || DEFAULT_GENZ_SETTINGS.statusPrivacy,
  notificationSound: parsed.notificationSound || DEFAULT_GENZ_SETTINGS.notificationSound,
  isDNDMode: parsed.isDNDMode !== undefined ? parsed.isDNDMode : DEFAULT_GENZ_SETTINGS.isDNDMode
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
  const currentUserIdRef = useRef(null);

  // Coalesce status/WINGA activity toasts: a burst of posts (e.g. a seller
  // uploading 15 listings back-to-back) shows ONE toast, not fifteen.
  const showActivityToastRef = useRef((kind, message) => {
    const now = Date.now();
    const last = showActivityToastRef.lastShown?.[kind] || 0;
    if (now - last < 6000) return;
    showActivityToastRef.lastShown = { ...(showActivityToastRef.lastShown || {}), [kind]: now };
    toast(message, { duration: 3500 });
  });
  const { isAuthenticated, loading: authLoading, user: authUser, isAuthReady, completeSession } = useAuth();

  const currentUserId = React.useMemo(() => {
    if (authUser?._id) return String(authUser._id);
    if (ENABLE_DEMO_DATA) return UNAUTHENTICATED_FALLBACK_USER_ID;
    return null;
  }, [authUser?._id]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Core state
  const [conversations, setConversations] = useState([]);
  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const [selectedConversation, setSelectedConversation] = useState(null);
  const selectedConversationIdRef = useRef(null);
  const [messages, setMessages] = useState([]);
  // Infinite scroll: server-side history pagination (page 1 = newest 50).
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const historyPageRef = useRef(1);
  const loadingOlderRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [onlineNotification, setOnlineNotification] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [statusViewers, setStatusViewers] = useState([]);
  // WINGA marketplace state
  const [wingaData, setWingaData] = useState({ categories: [], totalUnseen: 0, myListings: [], postedToday: 0, limit: 15 });
  const [wingaOrders, setWingaOrders] = useState([]);
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

  // Fetch the current user's matched contacts. Used on initial load, on the
  // 'contacts:updated' socket event (live refresh), and by ContactManager so
  // the list is never stale when opened. useCallback keeps the identity
  // stable so consumers can safely put it in effect deps.
  const loadContacts = React.useCallback(async () => {
    try {
      const contactsResponse = await authFetch(`${BACKEND_URL}/chat/contacts`);
      const contactsData = await contactsResponse.json();
      if (contactsData?.success) {
        setContacts(contactsData.contacts || []);
        return true;
      }
    } catch (err) {
      console.error('[ChatContext] Failed to refresh contacts:', err);
    }
    return false;
  }, []);

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

    // Native Anti-Screenshot (APK only): FLAG_SECURE blocks screenshots and
    // screen recording at the OS level while the mod is on. The ViewOnce
    // components toggle this themselves during one-time viewing.
    const syncNativeAntiScreenshot = async () => {
      try {
        if (mods.antiScreenshot) {
          await PrivacyScreen.enable();
        } else {
          await PrivacyScreen.disable();
        }
      } catch (_) { /* not on a native platform — web detection covers this */ }
    };
    syncNativeAntiScreenshot();

    // Set up screenshot attempt callback to notify via socket.
    // Registered whenever the mod is ON — NOT gated on socketRef.current being
    // set at this moment, because on a fresh page load this effect can run
    // before the socket finishes connecting. The callback body itself checks
    // socketRef.current?.connected at call time, so late connections are fine.
    if (mods.antiScreenshot) {
      setScreenshotAttemptCallback(() => {
        const convId = selectedConversationIdRef.current;
        if (convId && socketRef.current?.connected) {
          emitSafe('screenshot:attempt', { conversationId: convId });
        }
      });
    } else {
      setScreenshotAttemptCallback(null);
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

  // ── DEMO SEED DATA (shows when no real data exists) ──────────────────────
  const DEMO_CONVERSATIONS = [
    {
      _id: 'demo-conv-1', isGroup: false, isPinned: true, isArchived: false,
      participants: [{ _id: 'demo-user-1', username: 'Amina Kweli', profilePicture: null, isOnline: true }],
      lastMessage: { content: 'Hi there! 😊 Did you get home safe?', timestamp: new Date(Date.now() - 300000).toISOString(), senderId: 'demo-user-1' },
      unreadCount: 3, name: 'Amina Kweli',
    },
    {
      _id: 'demo-conv-2', isGroup: false, isPinned: false, isArchived: false,
      participants: [{ _id: 'demo-user-2', username: 'Brian Msomi', profilePicture: null, isOnline: false }],
      lastMessage: { content: '✅ Okay, see you tomorrow at 9', timestamp: new Date(Date.now() - 3600000).toISOString(), senderId: currentUserId },
      unreadCount: 0, name: 'Brian Msomi',
    },
    {
      _id: 'demo-conv-3', isGroup: true, isPinned: false, isArchived: false,
      participants: [
        { _id: 'demo-user-1', username: 'Amina Kweli', profilePicture: null },
        { _id: 'demo-user-3', username: 'Carol Mwangi', profilePicture: null },
        { _id: 'demo-user-4', username: 'David Ochieng', profilePicture: null },
      ],
      lastMessage: { content: '🎉 Congrats David!', timestamp: new Date(Date.now() - 7200000).toISOString(), senderId: 'demo-user-1' },
      unreadCount: 12, name: '🎓 GENZ Family', groupName: '🎓 GENZ Family',
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
      lastMessage: { content: 'Send this file as fast as you can 📎', timestamp: new Date(Date.now() - 172800000).toISOString(), senderId: currentUserId },
      unreadCount: 0, name: 'Edwin Baraka',
    },
    {
      _id: 'demo-conv-6', isGroup: true, isPinned: false, isArchived: false,
      participants: [
        { _id: 'demo-user-2', username: 'Brian Msomi', profilePicture: null },
        { _id: 'demo-user-5', username: 'Edwin Baraka', profilePicture: null },
      ],
      lastMessage: { content: '📍 I shared my location', timestamp: new Date(Date.now() - 259200000).toISOString(), senderId: 'demo-user-2' },
      unreadCount: 5, name: '💼 Work Team', groupName: '💼 Work Team',
    },
    {
      _id: 'demo-conv-7', isGroup: false, isPinned: false, isArchived: false,
      participants: [{ _id: 'demo-user-6', username: 'Fatuma Hassan', profilePicture: null, isOnline: true }],
      lastMessage: { content: 'Did you do tomorrow\'s assignment?', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), senderId: 'demo-user-6' },
      unreadCount: 2, name: 'Fatuma Hassan',
    },
    {
      _id: 'demo-conv-8', isGroup: false, isPinned: false, isArchived: false,
      participants: [{ _id: 'demo-user-7', username: 'George Kamau', profilePicture: null, isOnline: false }],
      lastMessage: { content: '😂😂😂 that is so true!', timestamp: new Date(Date.now() - 3600000 * 48).toISOString(), senderId: 'demo-user-7' },
      unreadCount: 0, name: 'George Kamau',
    },
  ];

  const DEMO_MESSAGES = {
    'demo-conv-1': [
      { _id: 'dm1-1', content: 'Good morning! ☀️', senderId: 'demo-user-1', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm1-2', content: 'Very good, and you? 😊', senderId: currentUserId, timestamp: new Date(Date.now() - 3600000 * 2.9).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm1-3', content: 'I\'m fine. There\'s a meeting at 10 this morning', senderId: 'demo-user-1', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm1-4', content: 'Okay I\'m ready! 👍', senderId: currentUserId, timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm1-5', content: 'Did you get that document I sent you?', senderId: 'demo-user-1', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm1-6', content: 'Yes I got it, I\'ll look at it right now 📄', senderId: currentUserId, timestamp: new Date(Date.now() - 900000).toISOString(), status: 'delivered', type: 'text' },
      { _id: 'dm1-7', content: 'Hi there! 😊 Did you get home safe?', senderId: 'demo-user-1', timestamp: new Date(Date.now() - 300000).toISOString(), status: 'delivered', type: 'text' },
    ],
    'demo-conv-2': [
      { _id: 'dm2-1', content: 'Are you still at the office?', senderId: currentUserId, timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm2-2', content: 'Yes, just finishing up some work', senderId: 'demo-user-2', timestamp: new Date(Date.now() - 7000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm2-3', content: 'What time shall we meet tomorrow?', senderId: currentUserId, timestamp: new Date(Date.now() - 6000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm2-4', content: 'Does 9 in the morning work?', senderId: 'demo-user-2', timestamp: new Date(Date.now() - 5000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm2-5', content: '✅ Okay, see you tomorrow at 9', senderId: currentUserId, timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'read', type: 'text' },
    ],
    'demo-conv-3': [
      { _id: 'dm3-1', content: 'Is everyone at the meeting? 🤔', senderId: 'demo-user-3', timestamp: new Date(Date.now() - 9000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm3-2', content: 'I\'m here! ✋', senderId: currentUserId, timestamp: new Date(Date.now() - 8900000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm3-3', content: 'Here too! 🙋‍♂️', senderId: 'demo-user-4', timestamp: new Date(Date.now() - 8800000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm3-4', content: 'I had great news today — I got a job! 🎉', senderId: 'demo-user-4', timestamp: new Date(Date.now() - 8000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm3-5', content: '🎉 Congrats David!', senderId: 'demo-user-1', timestamp: new Date(Date.now() - 7900000).toISOString(), status: 'read', type: 'text', reactions: [{ emoji: '🎊', userId: currentUserId }, { emoji: '❤️', userId: 'demo-user-3' }] },
      { _id: 'dm3-6', content: 'Congrats! Best of luck 🙏', senderId: currentUserId, timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'read', type: 'text' },
    ],
    'demo-conv-4': [
      { _id: 'dm4-1', content: 'What song are you into right now? 🎵', senderId: currentUserId, timestamp: new Date(Date.now() - 90000000).toISOString(), status: 'read', type: 'text' },
      { _id: 'dm4-2', content: 'Listen to this! 🎶', senderId: 'demo-user-3', timestamp: new Date(Date.now() - 89000000).toISOString(), status: 'read', type: 'audio', duration: 24 },
      { _id: 'dm4-3', content: '😍 So good! Who is it?', senderId: currentUserId, timestamp: new Date(Date.now() - 88000000).toISOString(), status: 'read', type: 'text' },
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
          // FIX: Do not auto-open any chat here. Previously the system took
          // the "storedId" (last opened chat) and set it as
          // selectedConversation as soon as the app started - which caused the
          // app to "open itself" into a chat without the user tapping anything
          // (especially on phones, where one screen changes
          // to show ChatArea instead of the chat list as soon as
          // selectedConversation becomes non-null). Now we only let the socket
          // join the room of the last opened chat (for notifications/real-time
          // sync) without forcing the UI into that chat directly.
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
      const token = getAuthToken();
      let userId = currentUserId;
      try {
        // Prefer the current JWT (the authenticated session) over the stale
        // `localStorage.user` profile so a shared browser never joins the
        // socket under a previous account's id.
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload?.id) userId = payload.id;
        }
      } catch (_) { /* keep default */ }
      if (!userId) {
        try {
          const u = authUser || JSON.parse(localStorage.getItem('user') || 'null');
          if (u?._id) userId = u._id;
        } catch (_) { /* keep default */ }
      }

      socket = io(SOCKET_ORIGIN, {
        path: '/socket.io/',
        // Polling first, then upgrade to websocket. Websocket-only dies hard
        // when the handshake fails (e.g. 520 while Render is cold-starting or
        // redeploying); polling falls back gracefully and still upgrades once
        // connected.
        transports: ['polling', 'websocket'],
        withCredentials: true,
        auth: {
          token: token || undefined,
          userId: userId,
          freezeLastSeen: modsRef.current.freezeLastSeen
        },
        reconnection: true,
        // Long retry window so a Render free-tier cold start (30-90s) doesn't
        // exhaust the attempts before the instance wakes up.
        reconnectionAttempts: 30,
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
          // Re-mark the open chat as read on reconnect so the server-side
          // unreadCount stays in sync (common source of stuck badges on APK).
          setTimeout(() => {
            const skipRead = Boolean(modsRef.current.hideReadReceipts || modsRef.current.ghostMode);
            socket.emit('mark_as_read', { chatId: currentConvId, skipReadReceipts: skipRead });
          }, 500);
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
            const token = getAuthToken();
            if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              if (payload?.id) uid = payload.id;
            }
          } catch (_) { /* */ }
          if (!uid) {
            try {
              const u = authUser || JSON.parse(localStorage.getItem('user') || 'null');
              if (u?._id) uid = u._id;
            } catch (_) { /* */ }
          }
          socket.emit('user:join', uid);

        // Re-confirm push subscription on reconnect (the real subscribe now
        // happens on app startup in App.jsx — this used to be the *only*
        // place it happened, and only fired on 'reconnect', so a normal
        // session that never disconnects never subscribed at all).
        try {
          if ('serviceWorker' in navigator && 'PushManager' in window && Notification.permission === 'granted') {
            const reg = await navigator.serviceWorker.ready;
            await notificationService.subscribeToWebPush(reg);
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

      // ── Contact list changed (added/removed/renamed elsewhere) ──
      socket.on('contacts:updated', async () => {
        await loadContacts();
        // Notify non-context consumers (Settings privacy selector,
        // StatusPrivacyPanel, ContactManager) so an open contact list
        // refreshes live.
        window.dispatchEvent(new CustomEvent('contacts:updated'));
      });

      // ── Someone posted a status → live toast + refresh feed ──
      socket.on('status:created', (statusObj) => {
        try {
          const posterId = String(statusObj?.userId || statusObj?.user?._id || statusObj?.user || '');
          const myId = String(currentUserIdRef.current || '');
          if (posterId && posterId !== myId && modsRef.current.activityNotifications !== false) {
            const name = statusObj?.username || statusObj?.user?.username || 'Someone';
            showActivityToastRef.current('status', `🟢 ${name} posted a status`);
          }
        } catch (_) { /* ignore */ }
        apiService.getStatuses().then((data) => {
          if (data?.success) setStatuses(data.statuses || []);
        }).catch(() => {});
      });

      // ── Someone posted a business on WINGA → live toast + refresh ──
      socket.on('winga:created', (listing) => {
        try {
          const posterId = String(listing?.user?._id || listing?.userId || '');
          const myId = String(currentUserIdRef.current || '');
          if (posterId && posterId !== myId && modsRef.current.activityNotifications !== false) {
            const name = listing?.user?.username || listing?.username || 'Someone';
            showActivityToastRef.current('winga', `🛍️ ${name} posted a business on WINGA`);
          }
        } catch (_) { /* ignore */ }
        fetchWingaRef.current();
      });

      // ── Someone placed an order on my listing → toast + refresh ──
      socket.on('winga:order', (order) => {
        try {
          const sellerId = String(order?.sellerId || order?.seller?._id || '');
          const myId = String(currentUserIdRef.current || '');
          if (sellerId && sellerId === myId && modsRef.current.activityNotifications !== false) {
            const buyer = order?.buyerUsername || 'Someone';
            const title = order?.listingTitle || 'listing';
            showActivityToastRef.current('winga', `🛍️ ${buyer} wants to buy "${title}"`);
          }
        } catch (_) { /* ignore */ }
        fetchWingaRef.current();
        fetchWingaOrdersRef.current();
      });

      // ── My order status changed (seller confirmed/declined) → toast + refresh ──
      socket.on('winga:order-updated', (order) => {
        try {
          const buyerId = String(order?.buyerId || order?.buyer?._id || '');
          const myId = String(currentUserIdRef.current || '');
          if (buyerId && buyerId === myId && modsRef.current.activityNotifications !== false) {
            const title = order?.listingTitle || 'listing';
            const msg =
              order?.status === 'confirmed' ? `✅ Seller confirmed your request for "${title}"` :
              order?.status === 'declined' ? `❌ Seller declined your request for "${title}"` :
              `📦 Your request for "${title}" has been updated`;
            showActivityToastRef.current('winga', msg);
          }
        } catch (_) { /* ignore */ }
        fetchWingaRef.current();
        fetchWingaOrdersRef.current();
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
        const incoming = msg;
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
              else if (incoming.messageType === 'contact') preview = '👤 Contact';
              else if (incoming.messageType === 'location') preview = '📍 Location';
              // BUG FIX: a text message that's just a URL (e.g. a shared group
              // invite link) used to show the whole raw link in the
              // notification body. Other apps never do that — show a clean
              // "🔗 Link" label instead, same as an image/video message.
              else if (/^https?:\/\/\S+$/i.test(preview.trim())) preview = '🔗 Link';
               notifyNewMessage(senderName, preview, incoming.conversationId);
               // BUG FIX: InAppNotification toast (App.jsx) was never fed data.
               // Dispatch a foreground in-app notification so the toast shows
               // while the user has the app open (push already covers bg).
               try {
                 window.dispatchEvent(new CustomEvent('genz-in-app-notification', {
                   detail: {
                     title: senderName,
                     message: preview,
                     avatar: incoming.sender?.profilePicture
                   }
                 }));
               } catch (_) { /* ignore */ }
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
              return [...prev, incoming].slice(-150); // keep only 150 messages in memory
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

      // ── Floating sticker broadcast ──
      socket.on('sticker:floating', (data) => {
        // Spawn locally for all clients in this chat
        setFloatingStickerHandlers(prev => {
          prev.forEach(h => h(data));
          return prev;
        });
      });

      // ✅ Badilisha temp message na ile ya kweli kutoka server (TOP-LEVEL, si ndani ya message:received)
      socket.on('message:sent', (confirmedMsg) => {
        try { playSentSound(); } catch (_) {}
        setMessages(prev => {
          const clientId = confirmedMsg.clientMessageId;
          const exists = prev.some(m => String(m._id) === String(confirmedMsg._id));

          if (exists) return prev; // Already exists, do not add it again

          if (clientId) {
            // Badilisha temp message
            return prev.map(m =>
              String(m._id) === String(clientId) || String(m.clientMessageId) === String(clientId)
                ? { ...confirmedMsg, status: 'sent' }
                : m
            );
          }

          // If there is no clientId, add it if it does not exist
          return [...prev, { ...confirmedMsg, status: 'sent' }];
        });
      });

      socket.on('notification:new_message', async (data) => {
        console.log('New message arrived from Socket (notification:new_message):', data);
        if (!data || !data.message) return;
        const incoming = data.message;
        
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
        else if (message?.messageType === 'contact') preview = '👤 Contact';
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
      socket.on('message:deleted', ({ messageId, forEveryone, deletedBy, reason } = {}) => {
        if (forEveryone && modsRef.current.antiDelete) {
          setMessages(prev => prev.map(m =>
            m._id === messageId ? { ...m, deletedForEveryone: true, _antiDeletePreserved: true } : m
          ));
        } else if (forEveryone || (deletedBy && String(deletedBy) === String(currentUserIdRef.current))) {
          // Delete for everyone removes the message for everyone.
          // Delete for me only removes it on the deleter's own client.
          setMessages(prev => prev.filter(m => m._id !== messageId));
        }
      });

      // ── Message edited ──
      socket.on('message:edited', (updatedMsg) => {
        setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
        try { DB.saveMessage(updatedMsg); } catch (e) { }
      });

      // ── Live location: coordinates updated on the original message ──
      socket.on('location:live:updated', ({ messageId, latitude, longitude, updatedAt } = {}) => {
        if (!messageId) return;
        setMessages(prev => prev.map(m =>
          String(m._id) === String(messageId)
            ? { ...m, latitude, longitude, isLiveLocation: true, liveLocationUpdatedAt: updatedAt }
            : m
        ));
      });

      // ── Live location: sender stopped sharing (manually or expired) ──
      socket.on('location:live:stopped', ({ messageId } = {}) => {
        if (!messageId) return;
        setMessages(prev => prev.map(m =>
          String(m._id) === String(messageId)
            ? { ...m, isLiveLocation: false }
            : m
        ));
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

      // ── View-once message revealed — notify the sender live, before the
      //    message is consumed (WhatsApp-style "opened" feedback) ──
      socket.on('message:revealed', ({ messageId, revealedAt } = {}) => {
        setOnlineNotification('👁️ Someone opened your view-once message');
        setTimeout(() => setOnlineNotification(null), 4000);
        setMessages(prev => prev.map(m =>
          (m._id === messageId || m.id === messageId) ? { ...m, revealedAt: revealedAt || m.revealedAt } : m
        ));
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
        // devices did), keep our own `blockedUsers` list in sync too, and
        // apply WhatsApp's hide-on-block / restore-on-unblock behavior.
        if (String(blockerId) === String(currentUserId)) {
          setBlockedUsers((prev) => {
            const list = prev || [];
            const already = list.some((id) => String(id) === String(targetUserId));
            if (blocked) return already ? list : [...list, targetUserId];
            return list.filter((id) => String(id) !== String(targetUserId));
          });

          if (blocked) {
            // Hide the 1:1 chat immediately; close it if it's open.
            setConversations((prev) =>
              prev.filter((c) => !isOneToOneWithUser(c, targetUserId, currentUserId))
            );
            setSelectedConversation((prev) =>
              prev && isOneToOneWithUser(prev, targetUserId, currentUserId) ? null : prev
            );
          } else {
            // Unblocked — refetch so the chat returns to the list.
            apiService.getConversations()
              .then((data) => {
                if (data?.success && Array.isArray(data.conversations)) {
                  setConversations((prev) => {
                    const map = new Map(prev.map((c) => [String(c._id), c]));
                    data.conversations.forEach((c) => map.set(String(c._id), c));
                    return Array.from(map.values());
                  });
                }
              })
              .catch(() => {});
          }
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
        setStatuses((prev) => prev.filter((s) =>
          String(s._id) !== String(statusId) && String(s.id) !== String(statusId)
        ));
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
  const processOfflineQueue = useCallback(async () => {
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
    // View-once messages get anti-screenshot protection by default; the sender
    // can opt INTO allowing screenshots via the composer toggle
    // (allowScreenshot: true). The backend persists this flag and reports
    // screenshot attempts to the sender via POST /messages/:id/screenshot-attempt.
    if (options.isViewOnce && typeof options.allowScreenshot !== 'boolean') {
      options = { ...options, allowScreenshot: false };
    }
    const targetConversationId = options.chatId || selectedConversation?._id;
    const messageType = options.messageType || 'text';
    let outboundContent = content;

    // Optimistic update — one client ID for UI, socket, and HTTP
    const clientMessageId = createClientMessageId();
    const optimisticMsg = {
      _id: clientMessageId,
      content: typeof outboundContent === 'string' ? outboundContent : '',
      sender: { _id: currentUserId, username: senderName || authUser?.username },
      messageType: messageType || 'text',
      status: 'sending',
      createdAt: new Date().toISOString(),
      conversationId: targetConversationId,
      clientMessageId,
      ...(options.mediaPreview ? { localPreview: options.mediaPreview } : {}),
      ...options,
    };

    setMessages(prev => [...prev, optimisticMsg]);

    const newMessage = {
      _id: clientMessageId,
      conversationId: targetConversationId || '1',
      sender: { _id: currentUserId, username: senderName || 'Me' },
      createdAt: new Date(),
      status: 'sent',
      clientMessageId,
      ...options,
      messageType,
      content: outboundContent,
      structuredContent: options.structuredContent || [],
    };

    // 1. Priority: Save to DB (local-first, doesn't block the UI)
    try {
      await DB.saveMessage(newMessage);
      if (selectedConversation && String(selectedConversation._id) === String(targetConversationId)) {
        const updatedConv = { ...selectedConversation, lastMessage: newMessage, updatedAt: new Date() };
        setConversations(prev => prev.map(c => c._id === updatedConv._id ? updatedConv : c));
        await DB.saveConversation(updatedConv);
      }
    } catch (dbError) {
      console.error('Error saving message to DB:', dbError);
    }
    const payload = {
        conversationId: newMessage.conversationId,
        content: newMessage.content,
        messageType: newMessage.messageType,
        messageId: newMessage._id,
        isViewOnce: Boolean(options.isViewOnce),
        isVideoNote: Boolean(options.isVideoNote),
        isSelfDestruct: Boolean(options.isSelfDestruct),
        selfDestructTimer: options.selfDestructTimer ?? null,
        allowScreenshot: typeof options.allowScreenshot === 'boolean' ? options.allowScreenshot : undefined,
        mediaUrl: options.mediaUrl || '',
        fileName: options.fileName || '',
        fileSize: options.fileSize || 0,
        duration: options.duration || 0,
        replyTo: options.replyTo?._id || options.replyTo?.id || options.replyTo || null,
        mentions: options.mentions || [],
        isForwarded: Boolean(options.isForwarded),
        caption: typeof options.caption === 'string' ? options.caption : '',
        structuredContent: options.structuredContent || [],
        // Location fields — previously missing here, so latitude/longitude/
        // isLiveLocation never reached the server no matter what ChatArea sent.
        latitude: typeof options.latitude === 'number' ? options.latitude : undefined,
        longitude: typeof options.longitude === 'number' ? options.longitude : undefined,
        isLiveLocation: Boolean(options.isLiveLocation),
        liveLocationExpiresAt: options.liveLocationExpiresAt || undefined,
        // Per-message font from the composer picker — previously missing here,
        // so the chosen font never reached the server or the recipient.
        font: typeof options.font === 'string' && options.font ? options.font : null
      };

      console.log("Saving message to DB for room:", newMessage.conversationId);

      let messageSent = false;
      let savedMessage = newMessage;
      let resolvedServerId = null;

      // 1. Priority: Use Socket first (real-time) — wait for delivery ack
      if (socketRef.current?.connected) {
        console.log("Sending message via Socket...");
        try {
          emitSafe('message:send', payload);
          messageSent = await new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              cleanup();
              resolve(false);
            }, 4000);
            const onDelivered = ({ messageId, serverMessageId }) => {
              if (String(messageId) !== String(clientMessageId)) return;
              cleanup();
              const serverId = serverMessageId || messageId;
              resolvedServerId = serverId;
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
          if (messageSent) console.log("Message sent via Socket");
        } catch (e) {
          console.error("Socket emit imefeli:", e);
        }
      }

      // 2. Fallback: If Socket is not working, use HTTP API
      if (!messageSent && navigator.onLine && isMongoObjectId(newMessage.conversationId)) {
        console.log("Socket not working, falling back to HTTP API...");
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
            resolvedServerId = savedMessage._id;
            try { await DB.deleteMessages([newMessage._id]); } catch (e) { }

            // Put it on screen (User A will see it)
            setMessages(prev => prev.map(m => m._id === clientMessageId ? savedMessage : m));
            await DB.saveMessage(savedMessage);
            console.log("Message saved successfully to Database:", savedMessage._id);
          } else {
            console.error("API response success false:", data);
          }
        } catch (e) {
          console.error("API error while sending:", e);
        }
      }

      // 4. If it failed, show the error on the message
      if (!messageSent) {
        setMessages(prev => prev.map(m =>
          m._id === clientMessageId ? { ...m, status: 'failed' } : m
        ));
      }

      // 3. If all attempts failed, enqueue the message
      if (!messageSent) {
        console.error("Message failed to send — no network or the server is down!");
        await DB.enqueueAction({ type: 'sendMessage', payload });
      }

      return { ok: messageSent, id: resolvedServerId || clientMessageId, clientMessageId };
  };

  // Resend a failed message. Looks up the failed message from state and
  // re-runs the same send path (socket -> HTTP fallback). Only acts on
  // messages whose current status is 'failed'.
  const handleRetryMessage = async (messageId) => {
    const message = (messages || []).find(
      (m) => (m._id === messageId || m.clientMessageId === messageId) && m.status === 'failed'
    );
    if (!message) return { ok: false, error: 'Message not found or not failed' };

    // Cap retries to avoid infinite retry loops when the server persistently
    // rejects a message (e.g. recipient blocked the user, invalid media, etc.)
    const retryCount = Number(message.retryCount || 0);
    if (retryCount >= 5) {
      return { ok: false, error: 'Max retries reached — please resend manually' };
    }

    // Pull the original send options back out of the stored message so the
    // retry is a faithful retransmission (same mediaUrl/type/reply/etc).
    const options = {};
    if (message.messageType) options.messageType = message.messageType;
    if (message.mediaUrl) options.mediaUrl = message.mediaUrl;
    if (message.fileName) options.fileName = message.fileName;
    if (message.fileSize) options.fileSize = message.fileSize;
    if (message.duration) options.duration = message.duration;
    if (message.replyTo) options.replyTo = message.replyTo;
    if (message.mentions) options.mentions = message.mentions;
    if (message.isViewOnce) options.isViewOnce = message.isViewOnce;
    if (message.isForwarded) options.isForwarded = message.isForwarded;
    if (message.structuredContent) options.structuredContent = message.structuredContent;
    if (message.isLiveLocation) options.isLiveLocation = message.isLiveLocation;
    if (message.latitude != null) options.latitude = message.latitude;
    if (message.longitude != null) options.longitude = message.longitude;
    if (message.thumbnail) options.thumbnail = message.thumbnail;
    options.retryCount = retryCount + 1;

    // Remove the failed marker so the UI goes back to "sending"/pending.
    setMessages(prev => prev.map(m =>
      (m._id === messageId || m.clientMessageId === messageId)
        ? { ...m, status: 'pending', retryCount: retryCount + 1 }
        : m
    ));

    const content = message.content || (message.messageType === 'image' ? 'Photo' : message.messageType === 'video' ? 'Video' : message.messageType === 'audio' ? 'Audio' : 'Message');
    const result = await sendMessage(content, authUser?.username || 'Me', options);

    // If the resend failed again and we've exhausted retries, persist a
    // non-retryable server-rejection error on the message so the UI can
    // surface it instead of silently looping.
    if (!result?.ok && retryCount + 1 >= 5) {
      const errMsg = message.errorMessage || 'Server rejected — max retries reached';
      setMessages(prev => prev.map(m =>
        (m._id === messageId || m.clientMessageId === messageId)
          ? { ...m, status: 'failed', errorMessage: errMsg, retryCount: retryCount + 1, nonRetryable: true }
          : m
      ));
    }
    return result;
  };
  // instead of creating a new chat message per tick.
  const updateLiveLocation = (messageId, latitude, longitude) => {
    if (!messageId || typeof latitude !== 'number' || typeof longitude !== 'number') return;
    setMessages(prev => prev.map(m =>
      String(m._id) === String(messageId) ? { ...m, latitude, longitude } : m
    ));
    emitSafe('location:live:update', { messageId, latitude, longitude });
  };

  // Sender ends their live location share.
  const stopLiveLocation = (messageId) => {
    if (!messageId) return;
    setMessages(prev => prev.map(m =>
      String(m._id) === String(messageId) ? { ...m, isLiveLocation: false } : m
    ));
    emitSafe('location:live:stop', { messageId });
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
    console.log('[ChatContext] selectConversation called with:', conv);
    
    if (!conv) {
      console.warn('[ChatContext] selectConversation called with null/undefined conversation');
      setSelectedConversation(null);
      clearStoredSelectedConversationId();
      setMessages([]);
      historyPageRef.current = 1;
      setHasOlderMessages(true);
      loadingOlderRef.current = false;
      return;
    }

    console.log('[ChatContext] Setting selected conversation:', conv._id);
    setSelectedConversation(conv);
    historyPageRef.current = 1;
    setHasOlderMessages(true);
    loadingOlderRef.current = false;
    
    if (conv._id) {
      setStoredSelectedConversationId(conv._id);
    }
    
    try {
      // Check for demo messages first
      if (ENABLE_DEMO_DATA && DEMO_MESSAGES[conv._id]) {
        console.log('[ChatContext] Loading demo messages for:', conv._id);
        setMessages(DEMO_MESSAGES[conv._id]);
        return;
      }

      const convId = conv._id;
      console.log('[ChatContext] Loading messages for conversation:', convId);
      let showedCache = false;

      if (isMongoObjectId(convId)) {
        console.log('[ChatContext] Conversation is MongoDB ObjectId, loading from IndexedDB');
        const offlineMsgs = await DB.getMessages(convId);
        console.log('[ChatContext] Offline messages found:', offlineMsgs?.length || 0);
        
        if (offlineMsgs?.length) {
          setMessages(offlineMsgs);
          showedCache = true;
        } else if (!showedCache) {
          setMessages([]);
        }

        if (socketRef.current) {
          console.log('[ChatContext] Emitting join:conversation for:', convId);
          socketRef.current.emit('join:conversation', convId);
        } else {
          console.warn('[ChatContext] Socket not available for join:conversation');
        }

        // Background sync — keeps chat active without clearing the UI
        apiService.getMessages(convId).then(async (remoteData) => {
          if (String(selectedConversationIdRef.current) !== String(convId)) return;
          if (!remoteData?.success) return;
          const decrypted = remoteData.messages || [];
          setMessages(decrypted);
          try {
            await Promise.all(decrypted.map((message) => DB.saveMessage(message)));
          } catch (_) { /* IndexedDB cache is best-effort */ }
        }).catch((apiError) => {
          console.warn('[ChatContext] Background message sync failed:', apiError?.message || apiError);
        });
        return;
      }

      console.log('[ChatContext] Conversation is not MongoDB ObjectId, loading directly');
      const offlineMsgs = await DB.getMessages(conv._id);
      if (offlineMsgs?.length) {
        setMessages(offlineMsgs);
      } else {
        setMessages([]);
      }
      if (socketRef.current) socketRef.current.emit('join:conversation', conv._id);
    } catch (err) {
      console.error('[ChatContext] Error loading messages:', err);
      setMessages([]);
    }
  };

  // Infinite scroll: fetch the next older page (50) of server history and
  // PREPEND it, preserving chat order. Returns true if a fetch was attempted.
  const loadOlderMessages = useCallback(async (convId = selectedConversation?._id) => {
    const id = String(convId || '');
    if (!id) return false;
    if (loadingOlderRef.current) return false;
    if (!hasOlderMessages) return false;
    loadingOlderRef.current = true;
    try {
      const page = historyPageRef.current + 1;
      const res = await apiService.getMessages(id, page, 50);
      if (String(selectedConversationIdRef.current) !== String(id)) return false;
      if (!res?.success) return false;
      const decrypted = res.messages || [];
      const totalPages = Number(res.pagination?.pages) || 0;
      setHasOlderMessages(page < totalPages && decrypted.length > 0);
      historyPageRef.current = page;
      if (decrypted.length) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => String(m._id || m.id)));
          const fresh = decrypted.filter(m => !existingIds.has(String(m._id || m.id)));
          if (!fresh.length) return prev;
          return [...fresh, ...prev];
        });
      }
      return true;
    } catch (err) {
      console.warn('[ChatContext] loadOlderMessages failed:', err?.message || err);
      return false;
    } finally {
      loadingOlderRef.current = false;
    }
  }, [selectedConversation?._id, hasOlderMessages]);

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

  const editMessage = async (id, newContent, newCaption) => {
    setMessages(prev => prev.map(m => {
      if (m._id === id) {
        const updated = { ...m, editedAt: new Date(), isEdited: true };
        if (newContent !== undefined) updated.content = newContent;
        if (newCaption !== undefined) updated.caption = newCaption;
        return updated;
      }
      return m;
    }));
    emitSafe('message:edit', { messageId: id, content: newContent, caption: newCaption });
  };

  const deleteMessage = async (id, forEveryone = false) => {
    setMessages(prev => prev.filter(m => m._id !== id));
    emitSafe('message:delete', { messageId: id, forEveryone });
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
      const token = getAuthToken();
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
    // Send via socket (real-time) + HTTP fallback (for APK where socket may
    // be unreliable). The HTTP fallback ensures the server-side unreadCount
    // stays in sync even if the socket event is lost during a cold start.
    emitSafe('mark_as_read', { chatId, userId: currentUserId, skipReadReceipts });
    // HTTP fallback — fire-and-forget, ensures the server is updated even if
    // the socket delivery fails (common on APK during network transitions).
    if (isMongoObjectId(chatId)) {
      authFetch(`${BACKEND_URL}/chat/messages/${chatId}/read`, { method: 'PUT' })
        .catch(() => {}); // best-effort — socket is primary
    }
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
      return { success: false, message: 'Restore is already in progress' };
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
      return { success: false, message: error.message || 'Failed to restore' };
    }
  };

  const deleteCloudBackup = async (backupId) => {
    try {
      await backupService.deleteBackup(backupId);
      return { success: true };
    } catch (error) {
      console.error('Cloud delete failed:', error);
      return { success: false, message: error.message || 'Failed to delete' };
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

  const uploadCollageImages = async (files) => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });

    try {
      const response = await authFetch(`${BACKEND_URL}/status/collage-upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        return data;
      } else {
        throw new Error(data.message || 'Collage upload failed');
      }
    } catch (error) {
      console.error('Error uploading collage images:', error);
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
    }
  }, [isAuthenticated, authLoading]);

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
        const [devicesData, modsData, broadcastsData, statusesData, conversationsData] = await Promise.allSettled([
          apiService.getDevices(),
          apiService.getGENZSettings(),
          apiService.getBroadcasts(),
          apiService.getStatuses(),
          apiService.getConversations()
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
          await loadContacts();
          console.log('[ChatContext] Contacts loaded successfully:', contacts.length);
        } catch (err) {
          console.error('[ChatContext] Failed to load contacts:', err);
        }

        // Log any errors
        const errors = [devicesData, modsData, broadcastsData, statusesData, conversationsData]
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

  const disable2FA = async (token) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/security/2fa/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token || '' })
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

  // ── WINGA marketplace functions ───────────────────────────────────────────
  const fetchWinga = useCallback(async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/winga`);
      const data = await response.json();
      if (data.success) {
        setWingaData({
          categories: data.categories || [],
          totalUnseen: data.totalUnseen || 0,
          myListings: data.myListings || [],
          postedToday: data.postedToday || 0,
          limit: data.limit || 15
        });
      }
      return data;
    } catch (err) {
      console.error('Fetch WINGA error:', err);
      return { success: false };
    }
  }, []);
  const fetchWingaRef = useRef(fetchWinga);
  useEffect(() => { fetchWingaRef.current = fetchWinga; }, [fetchWinga]);

  const createWingaListing = useCallback(async (listingData) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/winga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingData)
      });
      const data = await response.json();
      if (data.success) {
        await fetchWinga();
      }
      return data;
    } catch (err) {
      console.error('Create WINGA listing error:', err);
      return { success: false };
    }
  }, [fetchWinga]);

  const markWingaViewed = useCallback(async (listingId) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/winga/${encodeURIComponent(listingId)}/view`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        // Optimistic local update — mark as viewed without a full refetch.
        setWingaData(prev => {
          const cats = (prev.categories || []).map(c => ({
            ...c,
            unseen: Math.max(0, c.unseen - (c.listings.some(l => String(l._id) === String(listingId) && !l.viewedByMe) ? 1 : 0)),
            listings: c.listings.map(l => String(l._id) === String(listingId) ? { ...l, viewedByMe: true } : l)
          }));
          return {
            ...prev,
            categories: cats,
            totalUnseen: cats.reduce((sum, c) => sum + c.unseen, 0)
          };
        });
      }
      return data;
    } catch (err) {
      console.error('Mark WINGA viewed error:', err);
      return { success: false };
    }
  }, []);

  const uploadWingaMedia = useCallback(async (file, onProgress) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await authFetch(`${BACKEND_URL}/winga/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (onProgress && typeof onProgress === 'function') onProgress(100);
      return data;
    } catch (err) {
      console.error('Upload WINGA media error:', err);
      return { success: false };
    }
  }, []);

  const deleteWingaListing = useCallback(async (listingId) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/winga/${encodeURIComponent(listingId)}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        await fetchWinga();
      }
      return data;
    } catch (err) {
      console.error('Delete WINGA listing error:', err);
      return { success: false };
    }
  }, [fetchWinga]);

  const toggleWingaSold = useCallback(async (listingId) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/winga/${encodeURIComponent(listingId)}/sold`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        await fetchWinga();
      }
      return data;
    } catch (err) {
      console.error('Toggle WINGA sold error:', err);
      return { success: false };
    }
  }, [fetchWinga]);

  const rateWingaListing = useCallback(async (listingId, rating, comment) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/winga/${encodeURIComponent(listingId)}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment || '' })
      });
      const data = await response.json();
      if (data.success) {
        await fetchWinga();
      }
      return data;
    } catch (err) {
      console.error('Rate WINGA listing error:', err);
      return { success: false };
    }
  }, [fetchWinga]);

  const fetchWingaOrders = useCallback(async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/winga/orders`);
      const data = await response.json();
      if (data.success) {
        setWingaOrders(data.orders || []);
      }
      return data;
    } catch (err) {
      console.error('Fetch WINGA orders error:', err);
      return { success: false };
    }
  }, []);
  const fetchWingaOrdersRef = useRef(fetchWingaOrders);
  useEffect(() => { fetchWingaOrdersRef.current = fetchWingaOrders; }, [fetchWingaOrders]);

  const placeWingaOrder = useCallback(async (listingId, { quantity, message } = {}) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/winga/${encodeURIComponent(listingId)}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: quantity || 1, message: message || '' })
      });
      const data = await response.json();
      if (data.success) {
        await fetchWingaOrders();
      }
      return data;
    } catch (err) {
      console.error('Place WINGA order error:', err);
      return { success: false };
    }
  }, [fetchWingaOrders]);

  const updateWingaOrder = useCallback(async (orderId, status) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/winga/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        await fetchWingaOrders();
        await fetchWinga(); // a confirmed order marks the listing sold
      }
      return data;
    } catch (err) {
      console.error('Update WINGA order error:', err);
      return { success: false };
    }
  }, [fetchWingaOrders, fetchWinga]);

  useEffect(() => {
    if (!isAuthReady || (REQUIRE_AUTH && (authLoading || !isAuthenticated))) return;
    fetchGENZModsSettings();
    fetchBroadcasts();
    fetchStatuses();
    fetchWinga();
    fetchWingaOrders();
  }, [isAuthReady, authLoading, isAuthenticated, fetchStatuses, fetchWinga, fetchWingaOrders]);

  // ── A status was viewed in the feed → refresh so unseen badges update ──
  useEffect(() => {
    const handleStatusViewed = () => { fetchStatuses(); };
    window.addEventListener('genz-status-viewed', handleStatusViewed);
    return () => window.removeEventListener('genz-status-viewed', handleStatusViewed);
  }, [fetchStatuses]);

  // ── Keep mods in sync when the GENZ Mods page saves (it writes the backend
  // store directly and dispatches a 'storage' event, but ChatContext is the
  // runtime source of truth for behavior like ghost mode / freeze last seen) ──
  useEffect(() => {
    if (!isAuthReady || (REQUIRE_AUTH && (authLoading || !isAuthenticated))) return;
    const handleModsStorageSync = () => { fetchGENZModsSettings(); };
    window.addEventListener('storage', handleModsStorageSync);
    return () => window.removeEventListener('storage', handleModsStorageSync);
  }, [isAuthReady, authLoading, isAuthenticated]);

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

    // Refresh every 30 seconds for real-time status visibility (like WhatsApp)
    const refreshInterval = setInterval(refreshData, 30 * 1000);

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
        resolve({ success: false, error: 'You are offline right now (not connected)' });
        return;
      }

      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({ success: false, error: 'Request timed out, please try again (timeout)' });
      }, 15000);

      socketRef.current.emit('send_mass_message', {
        recipients: userIds,
        message: content,
        sender: currentUserId
      }, (ackResponse) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(ackResponse || { success: false, error: 'No response from server' });
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
      const token = getAuthToken();
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/admins/${memberId}`, {
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
      const token = getAuthToken();
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
      const token = getAuthToken();
      const apiUrl = BACKEND_URL;
      if (token && apiUrl) {
        fetch(`${apiUrl}/chat/conversations/${chatId}/pin`, {
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

  const toggleArchiveChat = (chatId) => {
    if (chatId) {
      // Optimistic update
      setConversations(prev => prev.map(c => {
        if (c._id === chatId) {
          const newState = !c.isArchived;
          return { ...c, isArchived: newState };
        }
        return c;
      }));
      setSelectedConversation(prev => prev && prev._id === chatId ? { ...prev, isArchived: !prev.isArchived } : prev);

      // API call
      const token = getAuthToken();
      const apiUrl = BACKEND_URL;
      if (token && apiUrl) {
        fetch(`${apiUrl}/chat/conversations/${chatId}/archive`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }).catch(err => console.error('Failed to archive chat:', err));
      }

      // Also emit socket for real-time updates
      emitSafe('archive_chat', { chatId });
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
    const storedPin = localStorage.getItem('genz_lock_pin');
    if (!storedPin) return false;
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
      const storedPin = localStorage.getItem('genz_lock_pin') || '';
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
  // Sticker pack catalog, downloads, favorites, recents, and sending now live
  // in StickerContext (frontend/src/context/StickerContext.jsx) so the sticker
  // feature is self-contained. Floating stickers stay here because they are
  // coupled to the socket and the selected conversation.
  const [floatingStickerHandlers, setFloatingStickerHandlers] = useState([]);
  
  const sendFloatingSticker = useCallback((stickerUrl, options = {}) => {
    if (!stickerUrl) return;
    const payload = {
      conversationId: options.chatId || selectedConversation?._id,
      stickerUrl,
      senderId: currentUserId,
      senderName: authUser?.username || 'Me',
      ...options,
      createdAt: new Date().toISOString(),
    };
    if (socketRef.current?.connected) {
      emitSafe('sticker:floating', payload);
    }
    // Spawn locally for the sender
    setFloatingStickerHandlers(prev => {
      prev.forEach(h => h(payload));
      return prev;
    });
  }, [selectedConversation, currentUserId, authUser]);
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
  const viewProfile = async (userId) => {
    try {
      emitSafe('visit_profile', {
        visitedUserId: userId,
        visitorId: currentUserId,
        visitorName: authUser?.username || localStorage.getItem('username') || 'Someone'
      });
      return { success: true };
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
      return { success: false, message: 'Failed to add contact' };
    }
  };

  const removeContact = async (contactId) => {
    try {
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
        // WhatsApp: hide the 1:1 chat immediately (don't wait for the socket relay)
        setConversations(prev => prev.filter((c) => !isOneToOneWithUser(c, userId, currentUserId)));
        setSelectedConversation(prev => (prev && isOneToOneWithUser(prev, userId, currentUserId) ? null : prev));
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
      const token = getAuthToken();
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
        // WhatsApp: unblocked — refetch so the chat returns to the list.
        apiService.getConversations()
          .then((res) => {
            if (res?.success && Array.isArray(res.conversations)) {
              setConversations((prev) => {
                const map = new Map(prev.map((c) => [String(c._id), c]));
                res.conversations.forEach((c) => map.set(String(c._id), c));
                return Array.from(map.values());
              });
            }
          })
          .catch(() => {});
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
      const token = getAuthToken();
      const response = await authFetch(`${BACKEND_URL}/auth/profile`, {
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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

  // Fetch a view-once message's real content. The feed APIs strip it, so this
  // is the only way a receiver gets it — once, before the message is consumed.
  const revealViewOnce = async (messageId) => {
    const response = await authFetch(`${BACKEND_URL}/chat/messages/${messageId}/view-once-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || 'View once message unavailable');
    }
    return data;
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/ban/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const unbanGroupMember = async (groupId, userId) => {
    try {
      const token = getAuthToken();
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/ban/${userId}`, {
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

  const getGroupBannedMembers = async (groupId) => {
    try {
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
      const response = await authFetch(`${BACKEND_URL}/chat/groups/${groupId}/antispam`, {
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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
      const token = getAuthToken();
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

  // ── Per-user unseen status / WINGA maps (chatlist symbols + badges) ──────
  const myIdStr = String(currentUserId || '');
  const unviewedStatusByUser = React.useMemo(() => {
    const map = {};
    (statuses || []).forEach((s) => {
      const uid = String(s.userId || s.user?._id || s.user || '');
      if (!uid || uid === myIdStr) return;
      const alreadyViewed = (s.views || []).some((v) => String(v.user?._id || v.user) === myIdStr);
      if (!alreadyViewed) map[uid] = (map[uid] || 0) + 1;
    });
    return map;
  }, [statuses, myIdStr]);

  const statusUnseenCount = React.useMemo(
    () => Object.values(unviewedStatusByUser).reduce((sum, n) => sum + n, 0),
    [unviewedStatusByUser]
  );

  const wingaByUser = React.useMemo(() => {
    const map = {};
    (wingaData?.categories || []).forEach((c) => {
      (c.listings || []).forEach((l) => {
        const uid = String(l.user?._id || l.userId || '');
        if (!uid || uid === myIdStr) return;
        const entry = map[uid] || { count: 0, unseen: 0, thumb: '', title: '' };
        entry.count += 1;
        if (!l.viewedByMe) entry.unseen += 1;
        if (!entry.thumb && l.media?.[0]?.url) {
          entry.thumb = l.media[0].url;
          entry.title = l.title || '';
        }
        map[uid] = entry;
      });
    });
    return map;
  }, [wingaData, myIdStr]);

  const contextValue = React.useMemo(() => ({
    user, conversations, setConversations,
    selectedConversation, selectConversation,
    messages, setMessages,
    loading, setLoading,
    sendMessage, editMessage, deleteMessage, clearChat, deleteChat,
    handleRetryMessage, addReaction, forwardMessage, markAsRead,
    updateLiveLocation, stopLiveLocation,
    isOtherUserTyping, sendTypingStatus, typingByConversation,
    isOtherUserRecording, sendRecordingStatus,
    isAutoRefreshing,
    onlineNotification, broadcasts, sendMassMessage, createBroadcastList,
    statuses, addStatus, uploadStatusMedia, uploadCollageImages, statusViewers, viewStatus,
    onlineUsers, awayUsers, lastSeenByUser, profileVisitors,
    showProfileEditor, setShowProfileEditor,
    contacts, refreshContacts: loadContacts, addContact, removeContact, updateContact,
    blockedUsers, blockUser, unblockUser,
    createPoll, votePoll, scheduleMessage, scheduledMessages,
    updateGroupMember, joinGroup, updateDisappearingMessages,
    toggleAdminOnlyMessaging, updateGroupPermission, createCustomRole, assignRole,
    togglePinChat, toggleMuteChat, toggleArchiveChat,
    pinMessage, unpinMessage, pinnedMessages,
    presenceHistory, unlockedSessionChats, verifyChatUnlock, toggleChatLock,
    sendFloatingSticker, floatingStickerHandlers, setFloatingStickerHandlers,
    toggleStarMessage, toggleMessageLock, viewProfile,
    // New WhatsApp features
    searchMessages, getMediaGallery, getMessageInfo, revealViewOnce, markViewOnceViewed,
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
    loadOlderMessages, hasOlderMessages,
    // Broadcast functions
    fetchBroadcasts, createBroadcast, updateBroadcast,
    deleteBroadcast, sendBroadcastMessage,
    // Status functions
    fetchStatuses, createStatus, deleteStatus,
    replyToStatus,
    // WINGA marketplace
    wingaData, fetchWinga, createWingaListing, markWingaViewed,
    uploadWingaMedia, deleteWingaListing, toggleWingaSold, rateWingaListing,
    wingaOrders, fetchWingaOrders, placeWingaOrder, updateWingaOrder,
    statusUnseenCount, unviewedStatusByUser, wingaByUser,
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
    isOtherUserTyping, isOtherUserRecording, typingByConversation,
    onlineNotification, broadcasts, statuses, statusViewers,
    onlineUsers, awayUsers, lastSeenByUser, profileVisitors, showProfileEditor,
    contacts, blockedUsers, scheduledMessages, pinnedMessages,
    presenceHistory, unlockedSessionChats,
    connectedDevices, sessions, notifications,
    statusPrivacy, backupProgress, notificationSound, mods,
    isSocketConnected, isDNDMode, appTheme,
    fetchStatuses, createStatus, deleteStatus, replyToStatus,
    wingaData, fetchWinga, createWingaListing, markWingaViewed,
    uploadWingaMedia, deleteWingaListing, toggleWingaSold, rateWingaListing,
    wingaOrders, fetchWingaOrders, placeWingaOrder, updateWingaOrder,
    statusUnseenCount, unviewedStatusByUser, wingaByUser,
    listCloudBackups, restoreCloudBackup, deleteCloudBackup,
    loadOlderMessages, hasOlderMessages
  ]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);


