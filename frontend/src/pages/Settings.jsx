import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, User, Lock, Bell, Shield, ShieldCheck, Users, Eye,
  Smartphone, ChevronRight, Database, UserRound, KeyRound, Languages,
  HelpCircle, Download, Trash2, Phone, Wifi, Image as ImageIcon,
  HardDrive, CheckCircle2, EyeOff, Archive, Clock, FileText, Globe2,
  RefreshCw, RotateCcw, Palette, MessageSquare, MapPin, X, Fingerprint,
  DollarSign, Star, Search, Plus, Camera, Video, Upload as UploadIcon, Mail, Crown, LayoutGrid, Store
} from 'lucide-react';
import ContactManager from '../components/ContactManager';
import { fetchVersionManifest } from '../utils/versionManifest';
import { BlockedUsersList } from '../components/BlockUnblock';
import AntiBanPanel from '../components/AntiBanPanel';
import PrivacyModsPanel from '../components/PrivacyModsPanel';
import SecurityModsPanel from '../components/SecurityModsPanel';
import StatusPrivacyPanel from '../components/StatusPrivacyPanel';
import StorageManagement from '../components/StorageManagement';
import AccountSwitcher from '../components/AccountSwitcher';
import PrivacyPermissionSelector from '../components/PrivacyPermissionSelector';
import ContactSelectorScreen from '../components/ContactSelectorScreen';
import FakeChatPanel from '../components/FakeChatPanel';
import LocationSharingPanel from '../components/LocationSharingPanel';
import PasskeysSettings from '../components/PasskeysSettings';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { useChat } from '../context/ChatContext';
import userService from '../services/userService';
import { checkForUpdate, getAppUpdateInfo } from '../utils/appUpdate';
import SettingsHelp from '../components/SettingsHelp';
import api from '../services/api';
import { getAppInfo, isNative } from '../services/capacitorBridge.js';

const SETTINGS_KEY = 'genz_user_settings';

const DEFAULT_SETTINGS = {
  account: {
    passkeys: false,
    securityNotifications: true,
    changeNumberGuard: true,
    requestAccountInfoAt: null,
    deleteAccountGuard: true
  },
  privacy: {
    lastSeen: 'everyone',
    online: 'same_as_last_seen',
    profilePhoto: 'everyone',
    about: 'everyone',
    status: 'contacts',
    readReceipts: true,
    defaultMessageTimer: 'off',
    groups: 'everyone',
    blockedUsers: [],
    disableLinkPreviews: false,
    blockUnknownAccountMessages: false,
    appLock: {
      enabled: false,
      lockAfter: 'immediately',
      requireBiometric: false
    },
    chatLock: {
      enabled: false,
      secretCodeEnabled: false,
      hideLockedChats: false
    },
    advancedChatPrivacy: false,
    privacyCheckupCompleted: false,
    privacyCheckupCompletedAt: null
  },
  chats: {
    theme: 'system',
    wallpaper: '',
    wallpaperDimming: 0,
    chatColor: '#00a884',
    fontSize: 'medium',
    enterIsSend: false,
    mediaVisibility: true,
    keepChatsArchived: true,
    archiveMutedChats: true,
    backup: {
      enabled: false,
      frequency: 'manual',
      account: '',
      includeVideos: false,
      endToEndEncrypted: false,
      passkeyEncrypted: false,
      lastBackupAt: null
    },
    history: {
      exportFormat: 'json',
      clearCacheOnLogout: false
    }
  },
  notifications: {
    messages: true,
    groups: true,
    calls: true,
    sounds: true,
    conversationTones: true,
    showPreview: true,
    highPriority: true,
    reactionNotifications: true,
    reminders: true,
    messageTone: 'default',
    groupTone: 'default',
    vibration: 'default'
  },
  storageData: {
    mobileAutoDownload: ['photos'],
    wifiAutoDownload: ['photos', 'audio', 'videos', 'documents'],
    roamingAutoDownload: [],
    photoUploadQuality: 'standard',
    videoUploadQuality: 'standard',
    proxy: {
      enabled: false,
      host: '',
      port: ''
    },
    networkUsageResetAt: null
  },
  app: {
    language: 'system',
    inviteFriends: true
  },
  help: {
    diagnostics: false,
    contactSupportAllowed: true
  }
};

const VISIBILITY_OPTIONS = [
  ['everyone', 'Everyone'],
  ['contacts', 'My contacts'],
  ['contacts_except', 'My contacts except...'],
  ['nobody', 'Nobody']
];

const STATUS_OPTIONS = [
  ['contacts', 'My contacts'],
  ['contacts_except', 'My contacts except...'],
  ['only_share_with', 'Only share with...'],
  ['nobody', 'Nobody']
];

const TIMER_OPTIONS = [
  ['off', 'Off'],
  ['24h', '24 hours'],
  ['7d', '7 days'],
  ['90d', '90 days']
];

const clone = (value) => JSON.parse(JSON.stringify(value));

const mergeDeep = (base, incoming) => {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return clone(base);
  const output = clone(base);

  Object.entries(incoming).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(output, key)) return;
    if (Array.isArray(output[key])) {
      output[key] = Array.isArray(value) ? value : output[key];
      return;
    }
    if (output[key] && typeof output[key] === 'object') {
      output[key] = mergeDeep(output[key], value);
      return;
    }
    output[key] = value ?? output[key];
  });

  return output;
};

const normalizeSettings = (settings = {}) => {
  const normalized = clone(settings);

  if (normalized.privacy?.statusPrivacy && !normalized.privacy.status) {
    normalized.privacy.status = normalized.privacy.statusPrivacy;
  }

  return mergeDeep(DEFAULT_SETTINGS, normalized);
};

const readStoredSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? normalizeSettings(JSON.parse(stored)) : clone(DEFAULT_SETTINGS);
  } catch {
    return clone(DEFAULT_SETTINGS);
  }
};

const persistSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  bridgeNotificationSettings(settings);
};

