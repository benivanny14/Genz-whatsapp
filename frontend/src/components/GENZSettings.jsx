import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  ArrowLeft, Shield, EyeOff, Zap, Palette, Lock, Bell, HardDrive,
  CameraOff, Timer, UserCheck, Image as ImageIcon, CheckCheck, Cloud,
  RefreshCw, Download, Clock, Play, MonitorSmartphone, Monitor, Smartphone,
  LogOut, Info, Mic, Music, UserCircle, Edit3, Camera, Sun, Moon, BellOff,
  BarChart2, Smartphone as SmartphoneIcon, Mail, Forward, Eye, Globe,
  MessageSquare, Layers, Video, Sparkles, TrendingUp, Star, Wand2,
  Activity, BarChart
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import PrivacyPolicyAnimation from './PrivacyPolicyAnimation';
import OnlineHistoryDashboard from './OnlineHistoryDashboard';
import DeviceManagement from './DeviceManagement';
import TwoFactorAuth from './TwoFactorAuth';
import EmailVerification from './EmailVerification';
import PasswordReset from './PasswordReset';
import GlassThemeManager from './GlassThemeManager';
import SystemDashboard from './SystemDashboard';
import { authFetch } from '../utils/authFetch';
import { VOICE_EFFECT_PRESETS, createTestToneBlob, applyVoiceEffect } from '../utils/voiceEffects';
import { compressImage } from '../utils/imageCompression';

const API_URL = import.meta.env.VITE_API_URL || '';
const SUBSCRIPTION_AMOUNT = 10000; // Tsh 10,000 kwa miezi 2 (siku 60)

