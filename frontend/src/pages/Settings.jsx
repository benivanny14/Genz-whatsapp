import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, User, Lock, Bell, Shield, Users, Package,
  Smartphone, ChevronRight, Database, UserRound, KeyRound, Languages,
  HelpCircle, Download, Trash2, Phone, Wifi, Image as ImageIcon,
  HardDrive, CheckCircle2, EyeOff, Archive, Clock, Mail, FileText, Globe2,
  RefreshCw, RotateCcw, Palette
} from 'lucide-react';
import ContactManager from '../components/ContactManager';
import ProductCatalogue from '../components/ProductCatalogue';
import StorageManagement from '../components/StorageManagement';
import AccountSwitcher from '../components/AccountSwitcher';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import userService from '../services/userService';
import { checkForUpdate } from '../utils/appUpdate';

const SETTINGS_KEY = 'genz_user_settings';

const DEFAULT_SETTINGS = {
  account: {
    email: '',
    twoStepVerification: false,
    passkeys: false,
    securityNotifications: true,
    changeNumberGuard: true,
    requestAccountInfoAt: null,
    deleteAccountGuard: true
  },
  privacy: {
    online: 'same_as_last_seen',
    profilePhoto: 'everyone',
    about: 'everyone',
    status: 'contacts',
    defaultMessageTimer: 'off',
    groups: 'everyone',
    blockedUsers: [],
    silenceUnknownCallers: false,
    protectIpAddressInCalls: false,
    disableLinkPreviews: false,
    blockUnknownAccountMessages: false,
    advancedChatPrivacy: false,
    privacyCheckupCompleted: false,
    privacyCheckupCompletedAt: null
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
    vibration: 'default'
  },
  storageData: {
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
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [showStorage, setShowStorage] = useState(false);

  const tabs = useMemo(() => ([
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: KeyRound },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'storage', label: 'Storage and data', icon: Database },
    { id: 'language', label: 'App language', icon: Languages },
    { id: 'linked', label: 'Linked devices', icon: Smartphone },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'business', label: 'Business tools', icon: Package },
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

  const runPrivacyCheckup = () => {
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
    showStatus('success', 'Privacy Checkup applied.');
  };

  const requestAccountInfo = () => {
    const next = setPath(settingsData, 'account.requestAccountInfoAt', new Date().toISOString());
    setSettingsData(next);
    saveSettings(next);
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
        <SettingRow icon={Mail} title="Email address" description="Used for verification and recovery." control={
          <div className="w-56">
            <TextInput value={settingsData.account.email} onChange={(value) => updateSetting('account.email', value)} placeholder="name@example.com" type="email" />
          </div>
        } />
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
        <SettingRow icon={Globe2} title="Online" control={<Select value={settingsData.privacy.online} onChange={(value) => updateSetting('privacy.online', value)} options={[['everyone', 'Everyone'], ['same_as_last_seen', 'Same as last seen']]} />} />
        <SettingRow icon={UserRound} title="Profile photo" control={<Select value={settingsData.privacy.profilePhoto} onChange={(value) => updateSetting('privacy.profilePhoto', value)} options={VISIBILITY_OPTIONS} />} />
        <SettingRow icon={User} title="About" control={<Select value={settingsData.privacy.about} onChange={(value) => updateSetting('privacy.about', value)} options={VISIBILITY_OPTIONS} />} />
        <SettingRow icon={Palette} title="Status" control={<Select value={settingsData.privacy.status} onChange={(value) => updateSetting('privacy.status', value)} options={STATUS_OPTIONS} />} />
      </SettingSection>

      <SettingSection title="Messages, groups, and calls" description="Controls for disappearing messages, group invites, unknown calls, and call privacy.">
        <SettingRow icon={Clock} title="Default message timer" control={<Select value={settingsData.privacy.defaultMessageTimer} onChange={(value) => updateSetting('privacy.defaultMessageTimer', value)} options={TIMER_OPTIONS} />} />
        <SettingRow icon={Users} title="Groups" description="Who can add you to groups." control={<Select value={settingsData.privacy.groups} onChange={(value) => updateSetting('privacy.groups', value)} options={VISIBILITY_OPTIONS.filter(([value]) => value !== 'nobody')} />} />
        <SettingRow icon={Phone} title="Silence unknown callers" description="Unknown calls will not ring, but stay visible in calls." control={<Toggle checked={settingsData.privacy.silenceUnknownCallers} onChange={() => toggleSetting('privacy.silenceUnknownCallers')} />} />
        <SettingRow icon={Shield} title="Protect IP address in calls" description="Relay calls for extra call privacy." control={<Toggle checked={settingsData.privacy.protectIpAddressInCalls} onChange={() => toggleSetting('privacy.protectIpAddressInCalls')} />} />
      </SettingSection>

      <SettingSection title="Advanced privacy" description="Newer WhatsApp-style controls for links, unknown accounts, and advanced chat privacy.">
        <SettingRow icon={EyeOff} title="Disable link previews" control={<Toggle checked={settingsData.privacy.disableLinkPreviews} onChange={() => toggleSetting('privacy.disableLinkPreviews')} />} />
        <SettingRow icon={Shield} title="Block unknown account messages" description="Reduce spam from accounts you have not contacted." control={<Toggle checked={settingsData.privacy.blockUnknownAccountMessages} onChange={() => toggleSetting('privacy.blockUnknownAccountMessages')} />} />
        <SettingRow icon={Shield} title="Advanced Chat Privacy" description="Block exports, media auto-downloads, and AI sharing for sensitive chats." control={<Toggle checked={settingsData.privacy.advancedChatPrivacy} onChange={() => toggleSetting('privacy.advancedChatPrivacy')} />} />
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
        <SettingRow icon={Users} title="Invite friends" description="Show invite/share entry points." control={<Toggle checked={settingsData.app.inviteFriends} onChange={() => toggleSetting('app.inviteFriends')} />} />
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
        <SettingRow icon={Shield} title="Blocked contacts" description={`${settingsData.privacy.blockedUsers.length} locally tracked blocked contacts.`} onClick={() => setShowContacts(true)} />
      </SettingSection>
    </div>
  );

  const renderBusiness = () => (
    <div className="space-y-4">
      <SettingSection title="Business tools" description="WhatsApp Business-style catalogue support already exists in this system.">
        <SettingRow icon={Package} title="Product catalogue" description="Create products and send them to customers." onClick={() => setShowCatalogue(true)} />
      </SettingSection>
    </div>
  );

  const renderHelp = () => (
    <div className="space-y-4">
      <SettingSection title="Help" description="Support, diagnostics, app info, and account export tools.">
        <SettingRow icon={HelpCircle} title="Help center" description="Open GENZ help and support route." onClick={() => showStatus('success', 'Help Center is ready for integration.')} />
        <SettingRow icon={Mail} title="Contact us" description="Prepare support email." onClick={() => { window.location.href = 'mailto:support@genz.local?subject=GENZ%20WhatsApp%20Support'; }} />
        <SettingRow icon={FileText} title="Terms and Privacy Policy" description="Terms, privacy, and app information entry." onClick={() => showStatus('success', 'Terms and Privacy Policy entry is available.')} />
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

  const renderActiveTab = () => {
    if (activeTab === 'profile') return renderProfile();
    if (activeTab === 'account') return renderAccount();
    if (activeTab === 'privacy') return renderPrivacy();
    if (activeTab === 'notifications') return renderNotifications();
    if (activeTab === 'storage') return renderStorage();
    if (activeTab === 'language') return renderLanguage();
    if (activeTab === 'linked') return renderLinked();
    if (activeTab === 'contacts') return renderContacts();
    if (activeTab === 'business') return renderBusiness();
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

      <div className="fixed bottom-4 left-4 right-4 z-20 sm:hidden">
        <ActionButton onClick={() => saveSettings()} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save all'}
        </ActionButton>
      </div>

      {showContacts && <ContactManager onClose={() => setShowContacts(false)} />}
      {showCatalogue && <ProductCatalogue onClose={() => setShowCatalogue(false)} onSendProduct={() => setShowCatalogue(false)} />}
      {showStorage && <StorageManagement onClose={() => setShowStorage(false)} />}
    </div>
  );
};

export default Settings;