const bridgeNotificationSettings = (settings) => {
  const notifications = settings.notifications;
  if (!notifications) return;
  try {
    localStorage.setItem('genz_notification_settings', JSON.stringify({
      enabled: Boolean(notifications.messages || notifications.groups),
      vibration: String(notifications.vibration || 'default').toLowerCase() !== 'off',
      sound: notifications.sounds !== false,
      showPreview: notifications.showPreview !== false
    }));
  } catch (e) {
    console.warn('Failed to bridge notification settings:', e);
  }
};

const getPath = (target, path) => (
  path.split('.').reduce((acc, key) => acc?.[key], target)
);

const setPath = (target, path, value) => {
  const next = clone(target);
  const keys = path.split('.');
  const last = keys.pop();
  const parent = keys.reduce((acc, key) => {
    if (!acc[key] || typeof acc[key] !== 'object') acc[key] = {};
    return acc[key];
  }, next);
  parent[last] = value;
  return next;
};

const applyRuntimeSettings = (settings) => {
  document.documentElement.lang = settings.app?.language === 'system' ? navigator.language : settings.app?.language || 'en';
  window.dispatchEvent(new Event('language-changed'));
};

const SettingSection = ({ title, description, children }) => (
  <section className="rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden">
    <div className="px-4 py-3 border-b border-white/10">
      <h2 className="text-base font-bold text-white">{title}</h2>
      {description && <p className="text-xs text-blue-100/60 mt-1">{description}</p>}
    </div>
    <div className="divide-y divide-white/10">{children}</div>
  </section>
);

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-[#00a884]' : 'bg-white/20'}`}
    aria-pressed={checked}
  >
    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

const Select = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="w-full sm:w-56 rounded-xl border border-white/15 bg-[#111b21] px-3 py-2 text-sm text-white outline-none focus:border-[#00a884]"
  >
    {options.map(([optionValue, label]) => (
      <option key={optionValue} value={optionValue}>{label}</option>
    ))}
  </select>
);

const TextInput = ({ value, onChange, placeholder, type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    className="w-full rounded-xl border border-white/15 bg-[#111b21] px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00a884]"
  />
);

const SettingRow = ({ icon, title, description, control, onClick }) => {
  const Icon = icon;
  const body = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#00a884]">
            <Icon size={19} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          {description && <p className="text-xs text-blue-100/55">{description}</p>}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {control}
        {onClick && <ChevronRight size={18} className="text-white/35" />}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.04]">
        {body}
      </button>
    );
  }

  return <div className="flex items-center justify-between gap-3 px-4 py-3">{body}</div>;
};

