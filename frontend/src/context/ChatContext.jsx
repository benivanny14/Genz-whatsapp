import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { DB } from '../services/db';
import { registerServiceWorker, notifyNewMessage, notifyIncomingCall, showLocalNotification } from '../services/notifications';
import { isOffline } from '../services/api';
import apiService from '../services/apiService';
import backupService from '../services/backupService';
import { useAuth } from './AuthContext';
import { authFetch } from '../utils/authFetch';
import { cleanupLocalBlobUrls, sanitizeBlobUrls } from '../utils/sanitizeStorage';
import encryptionService from '../services/encryptionService';
import { decryptMessageContent, decryptMessagesList } from '../utils/e2eeMessage';
import { isClientE2EEMessageContent } from '../utils/e2eeContent';
import notificationService from '../services/notificationService';

export const ChatContext = createContext();

const BACKEND_URL = 'https://genz-whatsapp.onrender.com';
const SOCKET_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL || BACKEND_URL;
/** Mongo-style demo fallback when no JWT user is present (dev / optional demo mode) */
const UNAUTHENTICATED_FALLBACK_USER_ID = '60d5ecb8b392cb371c664c12';
const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH !== 'false';
const ENABLE_DEMO_DATA = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';

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
const GENZ_SETTINGS_KEY = 'genz_settings_comprehensive';

const DEFAULT_GENZ_SETTINGS = {
  mods: {
    antiDelete: true,
    ghostMode: false,
    hideLastSeen: true,
    freezeLastSeen: false,
    antiViewOnce: true,
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
    chatMusicUrl: ''
  },
  appTheme: 'dark',
  statusPrivacy: 'everyone',
  notificationSound: 'default',
  isDNDMode: false
};

// Safe load GENZ settings from localStorage
const loadGENZSettings = () => {
  try {
    cleanupLocalBlobUrls();
    const saved = localStorage.getItem(GENZ_SETTINGS_KEY);
    if (saved) {
      const parsed = sanitizeBlobUrls(JSON.parse(saved)).value;
      // Merge with defaults to prevent undefined values
      return {
        mods: { ...DEFAULT_GENZ_SETTINGS.mods, ...(parsed.mods || {}) },
        appTheme: parsed.appTheme || DEFAULT_GENZ_SETTINGS.appTheme,
        statusPrivacy: parsed.statusPrivacy || DEFAULT_GENZ_SETTINGS.statusPrivacy,
        notificationSound: parsed.notificationSound || DEFAULT_GENZ_SETTINGS.notificationSound,
        isDNDMode: parsed.isDNDMode !== undefined ? parsed.isDNDMode : DEFAULT_GENZ_SETTINGS.isDNDMode
      };
    }
  } catch (e) {
    console.error('Failed to load GENZ settings:', e);
  }
  return DEFAULT_GENZ_SETTINGS;
};

