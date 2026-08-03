import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, User, Lock, Bell, Shield, ShieldCheck, Users, Package, Building2, PhoneCall, Eye,
  Smartphone, ChevronRight, Database, UserRound, KeyRound, Languages,
  HelpCircle, Download, Trash2, Phone, Wifi, Image as ImageIcon,
  HardDrive, CheckCircle2, EyeOff, Archive, Clock, FileText, Globe2,
  RefreshCw, RotateCcw, Palette, MessageSquare, MapPin, X, Fingerprint
} from 'lucide-react';
import ContactManager from '../components/ContactManager';
import { BlockedUsersList } from '../components/BlockUnblock';
import ProductCatalogue from '../components/ProductCatalogue';
import BusinessAccountPanel from '../components/BusinessAccountPanel';
import CallFeaturesPanel from '../components/CallFeaturesPanel';
import AntiBanPanel from '../components/AntiBanPanel';
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
import userService from '../services/userService';
import { checkForUpdate } from '../utils/appUpdate';
import { resolveApiBase } from '../utils/resolveApiBase';
import SettingsHelp from '../components/SettingsHelp';

const SETTINGS_KEY = 'genz_user_settings';

const DEFAULT_SETTINGS = {
  account: {
    twoStepVerification: false,
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
    silenceUnknownCallers: false,
    protectIpAddressInCalls: false,
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
    callRingtone: 'default',
    vibration: 'default'
  },
  storageData: {
    mobileAutoDownload: ['photos'],
    wifiAutoDownload: ['photos', 'audio', 'videos', 'documents'],
    roamingAutoDownload: [],
    photoUploadQuality: 'standard',
    videoUploadQuality: 'standard',
    useLessDataForCalls: false,
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
      enabled: Boolean(notifications.messages || notifications.groups || notifications.calls),
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
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [showBusinessPanel, setShowBusinessPanel] = useState(false);
  const [showStorage, setShowStorage] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [contactSelectorConfig, setContactSelectorConfig] = useState(null);
  const [showFakeChat, setShowFakeChat] = useState(false);
  const [showLocationSharing, setShowLocationSharing] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const tabs = useMemo(() => ([
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: KeyRound },
    { id: 'passkeys', label: 'Passkeys', icon: Fingerprint },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'storage', label: 'Storage and data', icon: Database },
    { id: 'calls', label: 'Calls', icon: PhoneCall },
    { id: 'language', label: 'App language', icon: Languages },
    { id: 'linked', label: 'Linked devices', icon: Smartphone },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'business', label: 'Business tools', icon: Package },
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
  const handleCheckForUpdate = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const result = await checkForUpdate();
      if (result === 'updated') {
        showStatus('success', 'Sasisho jipya limepatikana! Linaandaliwa...');
      } else if (result === 'up-to-date') {
        showStatus('success', 'Uko kwenye toleo jipya kabisa la app.');
      } else if (result === 'unsupported') {
        showStatus('error', 'Kivinjari hiki hakiwezeshi sasisho la moja kwa moja.');
      } else {
        showStatus('error', 'Imeshindwa kuangalia sasisho. Jaribu tena baadaye.');
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
        about: profileData.bio,
        phoneNumber: profileData.phone.trim()
      };
      await userService.updateProfile(payload);
      updateUserProfile?.(payload);
      showStatus('success', 'Profile saved successfully.');
    } catch (error) {
      updateUserProfile?.({
        username: profileData.username,
        bio: profileData.bio,
        phoneNumber: profileData.phone
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
        silenceUnknownCallers: true,
        protectIpAddressInCalls: true,
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
      const API_URL = resolveApiBase();
      const token = localStorage.getItem('token');
      const [contactsRes, savedRes] = await Promise.all([
        fetch(`${API_URL}/chat/contacts`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${API_URL}/privacy/${selectorType}/${privacyType}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);
      
      const data = contactsRes.ok ? await contactsRes.json() : {};
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
      if (savedRes.ok) {
        const savedData = await savedRes.json();
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
      const API_URL = resolveApiBase();
      
      if (selectorType === 'excluded') {
        // Clear existing and add new
        await fetch(`${API_URL}/privacy/excluded/type/${privacyType}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (selectedContactData.length > 0) {
          await fetch(`${API_URL}/privacy/excluded/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              privacyType,
              contacts: selectedContactData
            })
          });
        }
      } else if (selectorType === 'allowed') {
        // Clear existing and add new
        await fetch(`${API_URL}/privacy/allowed/type/${privacyType}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (selectedContactData.length > 0) {
          await fetch(`${API_URL}/privacy/allowed/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              privacyType,
              contacts: selectedContactData
            })
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
    const inviteText = 'Join me on GENZ WhatsApp — a powerful messaging app!';
    if (navigator.share) {
      navigator.share({ title: 'Invite to GENZ', text: inviteText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(inviteText).then(() => showStatus('success', 'Invite link copied.')).catch(() => {});
    }
  };


  const resetSettings = () => {
    if (!window.confirm('Reset all WhatsApp-style settings on this device?')) return;
    const next = clone(DEFAULT_SETTINGS);
    setSettingsData(next);
    persistSettings(next);
    saveSettings(next);
  };

  const resetNetworkUsage = () => {
    const next = setPath(settingsData, 'storageData.networkUsageResetAt', new Date().toISOString());
    setSettingsData(next);
    saveSettings(next);
  };

  const handleChangeNumber = async () => {
    if (!settingsData.account.changeNumberGuard || window.confirm('Are you sure you want to change your phone number? This will migrate your account data.')) {
      const newNumber = window.prompt('Enter your new phone number:');
      if (newNumber) {
        try {
          await userService.changeNumber(newNumber);
          showStatus('success', 'Phone number changed successfully.');
          setProfileData(prev => ({ ...prev, phone: newNumber }));
        } catch (error) {
          showStatus('error', error.message || 'Failed to change number.');
        }
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
      <SettingSection title="Account" description="Security, passkeys, account information, and account actions.">
        <SettingRow icon={Shield} title="Two-step verification" description="Open the full 2FA setup flow." onClick={() => navigate('/settings/security')} />
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
        
        <SettingRow icon={Phone} title="Silence unknown callers" description="Unknown calls will not ring, but stay visible in calls." control={<Toggle checked={settingsData.privacy.silenceUnknownCallers} onChange={() => toggleSetting('privacy.silenceUnknownCallers')} />} />
        <SettingRow icon={Shield} title="Protect IP address in calls" description="Relay calls for extra call privacy." control={<Toggle checked={settingsData.privacy.protectIpAddressInCalls} onChange={() => toggleSetting('privacy.protectIpAddressInCalls')} />} />
      </SettingSection>

      <SettingSection title="Advanced privacy" description="Newer WhatsApp-style controls for links, unknown accounts, and advanced chat privacy.">
        <SettingRow icon={EyeOff} title="Disable link previews" control={<Toggle checked={settingsData.privacy.disableLinkPreviews} onChange={() => toggleSetting('privacy.disableLinkPreviews')} />} />
        <SettingRow icon={Shield} title="Block unknown account messages" description="Reduce spam from accounts you have not contacted." control={<Toggle checked={settingsData.privacy.blockUnknownAccountMessages} onChange={() => toggleSetting('privacy.blockUnknownAccountMessages')} />} />
        <SettingRow icon={Shield} title="Advanced Chat Privacy" description="Block exports, media auto-downloads, and AI sharing for sensitive chats." control={<Toggle checked={settingsData.privacy.advancedChatPrivacy} onChange={() => toggleSetting('privacy.advancedChatPrivacy')} />} />
        <SettingRow icon={ShieldCheck} title="Account security" description="Anti-ban protection, rate limiting, device spoofing and security score." onClick={() => setShowAntiBanPanel(true)} />
      </SettingSection>

      <ActionButton onClick={() => saveSettings()} disabled={saving}><Save size={16} /> Save privacy settings</ActionButton>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4">
      <SettingSection title="Notifications" description="Message, group, call, preview, vibration, and reactions.">
        <SettingRow icon={Bell} title="Message notifications" control={<Toggle checked={settingsData.notifications.messages} onChange={() => toggleSetting('notifications.messages')} />} />
        <SettingRow icon={Users} title="Group notifications" control={<Toggle checked={settingsData.notifications.groups} onChange={() => toggleSetting('notifications.groups')} />} />
        <SettingRow icon={Phone} title="Call notifications" control={<Toggle checked={settingsData.notifications.calls} onChange={() => toggleSetting('notifications.calls')} />} />
        <SettingRow icon={Bell} title="Conversation tones" control={<Toggle checked={settingsData.notifications.conversationTones} onChange={() => toggleSetting('notifications.conversationTones')} />} />
        <SettingRow icon={Bell} title="Sounds" control={<Toggle checked={settingsData.notifications.sounds} onChange={() => toggleSetting('notifications.sounds')} />} />
        <SettingRow icon={EyeOff} title="Show preview" description="Show message text in notifications." control={<Toggle checked={settingsData.notifications.showPreview} onChange={() => toggleSetting('notifications.showPreview')} />} />
        <SettingRow icon={Bell} title="High priority notifications" control={<Toggle checked={settingsData.notifications.highPriority} onChange={() => toggleSetting('notifications.highPriority')} />} />
        <SettingRow icon={CheckCircle2} title="Reaction notifications" control={<Toggle checked={settingsData.notifications.reactionNotifications} onChange={() => toggleSetting('notifications.reactionNotifications')} />} />
        <SettingRow icon={Clock} title="Reminders" control={<Toggle checked={settingsData.notifications.reminders} onChange={() => toggleSetting('notifications.reminders')} />} />
        <SettingRow icon={Bell} title="Vibration" control={<Select value={settingsData.notifications.vibration} onChange={(value) => updateSetting('notifications.vibration', value)} options={[['off', 'Off'], ['default', 'Default'], ['short', 'Short'], ['long', 'Long']]} />} />
      </SettingSection>

      <ActionButton onClick={() => saveSettings()} disabled={saving}><Save size={16} /> Save notification settings</ActionButton>
    </div>
  );

  const renderStorage = () => (
    <div className="space-y-4">
      <SettingSection title="Manage storage" description="Open the existing storage manager and tune data usage.">
        <SettingRow icon={Database} title="Manage storage" description="Review large files and cached media by chat." onClick={() => setShowStorage(true)} />
        <SettingRow icon={Wifi} title="Use less data for calls" control={<Toggle checked={settingsData.storageData.useLessDataForCalls} onChange={() => toggleSetting('storageData.useLessDataForCalls')} />} />
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

  const renderBusiness = () => (
    <div className="space-y-4">
      <SettingSection title="Business tools" description="WhatsApp Business-style catalogue and profile tools.">
        <SettingRow icon={Package} title="Product catalogue" description="Create products and send them to customers." onClick={() => setShowCatalogue(true)} />
        <SettingRow icon={Building2} title="Business account settings" description="Hours, auto-reply, away message and quick replies." onClick={() => setShowBusinessPanel(true)} />
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
          title="Angalia Sasisho (Check for Updates)"
          description="Pata marekebisho mapya ya app papo hapo, bila kusubiri."
          onClick={handleCheckForUpdate}
          control={checkingUpdate ? <RefreshCw size={16} className="animate-spin text-blue-100/60" /> : undefined}
        />
      </SettingSection>
      <ActionButton onClick={() => saveSettings()} disabled={saving}><Save size={16} /> Save help settings</ActionButton>
    </div>
  );

  const [showCallsPanel, setShowCallsPanel] = useState(false);
  const [showAntiBanPanel, setShowAntiBanPanel] = useState(false);
  const [showStatusPrivacyPanel, setShowStatusPrivacyPanel] = useState(false);

  const renderCalls = () => (
    <div className="space-y-4">
      <SettingSection title="Calls" description="Call waiting, call blocking, ring timeout and more.">
        <SettingRow icon={PhoneCall} title="Call settings" description="Manage call waiting, blocking, recording and limits." onClick={() => setShowCallsPanel(true)} />
      </SettingSection>
    </div>
  );

  const renderActiveTab = () => {
    if (activeTab === 'profile') return renderProfile();
    if (activeTab === 'account') return renderAccount();
    if (activeTab === 'passkeys') return <PasskeysSettings />;
    if (activeTab === 'privacy') return renderPrivacy();
    if (activeTab === 'notifications') return renderNotifications();
    if (activeTab === 'storage') return renderStorage();
    if (activeTab === 'calls') return renderCalls();
    if (activeTab === 'language') return renderLanguage();
    if (activeTab === 'linked') return renderLinked();
    if (activeTab === 'contacts') return renderContacts();
    if (activeTab === 'business') return renderBusiness();
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
      {showCatalogue && <ProductCatalogue onClose={() => setShowCatalogue(false)} onSendProduct={() => setShowCatalogue(false)} />}
      {showBusinessPanel && <BusinessAccountPanel onClose={() => setShowBusinessPanel(false)} />}
      {showCallsPanel && <CallFeaturesPanel onClose={() => setShowCallsPanel(false)} />}
      {showAntiBanPanel && <AntiBanPanel onClose={() => setShowAntiBanPanel(false)} />}
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
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto bg-[#111b21] rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
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
            <div className="space-y-4 text-sm text-blue-100/80">
              <section>
                <h3 className="text-white font-medium mb-1">1. Acceptance of Terms</h3>
                <p>By accessing or using GENZ WhatsApp, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use the app.</p>
              </section>
              <section>
                <h3 className="text-white font-medium mb-1">2. Use of the Service</h3>
                <p>You may use the service for lawful, personal purposes only. You agree not to misuse the service, attempt unauthorized access, or interfere with other users' use.</p>
              </section>
              <section>
                <h3 className="text-white font-medium mb-1">3. Privacy</h3>
                <p>We collect account and messaging data necessary to operate the service. Messages are stored and synced to provide seamless chat history. See our Privacy Policy for details on data we collect and how you can request your information.</p>
              </section>
              <section>
                <h3 className="text-white font-medium mb-1">4. Account Security</h3>
                <p>You are responsible for safeguarding your account credentials. Enable two-factor authentication to protect your account.</p>
              </section>
              <section>
                <h3 className="text-white font-medium mb-1">5. Termination</h3>
                <p>We may suspend or terminate accounts that violate these Terms. You may delete your account at any time from Settings.</p>
              </section>
              <section>
                <h3 className="text-white font-medium mb-1">6. Changes</h3>
                <p>We may update these Terms from time to time. Continued use of the app after changes constitutes acceptance of the updated Terms.</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