const ActionButton = ({ children, onClick, tone = 'primary', disabled = false }) => {
  const tones = {
    primary: 'bg-[#00a884] text-white hover:bg-[#029b7a]',
    neutral: 'bg-white/10 text-white hover:bg-white/15',
    danger: 'bg-red-500/15 text-red-200 hover:bg-red-500/25 border border-red-400/20'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
};

const Settings = () => {
  const { user, updateUserProfile } = useUser();
  const { changeLanguage } = useLanguage();
  const { mods, setMods } = useChat();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [settingsData, setSettingsData] = useState(readStoredSettings);
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    bio: user?.bio || user?.about || '',
    phone: user?.phoneNumber || ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showContacts, setShowContacts] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [showStorage, setShowStorage] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [contactSelectorConfig, setContactSelectorConfig] = useState(null);
  const [showFakeChat, setShowFakeChat] = useState(false);
  const [showLocationSharing, setShowLocationSharing] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [apkVersion, setApkVersion] = useState(null);
  // The version this device/bundle is RUNNING: the installed native build on
  // the APK (from @capacitor/app), or the bundle's baked-in build on the web.
  const [installed, setInstalled] = useState(null);

  // Show the current Android build (from version.json — written by
  // npm run apk:build) so users can spot a stale install, plus what they are
  // actually running so the comparison is visible.
  useEffect(() => {
    fetchVersionManifest()
      .then((data) => {
        if (data?.version) setApkVersion(data);
      });

    if (isNative()) {
      getAppInfo()
        .then((info) => {
          if (info) {
            setInstalled({
              version: info.version || '',
              code: info.versionCode ?? info.build ?? 0
            });
          }
        })
        .catch(() => {});
    } else {
      setInstalled({
        version: __GENZ_VERSION__ || '0.0.0',
        code: Number(__GENZ_VERSION_CODE__ || 0)
      });
    }
  }, []);
  const [showTerms, setShowTerms] = useState(false);

  // GENZ AFTER WORK Feature States
  const [features, setFeatures] = useState([]);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [showCreateFeatureForm, setShowCreateFeatureForm] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquiryData, setInquiryData] = useState({ message: '', contactEmail: '' });
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    price: '',
    maxPrice: '',
    location: '',
    category: 'Real Estate',
    contactInfo: { phone: '', email: '' },
    tags: [],
    specifications: {},
    images: [],
    videos: [],
    isPrivate: false,
    expiresAt: '',
    status: 'pending'
  });
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [videoPreviewUrls, setVideoPreviewUrls] = useState([]);

  const categories = ['Real Estate', 'Services', 'Business', 'Automotive', 'Jobs', 'Electronics', 'Other'];

  const tabs = useMemo(() => ([
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: KeyRound },
    { id: 'passkeys', label: 'Passkeys', icon: Fingerprint },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'storage', label: 'Storage and data', icon: Database },
    { id: 'language', label: 'App language', icon: Languages },
    { id: 'linked', label: 'Linked devices', icon: Smartphone },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'fake-chat', label: 'Fake Chat', icon: MessageSquare },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'help', label: 'Help', icon: HelpCircle }
  ]), []);

  useEffect(() => {
    if (!user) return;
    setProfileData({
      username: user.username || '',
      bio: user.bio || user.about || '',
      phone: user.phoneNumber || ''
    });
  }, [user?.username, user?.bio, user?.about, user?.phoneNumber]);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      setLoading(true);
      try {
        const data = await userService.getSettings();
        if (!active) return;
        const remoteSettings = normalizeSettings(data.settings || {});
        setSettingsData(remoteSettings);
        persistSettings(remoteSettings);
      } catch (error) {
        // Using local settings fallback
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadBlocked = async () => {
      try {
        const data = await userService.getBlockedUsers();
        if (!active) return;
        setBlockedUsers((data.blockedUsers || []).map((b) => ({
          _id: b._id || b.userId,
          name: b.name || b.username || 'Unknown',
          phone: b.phone || b.phoneNumber || ''
        })));
      } catch (error) {
        if (active) setBlockedUsers([]);
      }
    };
    loadBlocked();
    return () => { active = false; };
  }, []);

  const handleUnblock = async (userId) => {
    try {
      await userService.unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((b) => b._id !== userId));
      showStatus('success', 'User unblocked.');
    } catch (error) {
      showStatus('warning', 'Failed to unblock user.');
    }
  };

  useEffect(() => {
    applyRuntimeSettings(settingsData);
  }, [settingsData]);

  const showStatus = (type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 3200);
  };

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  // Result of the WhatsApp-style check: when a newer build exists we open the
  // update dialog showing the "What's new" changelog + an Update button.
  const [updateInfo, setUpdateInfo] = useState(null);
  const handleCheckForUpdate = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      // Compare the running build against the latest published one
      // (version.json). On the APK this uses the installed native versionCode;
      // on the web the bundle's baked-in build.
      const info = await getAppUpdateInfo();
      if (info?.hasUpdate) {
        setUpdateInfo(info);
        return;
      }

      // Up to date (or the manifest was unreachable): the PWA/service-worker
      // check only means something on the web, so on the APK just report that
      // the user has the latest version.
      if (info && !info.isWeb) {
        showStatus('success', 'You are on the latest GENZ version.');
        return;
      }

      const result = await checkForUpdate();
      if (result === 'updated') {
        showStatus('success', 'Sasisho jipya limepatikana! Linaandaliwa...');
      } else if (result === 'up-to-date') {
        showStatus('success', 'You are on the latest version of the app.');
      } else if (result === 'unsupported') {
        showStatus('error', 'Kivinjari hiki hakiwezeshi sasisho la moja kwa moja.');
      } else {
        showStatus('error', 'Failed to check for updates. Please try again later.');
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const updateSetting = (path, value) => {
    setSettingsData((current) => {
      const next = setPath(current, path, value);
      persistSettings(next);
      if (path === 'app.language') {
        try {
          changeLanguage(value);
        } catch (error) {
          console.warn('Failed to apply app language change:', error);
        }
      }
      if (path === 'chats.theme') {
        window.dispatchEvent(new CustomEvent('language-changed', { detail: { language: value } }));
      }
      return next;
    });
  };

  const toggleSetting = (path) => {
    updateSetting(path, !getPath(settingsData, path));
  };

  const saveSettings = async (nextSettings = settingsData) => {
    setSaving(true);
    try {
      persistSettings(nextSettings);
      const response = await userService.updateSettings(nextSettings);
      const saved = normalizeSettings(response.settings || nextSettings);
      setSettingsData(saved);
      persistSettings(saved);
      showStatus('success', 'Settings saved successfully.');
      return saved;
    } catch (error) {
      showStatus('warning', 'Saved on this device. Server sync will retry next time.');
      return nextSettings;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        username: profileData.username.trim(),
        bio: profileData.bio,
        about: profileData.bio
      };
      await userService.updateProfile(payload);
      updateUserProfile?.(payload);
      showStatus('success', 'Profile saved successfully.');
    } catch (error) {
      updateUserProfile?.({
        username: profileData.username,
        bio: profileData.bio
      });
      showStatus('warning', 'Profile saved locally. Server sync failed.');
    } finally {
      setSaving(false);
    }
  };

  const runPrivacyCheckup = async () => {
    const next = {
      ...settingsData,
      privacy: {
        ...settingsData.privacy,
        online: 'same_as_last_seen',
        profilePhoto: 'contacts',
        about: 'contacts',
        groups: 'contacts',
        status: 'contacts',
        disableLinkPreviews: true,
        blockUnknownAccountMessages: true,
        advancedChatPrivacy: true,
        privacyCheckupCompleted: true,
        privacyCheckupCompletedAt: new Date().toISOString()
      }
    };
    setSettingsData(next);
    persistSettings(next);
    try {
      await userService.updateSettings(next);
      showStatus('success', 'Privacy Checkup applied.');
    } catch (error) {
      showStatus('warning', 'Privacy Checkup saved locally. Server sync will retry.');
    }
  };

  const handlePrivacyChange = async (privacyType, value) => {
    try {
      const next = {
        ...settingsData,
        privacy: {
          ...settingsData.privacy,
          [privacyType]: value
        }
      };
      setSettingsData(next);
      persistSettings(next);
      
      // Auto-save to server (WhatsApp behavior)
      await userService.updateSettings(next);
      showStatus('success', 'Privacy setting updated.');
    } catch (error) {
      showStatus('warning', 'Saved locally. Server sync will retry.');
    }
  };

  const handleOnlineChange = async (value) => {
    await handlePrivacyChange('online', value);
  };

  const openContactSelector = async (privacyType, selectorType) => {
    try {
      // Fetch full contact data from API
      const [contactsRes, savedRes] = await Promise.all([
        api.get('/chat/contacts'),
        api.get(`/privacy/${selectorType}/${privacyType}`)
      ]);
      
      const data = contactsRes?.data || {};
      const contacts = (data.contacts || data.users || []).map((c) =>
        c.user
          ? {
              _id: c.user._id,
              username: c.savedName || c.user.username || c.user.name,
              name: c.savedName || c.user.username || c.user.name,
              phoneNumber: c.user.phoneNumber || c.user.phone,
              phone: c.user.phoneNumber || c.user.phone,
              profilePicture: c.user.profilePicture
            }
          : c
      );

      // Reload the currently-saved selection so reopening the selector
      // shows what is actually saved, not an empty list.
      let initialSelectedContacts = [];
      if (savedRes?.data) {
        const savedData = savedRes.data;
        const key = selectorType === 'excluded' ? 'excludedContacts' : 'allowedContacts';
        const idKey = selectorType === 'excluded' ? 'excludedContactId' : 'allowedContactId';
        initialSelectedContacts = (savedData[key] || [])
          .map((item) => item[idKey])
          .filter(Boolean);
      }
      
      setContactSelectorConfig({
        privacyType,
        selectorType,
        initialSelectedContacts: initialSelectedContacts,
        contacts: contacts.length > 0 ? contacts : (user?.contacts || [])
      });
      setShowContactSelector(true);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      // Fallback to user contacts
      setContactSelectorConfig({
        privacyType,
        selectorType,
        initialSelectedContacts: [],
        contacts: user?.contacts || []
      });
      setShowContactSelector(true);
    }
  };

  const handleContactSelectorSave = async (selectedContactIds, selectedContactData) => {
    const { privacyType, selectorType } = contactSelectorConfig;
    
    try {
      if (selectorType === 'excluded') {
        // Clear existing and add new
        await api.delete(`/privacy/excluded/type/${privacyType}`);
        
        if (selectedContactData.length > 0) {
          await api.post('/privacy/excluded/bulk', {
            privacyType,
            contacts: selectedContactData
          });
        }
      } else if (selectorType === 'allowed') {
        // Clear existing and add new
        await api.delete(`/privacy/allowed/type/${privacyType}`);
        
        if (selectedContactData.length > 0) {
          await api.post('/privacy/allowed/bulk', {
            privacyType,
            contacts: selectedContactData
          });
        }
      }
      
      showStatus('success', 'Contact list updated.');
      setShowContactSelector(false);
    } catch (error) {
      showStatus('error', 'Failed to update contact list.');
    }
  };

  // Make openContactSelector available globally for PrivacyPermissionSelector
  useEffect(() => {
    window.openContactSelector = openContactSelector;
    return () => {
      delete window.openContactSelector;
    };
  }, []);

  // Live-refresh the open contact selector when the contact list changes
  // elsewhere (socket 'contacts:updated' → ChatContext re-fetches and
  // dispatches a window event).
  const openContactSelectorRef = useRef(openContactSelector);
  openContactSelectorRef.current = openContactSelector;

  useEffect(() => {
    const handler = () => {
      const open = openContactSelectorRef.current;
      if (showContactSelector && contactSelectorConfig?.privacyType) {
        open?.(contactSelectorConfig.privacyType, contactSelectorConfig.selectorType);
      }
    };
    window.addEventListener('contacts:updated', handler);
    return () => window.removeEventListener('contacts:updated', handler);
  }, [showContactSelector, contactSelectorConfig]);

  const requestAccountInfo = () => {
    try {
      const payload = {
        generatedAt: new Date().toISOString(),
        user: {
          username: profileData?.username || '',
          phone: profileData?.phone || '',
          bio: profileData?.bio || ''
        },
        settings: settingsData,
        contactCount: (user?.contacts || []).length
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `genz-account-info-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus('success', 'Account information exported.');
    } catch (error) {
      console.error('Failed to export account info:', error);
      showStatus('error', 'Failed to export account information.');
    }
    const next = setPath(settingsData, 'account.requestAccountInfoAt', new Date().toISOString());
    setSettingsData(next);
    saveSettings(next);
  };

  const handleInviteFriends = () => {
    const inviteText = 'Join me on Genz Messenger — a powerful messaging app!';
    if (navigator.share) {
      navigator.share({ title: 'Invite to GENZ', text: inviteText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(inviteText).then(() => showStatus('success', 'Invite link copied.')).catch(() => {});
    }
  };


  const resetSettings = async () => {
    if (!window.confirm('Reset all WhatsApp-style settings on this device?')) return;
    try {
      const response = await userService.resetSettings();
      const saved = normalizeSettings(response.settings || DEFAULT_SETTINGS);
      setSettingsData(saved);
      persistSettings(saved);
      showStatus('success', 'Settings reset to defaults.');
    } catch (error) {
      const next = clone(DEFAULT_SETTINGS);
      setSettingsData(next);
      persistSettings(next);
      saveSettings(next);
      showStatus('warning', 'Reset saved on this device. Server sync will retry next time.');
    }
  };

  const resetNetworkUsage = () => {
    const next = setPath(settingsData, 'storageData.networkUsageResetAt', new Date().toISOString());
    setSettingsData(next);
    saveSettings(next);
  };

  const handleChangeNumber = async () => {
    if (!settingsData.account.changeNumberGuard || window.confirm('Are you sure you want to change your phone number? This will migrate your account data.')) {
      const newNumber = window.prompt('Enter your new phone number:');
      if (!newNumber) return;
      try {
        let result = await userService.changeNumber(newNumber);
        if (result?.requiresOtp) {
          const otp = window.prompt(`OTP sent to ${newNumber}. Enter the verification code:`);
          if (!otp) return;
          result = await userService.changeNumber(newNumber, { verifyOtp: otp });
        }
        if (result?.success) {
          showStatus('success', 'Phone number changed successfully.');
          setProfileData(prev => ({ ...prev, phone: newNumber }));
        } else {
          showStatus('error', result?.message || 'Failed to change number.');
        }
      } catch (error) {
        showStatus('error', error.message || 'Failed to change number.');
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!settingsData.account.deleteAccountGuard || window.confirm('Are you sure you want to delete your account? This action is irreversible and will erase all your data.')) {
      const confirmWord = window.prompt('Type DELETE to confirm account deletion:');
      if (confirmWord === 'DELETE') {
        try {
          await userService.deleteAccount();
          showStatus('success', 'Account deleted successfully.');
          navigate('/login');
        } catch (error) {
          showStatus('error', error.message || 'Failed to delete account.');
        }
      } else {
        showStatus('info', 'Account deletion cancelled.');
      }
    }
  };

  const renderProfile = () => (
    <div className="space-y-4">
      <SettingSection title="Profile" description="Name, about text, and phone number shown in your account.">
        <div className="space-y-4 px-4 py-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-blue-100/60">Username</span>
            <TextInput value={profileData.username} onChange={(value) => setProfileData((prev) => ({ ...prev, username: value }))} />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-blue-100/60">About</span>
            <textarea
              value={profileData.bio}
              onChange={(event) => setProfileData((prev) => ({ ...prev, bio: event.target.value.slice(0, 200) }))}
              className="h-28 w-full resize-none rounded-xl border border-white/15 bg-[#111b21] px-3 py-2 text-sm text-white outline-none focus:border-[#00a884]"
            />
            <p className="mt-1 text-xs text-blue-100/45">{profileData.bio.length}/200</p>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-blue-100/60">Phone</span>
            <TextInput value={profileData.phone} onChange={(value) => setProfileData((prev) => ({ ...prev, phone: value }))} />
          </label>
          <ActionButton onClick={handleSaveProfile} disabled={saving}>
            <Save size={16} /> Save profile
          </ActionButton>
        </div>
      </SettingSection>
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-4">
      <SettingSection title="Feature Library" description="Every GENZ feature in one place — chat tools, appearance, privacy, data, messaging and account.">
        <SettingRow icon={LayoutGrid} title="Open Feature Library" description="Explore and use all available GENZ features." onClick={() => navigate('/features')} />
      </SettingSection>
      <SettingSection title="Account" description="Security, passkeys, account information, and account actions.">
        <SettingRow icon={KeyRound} title="Passkeys" description="Store passkey preference for secure sign-in and backups." control={
          <Toggle checked={settingsData.account.passkeys} onChange={() => toggleSetting('account.passkeys')} />
        } />
        <SettingRow icon={Bell} title="Security notifications" description="Show alerts when security codes or sessions change." control={
          <Toggle checked={settingsData.account.securityNotifications} onChange={() => toggleSetting('account.securityNotifications')} />
        } />
        <SettingRow icon={Phone} title="Change number" description="Migrate your account to a new phone number." onClick={handleChangeNumber} />
        <SettingRow icon={Shield} title="Change number guard" description="Require confirmation before changing this account phone number." control={
          <Toggle checked={settingsData.account.changeNumberGuard} onChange={() => toggleSetting('account.changeNumberGuard')} />
        } />
        <SettingRow icon={Download} title="Request account info" description={settingsData.account.requestAccountInfoAt ? `Requested ${new Date(settingsData.account.requestAccountInfoAt).toLocaleDateString()}` : 'Prepare an account information request timestamp.'} onClick={requestAccountInfo} />
        <SettingRow icon={Trash2} title="Delete account" description="Permanently erase your account and data." onClick={handleDeleteAccount} />
        <SettingRow icon={Shield} title="Delete account guard" description="Keep destructive account actions behind confirmation." control={
          <Toggle checked={settingsData.account.deleteAccountGuard} onChange={() => toggleSetting('account.deleteAccountGuard')} />
        } />
      </SettingSection>
      <div className="flex flex-wrap gap-2">
        <ActionButton tone="neutral" onClick={() => saveSettings()} disabled={saving}><Save size={16} /> Save account settings</ActionButton>
        <ActionButton tone="danger" onClick={resetSettings} disabled={saving}><RotateCcw size={16} /> Reset settings</ActionButton>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-4">
      <SettingSection title="Privacy Checkup" description="One tap applies stricter defaults for personal info, calls, links, and groups.">
        <SettingRow
          icon={CheckCircle2}
          title={settingsData.privacy.privacyCheckupCompleted ? 'Privacy Checkup completed' : 'Start Privacy Checkup'}
          description={settingsData.privacy.privacyCheckupCompletedAt ? new Date(settingsData.privacy.privacyCheckupCompletedAt).toLocaleString() : 'Recommended protection for a WhatsApp-like setup.'}
          onClick={runPrivacyCheckup}
        />
      </SettingSection>

      <SettingSection title="Who can see my personal info" description="Online, profile photo, about, and status visibility.">
        <div className="px-4 py-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-white mb-3">Online</p>
            <PrivacyPermissionSelector
              privacyType="online"
              currentValue={settingsData.privacy.online}
              options={['everyone', 'same_as_last_seen']}
              onChange={(value) => handleOnlineChange(value)}
            />
          </div>
          
          <div>
            <p className="text-sm font-semibold text-white mb-3">Profile photo</p>
            <PrivacyPermissionSelector
              privacyType="profilePhoto"
              currentValue={settingsData.privacy.profilePhoto}
              options={['everyone', 'contacts', 'contacts_except', 'nobody']}
              onChange={(value) => handlePrivacyChange('profilePhoto', value)}
            />
          </div>
          
          <div>
            <p className="text-sm font-semibold text-white mb-3">About</p>
            <PrivacyPermissionSelector
              privacyType="about"
              currentValue={settingsData.privacy.about}
              options={['everyone', 'contacts', 'contacts_except', 'nobody']}
              onChange={(value) => handlePrivacyChange('about', value)}
            />
          </div>
          
          <div>
            <p className="text-sm font-semibold text-white mb-3">Status</p>
            <PrivacyPermissionSelector
              privacyType="status"
              currentValue={settingsData.privacy.status}
              options={['contacts', 'contacts_except', 'only_share_with', 'nobody']}
              onChange={(value) => handlePrivacyChange('status', value)}
            />
          </div>
        </div>
        
        <SettingRow icon={Eye} title="Advanced status privacy" description="Close friends list and per-status privacy level." onClick={() => setShowStatusPrivacyPanel(true)} />
        <SettingRow icon={EyeOff} title="Privacy MODs" description="Ghost mode, hide online, anti view-once, block alerts and more." onClick={() => setShowPrivacyModsPanel(true)} />
      </SettingSection>

      <SettingSection title="Messages, groups, and calls" description="Controls for disappearing messages, group invites, unknown calls, and call privacy.">
        <SettingRow icon={Clock} title="Default message timer" control={<Select value={settingsData.privacy.defaultMessageTimer} onChange={(value) => updateSetting('privacy.defaultMessageTimer', value)} options={TIMER_OPTIONS} />} />
        
        <div className="px-4 py-4">
          <p className="text-sm font-semibold text-white mb-3">Groups</p>
          <PrivacyPermissionSelector
            privacyType="groups"
            currentValue={settingsData.privacy.groups}
            options={['everyone', 'contacts', 'contacts_except']}
            onChange={(value) => handlePrivacyChange('groups', value)}
          />
        </div>
        
      </SettingSection>

      <SettingSection title="Advanced privacy" description="Newer WhatsApp-style controls for links, unknown accounts, and advanced chat privacy.">
        <SettingRow icon={EyeOff} title="Disable link previews" control={<Toggle checked={settingsData.privacy.disableLinkPreviews} onChange={() => toggleSetting('privacy.disableLinkPreviews')} />} />
        <SettingRow icon={Shield} title="Block unknown account messages" description="Reduce spam from accounts you have not contacted." control={<Toggle checked={settingsData.privacy.blockUnknownAccountMessages} onChange={() => toggleSetting('privacy.blockUnknownAccountMessages')} />} />
        <SettingRow icon={Shield} title="Advanced Chat Privacy" description="Block exports and media auto-downloads for sensitive chats." control={<Toggle checked={settingsData.privacy.advancedChatPrivacy} onChange={() => toggleSetting('privacy.advancedChatPrivacy')} />} />
        <SettingRow icon={ShieldCheck} title="Account security" description="Anti-ban protection, rate limiting, device spoofing and security score." onClick={() => setShowAntiBanPanel(true)} />
        <SettingRow icon={ShieldCheck} title="Security MODs" description="App locks, anti-screenshot, screen recording detection, VPN mode and more." onClick={() => setShowSecurityModsPanel(true)} />
      </SettingSection>

      <ActionButton onClick={() => saveSettings()} disabled={saving}><Save size={16} /> Save privacy settings</ActionButton>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4">
      <SettingSection title="Notifications" description="Message, group, preview, vibration, and reactions.">
        <SettingRow icon={Bell} title="Message notifications" control={<Toggle checked={settingsData.notifications.messages} onChange={() => toggleSetting('notifications.messages')} />} />
        <SettingRow icon={Users} title="Group notifications" control={<Toggle checked={settingsData.notifications.groups} onChange={() => toggleSetting('notifications.groups')} />} />
        <SettingRow icon={Bell} title="Conversation tones" control={<Toggle checked={settingsData.notifications.conversationTones} onChange={() => toggleSetting('notifications.conversationTones')} />} />
        <SettingRow icon={Bell} title="Sounds" control={<Toggle checked={settingsData.notifications.sounds} onChange={() => toggleSetting('notifications.sounds')} />} />
        <SettingRow icon={EyeOff} title="Show preview" description="Show message text in notifications." control={<Toggle checked={settingsData.notifications.showPreview} onChange={() => toggleSetting('notifications.showPreview')} />} />
        <SettingRow icon={Bell} title="High priority notifications" control={<Toggle checked={settingsData.notifications.highPriority} onChange={() => toggleSetting('notifications.highPriority')} />} />
        <SettingRow icon={CheckCircle2} title="Reaction notifications" control={<Toggle checked={settingsData.notifications.reactionNotifications} onChange={() => toggleSetting('notifications.reactionNotifications')} />} />
        <SettingRow icon={Clock} title="Reminders" control={<Toggle checked={settingsData.notifications.reminders} onChange={() => toggleSetting('notifications.reminders')} />} />
        <SettingRow icon={Bell} title="Vibration" control={<Select value={settingsData.notifications.vibration} onChange={(value) => updateSetting('notifications.vibration', value)} options={[['off', 'Off'], ['default', 'Default'], ['short', 'Short'], ['long', 'Long']]} />} />
        <SettingRow
          icon={Store}
          title="Status & WINGA activity alerts"
          description="Toasts showing when someone posts a status or a listing on WINGA."
          control={<Toggle checked={mods?.activityNotifications !== false} onChange={() => setMods((prev) => ({ ...prev, activityNotifications: prev.activityNotifications === false }))} />}
        />
      </SettingSection>

      <ActionButton onClick={() => saveSettings()} disabled={saving}><Save size={16} /> Save notification settings</ActionButton>
    </div>
  );

  const renderStorage = () => (
    <div className="space-y-4">
      <SettingSection title="Manage storage" description="Open the existing storage manager and tune data usage.">
        <SettingRow icon={Database} title="Manage storage" description="Review large files and cached media by chat." onClick={() => setShowStorage(true)} />
      </SettingSection>

      <SettingSection title="Media upload quality and proxy" description="HD media preferences, proxy settings, and network usage reset.">
        <SettingRow icon={ImageIcon} title="Photo upload quality" control={<Select value={settingsData.storageData.photoUploadQuality} onChange={(value) => updateSetting('storageData.photoUploadQuality', value)} options={[['standard', 'Standard quality'], ['hd', 'HD quality']]} />} />
        <SettingRow icon={ImageIcon} title="Video upload quality" control={<Select value={settingsData.storageData.videoUploadQuality} onChange={(value) => updateSetting('storageData.videoUploadQuality', value)} options={[['standard', 'Standard quality'], ['hd', 'HD quality']]} />} />
        <SettingRow icon={Globe2} title="Proxy" control={<Toggle checked={settingsData.storageData.proxy.enabled} onChange={() => toggleSetting('storageData.proxy.enabled')} />} />
        <div className="grid gap-3 px-4 py-3 sm:grid-cols-2">
          <TextInput value={settingsData.storageData.proxy.host} onChange={(value) => updateSetting('storageData.proxy.host', value)} placeholder="Proxy host" />
          <TextInput value={settingsData.storageData.proxy.port} onChange={(value) => updateSetting('storageData.proxy.port', value)} placeholder="Port" />
        </div>
        <SettingRow icon={RefreshCw} title="Network usage" description={settingsData.storageData.networkUsageResetAt ? `Reset ${new Date(settingsData.storageData.networkUsageResetAt).toLocaleString()}` : 'No reset recorded.'} onClick={resetNetworkUsage} />
      </SettingSection>

      <ActionButton onClick={() => saveSettings()} disabled={saving}><Save size={16} /> Save storage settings</ActionButton>
    </div>
  );

  const renderLanguage = () => (
    <div className="space-y-4">
      <SettingSection title="App language" description="Match WhatsApp language settings and keep room for future translations.">
        <SettingRow icon={Languages} title="Language" control={<Select value={settingsData.app.language} onChange={(value) => updateSetting('app.language', value)} options={[['system', 'System default'], ['en', 'English'], ['sw', 'Kiswahili'], ['fr', 'Francais'], ['es', 'Espanol'], ['ar', 'Arabic'], ['hi', 'Hindi']]} />} />
        <SettingRow icon={Users} title="Invite friends" description="Show invite/share entry points." control={<Toggle checked={settingsData.app.inviteFriends} onChange={() => { toggleSetting('app.inviteFriends'); if (!settingsData.app.inviteFriends) handleInviteFriends(); }} />} />
      </SettingSection>
      <ActionButton onClick={() => saveSettings()} disabled={saving}><Save size={16} /> Save language settings</ActionButton>
    </div>
  );

  const renderLinked = () => (
    <div className="space-y-4">
      <SettingSection title="Linked devices" description="Manage sessions and connected devices like WhatsApp.">
        <SettingRow icon={Smartphone} title="Open linked devices" description="View, link, and log out devices." onClick={() => navigate('/linked-devices')} />
        <SettingRow icon={UserRound} title="Account switcher" description="Switch local accounts on this device." control={<span className="text-xs text-blue-100/60">Below</span>} />
      </SettingSection>
      <AccountSwitcher />
    </div>
  );

  const renderContacts = () => (
    <div className="space-y-4">
      <SettingSection title="Contacts" description="Contacts and blocked users are part of WhatsApp privacy and account settings.">
        <SettingRow icon={Users} title="Contact manager" description="Search, add, and manage contacts." onClick={() => setShowContacts(true)} />
        <SettingRow icon={Shield} title="Blocked contacts" description={`${blockedUsers.length} blocked ${blockedUsers.length === 1 ? 'contact' : 'contacts'}.`} onClick={() => setShowBlocked(true)} />
      </SettingSection>
    </div>
  );

  const renderFakeChat = () => (
    <div className="space-y-4">
      <SettingSection title="Fake Chat & Calls" description="Create fake conversations and call logs for testing.">
        <SettingRow icon={MessageSquare} title="Fake Chat Settings" description="Manage fake chat and call features." onClick={() => setShowFakeChat(true)} />
      </SettingSection>
    </div>
  );

  const renderLocation = () => (
    <div className="space-y-4">
      <SettingSection title="Location Sharing" description="Share your live location or use fake GPS.">
        <SettingRow icon={MapPin} title="Location Settings" description="Manage location sharing and fake GPS." onClick={() => setShowLocationSharing(true)} />
      </SettingSection>
    </div>
  );

  const renderHelp = () => (
    <div className="space-y-4">
      <SettingSection title="Help" description="Support, diagnostics, app info, and account export tools.">
        <SettingRow icon={HelpCircle} title="Help center" description="Open GENZ help and support route." onClick={() => setShowHelpCenter(true)} />
        <SettingRow icon={FileText} title="Terms and Privacy Policy" description="Terms, privacy, and app information entry." onClick={() => setShowTerms(true)} />
        <SettingRow icon={Shield} title="Diagnostics" description="Attach safe diagnostics to support messages." control={<Toggle checked={settingsData.help.diagnostics} onChange={() => toggleSetting('help.diagnostics')} />} />
        <SettingRow
          icon={RefreshCw}
          title="Check for Updates"
          description="Get real-time updates, without waiting."
          onClick={handleCheckForUpdate}
          control={checkingUpdate ? <RefreshCw size={16} className="animate-spin text-blue-100/60" /> : undefined}
        />
        <SettingRow
          icon={Smartphone}
          title="Android app version"
          description="How to install, download the APK and verify its checksum."
          onClick={() => navigate('/install')}
          control={apkVersion ? (
            installed && installed.code && apkVersion.versionCode > installed.code ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-white/70">v{installed.version || installed.code} →</span>
                <span className="font-semibold text-[#00a884]">v{apkVersion.version}</span>
                <span className="rounded-full bg-[#00a884]/20 px-2 py-0.5 text-[10px] font-bold text-[#00a884]">Update</span>
              </span>
            ) : (
              <span className="text-xs font-semibold text-[#00a884]">v{apkVersion.version}</span>
            )
          ) : undefined}
        />
      </SettingSection>
      <ActionButton onClick={() => saveSettings()} disabled={saving}><Save size={16} /> Save help settings</ActionButton>
    </div>
  );

  const [showAntiBanPanel, setShowAntiBanPanel] = useState(false);
  const [showPrivacyModsPanel, setShowPrivacyModsPanel] = useState(false);
  const [showSecurityModsPanel, setShowSecurityModsPanel] = useState(false);
  const [showStatusPrivacyPanel, setShowStatusPrivacyPanel] = useState(false);

  const renderActiveTab = () => {
    if (activeTab === 'profile') return renderProfile();
    if (activeTab === 'account') return renderAccount();
    if (activeTab === 'passkeys') return <PasskeysSettings />;
    if (activeTab === 'privacy') return renderPrivacy();
    if (activeTab === 'notifications') return renderNotifications();
    if (activeTab === 'storage') return renderStorage();
    if (activeTab === 'language') return renderLanguage();
    if (activeTab === 'linked') return renderLinked();
    if (activeTab === 'contacts') return renderContacts();
    if (activeTab === 'fake-chat') return renderFakeChat();
    if (activeTab === 'location') return renderLocation();
    return renderHelp();
  };

  return (
    <div className="flex h-screen min-h-screen flex-col bg-[#0b141a] text-white">
      <header className="border-b border-white/10 bg-[#111b21]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="rounded-full p-2 text-white hover:bg-white/10"
            title="Back" aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">Settings</h1>
            <p className="truncate text-xs text-blue-100/55">WhatsApp-style account, privacy, chats, notifications, storage and help settings</p>
          </div>
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            {loading && <RefreshCw size={16} className="animate-spin text-blue-100/60" />}
            <ActionButton onClick={() => saveSettings()} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save all'}
            </ActionButton>
          </div>
        </div>
      </header>

      {message && (
        <div className={`mx-4 mt-3 rounded-xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-[#00a884]/40 bg-[#00a884]/15 text-green-100' : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-100'}`}>
          {message.text}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:flex-row">
        <aside className="w-full flex-shrink-0 md:w-72">
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.05] p-2 md:flex-col md:overflow-visible">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-fit items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${isActive ? 'bg-[#00a884] text-white shadow' : 'text-blue-100/70 hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon size={18} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto pb-20 md:pb-4">
          <div className="mx-auto max-w-4xl space-y-4">
            {renderActiveTab()}
          </div>
        </main>
      </div>

      <div className="fixed bottom-24 left-4 right-4 z-20 sm:hidden">
        <ActionButton onClick={() => saveSettings()} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save all'}
        </ActionButton>
      </div>

      {showContacts && <ContactManager onClose={() => setShowContacts(false)} />}
      {showBlocked && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto bg-[#111b21] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Blocked contacts</h2>
              <button
                onClick={() => setShowBlocked(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                title="Close" aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <BlockedUsersList blockedUsers={blockedUsers} onUnblock={handleUnblock} />
          </div>
        </div>
      )}
      {showAntiBanPanel && <AntiBanPanel onClose={() => setShowAntiBanPanel(false)} />}
      {showPrivacyModsPanel && <PrivacyModsPanel onClose={() => setShowPrivacyModsPanel(false)} />}
      {showSecurityModsPanel && <SecurityModsPanel onClose={() => setShowSecurityModsPanel(false)} />}
      {showStatusPrivacyPanel && <StatusPrivacyPanel onClose={() => setShowStatusPrivacyPanel(false)} />}
      {showStorage && <StorageManagement onClose={() => setShowStorage(false)} />}
      {showFakeChat && <FakeChatPanel onClose={() => setShowFakeChat(false)} />}
      {showLocationSharing && <LocationSharingPanel onClose={() => setShowLocationSharing(false)} />}
      {showContactSelector && contactSelectorConfig && (
        <ContactSelectorScreen
          privacyType={contactSelectorConfig.privacyType}
          selectorType={contactSelectorConfig.selectorType}
          contacts={contactSelectorConfig.contacts || user?.contacts || []}
          initialSelectedContacts={contactSelectorConfig.initialSelectedContacts}
          onSave={handleContactSelectorSave}
          onClose={() => setShowContactSelector(false)}
        />
      )}

      {showHelpCenter && <SettingsHelp onClose={() => setShowHelpCenter(false)} />}

      {showTerms && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowTerms(false)}>
          <div className="w-full max-w-lg bg-[#111b21] rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Terms and Privacy Policy</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                title="Close" aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-blue-100/70 mb-4">
              Read the full legal documents for Genz Messenger, including our privacy and data handling details.
            </p>
            <div className="grid gap-3">
              <Link
                to="/terms"
                onClick={() => setShowTerms(false)}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left hover:bg-white/10 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-white">Terms of Service</p>
                  <p className="text-xs text-blue-100/60">Rules, eligibility, and acceptable use</p>
                </div>
                <ChevronRight size={18} className="text-white/40" />
              </Link>
              <Link
                to="/privacy-policy"
                onClick={() => setShowTerms(false)}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left hover:bg-white/10 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-white">Privacy Policy</p>
                  <p className="text-xs text-blue-100/60">Data we collect and how we use it</p>
                </div>
                <ChevronRight size={18} className="text-white/40" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {updateInfo && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={() => setUpdateInfo(null)}>
          <div className="w-full max-w-md bg-[#111b21] rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00a884]/20">
                <Download size={20} className="text-[#00a884]" />
              </div>
              <button
                type="button"
                onClick={() => setUpdateInfo(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                title="Close" aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="text-white font-bold text-lg mt-3">Sasisho jipya limepatikana</h2>
            <p className="text-sm text-blue-100/70 mt-1">
              {updateInfo.isWeb
                ? "There's a new GENZ version. Reload to get new features."
                : `You have a new GENZ version — v${updateInfo.manifest.version}. Install it to get new features.`}
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-100/60">Installed</span>
                <span className="text-white/80 font-semibold">v{updateInfo.installed.version || updateInfo.installed.code}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-blue-100/60">Latest</span>
                <span className="text-[#00a884] font-bold">v{updateInfo.manifest.version}</span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-100/60 mb-2">Mabadiliko mapya</p>
              {updateInfo.changes.length > 0 ? (
                <ul className="space-y-2">
                  {updateInfo.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/85">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00a884]" />
                      {change}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-blue-100/50">No change details for this version.</p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              {updateInfo.isWeb ? (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#00a884] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#00c795]"
                >
                  <RefreshCw size={16} /> Reload sasa
                </button>
              ) : (
                <a
                  href={updateInfo.apkUrl}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#00a884] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#00c795]"
                >
                  <Download size={16} /> Install sasa
                </a>
              )}
              <button
                type="button"
                onClick={() => setUpdateInfo(null)}
                className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15"
              >
                Sasa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