// Safe save GENZ settings to localStorage
const saveGENZSettings = (settings) => {
  try {
    localStorage.setItem(GENZ_SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem('genz_mods', JSON.stringify(settings.mods || {}));
  } catch (e) {
    console.error('Failed to save GENZ settings:', e);
  }
};

const isMongoObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''));
let clientMessageCounter = 0;
const createClientMessageId = (prefix = 'client-message') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  clientMessageCounter = (clientMessageCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}-${Date.now()}-${clientMessageCounter}-${Math.random().toString(36).slice(2, 8)}`;
};

import { applyVoiceEffect } from '../utils/voiceEffects';
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
  const modsRef = useRef({});  // keep mods accessible in socket callbacks
  const { isAuthenticated, loading: authLoading, user: authUser, isAuthReady } = useAuth();

  const currentUserId = React.useMemo(
    () => (authUser?._id ? String(authUser._id) : UNAUTHENTICATED_FALLBACK_USER_ID),
    [authUser?._id]
  );

  // Core state
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [onlineNotification, setOnlineNotification] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [statusViewers, setStatusViewers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [profileVisitors, setProfileVisitors] = useState([]);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState({});
  const [presenceHistory, setPresenceHistory] = useState({});
  // Load unlocked session chats from localStorage on mount
  const [unlockedSessionChats, setUnlockedSessionChats] = useState(() => {
    try {
      const stored = localStorage.getItem('unlockedSessionChats');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
      return new Set();
    }
  });
  const [stickerPacks, setStickerPacks] = useState([]);
  const [downloadedStickers, setDownloadedStickers] = useState([]);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isOtherUserRecording, setIsOtherUserRecording] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

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

      // Save FULL mods (including wallpaper) to localStorage
      try { localStorage.setItem('genz_mods', JSON.stringify(newMods)); } catch (e) { }

      // Sync to IndexedDB (full) and backend (stripped) asynchronously
      Promise.resolve().then(async () => {
        try { await DB.saveSetting('mods', newMods); } catch (e) { }
        try {
          await authFetch(`${BACKEND_URL}/api/genz-mods/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stripLocalOnlyData(newMods))
          });
        } catch (e) { }
      });
      return newMods;
    });
  }, []);

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

  }, [mods.fontFamily, mods.fontSize, mods.bubbleSentColor, mods.bubbleReceivedColor, mods.bubbleStyle, mods.tickStyle, mods.bubbleAnimations]);

  // ── Load GENZ settings from localStorage on mount ──
  useEffect(() => {
    const savedSettings = loadGENZSettings();
    if (savedSettings) {
      setModsState(prev => ({ ...prev, ...savedSettings.mods }));
      setStatusPrivacy(savedSettings.statusPrivacy);
      setNotificationSound(savedSettings.notificationSound);
      setIsDNDMode(savedSettings.isDNDMode);
      setAppTheme(savedSettings.appTheme);
    }
  }, []);

  // ── Persist mods ref for socket callbacks ──
  useEffect(() => { modsRef.current = mods; }, [mods]);
  useEffect(() => { isDNDModeRef.current = isDNDMode; }, [isDNDMode]);

  // ── Persist unlocked session chats to localStorage ──
  useEffect(() => {
    try {
      localStorage.setItem('unlockedSessionChats', JSON.stringify(Array.from(unlockedSessionChats)));
    } catch (e) {
      console.error('Failed to save unlocked session chats:', e);
    }
  }, [unlockedSessionChats]);

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
      saveGENZSettings(settings);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [mods, statusPrivacy, notificationSound, isDNDMode, appTheme]);

  const remoteSettingsSyncReady = useRef(false);

  useEffect(() => {
    if (!isAuthReady || (REQUIRE_AUTH && (authLoading || !isAuthenticated))) return;

    if (!remoteSettingsSyncReady.current) {
      remoteSettingsSyncReady.current = true;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await authFetch(`${BACKEND_URL}/api/genz-mods/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stripLocalOnlyData(mods))
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
          const storedId = localStorage.getItem('selectedConversationId');
          if (storedId) {
            const matched = offlineConvs.find(c => c._id === storedId);
            if (matched) {
              selectConversation(matched);
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

      socket = io(BACKEND_URL, {
        auth: {
          token: token || undefined,
          userId: userId,
          freezeLastSeen: modsRef.current.freezeLastSeen
        },
        reconnection: true,
        reconnectionAttempts: 3, // Limit reconnection attempts to prevent errors
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        timeout: 10000,
        transports: ['websocket', 'polling'], // Add polling as fallback
        withCredentials: true,
        forceNew: true,
        autoConnect: false // Don't auto-connect, connect manually
      });
      socketRef.current = socket;

      // Manual connection with error handling
      const connectSocket = () => {
        if (!socket.connected && !isOffline()) {
          socket.connect();
        }
      };

      // Delay connection to prevent immediate 426 errors
      const connectionTimeout = setTimeout(() => {
        connectSocket();
      }, 1000);

      socket.on('connect', () => {
        console.log('Socket connected successfully');
        setIsSocketConnected(true);
        socket.emit('user:join', userId);
        window.dispatchEvent(new Event('process-offline-queue'));
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

      socket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setIsSocketConnected(true);
        let uid = currentUserId;
        try {
          const u = authUser || JSON.parse(localStorage.getItem('user') || 'null');
          if (u?._id) uid = u._id;
        } catch (_) { /* */ }
        socket.emit('user:join', uid);
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Socket reconnection attempt:', attemptNumber);
      });

      socket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed');
        setIsSocketConnected(false);
      });

      // ── Incoming message ──
      socket.on('message:received', async (msg) => {
        const incoming = await decryptMessageContent(msg);
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
              const preview = typeof incoming.content === 'string' ? incoming.content : 'New message';
              notifyNewMessage(senderName, preview, incoming.conversationId);
              setOnlineNotification(`New message from ${senderName}`);
              setTimeout(() => setOnlineNotification(null), 3000);
            }
            return [...prev, incoming];
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
        setConversations(prev => prev.map(c =>
          c._id === incoming.conversationId ? { ...c, lastMessage: incoming, updatedAt: new Date() } : c
        ));
      });

      socket.on('notification:mention', async ({ conversationId, message }) => {
        const senderName = message?.sender?.username || 'Someone';
        const preview = typeof message?.content === 'string'
          ? message.content
          : 'You were mentioned in a message';
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
      socket.on('message:deleted', ({ messageId, forEveryone }) => {
        if (forEveryone && modsRef.current.antiDelete) {
          // Mark as "deleted" but keep content visible
          setMessages(prev => prev.map(m =>
            m._id === messageId ? { ...m, deletedForEveryone: true, _antiDeletePreserved: true } : m
          ));
        } else {
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
      socket.on('conversation:pinned', ({ chatId, messageId }) => {
        setConversations(prev => prev.map(c => c._id === chatId ? { ...c, pinnedMessages: [...(c.pinnedMessages || []), messageId] } : c));
        setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, pinnedMessages: [...(prev.pinnedMessages || []), messageId] } : prev);
      });
      socket.on('conversation:unpinned', ({ chatId }) => {
        setConversations(prev => prev.map(c => c._id === chatId ? { ...c, pinnedMessages: [] } : c));
        setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, pinnedMessages: [] } : prev);
      });

      // ── Chat pinned/unpinned (conversation-level) ──
      socket.on('chat:pinned', ({ chatId, isPinned }) => {
        setConversations(prev => prev.map(c => c._id === chatId ? { ...c, isPinned } : c));
        setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, isPinned } : prev);
      });

      socket.on('chat_pinned_signal', ({ chatId, isPinned }) => {
        setConversations(prev => prev.map(c => c._id === chatId ? { ...c, isPinned } : c));
        setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, isPinned } : prev);
      });

      // ── Chat archived/unarchived ──
      socket.on('chat:archived', ({ chatId, isArchived }) => {
        setConversations(prev => prev.map(c => c._id === chatId ? { ...c, isArchived } : c));
        setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, isArchived } : prev);
      });

      socket.on('chat_archived_signal', ({ chatId, isArchived }) => {
        setConversations(prev => prev.map(c => c._id === chatId ? { ...c, isArchived } : c));
        setSelectedConversation(prev => (prev && prev._id === chatId) ? { ...prev, isArchived } : prev);
      });

      // ── Message forwarded ──
      socket.on('message:forwarded', ({ messageId, targetConversationIds }) => {
        // Update message forward count
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, forwardCount: (m.forwardCount || 0) + 1 } : m));
      });

      // ── Group updated ──
      socket.on('group:updated', ({ groupId, updates }) => {
        setConversations(prev => prev.map(conv =>
          conv._id === groupId ? { ...conv, groupName: updates.groupName || conv.groupName, groupPhoto: updates.groupPhoto || conv.groupPhoto } : conv
        ));
        setSelectedConversation(prev => (prev && prev._id === groupId) ? { ...prev, groupName: updates.groupName || prev.groupName, groupPhoto: updates.groupPhoto || prev.groupPhoto } : prev);
      });

      // ── Admin removed ──
      socket.on('admin:removed', ({ groupId, userId }) => {
        // Refresh group info
        if (selectedConversation?._id === groupId) {
          setSelectedConversation(prev => prev ? { ...prev, admins: prev.admins?.filter(a => a !== userId) } : prev);
        }
      });

      // ── View-once message viewed ──
      socket.on('message:view-once-viewed', ({ messageId }) => {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isViewOnce: false, viewedAt: new Date() } : m));
      });

      // Read receipts — update state AND IndexedDB ──
      socket.on('message:read_receipt', async ({ messageId }) => {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'read' } : m));
        try { await DB.saveMessage({ _id: messageId, status: 'read' }); } catch (e) { }
      });

      // ── Delivered receipt ──
      socket.on('message:delivered', async ({ messageId }) => {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'delivered' } : m));
        try { await DB.saveMessage({ _id: messageId, status: 'delivered' }); } catch (e) { }
      });

      // ── Typing indicators ──
      socket.on('user:typing', ({ userId, isTyping }) => {
        if (userId !== currentUserId) setIsOtherUserTyping(isTyping);
      });

      socket.on('user:recording', ({ userId }) => {
        if (userId !== currentUserId) setIsOtherUserRecording(true);
        setTimeout(() => setIsOtherUserRecording(false), 3000);
      });

      // ── Calls (Phase 8 WebRTC signaling) ──
      socket.on('call:incoming', ({ callerId, callType, conversationId, offer }) => {
        // Resolve caller name from conversations list
        let callerName = 'Unknown';
        let callerPicture = '';
        const matchingConv = conversationsRef.current?.find(c =>
          c.participants?.some(p => (p?._id || p)?.toString() === callerId?.toString())
        );
        if (matchingConv) {
          const callerParticipant = matchingConv.participants.find(p => (p?._id || p)?.toString() === callerId?.toString());
          callerName = callerParticipant?.username || 'Unknown';
          callerPicture = callerParticipant?.profilePicture || '';
        }
        setActiveCall({
          type: callType,
          callerId,
          callerName,
          callerPicture,
          conversationId,
          status: 'incoming',
          offer,
          user: { _id: callerId, username: callerName, profilePicture: callerPicture }
        });
        // Push notification for incoming call
        notifyIncomingCall(callerName, callType);
      });

      // ── Presence ──
      socket.on('user:online', ({ userId, username }) => {
        setOnlineUsers(prev => [...new Set([...prev, userId])]);
        if (username) {
          setOnlineNotification(`${username} is now online`);
          setTimeout(() => setOnlineNotification(null), 3000);
        }
      });

      // ── Reactions ──
      socket.on('reaction:added', (updatedMsg) => {
        setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
      });

      // ── Calls (Phase 8 WebRTC signaling) ──
      socket.on('call:accepted', () => {
        setActiveCall(prev => prev ? { ...prev, status: 'connected' } : prev);
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
      socket.on('webrtc:offer', (data) => {
        socket.emit('webrtc:answer_needed', data);
      });

      // ── Status ──
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

      return () => {
        // Safe cleanup - remove all listeners first
        clearTimeout(connectionTimeout);
        if (socket) {
          socket.removeAllListeners();
          if (socket.connected) {
            socket.disconnect();
          }
        }
        socketRef.current = null;
        setIsSocketConnected(false);
      };
    } catch (err) {
      console.warn('Socket connection failed (offline mode active):', err);
      // Ensure cleanup even on error
      if (socket) {
        socket.removeAllListeners();
        socketRef.current = null;
      }
    }
  }, [isAuthenticated, authLoading, authUser?._id]);


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
  // Watches for incoming messages and auto-replies if the mod is enabled
  const autoReplyTimerRef = useRef(null);
  useEffect(() => {
    if (!mods.autoReply || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    // Only reply to messages from OTHER users, not my own
    const isFromOther = lastMsg?.sender?._id !== currentUserId &&
      lastMsg?.sender?.username !== 'Me' &&
      lastMsg?.sender?.username !== 'System';
    if (!isFromOther) return;
    // Avoid double-replying to same message
    if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current);
    autoReplyTimerRef.current = setTimeout(() => {
      const replyText = mods.autoReplyMsg || "I'm currently unavailable. I'll reply soon! 🤖";
      sendMessage(replyText, 'Me', { isAutoReply: true });
    }, 1500);
    return () => { if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current); };
  }, [messages, mods.autoReply, mods.autoReplyMsg]);

  // ── Self-Destruct Timer (Item 4) ──
  // When a self-destruct message is received from others, delete it after 10 seconds once visible
  const selfDestructTimers = useRef(new Set());
  useEffect(() => {
    const selfDestructMsgs = messages.filter(
      m => m.isSelfDestruct && m.sender?._id !== currentUserId && !m._selfDestructScheduled
    );

    if (selfDestructMsgs.length > 0) {
      setMessages(prev => prev.map(m => {
        if (m.isSelfDestruct && m.sender?._id !== currentUserId && !m._selfDestructScheduled) {
          const msgId = m._id;
          if (!selfDestructTimers.current.has(msgId)) {
            selfDestructTimers.current.add(msgId);
            setTimeout(async () => {
              setMessages(current => current.filter(msg => msg._id !== msgId));
              try { await DB.saveMessage({ _id: msgId, _deleted: true }); } catch (e) { }
              selfDestructTimers.current.delete(msgId);
            }, 10000);
          }
          return { ...m, _selfDestructScheduled: true };
        }
        return m;
      }));
    }
  }, [messages, currentUserId]);

  // ── Core messaging ──
  const sendMessage = async (content, senderName, options = {}) => {
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

    const newMessage = {
      _id: createClientMessageId(),
      conversationId: selectedConversation?._id || '1',
      sender: { _id: currentUserId, username: senderName || 'Me' },
      createdAt: new Date(),
      status: 'sent',
      ...options,
      messageType,
      content: outboundContent,
      ...(outboundContent !== content ? { isClientE2EE: true } : {}),
    };
    setMessages(prev => [...prev, newMessage]);
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
        ...options
      };

      if (socketRef.current?.connected) {
        emitSafe('message:send', payload);
      } else if (navigator.onLine && isMongoObjectId(newMessage.conversationId)) {
        try {
          const data = await apiService.sendMessage(
            newMessage.conversationId,
            newMessage.content,
            newMessage.messageType,
            options
          );
          if (data?.success && data.message) {
            try { await DB.deleteMessages([newMessage._id]); } catch (e) { }
            setMessages(prev => prev.map(m => m._id === newMessage._id ? data.message : m));
            await DB.saveMessage(data.message);
          } else {
            await DB.enqueueAction({ type: 'sendMessage', payload });
          }
        } catch (e) {
          await DB.enqueueAction({ type: 'sendMessage', payload });
        }
      } else {
        await DB.enqueueAction({ type: 'sendMessage', payload });
      }
    } catch (err) { console.error('Error saving message:', err); }
  };

  const selectConversation = async (conv) => {
    setSelectedConversation(conv);
    if (!conv) {
      localStorage.removeItem('selectedConversationId');
      setMessages([]);
      return;
    }
    if (conv._id) {
      localStorage.setItem('selectedConversationId', conv._id);
    }
    try {
      // Check for demo messages first
      if (ENABLE_DEMO_DATA && DEMO_MESSAGES[conv._id]) {
        setMessages(DEMO_MESSAGES[conv._id]);
        return;
      }

      if (isMongoObjectId(conv._id)) {
        try {
          const remoteData = await apiService.getMessages(conv._id);
          if (remoteData?.success) {
            const decrypted = await decryptMessagesList(remoteData.messages || []);
            setMessages(decrypted);
            try {
              await Promise.all(decrypted.map((message) => DB.saveMessage(message)));
            } catch (_) { /* IndexedDB cache is best-effort */ }
            if (socketRef.current) socketRef.current.emit('join:conversation', conv._id);
            return;
          }
        } catch (apiError) {
          console.warn('[ChatContext] Remote messages unavailable, using offline cache:', apiError.message);
        }
      }

      const offlineMsgs = await DB.getMessages(conv._id);
      if (offlineMsgs && offlineMsgs.length > 0) {
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

  const addReaction = (messageId, emoji) => {
    setMessages(prev => prev.map(m => {
      if (m._id === messageId) {
        const reactions = m.reactions || [];
        return { ...m, reactions: [...reactions, { emoji, user: currentUserId }] };
      }
      return m;
    }));
    emitSafe('reaction:add', { messageId, emoji });
  };

  const markAsRead = (chatId) => {
    if (!modsRef.current.hideReadReceipts) {
      emitSafe('mark_as_read', { chatId, userId: currentUserId });
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

  // ── Calls (Phase 8) ──
  const getOtherParticipantId = useCallback((conversation) => {
    if (!conversation?.participants?.length) return null;
    const me = currentUserId;
    const other = conversation.participants.find((p) => {
      const id = p?._id || p;
      return id?.toString() !== me?.toString();
    });
    return other?._id || other || null;
  }, [currentUserId]);

  const initiateCall = (type, conversationOrUser) => {
    const conversation = conversationOrUser?.participants
      ? conversationOrUser
      : selectedConversation;
    const calleeId = getOtherParticipantId(conversation);
    const callData = {
      type,
      user: conversationOrUser,
      status: 'calling',
      conversationId: conversation?._id,
      calleeId
    };
    setActiveCall(callData);
    emitSafe('call:start', {
      conversationId: conversation?._id,
      callType: type,
      calleeId
    });
  };

  const endCall = () => {
    if (activeCall) {
      emitSafe('call:end', {
        conversationId: activeCall.conversationId,
        targetUserId: activeCall.calleeId,
        callType: activeCall.type
      });
    }
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
  const acceptCall = () => {
    if (activeCall) {
      emitSafe('call:accept', { conversationId: activeCall.conversationId, callerId: activeCall.callerId });
      setActiveCall(prev => prev ? { ...prev, status: 'connected' } : prev);
    }
  };
  const rejectCall = () => {
    if (activeCall) emitSafe('call:reject', { conversationId: activeCall.conversationId, callerId: activeCall.callerId });
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
  const getMessageStats = () => {
    const total = messages.length;
    const byType = messages.reduce((acc, m) => {
      const type = m.messageType || 'text';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    const sentByMe = messages.filter(m =>
      m.sender?._id === currentUserId || m.sender?.username === 'Me'
    ).length;
    const received = total - sentByMe;
    const today = messages.filter(m => {
      const d = new Date(m.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    return { total, byType, sentByMe, received, today };
  };

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
  const exportBackup = async () => {
    try {
      const allConvs = await DB.getConversations();
      const allMsgs = [];
      for (const conv of (allConvs || [])) {
        const msgs = await DB.getMessages(conv._id);
        allMsgs.push(...(msgs || []));
      }
      const blob = new Blob([JSON.stringify({ conversations: allConvs, messages: allMsgs, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `GENZ_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { console.error('Backup export failed:', e); }
  };

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
      const response = await authFetch(`${BACKEND_URL}/api/scheduled-messages`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/scheduled-messages/${scheduledMessageId}`, {
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
        ? `${BACKEND_URL}/api/scheduled-messages?conversationId=${conversationId}`
        : `${BACKEND_URL}/api/scheduled-messages`;
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
      const response = await authFetch(`${BACKEND_URL}/api/advanced/status/upload`, {
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
            } catch (_) { /* IndexedDB cache is best-effort */ }
            const storedId = localStorage.getItem('selectedConversationId');
            if (storedId) {
              const matched = remoteConversations.find(c => c._id === storedId);
              if (matched) {
                selectConversation(matched);
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
      const response = await authFetch(`${BACKEND_URL}/api/security/2fa/generate`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/security/2fa/verify`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/security/2fa/disable`, {
        method: 'POST'
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Disable 2FA error:', err);
      return { success: false, message: 'Failed to disable 2FA' };
    }
  };

  const sendEmailVerification = async (email) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/security/email/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Send email verification error:', err);
      return { success: false, message: 'Failed to send verification email' };
    }
  };

  const verifyEmail = async (token) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/security/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Verify email error:', err);
      return { success: false, message: 'Failed to verify email' };
    }
  };

  const resendEmailVerification = async (email) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/security/email/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Resend email verification error:', err);
      return { success: false, message: 'Failed to resend verification email' };
    }
  };

  const sendPasswordReset = async (email) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/security/password/send-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Send password reset error:', err);
      return { success: false, message: 'Failed to send password reset email' };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/security/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Reset password error:', err);
      return { success: false, message: 'Failed to reset password' };
    }
  };

  // ── GENZ Mods Functions ──
  const fetchGENZModsSettings = async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/genz-mods/settings`);
      const data = await response.json();
      if (data.success) {
        // MERGE with local state to preserve local-only data (wallpapers, etc.)
        setModsState(prev => ({ ...prev, ...(data.settings || {}) }));
      }
      return data;
    } catch (err) {
      console.error('Fetch GENZ mods settings error:', err);
      return { success: false };
    }
  };

  const saveGENZModsSettings = async (settings) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/genz-mods/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stripLocalOnlyData(settings))
      });
      const data = await response.json();
      if (data.success) {
        // MERGE with local state to preserve local-only data (wallpapers, etc.)
        setModsState(prev => ({ ...prev, ...(data.settings || {}) }));
      }
      return data;
    } catch (err) {
      console.error('Save GENZ mods settings error:', err);
      return { success: false };
    }
  };

  const fetchDeletedMessages = async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/genz-mods/deleted-messages`);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Fetch deleted messages error:', err);
      return { success: false, messages: [] };
    }
  };

  const restoreDeletedMessage = async (messageId) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/genz-mods/restore-message/${messageId}`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/genz-mods/auto-reply`, {
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

  const getUserStatusWithGhostMode = async (userId) => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/genz-mods/user-status/${userId}`);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Get user status error:', err);
      return { success: false };
    }
  };

  // ── Broadcast Functions ──
  const fetchBroadcasts = async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/advanced/broadcast`);
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
      const response = await authFetch(`${BACKEND_URL}/api/advanced/broadcast`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/advanced/broadcast/${broadcastId}`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/advanced/broadcast/${broadcastId}`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/advanced/broadcast/${broadcastId}/send`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/advanced/status`);
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
      const response = await authFetch(`${BACKEND_URL}/api/advanced/status`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/advanced/status/${sid}`, {
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
      emitSafe('status_reply', {
        statusId,
        content: replyContent,
        recipientId: ownerId,
        conversationId: targetConv._id,
      });

      // Try to persist via API (best-effort) and update local IndexedDB + State
      try {
        const sid = encodeURIComponent(statusId);
        const response = await authFetch(`${BACKEND_URL}/api/advanced/status/${sid}/reply`, {
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
          const currentSelectedId = localStorage.getItem('selectedConversationId');
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
            localStorage.setItem('selectedConversationId', realConvId);
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
    emitSafe('send_mass_message', { recipients: userIds, message: content, sender: currentUserId });
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
      const response = await authFetch(`${BACKEND_URL}/api/groups/${groupId}/members/${memberId}`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/chat/groups/${groupId}/join`, {
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

  const updateDisappearingMessages = (chatId, duration) => { if (chatId) emitSafe('disappearing_messages:set', { chatId, duration }); };
  const toggleAdminOnlyMessaging = () => { };
  const updateGroupPermission = () => { };
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
      const token = localStorage.getItem('token');
      const apiUrl = BACKEND_URL;
      if (token && apiUrl) {
        fetch(`${apiUrl}/api/chat/conversations/${chatId}/archive`, {
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
  const downloadStickerPack = () => { };
  const sendSticker = (stickerUrl) => { if (stickerUrl) sendMessage(stickerUrl, 'Me', { messageType: 'sticker' }); };
  const addFavoriteSticker = () => { };
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
      const res = await authFetch(`${BACKEND_URL}/api/advanced/transcribe-audio`, { method: 'POST', body: formData });
      if (res.ok) { const data = await res.json(); return data?.text || ''; }
    } catch (e) { console.warn('Transcription failed:', e); }
    return '';
  };
  const viewProfile = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/api/users/${userId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        emitSafe('visit_profile', { visitedUserId: userId, visitorId: currentUserId });
      }
      return data;
    } catch (err) {
      console.error('View profile error:', err);
      return { success: false };
    }
  };
  const addContact = async (contactData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/api/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactData)
      });
      const data = await response.json();
      if (data.success) {
        setContacts(prev => [...prev, data.contact]);
      }
      return data;
    } catch (err) {
      console.error('Add contact error:', err);
      return { success: false };
    }
  };

  const removeContact = async (contactId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${BACKEND_URL}/api/contacts/${contactId}`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/contacts/${contactId}`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/chat/users/${userId}/block`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/chat/users/${userId}/block`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/user/profile`, {
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
      const response = await fetch(`${BACKEND_URL}/api/chat/conversations/${conversationId}/search?query=${encodeURIComponent(query)}`, {
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
      const response = await authFetch(`${BACKEND_URL}/api/chat/conversations/${conversationId}/media?mediaType=${mediaType}`);
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
      const response = await fetch(`${BACKEND_URL}/api/chat/messages/${messageId}/info`, {
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/chat/messages/${messageId}/view-once-viewed`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
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
      const response = await fetch(`${BACKEND_URL}/api/chat/messages/${messageIdOrContent}/forward`, {
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
      const response = await fetch(`${BACKEND_URL}/api/chat/messages/${messageId}/report`, {
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
      const response = await fetch(`${BACKEND_URL}/api/chat/groups/${groupId}/info`, {
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
      const response = await fetch(`${BACKEND_URL}/api/chat/groups/${groupId}/invite/regenerate`, {
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
      const response = await fetch(`${BACKEND_URL}/api/chat/groups/${groupId}/info`, {
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
      const response = await fetch(`${BACKEND_URL}/api/chat/groups/${groupId}/admins/${userId}`, {
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
    isOtherUserTyping, sendTypingStatus,
    isOtherUserRecording, sendRecordingStatus,
    activeCall, initiateCall, endCall, acceptCall, rejectCall,
    onlineNotification, broadcasts, sendMassMessage, createBroadcastList,
    statuses, addStatus, uploadStatusMedia, statusViewers, viewStatus,
    onlineUsers, callLogs, fetchCallLogs, profileVisitors,
    showProfileEditor, setShowProfileEditor,
    contacts, addContact, removeContact, updateContact,
    blockedUsers, blockUser, unblockUser,
    createPoll, votePoll, scheduleMessage, scheduledMessages,
    updateGroupMember, joinGroup, updateDisappearingMessages,
    toggleAdminOnlyMessaging, updateGroupPermission, createCustomRole, assignRole,
    togglePinChat, toggleMuteChat, toggleArchiveChat,
    pinMessage, unpinMessage, pinnedMessages,
    presenceHistory, unlockedSessionChats, verifyChatUnlock, toggleChatLock,
    stickerPacks, downloadedStickers, downloadStickerPack, sendSticker, addFavoriteSticker,
    toggleStarMessage, toggleMessageLock, transcribeAudio, viewProfile,
    // New WhatsApp features
    searchMessages, getMediaGallery, getMessageInfo, markViewOnceViewed,
    reportMessage, getGroupInfo, regenerateGroupInvite, updateGroupInfo, removeAdmin,
    connectedDevices, sessions, notifications, statusPrivacy, setStatusPrivacy,
    backupProgress, setBackupProgress, notificationSound, setNotificationSound,
    startCloudBackup, listCloudBackups, restoreCloudBackup, deleteCloudBackup, logoutDevice, logoutAllDevices, generateQRCode, pairDevice, getDevices, updateDeviceCapabilities, updateAutoReply,
    // Security functions
    generate2FASecret, verify2FASetup, disable2FA,
    sendEmailVerification, verifyEmail, resendEmailVerification,
    sendPasswordReset, resetPassword,
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
    setDisappearingTimer,
    exportBackup
  }), [
    user, conversations, selectedConversation, messages, loading,
    isOtherUserTyping, isOtherUserRecording, activeCall,
    onlineNotification, broadcasts, statuses, statusViewers,
    onlineUsers, callLogs, fetchCallLogs, profileVisitors, showProfileEditor,
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