const GENZSettings = ({ close, mods, setMods, lockType, setLockType, setLockPin }) => {
  const {
    statusPrivacy, setStatusPrivacy, user, startCloudBackup, backupProgress,
    notificationSound, setNotificationSound, connectedDevices, logoutDevice,
    updateAutoReply, presenceHistory,
    toggleAppTheme, appTheme,
    toggleDNDMode, isDNDMode,
    getMessageStats, exportBackup,
    listCloudBackups, restoreCloudBackup, deleteCloudBackup,
    selectedConversation
  } = useChat();
  const { updateUserProfile } = useUser();

  const [showPrivacyAnimation, setShowPrivacyAnimation] = useState(false);
  const [voiceFxPreviewBusy, setVoiceFxPreviewBusy] = useState(false);
  const [applyScope, setApplyScope] = useState('global');
  const [wallpaperCategory, setWallpaperCategory] = useState('bright');
  const [previewWallpaper, setPreviewWallpaper] = useState(mods?.chatWallpaper);

  const TM_SOLID_COLORS = [
    { name: 'WhatsApp Teal', hex: '#075e54' },
    { name: 'Dark Slate', hex: '#0b141a' },
    { name: 'Deep Sea Blue', hex: '#0e1e2d' },
    { name: 'Eggplant Purple', hex: '#1c0f24' },
    { name: 'Forest Green', hex: '#0a2211' },
    { name: 'Classic Charcoal', hex: '#161d22' },
    { name: 'Burgundy Red', hex: '#310d13' },
    { name: 'Warm Chocolate', hex: '#26170e' },
    { name: 'Royal Gold', hex: '#2c2718' },
    { name: 'Sunset Sage', hex: '#1f2c25' }
  ];

  const TM_BRIGHT_WALLPAPERS = [
    { name: 'Classic Gradient', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=60' },
    { name: 'Pastel Dream', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60' },
    { name: 'Summer Leaf', url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=60' },
    { name: 'Desert Dune', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=60' },
    { name: 'Abstract Aura', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=60' }
  ];

  const TM_DARK_WALLPAPERS = [
    { name: 'Moody Tech', url: 'https://images.unsplash.com/photo-1618005198143-d56653f666f7?w=800&auto=format&fit=crop&q=60' },
    { name: 'Dark Pines', url: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800&auto=format&fit=crop&q=60' },
    { name: 'Deep Cosmos', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800&auto=format&fit=crop&q=60' },
    { name: 'Midnight Waves', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=60' },
    { name: 'Charcoal Texture', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=60' }
  ];

  // Update preview when applyScope changes
  useEffect(() => {
    if (applyScope === 'chat' && selectedConversation?._id) {
      const chatConf = mods?.customWallpapers?.[selectedConversation._id];
      setPreviewWallpaper(chatConf?.wallpaper || '');
    } else {
      setPreviewWallpaper(mods?.chatWallpaper || '');
    }
  }, [applyScope, selectedConversation?._id, mods?.chatWallpaper, mods?.customWallpapers]);

  const [showDashboard, setShowDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [autoReplyMsg, setAutoReplyMsg] = useState("Hello! I'm offline right now, will reply when I'm back.");
  const [editProfile, setEditProfile] = useState(() => {
    // Load profile data from localStorage on initialization
    const storedProfile = localStorage.getItem('genz_user_profile');
    let profileData = { username: '', bio: '', profilePicture: '' };
    if (storedProfile) {
      try {
        profileData = JSON.parse(storedProfile);
        console.log('Loaded profile from localStorage:', { ...profileData, profilePicture: profileData.profilePicture?.length + ' chars' });
      } catch (e) {
        console.error('Failed to parse stored profile:', e);
      }
    }
    return {
      username: profileData.username || user?.username || '',
      bio: profileData.bio || user?.bio || 'Using GENZ WhatsApp Ultra Secure',
      profilePicture: profileData.profilePicture || user?.profilePicture || ''
    };
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isActive: false,
    hasSubscription: false,
    expiryDate: null,
    remainingDays: 0
  });
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [isPrivacyLocked, setIsPrivacyLocked] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeviceManagement, setShowDeviceManagement] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showGlassManager, setShowGlassManager] = useState(false);
  const [showSystemDashboard, setShowSystemDashboard] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [cloudBackups, setCloudBackups] = useState([]);
  const [fetchingBackups, setFetchingBackups] = useState(false);
  const [backupActionLoading, setBackupActionLoading] = useState(null); // backupId of active operation, or 'start'
  const [backupError, setBackupError] = useState('');
  const profilePictureInputRef = useRef(null);
  const wallpaperInputRef = useRef(null);
  const previousProfileRef = useRef(null);

  // Save profile data to localStorage when it changes (debounced to avoid issues)
  useEffect(() => {
    const currentProfile = {
      username: editProfile.username,
      bio: editProfile.bio,
      profilePicture: editProfile.profilePicture
    };

    if (!previousProfileRef.current) {
      previousProfileRef.current = currentProfile;
      return;
    }

    // Only save if data actually changed
    const hasChanged =
      currentProfile.username !== previousProfileRef.current.username ||
      currentProfile.bio !== previousProfileRef.current.bio ||
      currentProfile.profilePicture !== previousProfileRef.current.profilePicture;

    if (!hasChanged) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem('genz_user_profile', JSON.stringify(currentProfile));
        previousProfileRef.current = currentProfile;
        if (updateUserProfile) updateUserProfile(currentProfile);
        console.log('Saved profile to localStorage:', { ...currentProfile, profilePicture: currentProfile.profilePicture?.length + ' chars' });
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          console.error('localStorage quota exceeded - profile picture too large');
          alert('Profile picture is too large. Please choose a smaller image.');
        } else {
          console.error('Failed to save profile data:', e);
        }
      }
    }, 800); // Increased debounce time for better performance
    return () => clearTimeout(timer);
  }, [editProfile.username, editProfile.bio, editProfile.profilePicture, updateUserProfile]);

  useEffect(() => {
    if (mods?.autoReplyMsg) setAutoReplyMsg(mods.autoReplyMsg);
  }, [mods?.autoReplyMsg]);

  // Check subscription status on mount
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const response = await authFetch(`${API_URL}/payment/subscription`);

        if (response.ok) {
          const data = await response.json();
          setSubscriptionStatus(data);
          // Check userPremium field (more reliable than subscription status)
          setIsPrivacyLocked(!(data.userPremium || data.isActive));
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsPrivacyLocked(true);
      }
    };

    checkSubscription();

    // Poll subscription status every 30 seconds to check for expiry
    const interval = setInterval(checkSubscription, 30000);

    return () => clearInterval(interval);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!subscriptionStatus.expiryDate || !subscriptionStatus.isActive) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const expiry = new Date(subscriptionStatus.expiryDate);
      const diff = expiry - now;

      if (diff <= 0) {
        setCountdown('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [subscriptionStatus.expiryDate, subscriptionStatus.isActive]);

  const handleInitiatePayment = async () => {
    if (!phoneNumber) {
      setPaymentMessage('Tafadhali ingiza namba ya simu');
      return;
    }

    // Validate phone number format (exactly 9 digits after stripping 0 or 255)
    if (phoneNumber.length !== 9 || !/^\d+$/.test(phoneNumber)) {
      setPaymentMessage('Namba ya simu si sahihi. Tafadhali ingiza namba ya simu yenye tarakimu 9 (mfano: 712345678).');
      return;
    }

    setPaymentLoading(true);
    setPaymentMessage('');

    try {
      const response = await authFetch(`${API_URL}/payment/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethod,
          phoneNumber,
          amount: SUBSCRIPTION_AMOUNT,
          deviceId: localStorage.getItem('device-id') || 'local-user'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPaymentMessage('Malipo yameanza. Tafadhali maliza kwenye simu yako.');
        // Check payment status after 5 seconds
        setTimeout(async () => {
          try {
            const subResponse = await authFetch(`${API_URL}/payment/subscription`);
            if (subResponse.ok) {
              const subData = await subResponse.json();
              setSubscriptionStatus(subData);
              setIsPrivacyLocked(!subData.isActive);
              if (subData.isActive) {
                setShowPaymentModal(false);
                setPaymentMessage('Malipo yamekamilika!');
              }
            }
          } catch (error) {
            console.error('Error checking payment status:', error);
          }
        }, 6000);
      } else {
        setPaymentMessage(data.message || 'Malipo yameshindwa. Tafadhali jaribu tena.');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      setPaymentMessage('Kuna tatizo la mtandao. Tafadhali jaribu tena.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleRenewSubscription = async () => {
    if (!phoneNumber) {
      setPaymentMessage('Tafadhali ingiza namba ya simu');
      return;
    }

    // Validate phone number format (exactly 9 digits after stripping 0 or 255)
    if (phoneNumber.length !== 9 || !/^\d+$/.test(phoneNumber)) {
      setPaymentMessage('Namba ya simu si sahihi. Tafadhali ingiza namba ya simu yenye tarakimu 9 (mfano: 712345678).');
      return;
    }

    setPaymentLoading(true);
    setPaymentMessage('');

    try {
      const response = await authFetch(`${API_URL}/payment/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentMethod, phoneNumber })
      });

      const data = await response.json();

      if (response.ok) {
        setPaymentMessage('Udhibiti wa malipo umekamilika. Tafadhali maliza kwenye simu yako.');
        setTimeout(async () => {
          const subResponse = await authFetch(`${API_URL}/payment/subscription`);
          if (subResponse.ok) {
            const subData = await subResponse.json();
            setSubscriptionStatus(subData);
            setIsPrivacyLocked(!subData.isActive);
            if (subData.isActive) {
              setShowPaymentModal(false);
              setPaymentMessage('Udhibiti umekamilika!');
            }
          }
        }, 6000);
      } else {
        setPaymentMessage(data.message || 'Udhibiti umeshindwa.');
      }
    } catch (error) {
      setPaymentMessage('Kuna tatizo la mtandao. Tafadhali jaribu tena.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleFileWallpaper = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressedBase64 = await compressImage(file, 1080, 0.7);
      setPreviewWallpaper(compressedBase64);
      showMsg('✨ Picha imepakiwa vizuri! Bonyeza Apply ili kuhifadhi.');
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const preview = await compressImage(file, 512, 0.75);
      setEditProfile(prev => ({ ...prev, profilePicture: preview }));
    } catch (_) {
      const reader = new FileReader();
      reader.onloadend = () => setEditProfile(prev => ({ ...prev, profilePicture: reader.result }));
      reader.readAsDataURL(file);
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await authFetch(`${API_URL}/auth/profile/picture`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json().catch(() => ({}));
      const uploadedUrl = data.user?.profilePicture || data.fileUrl || data.url;
      if (!response.ok || !uploadedUrl) {
        throw new Error(data.message || data.error || 'Profile picture upload failed');
      }
      setEditProfile(prev => ({ ...prev, profilePicture: uploadedUrl }));
      if (updateUserProfile) updateUserProfile({ profilePicture: uploadedUrl, avatar: uploadedUrl });
      showMsg('✅ Profile picture updated');
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      showMsg('⚠️ Preview shown, but upload failed. Try again.');
    } finally {
      if (e?.target) e.target.value = '';
    }
  };

  const toggleMod = (key) => {
    setMods((prev) => {
      const nextVal = !prev[key];
      const next = { ...prev, [key]: nextVal };
      if (key === 'autoReply') {
        updateAutoReply(nextVal, prev.autoReplyMsg || autoReplyMsg);
      }
      return next;
    });
  };

  const showMsg = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 2500);
  };

  const loadCloudBackups = async () => {
    setFetchingBackups(true);
    setBackupError('');
    try {
      const list = await listCloudBackups();
      setCloudBackups(list || []);
    } catch (err) {
      console.error('Failed to list backups:', err);
      setBackupError('Imeshindwa kupata orodha ya backups (Failed to list backups)');
    } finally {
      setFetchingBackups(false);
    }
  };

  const handleStartCloudBackup = async () => {
    setBackupActionLoading('start');
    setBackupError('');
    try {
      const res = await startCloudBackup();
      if (res?.success) {
        showMsg('✅ Backup ya wingu imekamilika! (Cloud backup completed!)');
        await loadCloudBackups();
      } else {
        setBackupError(res?.message || 'Uundaji wa Backup umeshindwa (Backup creation failed)');
      }
    } catch (err) {
      console.error('Failed to create cloud backup:', err);
      setBackupError('Imeshindwa kuunda backup (Failed to create backup)');
    } finally {
      setBackupActionLoading(null);
    }
  };

  const handleRestoreCloudBackup = async (backupId) => {
    if (!window.confirm('Je, una uhakika unataka kurejesha backup hii? Hii itafuta data ya sasa ya IndexedDB na kuweka ya wingu. (Are you sure you want to restore this backup? This will replace your current IndexedDB cache.)')) {
      return;
    }
    setBackupActionLoading(backupId);
    setBackupError('');
    try {
      const res = await restoreCloudBackup(backupId);
      if (res?.success) {
        showMsg('✅ Kurejesha kumekamilika! Mfumo utajipakia upya sasa... (Restore completed! Reloading...)');
      } else {
        setBackupError(res?.message || 'Kurejesha kumeshindwa (Restore failed)');
      }
    } catch (err) {
      console.error('Failed to restore backup:', err);
      setBackupError('Imeshindwa kurejesha backup (Failed to restore backup)');
    } finally {
      setBackupActionLoading(null);
    }
  };

  const handleDeleteCloudBackup = async (backupId) => {
    if (!window.confirm('Je, una uhakika unataka kufuta backup hii milele? (Are you sure you want to delete this backup permanently?)')) {
      return;
    }
    setBackupActionLoading(backupId);
    setBackupError('');
    try {
      const res = await deleteCloudBackup(backupId);
      if (res?.success) {
        showMsg('✅ Backup imefutwa! (Backup deleted!)');
        await loadCloudBackups();
      } else {
        setBackupError(res?.message || 'Kufuta kumeshindwa (Delete failed)');
      }
    } catch (err) {
      console.error('Failed to delete backup:', err);
      setBackupError('Imeshindwa kufuta backup (Failed to delete backup)');
    } finally {
      setBackupActionLoading(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'privacy' || activeTab === 'advanced') {
      loadCloudBackups();
    }
  }, [activeTab]);

  const renderCloudBackupsList = () => {
    if (fetchingBackups) {
      return (
        <div className="flex flex-col items-center justify-center p-6 space-y-2 bg-white/5 rounded-xl border border-white/5">
          <RefreshCw size={24} className="animate-spin text-blue-400" />
          <p className="text-xs text-blue-300">Inapakia backups... (Loading backups...)</p>
        </div>
      );
    }

    if (cloudBackups.length === 0) {
      return (
        <div className="p-4 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
          <Cloud size={28} className="mx-auto text-blue-400/50 mb-2 animate-pulse" />
          <p className="text-xs text-white/50">Hakuna backups zilizopatikana kwenye wingu. (No backups found on cloud.)</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pr-1">
        {cloudBackups.map((backup) => {
          const dateStr = new Date(backup.lastModified).toLocaleString('sw-TZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const sizeKb = (backup.size / 1024).toFixed(1);
          const isL = backupActionLoading === backup.backupId;

          return (
            <div
              key={backup.backupId}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl gap-2 hover:bg-white/10 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white font-mono truncate">
                  {backup.backupId}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[9px] text-blue-300 bg-blue-900/40 border border-blue-500/30 px-1.5 py-0.5 rounded uppercase font-black tracking-wide">
                    {backup.storage}
                  </span>
                  <span className="text-[10px] text-white/40">{dateStr}</span>
                  <span className="text-[10px] text-white/40">({sizeKb} KB)</span>
                </div>
              </div>
              <div className="flex gap-2 self-end sm:self-auto flex-shrink-0">
                <button
                  disabled={backupActionLoading !== null}
                  onClick={() => handleRestoreCloudBackup(backup.backupId)}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all active:scale-95"
                >
                  {isL ? (
                    <RefreshCw size={10} className="animate-spin" />
                  ) : (
                    <RefreshCw size={10} />
                  )}
                  Rejesha (Restore)
                </button>
                <button
                  disabled={backupActionLoading !== null}
                  onClick={() => handleDeleteCloudBackup(backup.backupId)}
                  className="bg-red-500/25 hover:bg-red-500/50 border border-red-500/40 disabled:opacity-40 text-red-300 font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all active:scale-95"
                >
                  Futa (Delete)
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Tab definitions ──
  const TABS = [
    { id: 'profile',    label: 'Profile',    icon: '👤' },
    { id: 'appearance', label: 'Theme Engine', icon: '🎨' },
    { id: 'mods',       label: 'GENZ Mods',  icon: '⚡' },
    { id: 'social',     label: 'Social',     icon: '🔥' },
    { id: 'privacy',    label: 'Privacy',    icon: '🔒' },
    { id: 'advanced',   label: 'Advanced',   icon: '⚙️' },
  ];

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2440 50%, #0a1628 100%)' }}>

      {/* ── Header ── */}
      <div className="bg-blue-900/50 backdrop-blur-xl px-4 pt-4 pb-0 flex items-center gap-4 text-white shadow-lg border-b border-white/10">
        <ArrowLeft className="cursor-pointer hover:scale-110 transition-transform flex-shrink-0" onClick={close} />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">GENZ WhatsApp Mods</h1>
          <p className="text-[9px] opacity-70 uppercase tracking-widest text-blue-300">Version 9.80 Â· Ultra Secure</p>
        </div>
        {subscriptionStatus.isActive && (
          <span className="text-[10px] bg-green-500/30 text-green-300 border border-green-500/40 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
            PREMIUM âœ“
          </span>
        )}
      </div>

      {/* â”€â”€ Tab Navigation â”€â”€ */}
      <div className="flex overflow-x-auto bg-black/20 border-b border-white/10 px-1 pt-1 gap-1 scrollbar-none flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold whitespace-nowrap rounded-t-lg transition-all border-b-2 ${
              activeTab === tab.id
                ? 'bg-white/10 border-blue-400 text-white'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* â”€â”€ Status Message â”€â”€ */}
      {statusMsg && (
        <div className="bg-green-500/90 backdrop-blur-md text-white text-xs font-bold text-center py-2 px-4 flex-shrink-0">
          {statusMsg}
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
           TAB CONTENT
         â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TAB: PROFILE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'profile' && (
        <>
          {/* My Profile */}
          <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
            <div className="p-4 bg-blue-900/30 border-b border-white/10 flex items-center gap-2 text-white font-bold">
              <UserCircle size={18} /> My Profile
            </div>
          <div className="p-6 flex flex-col items-center">
            <div className="relative group cursor-pointer mb-4">
              {editProfile.profilePicture ? (
                <img
                  src={editProfile.profilePicture}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary-500/20"
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              {!editProfile.profilePicture && (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center border-4 border-primary-500/20">
                  <UserCircle size={48} className="text-white" />
                </div>
              )}
              <div
                onClick={() => profilePictureInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="text-white" size={24} />
              </div>
              <input
                type="file"
                ref={profilePictureInputRef}
                hidden
                accept="image/*"
                onChange={handleProfilePictureUpload}
              />
            </div>
            <div className="w-full space-y-3">
              <div>
                <label className="text-[10px] text-blue-300 uppercase font-black tracking-widest">Your Name</label>
                <div className="flex items-center gap-2 border-b border-white/20 py-1">
                  <input
                    type="text"
                    value={editProfile.username}
                    onChange={(e) => {
                      setEditProfile(p => ({ ...p, username: e.target.value }));
                      if (updateUserProfile) updateUserProfile({ username: e.target.value });
                    }}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-white outline-none"
                  />
                  <Edit3 size={14} className="text-blue-400" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-blue-300 uppercase font-black tracking-widest">Bio / About</label>
                <div className="flex items-center gap-2 border-b border-white/20 py-1">
                  <input
                    type="text"
                    value={editProfile.bio}
                    onChange={(e) => setEditProfile(p => ({ ...p, bio: e.target.value }))}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-blue-200 outline-none"
                  />
                  <Edit3 size={14} className="text-blue-400" />
                </div>
              </div>
            </div>
          </div>
        </section>
        </> /* end profile tab */
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TAB: APPEARANCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'appearance' && (
        <>
        {/* Theme Store / Presets */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-blue-900/30 border-b border-white/10 flex items-center gap-2 text-indigo-400 font-bold">
            <Palette size={18} /> Theme Store (Packs)
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              { id: 'default', name: 'GENZ Default', icon: '🌟', colors: { customTheme: '#008069', bubbleSentColor: '', bubbleReceivedColor: '', fontFamily: 'Inter', bubbleStyle: 'default', tickStyle: 'default' } },
              { id: 'ios', name: 'iOS Style', icon: '🍎', colors: { customTheme: '#007aff', bubbleSentColor: '#007aff', bubbleReceivedColor: '#e5e5ea', fontFamily: 'San Francisco, Roboto', bubbleStyle: 'ios', tickStyle: 'ios' } },
              { id: 'telegram', name: 'Telegram Dark', icon: '✈️', colors: { customTheme: '#2b5278', bubbleSentColor: '#2b5278', bubbleReceivedColor: '#182533', fontFamily: 'Roboto', bubbleStyle: 'rounded', tickStyle: 'default' } },
              { id: 'hacker', name: 'Hacker Matrix', icon: '💻', colors: { customTheme: '#00ff00', bubbleSentColor: '#003300', bubbleReceivedColor: '#000000', fontFamily: 'JetBrains Mono', bubbleStyle: 'sharp', tickStyle: 'hacker' } },
            ].map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  setMods(prev => ({ 
                    ...prev, 
                    themePack: theme.id,
                    customTheme: theme.colors.customTheme,
                    bubbleSentColor: theme.colors.bubbleSentColor,
                    bubbleReceivedColor: theme.colors.bubbleReceivedColor,
                    fontFamily: theme.colors.fontFamily,
                    bubbleStyle: theme.colors.bubbleStyle,
                    tickStyle: theme.colors.tickStyle
                  }));
                  showMsg(`✅ ${theme.name} Applied!`);
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  mods.themePack === theme.id
                    ? 'border-indigo-500 bg-indigo-500/20'
                    : 'border-white/10 hover:border-white/30 bg-white/5'
                }`}
              >
                <span className="text-xl">{theme.icon}</span>
                <span className="text-xs font-bold text-white">{theme.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Font Customization */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10 mt-3">
          <div className="p-4 bg-blue-900/30 border-b border-white/10 flex items-center gap-2 text-pink-400 font-bold">
            <Edit3 size={18} /> Font & Typography
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs text-blue-300 mb-2 block font-bold">Font Style</label>
              <div className="grid grid-cols-2 gap-2">
                {['Inter', 'Roboto', 'Poppins', 'Comic Neue', 'JetBrains Mono', 'Space Grotesk'].map((font) => (
                  <button
                    key={font}
                    onClick={() => setMods(prev => ({ ...prev, fontFamily: font, themePack: 'custom' }))}
                    style={{ fontFamily: font }}
                    className={`py-2 px-3 text-xs rounded-lg border transition-all ${
                      mods.fontFamily === font ? 'border-pink-500 bg-pink-500/20 text-white' : 'border-white/10 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bubble Customization */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10 mt-3">
          <div className="p-4 bg-blue-900/30 border-b border-white/10 flex items-center gap-2 text-cyan-400 font-bold">
            <MessageSquare size={18} /> Chat Bubbles
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs text-blue-300 mb-2 block font-bold">Bubble Shape</label>
              <div className="flex gap-2">
                {[
                  { id: 'default', label: 'Classic' },
                  { id: 'rounded', label: 'Rounded' },
                  { id: 'ios', label: 'iOS Style' },
                  { id: 'sharp', label: 'Sharp' },
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setMods(prev => ({ ...prev, bubbleStyle: style.id, themePack: 'custom' }))}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all ${
                      mods.bubbleStyle === style.id ? 'border-cyan-500 bg-cyan-500/20 text-white' : 'border-white/10 text-gray-400'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs text-blue-300 mb-2 block font-bold mt-4">Tick Style</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'default', label: 'Default ✓✓' },
                  { id: 'ios', label: 'iOS Style 🟦' },
                  { id: 'batman', label: 'Batman 🦇' },
                  { id: 'minions', label: 'Minions 🍌' },
                  { id: 'hacker', label: 'Hacker //' },
                  { id: 'hearts', label: 'Hearts 💖' },
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setMods(prev => ({ ...prev, tickStyle: style.id, themePack: 'custom' }))}
                    className={`px-3 py-2 text-[10px] font-bold rounded-lg border transition-all ${
                      mods.tickStyle === style.id ? 'border-cyan-500 bg-cyan-500/20 text-white' : 'border-white/10 text-gray-400'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-blue-300 mb-1 block">Sent Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={mods.bubbleSentColor || '#008069'} 
                    onChange={(e) => setMods(prev => ({ ...prev, bubbleSentColor: e.target.value, themePack: 'custom' }))}
                    className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                  />
                  <span className="text-[10px] text-gray-400">{mods.bubbleSentColor || 'Default'}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-blue-300 mb-1 block">Received Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={mods.bubbleReceivedColor || '#202c33'} 
                    onChange={(e) => setMods(prev => ({ ...prev, bubbleReceivedColor: e.target.value, themePack: 'custom' }))}
                    className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                  />
                  <span className="text-[10px] text-gray-400">{mods.bubbleReceivedColor || 'Default'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Wallpaper Picker Section */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-[#0a1d37]/45 border-b border-white/10 flex items-center gap-2 text-indigo-400 font-bold">
            <ImageIcon size={18} /> Chat Wallpaper (TM WhatsApp Style)
          </div>
          <div className="p-4 space-y-4">
            
            {/* Apply Scope Selector */}
            {selectedConversation && (
              <div>
                <label className="text-xs text-blue-300 mb-1.5 block">Wallpaper Scope</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setApplyScope('global')} 
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      applyScope === 'global' 
                        ? 'bg-[#008069] text-white border-[#008069]' 
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    All Chats (Global)
                  </button>
                  <button 
                    onClick={() => setApplyScope('chat')} 
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      applyScope === 'chat' 
                        ? 'bg-[#008069] text-white border-[#008069]' 
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    This Chat Only
                  </button>
                </div>
              </div>
            )}

            {/* Category Tabs Selector */}
            <div>
              <label className="text-xs text-blue-300 mb-1.5 block">Select Wallpaper Type</label>
              <div className="grid grid-cols-4 gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                {[
                  { id: 'bright', label: '🌟 Bright' },
                  { id: 'dark', label: '🌙 Dark' },
                  { id: 'colors', label: '🎨 Colors' },
                  { id: 'custom', label: '📸 Custom' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setWallpaperCategory(tab.id)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      wallpaperCategory === tab.id 
                        ? 'bg-[#008069] text-white shadow-md' 
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Tab Panel */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 min-h-[120px]">
              {wallpaperCategory === 'bright' && (
                <div>
                  <h4 className="text-xs font-medium text-gray-300 mb-2">Select a Bright Background</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {TM_BRIGHT_WALLPAPERS.map((wp) => {
                      const isSelected = previewWallpaper === wp.url;
                      return (
                        <button
                          key={wp.name}
                          type="button"
                          onClick={() => {
                            setPreviewWallpaper(wp.url);
                            showMsg(`🌟 Selected ${wp.name}`);
                          }}
                          className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                            isSelected ? 'border-[#008069] scale-105 shadow-md shadow-green-500/20' : 'border-transparent opacity-80 hover:opacity-100'
                          }`}
                          title={wp.name}
                        >
                          <img src={wp.url} alt={wp.name} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {wallpaperCategory === 'dark' && (
                <div>
                  <h4 className="text-xs font-medium text-gray-300 mb-2">Select a Dark Background</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {TM_DARK_WALLPAPERS.map((wp) => {
                      const isSelected = previewWallpaper === wp.url;
                      return (
                        <button
                          key={wp.name}
                          type="button"
                          onClick={() => {
                            setPreviewWallpaper(wp.url);
                            showMsg(`🌙 Selected ${wp.name}`);
                          }}
                          className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                            isSelected ? 'border-[#008069] scale-105 shadow-md shadow-green-500/20' : 'border-transparent opacity-80 hover:opacity-100'
                          }`}
                          title={wp.name}
                        >
                          <img src={wp.url} alt={wp.name} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {wallpaperCategory === 'colors' && (
                <div>
                  <h4 className="text-xs font-medium text-gray-300 mb-2">Select WhatsApp Predefined Color</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {TM_SOLID_COLORS.map((color) => {
                      const isSelected = previewWallpaper === color.hex;
                      return (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => {
                            setPreviewWallpaper(color.hex);
                            showMsg(`🎨 Selected ${color.name}`);
                          }}
                          className={`w-full aspect-square rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center ${
                            isSelected ? 'border-white scale-105 shadow-lg' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {wallpaperCategory === 'custom' && (
                <div className="space-y-3">
                  {/* Custom URL Input */}
                  <div>
                    <label className="text-[10px] text-blue-300 mb-1 block">Image URL (e.g., from Unsplash, Imgur)</label>
                    <input
                      type="text"
                      placeholder="Paste image URL..."
                      value={previewWallpaper && !previewWallpaper.startsWith('#') && !previewWallpaper.startsWith('data:') ? previewWallpaper : ''}
                      onChange={(e) => setPreviewWallpaper(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#008069] text-white placeholder-blue-200/50"
                    />
                  </div>

                  {/* File Upload Button */}
                  <div>
                    <input
                      type="file"
                      ref={wallpaperInputRef}
                      hidden
                      accept="image/*"
                      onChange={handleFileWallpaper}
                    />
                    <button
                      type="button"
                      onClick={() => wallpaperInputRef.current?.click()}
                      className="w-full py-2 border border-dashed border-white/20 rounded-lg text-xs font-bold text-blue-300 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <ImageIcon size={14} /> Upload Custom Photo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TM WhatsApp Doodle Overlay Toggle */}
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
              <div>
                <h4 className="text-xs font-medium text-white">TM Doodle Pattern Layer</h4>
                <p className="text-[9px] text-gray-400">Overlay classic WhatsApp doodles on background</p>
              </div>
              <div
                onClick={() => setMods(prev => ({ ...prev, chatWallpaperDoodle: prev.chatWallpaperDoodle === false ? true : false }))}
                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
                  mods.chatWallpaperDoodle !== false ? 'bg-[#008069]' : 'bg-white/10 border border-white/20'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                  mods.chatWallpaperDoodle !== false ? 'right-0.5' : 'left-0.5'
                }`} />
              </div>
            </div>

            {/* Wallpaper Dimming Slider */}
            {(previewWallpaper || mods.chatWallpaper) && (
              <div className="space-y-4">
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-blue-300 font-medium">Wallpaper Dimming (Fifisha)</label>
                    <span className="text-xs text-blue-300 font-bold">{Math.round((mods.chatWallpaperDim || 0) * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="0.9" 
                    step="0.05" 
                    value={mods.chatWallpaperDim || 0}
                    onChange={(e) => setMods(prev => ({ ...prev, chatWallpaperDim: parseFloat(e.target.value) }))}
                    className="w-full accent-[#008069] cursor-pointer"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">Dim the wallpaper to make messages easier to read.</p>
                </div>
                
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-blue-300 font-medium">Wallpaper Zoom (Kuza/Kupunguza)</label>
                    <span className="text-xs text-blue-300 font-bold">{Math.round((mods.chatWallpaperZoom || 1) * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="3" 
                    step="0.1" 
                    value={mods.chatWallpaperZoom || 1}
                    onChange={(e) => setMods(prev => ({ ...prev, chatWallpaperZoom: parseFloat(e.target.value) }))}
                    className="w-full accent-[#008069] cursor-pointer"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">Zoom the wallpaper image in or out to fit perfectly.</p>
                </div>
              </div>
            )}

            {/* Apply & Reset Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (applyScope === 'chat' && selectedConversation?._id) {
                    const customWallpapers = { ...(mods.customWallpapers || {}) };
                    customWallpapers[selectedConversation._id] = {
                      wallpaper: previewWallpaper,
                      dim: mods.chatWallpaperDim || 0,
                      zoom: mods.chatWallpaperZoom || 1,
                      doodle: mods.chatWallpaperDoodle !== false
                    };
                    setMods(prev => ({ ...prev, customWallpapers }));
                    showMsg('✨ Wallpaper applied to this chat!');
                  } else {
                    setMods(prev => ({ 
                      ...prev, 
                      chatWallpaper: previewWallpaper, 
                      chatWallpaperDim: prev.chatWallpaperDim || 0,
                      chatWallpaperDoodle: prev.chatWallpaperDoodle !== false
                    }));
                    showMsg('✅ Global wallpaper applied!');
                  }
                }}
                className="flex-1 bg-[#008069] hover:bg-[#007a5e] text-white font-bold py-2 rounded-lg text-xs transition-all shadow-md active:scale-95"
              >
                Apply Wallpaper
              </button>
              <button
                type="button"
                onClick={() => {
                  if (applyScope === 'chat' && selectedConversation?._id) {
                    const customWallpapers = { ...(mods.customWallpapers || {}) };
                    delete customWallpapers[selectedConversation._id];
                    setMods(prev => ({ ...prev, customWallpapers }));
                    setPreviewWallpaper('');
                    showMsg('✅ Custom wallpaper reset for this chat!');
                  } else {
                    setMods(prev => ({ 
                      ...prev, 
                      chatWallpaper: null, 
                      chatWallpaperDim: 0,
                      chatWallpaperZoom: 1,
                      chatWallpaperDoodle: true
                    }));
                    setPreviewWallpaper(null);
                    showMsg('✅ Global wallpaper reset to default!');
                  }
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg text-xs transition-all shadow-md active:scale-95"
              >
                Reset Wallpaper
              </button>
            </div>

            {/* Wallpaper Preview Block */}
            <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-white/10 relative overflow-hidden h-44 flex flex-col justify-end shadow-inner w-full">
              <h4 className="text-xs font-bold text-white mb-2 z-20 shadow-sm bg-black/40 px-2 py-0.5 rounded w-max">Live Preview:</h4>
              <div
                className="absolute inset-0 bg-center"
                style={previewWallpaper ? {
                  backgroundColor: previewWallpaper.startsWith('#') ? previewWallpaper : 'transparent',
                  backgroundImage: previewWallpaper.startsWith('#') ? 'none' : `url(${previewWallpaper})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  transform: `scale(${mods.chatWallpaperZoom || 1})`,
                  transformOrigin: 'center',
                  transition: 'transform 0.2s ease-in-out'
                } : {
                  backgroundColor: '#0b141a',
                  transform: `scale(${mods.chatWallpaperZoom || 1})`,
                  transformOrigin: 'center',
                  transition: 'transform 0.2s ease-in-out'
                }}
              />
              {mods.chatWallpaperDoodle !== false && (
                <div 
                  className="absolute inset-0 pointer-events-none opacity-[0.04]" 
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm1-61c3.13 0 5.665-2.535 5.665-5.665S38.13 17.67 35 17.67s-5.665 2.535-5.665 5.665S31.87 29 35 29zM9 75c3.13 0 5.665-2.535 5.665-5.665S12.13 63.67 9 63.67 3.335 66.205 3.335 69.33 5.87 75 9 75zm51-61c3.13 0 5.665-2.535 5.665-5.665S57.13 2.67 54 2.67 48.335 5.205 48.335 8.33 50.87 14 54 14zm26 62c3.13 0 5.665-2.535 5.665-5.665S77.13 64.67 74 64.67 68.335 67.205 68.335 70.33 70.87 76 74 76z'/%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                    mixBlendMode: 'overlay'
                  }}
                />
              )}
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ 
                  backgroundColor: `rgba(0,0,0, ${mods.chatWallpaperDim || 0})`
                }} 
                id="wallpaper-preview-dim"
              />
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex justify-end">
                  <div className="bg-[#008069] text-white text-[10px] px-2.5 py-1.5 rounded-lg rounded-br-none shadow-md">Hii ni preview!</div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 text-[10px] px-2.5 py-1.5 rounded-lg rounded-bl-none shadow-md font-medium">Inaonekana vizuri sana.</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setPreviewWallpaper(null)}
                className="text-xs text-blue-300 font-medium hover:underline"
              >
                Clear Preview
              </button>
            </div>
          </div>
        </section>

        {/* App Lock Section */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-blue-900/30 border-b border-white/10 flex items-center gap-2 text-red-400 font-bold">
            <Lock size={18} /> App Lock
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">Enable App Lock</h3>
              <div
                onClick={() => {
                  const newEnableState = !mods.enableAppLock;
                  setMods(prev => ({ ...prev, enableAppLock: newEnableState }));
                  const newLockType = newEnableState ? 'pin' : 'none';
                  setLockType(newLockType);
                  localStorage.setItem('genz_lock_type', newLockType);
                  if (!newEnableState) {
                    localStorage.removeItem('genz_lock_pin');
                    setLockPin('');
                  }
                }}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${mods.enableAppLock ? 'bg-blue-500' : 'bg-white/10 border border-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${mods.enableAppLock ? 'right-1' : 'left-1'}`} />
              </div>
            </div>

            {mods.enableAppLock && (
              <div>
                <label className="text-xs text-blue-300 mb-1 block">Set PIN (4 digits)</label>
                <input
                  type="password"
                  maxLength="4"
                  value={lockType === 'pin' ? localStorage.getItem('genz_lock_pin') || '' : ''}
                  onChange={(e) => {
                    const newPin = e.target.value;
                    if (/^\d*$/.test(newPin) && newPin.length <= 4) {
                      localStorage.setItem('genz_lock_pin', newPin);
                      setLockPin(newPin);
                    }
                  }}
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 text-white placeholder-blue-200/50"
                  placeholder="Enter 4-digit PIN"
                />
              </div>
            )}
          </div>
        </section>
        </> /* end appearance tab */
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TAB: PRIVACY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'privacy' && (
        <>
        {/* Privacy & Protection */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-blue-900/30 border-b border-white/10 flex items-center justify-between text-white font-bold">
            <div className="flex items-center gap-2">
              <Shield size={18} /> Privacy & Protection
            </div>
            {subscriptionStatus.isActive === true ? (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-500 px-2 py-1 rounded-full">Active</span>
                {countdown && (
                  <span className="text-xs bg-green-500/30 px-2 py-1 rounded-full text-green-300">
                    {countdown}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs bg-red-500 px-2 py-1 rounded-full">Locked</span>
            )}
          </div>

          {isPrivacyLocked ? (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={40} className="text-red-500" />
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Premium Required</h3>
              <p className="text-gray-400 text-sm mb-4">
                Lipa <span className="text-yellow-400 font-black">Tsh 10,000</span> kwa siku 60 ili kutumia features zote za Privacy &amp; Protection
              </p>
              {subscriptionStatus.hasSubscription === true && subscriptionStatus.expiryDate && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
                  <p className="text-yellow-400 text-xs font-semibold">
                    Malipo yako yalikwisha: {new Date(subscriptionStatus.expiryDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                <Lock size={20} />
                Upgrade to Premium - Tsh 10,000
              </button>
              <p className="text-gray-500 text-xs mt-3">
                Payment methods: M-Pesa, Airtel Money, Yas, Halopesa
              </p>
            </div>
          ) : (
            <div className="p-2">
              <ModItem
                icon={<EyeOff size={20} className="text-blue-500" />}
                title="Freeze Last Seen"
                desc="Hide your online status"
                active={mods.hideLastSeen}
                onClick={() => toggleMod('hideLastSeen')}
              />
              <ModItem
                icon={<Zap size={20} className="text-purple-500" />}
                title="Ghost Mode"
                desc="Hide typing and voice recording status"
                active={mods.ghostMode}
                onClick={() => toggleMod('ghostMode')}
              />
              <ModItem
                icon={<EyeOff size={20} className="text-gray-400" />}
                title="Freeze Last Seen"
                desc="Appear offline to everyone while still seeing them online"
                active={mods.freezeLastSeen}
                onClick={() => toggleMod('freezeLastSeen')}
              />
              <ModItem
                icon={<Lock size={20} className="text-red-500" />}
                title="Anti-Delete Messages"
                desc="Prevent people from deleting messages they sent to you"
                active={mods.antiDelete}
                onClick={() => toggleMod('antiDelete')}
              />
              <ModItem
                icon={<CameraOff size={20} className="text-orange-600" />}
                title="Anti-Screenshot"
                desc="Prevent taking screenshots of the screen"
                active={mods.antiScreenshot}
                onClick={() => toggleMod('antiScreenshot')}
              />
              <ModItem
                icon={<CheckCheck size={20} className="text-blue-400" />}
                title="Hide Read Receipts"
                desc="Hide blue tick read receipts from others"
                active={mods.hideReadReceipts}
                onClick={() => toggleMod('hideReadReceipts')}
              />
              <ModItem
                icon={<EyeOff size={20} className="text-purple-600" />}
                title="Anti-View Once"
                desc="View 'View Once' images as many times as you want"
                active={mods.antiViewOnce}
                onClick={() => toggleMod('antiViewOnce')}
              />
              <ModItem
                icon={<Timer size={20} className="text-pink-500" />}
                title="Self-Destruct Messages"
                desc="Messages self-destruct 10 seconds after being viewed"
                active={mods.selfDestruct}
                onClick={() => toggleMod('selfDestruct')}
              />
              <ModItem
                icon={<Shield size={20} className="text-emerald-500" />}
                title="DM — Ulinzi wa Mwisho (E2EE)"
                desc="Simba maneno kwenye mazungumzo ya mtu mmoja (ECDH + AES-GCM). Washiriki lazima wawe na akaunti walioweka funguo."
                active={mods.clientE2EE}
                onClick={() => toggleMod('clientE2EE')}
              />
              <ModItem
                icon={<Lock size={20} className="text-gray-600" />}
                title="Debug Encryption Mode"
                desc="Show messages in encrypted format (Hash view)"
                active={mods.debugEncryption}
                onClick={() => toggleMod('debugEncryption')}
              />
              {subscriptionStatus.expiryDate && (
                <div className="p-3 text-center">
                  <p className="text-xs text-gray-400">
                    Malipo yako yatakwisha: {new Date(subscriptionStatus.expiryDate).toLocaleDateString()}
                  </p>
                  {subscriptionStatus.remainingDays !== undefined && (
                    <p className="text-xs font-semibold mt-1">
                      {subscriptionStatus.remainingDays > 0 ? (
                        <span className="text-green-400">{subscriptionStatus.remainingDays} siku zinasalia</span>
                      ) : (
                        <span className="text-red-400">Subscription imekwisha</span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Connected Devices & Media */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-blue-900/30 border-b border-white/10 flex items-center gap-2 text-green-400 font-bold">
            <Download size={18} /> Media Settings
          </div>
          <div className="p-2">
            <ModItem
              icon={<ImageIcon size={20} className="text-green-500" />}
              title="Auto-download Images"
              desc="Auto-download images in chat"
              active={mods.autoDownloadMedia}
              onClick={() => toggleMod('autoDownloadMedia')}
            />
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-blue-900/30 border-b border-white/10 flex items-center gap-2 text-yellow-400 font-bold">
            <Bell size={18} /> Notifications
          </div>
          <div className="p-4 space-y-3">
            <label className="text-xs text-blue-300 mb-1 block">Choose Alert Tone</label>
            <select
              value={notificationSound}
              onChange={(e) => setNotificationSound(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-500 text-white"
            >
              <option value="default">GENZ Default Tone</option>
              <option value="classic">Classic WhatsApp</option>
              <option value="modern">Modern Tech</option>
              <option value="soft">Soft Minimalist</option>
              <option value="none">Silent</option>
            </select>
            <button
              onClick={() => alert(`Simulating playback of: ${notificationSound}`)}
              className="text-[10px] text-yellow-500 font-bold flex items-center gap-1 hover:underline"
            >
              <Play size={10} /> Test Selected Sound
            </button>
          </div>
        </section>

        {showPrivacyAnimation && <PrivacyPolicyAnimation onClose={() => setShowPrivacyAnimation(false)} />}

        {/* Voice Changer Section */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-blue-900/30 border-b border-white/10 flex items-center gap-2 text-purple-400 font-bold">
            <Mic size={18} /> Voice Changer
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-blue-300 mb-2">Change your voice when sending voice notes.</p>
            <select
              value={mods.voiceEffect}
              onChange={(e) => setMods(prev => ({ ...prev, voiceEffect: e.target.value }))}
              className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 text-white"
            >
              {VOICE_EFFECT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={voiceFxPreviewBusy}
              onClick={async () => {
                if (voiceFxPreviewBusy) return;
                setVoiceFxPreviewBusy(true);
                try {
                  const raw = await createTestToneBlob();
                  const out = await applyVoiceEffect(raw, mods.voiceEffect || 'none');
                  const url = URL.createObjectURL(out);
                  const audio = new Audio(url);
                  const done = () => {
                    URL.revokeObjectURL(url);
                    setVoiceFxPreviewBusy(false);
                  };
                  audio.onended = done;
                  audio.onerror = done;
                  await audio.play();
                } catch (e) {
                  console.warn('[GENZSettings] Voice effect preview failed:', e);
                  setVoiceFxPreviewBusy(false);
                }
              }}
              className="text-[10px] text-purple-500 font-bold flex items-center gap-1 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play size={10} /> {voiceFxPreviewBusy ? 'Inacheza…' : 'Sikiza sampuli (bila maikrofoni)'}
            </button>
          </div>
        </section>

        {/* Chat Background Music Section */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-blue-900/30 border-b border-white/10 flex items-center gap-2 text-pink-400 font-bold">
            <Music size={18} /> Chat Background Music
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white text-sm">Enable Music in Chats</h3>
              <div
                onClick={() => toggleMod('chatMusic')}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${mods.chatMusic ? 'bg-pink-500' : 'bg-white/10 border border-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${mods.chatMusic ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
            {mods.chatMusic && (
              <input
                type="text"
                placeholder="Paste MP3 URL..."
                value={mods.chatMusicUrl || ''}
                onChange={(e) => setMods(prev => ({ ...prev, chatMusicUrl: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm focus:ring-2 focus:ring-pink-500 text-white placeholder-blue-200/50"
              />
            )}
          </div>
        </section>

        {/* Cloud Backup */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-blue-900/30 border-b border-white/10 flex items-center gap-2 text-blue-400 font-bold">
            <Cloud size={18} /> Hifadhi ya Wingu (Cloud Backup)
          </div>
          <div className="p-4">
            {backupProgress !== null ? (
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-bold text-white flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-blue-400" />
                    {backupProgress === 100 ? 'Backup imekamilika! (Backup Completed!)' : 'Kuhifadhi soga kwenye wingu... (Backing up chats...)'}
                  </p>
                  <span className="text-sm font-black text-blue-400">{backupProgress}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${backupProgress}%` }} />
                </div>
              </div>
            ) : (
              <button
                disabled={backupActionLoading !== null}
                onClick={handleStartCloudBackup}
                className="w-full flex items-center justify-center gap-2 bg-[#008069] hover:bg-[#007a5e] disabled:opacity-40 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
              >
                {backupActionLoading === 'start' ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                Anza Kuhifadhi Mtandaoni (Start Online Backup)
              </button>
            )}

            {backupError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                ⚠️ {backupError}
              </div>
            )}

            <div className="mt-4">
              <h4 className="text-xs font-bold text-blue-300 mb-2 flex items-center gap-1">
                ☁️ Backups Zinazopatikana (Available Backups)
              </h4>
              {renderCloudBackupsList()}
            </div>
          </div>
        </section>

        {/* Privacy Policy Animation */}
        <PrivacyPolicyAnimation show={showPrivacyAnimation} onClose={() => setShowPrivacyAnimation(false)} />

        {/* Connected Devices */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-blue-900/30 border-b border-white/10 flex items-center gap-2 text-teal-400 font-bold">
            <MonitorSmartphone size={18} /> Connected Devices
          </div>
          <div className="p-4 space-y-4">
            <p className="text-[11px] text-blue-300">Track and manage other devices logged into your account.</p>
            <button onClick={() => setShowPrivacyAnimation(true)} className="text-xs text-blue-400 flex items-center gap-1 hover:underline">
              <Info size={14} /> View Privacy Policy
            </button>
            {(connectedDevices || []).map(device => {
              const deviceId = device.id || device.deviceId || device._id;
              const deviceName = device.name || device.deviceName || 'Unknown Device';
              const isCurrent = device.isCurrent || device.current;
              return (
              <div key={deviceId} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg shadow-sm">
                    {deviceName.includes('Windows') || deviceName.includes('Linux') ? <Monitor size={20} className="text-white" /> : <Smartphone size={20} className="text-white" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{deviceName} &bull; {device.browser || 'Browser'}</h4>
                    <p className="text-[9px] text-blue-300">{device.lastActive || 'Recently active'} &bull; {device.location || device.platform || 'Unknown location'}</p>
                    {isCurrent && <span className="text-[8px] text-blue-400 font-black uppercase bg-blue-900/30 px-1 rounded">Current Session</span>}
                  </div>
                </div>
                {!isCurrent && (
                  <button
                    onClick={() => logoutDevice(deviceId)}
                    className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Logout device"
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            );})}
            <button className="w-full py-3 bg-blue-600/80 hover:bg-blue-500/80 backdrop-blur-md text-white font-bold rounded-xl shadow-lg transition-all text-xs border border-blue-400/30">
              Link a New Device
            </button>
          </div>
        </section>
        </> /* end privacy tab */
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TAB: MODS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'mods' && (
        <>
        {/* Advanced Tools */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-purple-900/30 border-b border-white/10 flex items-center gap-2 text-purple-400 font-bold">
            <Zap size={18} /> Advanced GENZ Tools
          </div>
          <div className="p-2">
            <ModItem
              icon={<Bell size={20} className="text-orange-500" />}
              title="Auto-Reply Bot"
              desc="Reply to messages automatically when you are away"
              active={mods.autoReply}
              onClick={() => toggleMod('autoReply')}
            />
            {mods.autoReply && (
              <div className="px-4 pb-3">
                <label className="text-xs text-gray-400 block mb-1">Auto-reply message</label>
                <textarea
                  value={autoReplyMsg}
                  onChange={(e) => {
                    const msg = e.target.value;
                    setAutoReplyMsg(msg);
                    setMods((prev) => ({ ...prev, autoReplyMsg: msg }));
                    updateAutoReply(true, msg);
                  }}
                  rows={2}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white resize-none"
                  placeholder="I'm offline, will reply soon."
                />
              </div>
            )}
            <ModItem
              icon={<HardDrive size={20} className="text-green-500" />}
              desc="Send images up to 50MB without quality loss"
              active={mods.highResMedia}
              onClick={() => toggleMod('highResMedia')}
            />
          </div>
        </section>

        {/* â”€â”€â”€ Glass Theme + Video Background â”€â”€â”€ */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-b border-white/10 flex items-center gap-2 text-blue-400 font-bold">
            <Layers size={18} /> Glass Theme &amp; Video Background
          </div>
          <div className="p-4 space-y-3">
            <p className="text-gray-400 text-xs">Fanya UI nzima ya mfumo iwe kama kioo (glassmorphism) na uweke video kama background</p>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-purple-400" />
                <div>
                  <p className="text-white text-sm font-semibold">Glass Mode</p>
                  <p className="text-gray-500 text-xs">{mods?.glassMode ? 'âœ… Imewashwa' : 'âŒ Imezimwa'}</p>
                </div>
              </div>
              <button
                onClick={() => setMods(prev => ({ ...prev, glassMode: !prev.glassMode }))}
                className={`w-12 h-6 rounded-full relative transition-all ${mods?.glassMode ? 'bg-purple-500' : 'bg-white/10 border border-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${mods?.glassMode ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            <button
              onClick={() => setShowGlassManager(true)}
              className="w-full py-3 bg-gradient-to-r from-blue-600/30 to-purple-600/30 border border-blue-500/30 text-blue-300 rounded-xl font-semibold text-sm hover:from-blue-600/50 hover:to-purple-600/50 transition-all flex items-center justify-center gap-2"
            >
              <Video size={16} /> Dhibiti Glass Theme &amp; Video Background
            </button>
            {mods?.glassMode && mods?.videoBg && (
              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                <span>ðŸŽ¬</span> Video background imewashwa
              </div>
            )}
          </div>
        </section>

        {/* â”€â”€â”€ System Dashboard â”€â”€â”€ */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-gradient-to-r from-green-900/40 to-teal-900/40 border-b border-white/10 flex items-center gap-2 text-green-400 font-bold">
            <BarChart size={18} /> System Dashboard
          </div>
          <div className="p-4 space-y-3">
            <p className="text-gray-400 text-xs">Angalia takwimu za mfumo: ujumbe wa leo, users wanaokaa online sana, chats maarufu na zaidi</p>
            <button
              onClick={() => setShowSystemDashboard(true)}
              className="w-full py-3 bg-gradient-to-r from-green-600/30 to-teal-600/30 border border-green-500/30 text-green-300 rounded-xl font-semibold text-sm hover:from-green-600/50 hover:to-teal-600/50 transition-all flex items-center justify-center gap-2"
            >
              <Activity size={16} /> Fungua Dashboard
            </button>
          </div>
        </section>

        {/* â”€â”€â”€ TikTok / Instagram Exclusive Features â”€â”€â”€ */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-gradient-to-r from-pink-900/40 to-purple-900/40 border-b border-white/10 flex items-center gap-2 font-bold" style={{ color: '#ff6b9d' }}>
            <Sparkles size={18} /> GENZ Exclusive â€” TikTok/Instagram Features
          </div>
          <div className="p-2">
            <ModItem
              icon={<Star size={20} className="text-yellow-400" />}
              title="Story Highlights"
              desc="Hifadhi statuses kama highlights zinazodumu daima"
              active={mods?.storyHighlights}
              onClick={() => toggleMod('storyHighlights')}
            />
            <ModItem
              icon={<Wand2 size={20} className="text-purple-400" />}
              title="AI Caption Generator"
              desc="Generate captions za picha/video kwa AI"
              active={mods?.aiCaption}
              onClick={() => toggleMod('aiCaption')}
            />
            <ModItem
              icon={<TrendingUp size={20} className="text-orange-400" />}
              title="Trending Stickers"
              desc="Stickers za hali ya juu za East Africa"
              active={mods?.trendingStickers}
              onClick={() => toggleMod('trendingStickers')}
            />
            <ModItem
              icon={<Activity size={20} className="text-pink-400" />}
              title="Live Reactions"
              desc="Tuma emoji reactions zinazoelea wakati wa chat"
              active={mods?.liveReactions}
              onClick={() => toggleMod('liveReactions')}
            />
            <ModItem
              icon={<Video size={20} className="text-blue-400" />}
              title="Collaborative Status (Duet)"
              desc="Fanya status pamoja na rafiki yako"
              active={mods?.collabStatus}
              onClick={() => toggleMod('collabStatus')}
            />
            <ModItem
              icon={<Sparkles size={20} className="text-cyan-400" />}
              title="Chat Bubble Animations"
              desc="Confetti na hearts wakati wa kutuma message"
              active={mods?.bubbleAnimations}
              onClick={() => toggleMod('bubbleAnimations')}
            />
            <ModItem
              icon={<MessageSquare size={20} className="text-green-400" />}
              title="Status Reel Mode"
              desc="Angalia statuses kama Instagram Reels (full screen)"
              active={mods?.reelMode}
              onClick={() => toggleMod('reelMode')}
             />
          </div>
        </section>
        </> /* end mods tab */
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TAB: SOCIAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'social' && (
        <>
        {/* TikTok / Instagram Exclusive Features */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-gradient-to-r from-green-900/40 to-teal-900/40 border-b border-white/10 flex items-center gap-2 text-green-400 font-bold">
            <Shield size={18} /> TM WhatsApp Exclusive Features
          </div>
          <div className="p-2">
            <ModItem
              icon={<Forward size={20} className="text-yellow-400" />}
              title="No Forward Label"
              desc="Hide 'Forwarded' tag when you share messages"
              active={mods.noForwardLabel}
              onClick={() => toggleMod('noForwardLabel')}
            />
            <ModItem
              icon={<Eye size={20} className="text-blue-400" />}
              title="Hide Blue Ticks Color"
              desc="Keep double ticks grey even after reading"
              active={mods.hideBlueTickColor}
              onClick={() => toggleMod('hideBlueTickColor')}
            />
            <ModItem
              icon={<Download size={20} className="text-purple-400" />}
              title="Auto Save Media to Gallery"
              desc="Automatically save received photos and videos"
              active={mods.autoSaveMedia}
              onClick={() => toggleMod('autoSaveMedia')}
            />
            <ModItem
              icon={<Globe size={20} className="text-cyan-400" />}
              title="Link Preview"
              desc="Show rich preview cards for links in chat"
              active={mods.linkPreview !== false}
              onClick={() => toggleMod('linkPreview')}
            />
            <ModItem
              icon={<Bell size={20} className="text-red-400" />}
              title="Spam Filter"
              desc="Auto-detect and filter spam messages"
              active={mods.spamFilter}
              onClick={() => toggleMod('spamFilter')}
            />
            <ModItem
              icon={<CheckCheck size={20} className="text-green-400" />}
              title="Always Online"
              desc="Show online status even when app is closed"
              active={mods.alwaysOnline}
              onClick={() => toggleMod('alwaysOnline')}
            />
          </div>

          {/* Font Size Section */}
          <div className="p-4 border-t border-white/10">
            <h4 className="text-xs font-bold text-blue-300 mb-3 flex items-center gap-2">
              <Edit3 size={14} /> Message Font Size
            </h4>
            <div className="flex gap-2">
              {[
                { key: 'small', label: 'Small', size: 'text-xs' },
                { key: 'medium', label: 'Medium', size: 'text-sm' },
                { key: 'large', label: 'Large', size: 'text-base' },
                { key: 'xlarge', label: 'X-Large', size: 'text-lg' },
              ].map(({ key, label, size }) => (
                <button
                  key={key}
                  onClick={() => setMods(prev => ({ ...prev, fontSize: key }))}
                  className={`flex-1 py-2 rounded-xl font-bold transition-all border ${
                    (mods.fontSize || 'medium') === key
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span className={size}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Bubble Style */}
          <div className="p-4 border-t border-white/10">
            <h4 className="text-xs font-bold text-pink-300 mb-3 flex items-center gap-2">
              <MessageSquare size={14} /> Bubble Style
            </h4>
            <div className="flex gap-2">
              {[
                { key: 'default', label: 'Default' },
                { key: 'rounded', label: 'Rounded' },
                { key: 'sharp', label: 'Sharp' },
                { key: 'bubble', label: 'Bubble' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMods(prev => ({ ...prev, bubbleStyle: key }))}
                  className={`flex-1 py-2 text-xs rounded-xl font-bold transition-all border ${
                    (mods.bubbleStyle || 'default') === key
                      ? 'bg-pink-600 border-pink-400 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
        </> /* end social tab */
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TAB: ADVANCED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'advanced' && (
        <>
        {/* Online History */}
        <button
          onClick={() => setShowDashboard(true)}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
        >
          <Clock size={18} /> View Online History Dashboard
        </button>

        {/* Advanced Features */}
        <section className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-white/10">
          <div className="p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-b border-white/10 flex items-center gap-2 text-white font-bold">
            <Zap size={18} /> Advanced Features
          </div>
          <div className="p-4 space-y-6">

            {/* Display & Theme */}
            <div>
              <h4 className="text-xs font-bold text-purple-400 mb-3 flex items-center gap-2">
                <Palette size={14} /> Display & Theme
              </h4>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  {appTheme === 'dark' ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-yellow-400" />}
                  <div>
                    <p className="text-sm font-bold text-white">{appTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                    <p className="text-xs text-white/50">Switch app appearance</p>
                  </div>
                </div>
                <button
                  onClick={toggleAppTheme}
                  className={`w-12 h-6 rounded-full transition-all duration-300 relative ${appTheme === 'dark' ? 'bg-blue-600' : 'bg-yellow-400'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${appTheme === 'dark' ? 'left-0.5' : 'left-6'}`} />
                </button>
              </div>
            </div>

            {/* Do Not Disturb */}
            <div>
              <h4 className="text-xs font-bold text-orange-400 mb-3 flex items-center gap-2">
                <BellOff size={14} /> Do Not Disturb (DND)
              </h4>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BellOff size={18} className={isDNDMode ? 'text-orange-400' : 'text-white/40'} />
                    <div>
                      <p className="text-sm font-bold text-white">DND Mode</p>
                      <p className="text-xs text-white/50">Disconnects socket â€” no messages or calls</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleDNDMode}
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative ${isDNDMode ? 'bg-orange-500' : 'bg-white/20'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${isDNDMode ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
                {isDNDMode && (
                  <div className="mt-3 p-2 bg-orange-500/10 rounded-lg border border-orange-500/20 text-xs text-orange-300">
                    ðŸ”• You are offline. No messages or calls will be received.
                  </div>
                )}
              </div>
            </div>

            {/* Message Statistics */}
            <div>
              <h4 className="text-xs font-bold text-teal-400 mb-3 flex items-center gap-2">
                <BarChart2 size={14} /> Message Statistics
              </h4>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                {(() => {
                  const stats = getMessageStats ? getMessageStats() : {};
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Total Messages', value: stats.total || 0, color: 'text-blue-400' },
                        { label: 'Sent by Me', value: stats.sentByMe || 0, color: 'text-green-400' },
                        { label: 'Received', value: stats.received || 0, color: 'text-purple-400' },
                        { label: 'Today', value: stats.today || 0, color: 'text-yellow-400' },
                        { label: 'Voice Notes', value: stats.byType?.audio || 0, color: 'text-pink-400' },
                        { label: 'Images', value: stats.byType?.image || 0, color: 'text-indigo-400' },
                      ].map(s => (
                        <div key={s.label} className="bg-dark-bg/50 rounded-xl p-3 text-center border border-white/5">
                          <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                          <p className="text-[10px] text-white/50 mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Backup & Data Export */}
            <div>
              <h4 className="text-xs font-bold text-green-400 mb-3 flex items-center gap-2">
                <Cloud size={14} /> Backup & Data Export
              </h4>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-3">
                <button onClick={startCloudBackup}
                  className="w-full py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-xl text-green-300 text-sm font-bold flex items-center justify-center gap-2 transition-all">
                  <Cloud size={16} /> Create Cloud Backup
                </button>
                <button onClick={() => exportBackup?.()}
                  className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-300 text-sm font-bold flex items-center justify-center gap-2 transition-all">
                  <Download size={16} /> Export All Data (JSON)
                </button>
                {backupProgress !== null && backupProgress !== undefined && (
                  <div className="mt-2">
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${backupProgress}%` }} />
                    </div>
                    <p className="text-xs text-green-400 mt-1 text-center">{backupProgress}% backed up</p>
                  </div>
                )}
              </div>
            </div>

            {/* Security Features */}
            <div>
              <h4 className="text-xs font-bold text-red-400 mb-3 flex items-center gap-2">
                <Shield size={14} /> Security Features
              </h4>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                <button
                  onClick={() => setShow2FAModal(true)}
                  className="w-full py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Shield size={16} /> Two-Factor Authentication (2FA)
                </button>
                <button
                  onClick={() => setShowEmailVerification(true)}
                  className="w-full py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-300 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Mail size={16} /> Email Verification
                </button>
                <button
                  onClick={() => setShowPasswordReset(true)}
                  className="w-full py-2.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-xl text-yellow-300 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Lock size={16} /> Password Reset
                </button>
                <button
                  onClick={() => setShowDeviceManagement(true)}
                  className="w-full py-2.5 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 rounded-xl text-teal-300 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <SmartphoneIcon size={16} /> Device Management
                </button>
              </div>
            </div>

            {/* Voice Note Settings */}
            <div>
              <h4 className="text-xs font-bold text-pink-400 mb-3 flex items-center gap-2">
                <Mic size={14} /> Voice Note Settings
              </h4>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Auto-play Voice Notes</p>
                    <p className="text-[10px] text-white/50">Automatically play voice notes</p>
                  </div>
                  <button
                    onClick={() => setMods(prev => ({ ...prev, voiceAutoPlay: !prev.voiceAutoPlay }))}
                    className={`w-10 h-5 rounded-full relative transition-colors ${mods.voiceAutoPlay ? 'bg-pink-500' : 'bg-white/20'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${mods.voiceAutoPlay ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Noise Suppression</p>
                    <p className="text-[10px] text-white/50">Reduce background noise</p>
                  </div>
                  <button
                    onClick={() => setMods(prev => ({ ...prev, voiceNoiseSuppression: !prev.voiceNoiseSuppression }))}
                    className={`w-10 h-5 rounded-full relative transition-colors ${mods.voiceNoiseSuppression ? 'bg-pink-500' : 'bg-white/20'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${mods.voiceNoiseSuppression ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Echo Cancellation</p>
                    <p className="text-[10px] text-white/50">Remove echo from recordings</p>
                  </div>
                  <button
                    onClick={() => setMods(prev => ({ ...prev, voiceEchoCancellation: !prev.voiceEchoCancellation }))}
                    className={`w-10 h-5 rounded-full relative transition-colors ${mods.voiceEchoCancellation ? 'bg-pink-500' : 'bg-white/20'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${mods.voiceEchoCancellation ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div>
                  <p className="text-xs font-bold text-white mb-2">Default Playback Speed</p>
                  <div className="flex gap-2">
                    {['1x', '1.5x', '2x'].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setMods(prev => ({ ...prev, voiceDefaultSpeed: speed }))}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${mods.voiceDefaultSpeed === speed
                          ? 'bg-pink-500 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                      >
                        {speed}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Save Voice Notes Locally</p>
                    <p className="text-[10px] text-white/50">Download voice notes automatically</p>
                  </div>
                  <button
                    onClick={() => setMods(prev => ({ ...prev, voiceSaveLocally: !prev.voiceSaveLocally }))}
                    className={`w-10 h-5 rounded-full relative transition-colors ${mods.voiceSaveLocally ? 'bg-pink-500' : 'bg-white/20'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${mods.voiceSaveLocally ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>
        </> /* end advanced tab */
      )}
      </div> {/* end overflow-y-auto */}

      {/* ════════════════════════════════════════
           GLOBAL MODALS (render above all tabs)
         ════════════════════════════════════════ */}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-[#0d1b2a] via-[#0a1628] to-black rounded-3xl shadow-2xl w-full max-w-[calc(100vw-2rem)] sm:max-w-md border border-white/10 flex flex-col overflow-hidden max-h-[92vh]">

            {/* Header */}
            <div className="bg-gradient-to-r from-[#008069] to-[#005c4b] p-5 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-white">💎 Premium Subscription</h2>
                <p className="text-green-200 text-xs mt-0.5">Fungua vipengele vyote vya GENZ Ultra</p>
              </div>
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentMessage(''); }}
                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all"
              >✕</button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">

              {/* Price Card */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-2xl p-4 border border-green-500/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/60 text-sm">Bei ya Subscription</span>
                  <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold">MIEZI 2</span>
                </div>
                <div className="text-4xl font-black text-white">Tsh 10,000</div>
                <p className="text-green-400 text-xs mt-1">≈ Tsh 5,000 / mwezi • Ghaghama pungufu!</p>
              </div>

              {/* Features */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white/50 text-xs font-semibold mb-2 uppercase tracking-wide">Utapata:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {['🔒 Privacy ya juu', '👻 Ghost Mode', '🛡️ Anti-Delete', '💬 Glass Mode',
                    '📊 Dashboard', '🎵 Chat Music', '⚡ All Mods', '🔄 Auto-Reply'].map(f => (
                    <div key={f} className="text-xs text-green-300">{f}</div>
                  ))}
                </div>
              </div>

              {/* Step 1 - Payment Method */}
              <div>
                <p className="text-white/70 text-sm font-semibold mb-2">1️⃣ Chagua Njia ya Malipo:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'mpesa',        name: 'M-Pesa',       flag: '🟢' },
                    { id: 'airtel-money', name: 'Airtel Money',  flag: '🔴' },
                    { id: 'halopesa',     name: 'HaloPesa',      flag: '🟠' },
                    { id: 'yas',          name: 'Yas Money',     flag: '🔵' },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => { setPaymentMethod(method.id); setPaymentMessage(''); }}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        paymentMethod === method.id
                          ? 'border-green-400 bg-green-500/20 shadow-lg shadow-green-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-lg mb-0.5">{method.flag}</div>
                      <div className="text-white font-bold text-sm">{method.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2 - Phone Number */}
              <div>
                <p className="text-white/70 text-sm font-semibold mb-2">2️⃣ Ingiza Namba ya Simu:</p>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-white/50 text-sm font-mono pointer-events-none pr-3 border-r border-white/15">
                    <span>🇹🇿</span>
                    <span>+255</span>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.startsWith('255')) val = val.slice(3);
                      if (val.startsWith('0')) val = val.slice(1);
                      setPhoneNumber(val.slice(0, 9));
                      setPaymentMessage('');
                    }}
                    placeholder="712 345 678"
                    maxLength={9}
                    className="w-full bg-white/5 border border-white/20 rounded-xl pl-24 pr-4 py-3.5 text-white placeholder-white/25 text-sm font-mono focus:outline-none focus:border-green-400/60 focus:bg-white/10 transition-all"
                  />
                </div>
                <p className="text-white/30 text-xs mt-1.5 ml-1">
                  {paymentMethod === 'mpesa' && '📱 Namba ya M-Pesa (huanza na 6 au 7)'}
                  {paymentMethod === 'airtel-money' && '📱 Namba ya Airtel Money (huanza na 6 au 7)'}
                  {paymentMethod === 'halopesa' && '📱 Namba ya HaloPesa (huanza na 6)'}
                  {paymentMethod === 'yas' && '📱 Namba ya Yas Money (huanza na 6 au 7)'}
                </p>
              </div>

              {/* Message feedback */}
              {paymentMessage && (
                <div className={`p-3 rounded-xl text-sm flex items-start gap-2 ${
                  paymentMessage.includes('kamilika') || paymentMessage.includes('Malipo yameanza')
                    ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                    : 'bg-red-500/15 text-red-400 border border-red-500/20'
                }`}>
                  <span>{paymentMessage.includes('kamilika') || paymentMessage.includes('yameanza') ? '✅' : '⚠️'}</span>
                  <span>{paymentMessage}</span>
                </div>
              )}

              {/* Subscription expiry info */}
              {subscriptionStatus.hasSubscription && subscriptionStatus.expiryDate && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
                  ℹ️ Subscription yako: inaisha {new Date(subscriptionStatus.expiryDate).toLocaleDateString('sw-TZ')}
                </div>
              )}

              {/* Pay Button */}
              <button
                onClick={subscriptionStatus.hasSubscription ? handleRenewSubscription : handleInitiatePayment}
                disabled={paymentLoading || phoneNumber.length < 6}
                className="w-full py-4 bg-gradient-to-r from-[#008069] to-[#25d366] hover:from-[#007a5e] hover:to-[#1ebe5d] text-white font-black text-base rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {paymentLoading ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Inashughulikia...</>
                ) : (
                  <>{subscriptionStatus.hasSubscription ? '🔄 Renew Subscription' : '💳 Lipa Sasa — Tsh 10,000'}</>
                )}
              </button>

              <p className="text-center text-white/25 text-xs pb-1">
                🔐 Malipo ni salama. Utapata ujumbe wa kuthibitisha simu yako.
              </p>
            </div>
          </div>
        </div>
      )}


      {showDashboard && <OnlineHistoryDashboard onClose={() => setShowDashboard(false)} />}
      {show2FAModal && <TwoFactorAuth close={() => setShow2FAModal(false)} />}
      {showEmailVerification && <EmailVerification close={() => setShowEmailVerification(false)} />}
      {showPasswordReset && <PasswordReset close={() => setShowPasswordReset(false)} />}
      {showDeviceManagement && <DeviceManagement close={() => setShowDeviceManagement(false)} />}
      {showGlassManager && <GlassThemeManager mods={mods} setMods={setMods} onClose={() => setShowGlassManager(false)} />}
      {showSystemDashboard && <SystemDashboard onClose={() => setShowSystemDashboard(false)} />}

    </div>
  );
};

const ModItem = ({ icon, title, desc, active, onClick }) => (
  <div className="flex justify-between items-center p-3 hover:bg-white/10 cursor-pointer rounded-lg transition-colors" onClick={onClick}>
    <div className="flex items-center gap-4">
      {icon}
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-white/50">{desc}</p>
      </div>
    </div>
    <div className={`w-10 h-5 rounded-full relative transition-colors ${active ? 'bg-[#25d366]' : 'bg-white/20'}`}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${active ? 'right-1' : 'left-1'}`} />
    </div>
  </div>
);

export default GENZSettings;
