import React, { useState } from 'react';
import { ArrowLeft, LayoutGrid, MessagesSquare, Palette, ShieldCheck, Database, Send, UserCircle, X, Users, MessageSquare, Image as ImageIcon, QrCode, Shield, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

// ── Previously-unwired feature panels (now functional via this page) ──
import ChatSort from '../components/ChatSort';
import ChatFilter from '../components/ChatFilter';
import ChatFolders from '../components/ChatFolders';
import MarkAsUnread from '../components/MarkAsUnread';
import PinnedChats from '../components/PinnedChats';
import StarredMessages from '../components/StarredMessages';
import HiddenChats from '../components/HiddenChats';
import ChatLock from '../components/ChatLock';

import ChatTheme from '../components/ChatTheme';
import ChatWallpaper from '../components/ChatWallpaper';
import WallpaperSelector from '../components/WallpaperSelector';
import FontSize from '../components/FontSize';
import Vibration from '../components/Vibration';

import BlockedContacts from '../components/BlockedContacts';
import BlockUnknown from '../components/BlockUnknown';
import LastSeen from '../components/LastSeen';
import PrivacyCheckup from '../components/PrivacyCheckup';
import LoginAlerts from '../components/LoginAlerts';
import SecurityNotifications from '../components/SecurityNotifications';
import AppLock from '../components/AppLock';
import SpamFilter from '../components/SpamFilter';
import MuteUnknown from '../components/MuteUnknown';
import AccountPrivacy from '../components/AccountPrivacy';

import DataUsage from '../components/DataUsage';
import DataSaver from '../components/DataSaver';
import DownloadQuality from '../components/DownloadQuality';
import DataDownload from '../components/DataDownload';

import QuickReplies from '../components/QuickReplies';
import Reminders from '../components/Reminders';
import DoNotDisturb from '../components/DoNotDisturb';
import BulkSender from '../components/BulkSender';
import DocumentSharing from '../components/DocumentSharing';
import ExportChat from '../components/ExportChat';

import PhoneNumber from '../components/PhoneNumber';
import ProfileStatus from '../components/ProfileStatus';
import BusinessProfileManager from '../components/BusinessProfileManager';
import AvatarManager from '../components/AvatarManager';

// ── Group & chat management ──
import GroupAdmin from '../components/GroupAdmin';
import GroupAnnouncement from '../components/GroupAnnouncement';
import GroupAvatar from '../components/GroupAvatar';
import GroupDescription from '../components/GroupDescription';
import GroupInviteLink from '../components/GroupInviteLink';
import GroupMemberManagement from '../components/GroupMemberManagement';
import GroupPrivacy from '../components/GroupPrivacy';
import GroupQRCode from '../components/GroupQRCode';
import MuteNotifications from '../components/MuteNotifications';
import DisappearingMessages from '../components/DisappearingMessages';
import ChatDelete from '../components/ChatDelete';
import ChatSettings from '../components/ChatSettings';

// ── Message tools ──
import { MessageEditingSettings } from '../components/MessageEditing';
import MessageForwarding from '../components/MessageForwarding';
import MessageReactions from '../components/MessageReactions';
import MessageRecall from '../components/MessageRecall';
import MessageDeletion from '../components/MessageDeletion';
import MessageBookmark from '../components/MessageBookmark';
import MessageLabels from '../components/MessageLabels';
import MessageTemplate from '../components/MessageTemplate';
import MessagePriority from '../components/MessagePriority';
import MessageHighlight from '../components/MessageHighlight';
import MessageMention from '../components/MessageMention';
import MessageShareToStatus from '../components/MessageShareToStatus';
import MessageReplyThread from '../components/MessageReplyThread';
import MessageThread from '../components/MessageThread';
import MessageGroupReply from '../components/MessageGroupReply';
import MessageQuickAction from '../components/MessageQuickAction';
import MessageSwipeActions from '../components/MessageSwipeActions';
import MessageDoubleTap from '../components/MessageDoubleTap';
import MessageLongPress from '../components/MessageLongPress';
import MessageQuoting from '../components/MessageQuoting';
import EphemeralMessage from '../components/EphemeralMessage';
import SafeMessage from '../components/SafeMessage';
import ViewOnceMessage from '../components/ViewOnceMessage';
import ViewOnceMedia from '../components/ViewOnceMedia';
import Mentions from '../components/Mentions';
import Comments from '../components/Comments';
import Hashtags from '../components/Hashtags';
import LinkPreviews from '../components/LinkPreviews';

// ── Contacts, devices & communities ──
import ContactManagement from '../components/ContactManagement';
import BroadcastLists from '../components/BroadcastLists';
import CommunityManager from '../components/CommunityManager';
import PhoneContactsSync from '../components/PhoneContactsSync';
import DeviceLinking from '../components/DeviceLinking';
import MultiAccountsPanel from '../components/MultiAccountsPanel';
import BlockUserModal from '../components/BlockUserModal';
import ReportUser from '../components/ReportUser';
import SecretChat from '../components/SecretChat';
import LiveLocationSharing from '../components/LiveLocationSharing';
import LocationPicker from '../components/LocationPicker';

// ── Content ──
import GIFPicker from '../components/GIFPicker';
import CustomEmojis from '../components/CustomEmojis';
import EventManager from '../components/EventManager';
import CropRotatePanel from '../components/CropRotatePanel';
import PopupNotification from '../components/PopupNotification';
import { QRCodeGenerator, QRCodeScanner, QRCodeSettings } from '../components/QRCode';
import QRCodeSharing from '../components/QRCodeSharing';

// ── Account & security ──
import About from '../components/About';
import AccountManagementSettings from '../components/AccountManagement';
import ProfileDelete from '../components/ProfileDelete';
import ProfileLinks from '../components/ProfileLinks';
import ProfileSecurity from '../components/ProfileSecurity';
import WebLogin from '../components/WebLogin';
import BiometricAuth from '../components/BiometricAuth';
import BiometricLock from '../components/BiometricLock';
import FingerprintSimulation from '../components/FingerprintSimulation';
import SecureBackup from '../components/SecureBackup';

// ── Mods panels (self-contained; talk to their own /api/*-mods endpoints) ──

// ── Payments & UI primitives ──
import PaymentFeatures from '../components/PaymentFeatures';
import PaymentFeaturesManager from '../components/PaymentFeaturesManager';
import SkeletonLoader from '../components/SkeletonLoader';
import TabSystem from '../components/TabSystem';
import TextMenu from '../components/TextMenu';
import toast from 'react-hot-toast';
import TypingDots from '../components/TypingDots';

// Toast demo — fires real app toasts via react-hot-toast (the `<Toaster />`
// in App.jsx renders them). The old `Toast` import was a context *provider*,
// which rendered an empty panel when used as a UI component.
const ToastPreview = () => (
  <div className="space-y-3">
    <p className="text-sm text-dark-textSecondary">Preview the app's toast notifications:</p>
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => toast.success('Operation successful ✓')}
        className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
      >
        Success toast
      </button>
      <button
        type="button"
        onClick={() => toast.error('Something went wrong')}
        className="px-3 py-2 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-sm font-medium hover:bg-red-500/30 transition-colors"
      >
        Error toast
      </button>
      <button
        type="button"
        onClick={() => toast('Heads up: this is an info toast', { icon: 'ℹ️' })}
        className="px-3 py-2 rounded-lg bg-white/5 text-white/80 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
      >
        Info toast
      </button>
    </div>
  </div>
);
import VideoPlayer from '../components/VideoPlayer';

// localStorage-backed state (works the same as a real setting — persists)
const usePersistent = (key, initial) => {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  const update = (next) => {
    setValue(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
  };
  return [value, update];
};

const FeatureLibrary = () => {
  const navigate = useNavigate();
  const {
    user, conversations, contacts, blockedUsers, blockUser, unblockUser,
    mods, setMods, togglePinChat, toggleStarMessage, updateProfile
  } = useChat();

  // Active modal
  const [active, setActive] = useState(null);
  const close = () => setActive(null);

  // Local state for chat interactions
  const [chatOrder, setChatOrder] = useState('recent');
  const [chatFilters, setChatFilters] = useState({ type: [], status: [], time: 'all' });
  const [chatQuery, setChatQuery] = useState('');
  const [unreadIds, setUnreadIds] = usePersistent('genz_unread_ids', []);
  const [hiddenIds, setHiddenIds] = usePersistent('genz_hidden_chats', []);
  const [lockedIds, setLockedIds] = usePersistent('genz_locked_chats', []);
  const [starredIds, setStarredIds] = usePersistent('genz_starred_ids', []);
  const [folders, setFolders] = usePersistent('genz_chat_folders', []);

  const [wallpaper, setWallpaper] = usePersistent('genz_wallpaper', '');
  const [theme, setTheme] = usePersistent('genz_chat_theme', 'dark');
  const [fontSize, setFontSize] = usePersistent('genz_font_size', 'md');
  const [vibrationPattern, setVibrationPattern] = usePersistent('genz_vibration', 'default');
  const [dnd, setDnd] = usePersistent('genz_dnd_settings', { enabled: false, start: '22:00', end: '07:00' });
  const [appLock, setAppLock] = usePersistent('genz_app_lock', false);
  const [blockUnknown, setBlockUnknown] = usePersistent('genz_block_unknown', false);
  const [muteUnknown, setMuteUnknown] = usePersistent('genz_mute_unknown', false);
  const [spamSettings, setSpamSettings] = usePersistent('genz_spam_settings', { enabled: true, level: 'medium' });
  const [secNotify, setSecNotify] = usePersistent('genz_security_notifications', { loginAlerts: true, newDevice: true, passwordChange: true });
  const [privacySettings, setPrivacySettings] = usePersistent('genz_privacy_settings', {
    lastSeen: 'everyone', profilePhoto: 'everyone', about: 'contacts', status: 'contacts', readReceipts: true
  });
  const [loginHistory, setLoginHistory] = usePersistent('genz_login_history', []);
  const [usage, setUsage] = usePersistent('genz_data_usage', { month: { sent: 0, received: 0, wifi: { sent: 0, received: 0 }, mobile: { sent: 0, received: 0 } } });
  const [dataSaver, setDataSaver] = usePersistent('genz_data_saver', { enabled: false, autoDownload: 'wifi', mediaQuality: 'auto' });
  const [downloadQuality, setDownloadQuality] = usePersistent('genz_download_quality', { photos: 'standard', videos: 'standard', documents: 'standard' });
  const [quickReplies, setQuickReplies] = usePersistent('genz_quick_replies', []);
  const [documents, setDocuments] = usePersistent('genz_documents', []);
  const [businessProfile, setBusinessProfile] = usePersistent('genz_business_profile', { name: user?.username || '', category: '', description: '' });
  const [reminders, setReminders] = usePersistent('genz_reminders', []);
  const [labels, setLabels] = usePersistent('genz_message_labels', []);
  const [templates, setTemplates] = usePersistent('genz_message_templates', []);
  const [profileLinks, setProfileLinks] = usePersistent('genz_profile_links', []);
  const [broadcastLists, setBroadcastLists] = usePersistent('genz_broadcast_lists', []);
  const [events, setEvents] = usePersistent('genz_events', []);
  const [customEmojis, setCustomEmojis] = usePersistent('genz_custom_emojis', []);
  const [hashtags, setHashtags] = usePersistent('genz_hashtags', []);
  const [activeShares, setActiveShares] = usePersistent('genz_active_location_shares', []);
  const [profileSecurity, setProfileSecurity] = usePersistent('genz_profile_security', { twoFactor: false, loginAlerts: true });
  const [backupStatus, setBackupStatus] = usePersistent('genz_backup_status', { lastBackup: null, enabled: false });
  const [messageEditing, setMessageEditing] = usePersistent('genz_message_editing', { messageEditingEnabled: false, showEditIndicator: true });
  const [tabs, setTabs] = usePersistent('genz_tabs', [{ id: 'tab-1', label: 'Chats' }, { id: 'tab-2', label: 'Status' }]);

  // Derived chat list
  const allChats = (conversations || []).filter(c => !hiddenIds.includes(String(c._id)));
  let chats = allChats;
  if (chatFilters.type.includes('group')) chats = chats.filter(c => c.isGroup);
  else if (chatFilters.type.includes('contact')) chats = chats.filter(c => !c.isGroup);
  if (chatFilters.status.includes('unread')) chats = chats.filter(c => unreadIds.includes(String(c._id)));
  if (chatFilters.status.includes('pinned')) chats = chats.filter(c => c.isPinned || c.pinned);
  if (chatFilters.time === 'today') chats = chats.filter(c => new Date(c.updatedAt || 0).toDateString() === new Date().toDateString());
  if (chatQuery) chats = chats.filter(c => (c.name || c.groupName || '').toLowerCase().includes(chatQuery.toLowerCase()));
  if (chatOrder === 'name') chats = [...chats].sort((a, b) => String(a.name || a.groupName || '').localeCompare(String(b.name || b.groupName || '')));
  else if (chatOrder === 'unread') chats = [...chats].sort((a, b) => Number(unreadIds.includes(String(b._id))) - Number(unreadIds.includes(String(a._id))));
  const pinnedChats = allChats.filter(c => c.isPinned || c.pinned);
  const starredMessages = allChats.flatMap(c => (c.messages || []).filter(m => starredIds.includes(m._id || m.id)));
  const selectedChat = allChats[0] || null;

  const onExportChat = async (chat, format, opts) => {
    try {
      const { authFetch } = await import('../utils/authFetch');
      const { resolveApiBase } = await import('../utils/resolveApiBase');
      const res = await authFetch(`${resolveApiBase()}/quick-actions/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: chat._id, format: format || 'txt', includeMedia: !!opts?.includeMedia })
      });
      const data = await res.json().catch(() => ({}));
      return { success: res.ok && data?.success !== false, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const categories = [
    {
      title: 'Chat', icon: MessagesSquare,
      items: [
        { id: 'sort', name: 'Chat Sort', desc: 'Sort chats by recent, name or unread', C: ChatSort,
          props: { chats, onSort: setChatOrder } },
        { id: 'filter', name: 'Chat Filter', desc: 'Filter chats by type, status or time', C: ChatFilter,
          props: { chats, onFilter: (filters) => { setChatFilters(filters || { type: [], status: [], time: 'all' }); setActive(null); } } },
        { id: 'folders', name: 'Chat Folders', desc: 'Organise chats into folders', C: ChatFolders,
          props: { folders, chats, onCreateFolder: (f) => setFolders([...folders, f]), onUpdateFolder: (id, upd) => setFolders(folders.map(f => f.id === id ? { ...f, ...upd } : f)), onDeleteFolder: (id) => setFolders(folders.filter(f => f.id !== id)) } },
        { id: 'unread', name: 'Mark as Unread', desc: 'Toggle unread badges on chats', C: MarkAsUnread,
          props: { chats, onMarkAsUnread: (id) => setUnreadIds([...new Set([...unreadIds, id])]), onMarkAsRead: (id) => setUnreadIds(unreadIds.filter(x => x !== id)) } },
        { id: 'pinned', name: 'Pinned Chats', desc: 'See and manage pinned conversations', C: PinnedChats,
          props: { chats: pinnedChats, onPin: (id) => togglePinChat?.(id), onUnpin: (id) => togglePinChat?.(id) } },
        { id: 'starred', name: 'Starred Messages', desc: 'Browse your starred messages', C: StarredMessages,
          props: { messages: starredMessages, onStar: (id) => setStarredIds([...new Set([...starredIds, id])]), onUnstar: (id) => setStarredIds(starredIds.filter(x => x !== id)), onShare: () => {}, onDelete: () => {} } },
        { id: 'hidden', name: 'Hidden Chats', desc: 'Hide chats from the main list', C: HiddenChats,
          props: { chats, onHide: (id) => setHiddenIds([...new Set([...hiddenIds, id])]), onUnhide: (id) => setHiddenIds(hiddenIds.filter(x => x !== id)) } },
        { id: 'chatlock', name: 'Chat Lock', desc: 'Lock a conversation with a PIN', C: ChatLock,
          props: { chat: selectedChat, isLocked: selectedChat ? lockedIds.includes(selectedChat._id) : false,
            onLockChat: (id) => setLockedIds([...new Set([...lockedIds, id])]),
            onUnlockChat: (id) => setLockedIds(lockedIds.filter(x => x !== id)), onLockSettings: () => {} } },
        { id: 'export', name: 'Export Chat', desc: 'Export a conversation to TXT/PDF/JSON', C: ExportChat,
          props: { chat: selectedChat, onExport: onExportChat } },
      ]
    },
    {
      title: 'Appearance', icon: Palette,
      items: [
        { id: 'theme', name: 'Chat Theme', desc: 'Pick a theme for your chats', C: ChatTheme,
          props: { currentTheme: { id: theme }, themes: [], onSelect: setTheme, onCustomize: () => {} } },
        { id: 'wallpaper', name: 'Chat Wallpaper', desc: 'Change your chat background', C: ChatWallpaper,
          props: { currentWallpaper: wallpaper, wallpapers: ['/wallpapers/wp1.jpg', '/wallpapers/wp2.jpg', '/wallpapers/wp3.jpg'], onSelect: setWallpaper, onUpload: setWallpaper, onRemove: () => setWallpaper(''), onReset: () => setWallpaper('') } },
        { id: 'wallpaper-selector', name: 'Wallpaper Picker', desc: 'Upload a custom wallpaper', C: WallpaperSelector,
          props: { isOpen: true, onClose: close, onSelect: setWallpaper, currentWallpaper: wallpaper, onRemove: () => setWallpaper('') } },
        { id: 'fontsize', name: 'Font Size', desc: 'Adjust message text size', C: FontSize,
          props: { currentSize: fontSize, sizes: ['sm', 'md', 'lg', 'xl'], onSelect: setFontSize } },
        { id: 'vibration', name: 'Vibration', desc: 'Choose notification vibration', C: Vibration,
          props: { currentPattern: vibrationPattern, patterns: ['default', 'short', 'long', 'double'], onSelect: setVibrationPattern, onTest: () => { try { navigator.vibrate?.(200); } catch { /* unsupported */ } } } },
      ]
    },
    {
      title: 'Privacy & Security', icon: ShieldCheck,
      items: [
        { id: 'blocked', name: 'Blocked Contacts', desc: 'Manage your blocked list', C: BlockedContacts,
          props: { blockedContacts: blockedUsers || [], onUnblock: (id) => unblockUser?.(id), onBlock: (id) => blockUser?.(id) } },
        { id: 'blockunknown', name: 'Block Unknown', desc: 'Auto-block unknown senders', C: BlockUnknown,
          props: { settings: { enabled: blockUnknown }, onUpdate: (s) => setBlockUnknown(!!s.enabled) } },
        { id: 'muteunknown', name: 'Mute Unknown', desc: 'Mute messages from unknown senders', C: MuteUnknown,
          props: { settings: { enabled: muteUnknown }, onUpdate: (s) => setMuteUnknown(!!s.enabled) } },
        { id: 'lastseen', name: 'Last Seen', desc: 'Who can see your last seen', C: LastSeen,
          props: { user, privacySettings, onPrivacyChange: (k, v) => setPrivacySettings({ ...privacySettings, [k]: v }) } },
        { id: 'privacycheckup', name: 'Privacy Checkup', desc: 'Review your privacy settings', C: PrivacyCheckup,
          props: { privacyData: privacySettings, onFixIssue: (k) => setPrivacySettings({ ...privacySettings, [k]: 'contacts' }), onDismiss: () => {} } },
        { id: 'login-alerts', name: 'Login Alerts', desc: 'Review recent login activity', C: LoginAlerts,
          props: { loginHistory, onDismissAlert: (id) => setLoginHistory(loginHistory.filter(l => l.id !== id)), onReviewDevice: () => navigate('/linked-devices') } },
        { id: 'secnotify', name: 'Security Notifications', desc: 'Control security alerts', C: SecurityNotifications,
          props: { settings: secNotify, onUpdate: setSecNotify } },
        { id: 'applock', name: 'App Lock', desc: 'Lock the app with a PIN', C: AppLock,
          props: { isEnabled: appLock, onToggle: () => setAppLock(!appLock), onUnlock: () => {} } },
        { id: 'spam', name: 'Spam Filter', desc: 'Configure spam protection', C: SpamFilter,
          props: { spamMessages: [], onMarkAsSpam: () => {}, onMarkAsNotSpam: () => {}, onDelete: () => {}, onConfigure: setSpamSettings } },
        { id: 'accountprivacy', name: 'Account Privacy', desc: 'Profile & status visibility', C: AccountPrivacy,
          props: { privacySettings, onUpdate: (s) => setPrivacySettings({ ...privacySettings, ...s }) } },
      ]
    },
    {
      title: 'Data & Storage', icon: Database,
      items: [
        { id: 'usage', name: 'Data Usage', desc: 'Track sent & received data', C: DataUsage,
          props: { dataUsage: usage, onResetUsage: () => setUsage({ month: { sent: 0, received: 0, wifi: { sent: 0, received: 0 }, mobile: { sent: 0, received: 0 } } }) } },
        { id: 'datasaver', name: 'Data Saver', desc: 'Reduce mobile data use', C: DataSaver,
          props: { settings: dataSaver, onUpdate: setDataSaver } },
        { id: 'downloadq', name: 'Download Quality', desc: 'Media download quality', C: DownloadQuality,
          props: { settings: downloadQuality, onUpdate: setDownloadQuality } },
        { id: 'datadownload', name: 'Request My Data', desc: 'Download your account data', C: DataDownload,
          props: { user, onRequestDownload: () => {}, onDownload: () => {} } },
      ]
    },
    {
      title: 'Messaging', icon: Send,
      items: [
        { id: 'quickreplies', name: 'Quick Replies', desc: 'Save reusable replies', C: QuickReplies,
          props: { replies: quickReplies, onCreateReply: (r) => setQuickReplies([...quickReplies, r]), onUpdateReply: (id, r) => setQuickReplies(quickReplies.map(x => x.id === id ? r : x)), onDeleteReply: (id) => setQuickReplies(quickReplies.filter(x => x.id !== id)), onUseReply: () => {} } },
        { id: 'reminders', name: 'Reminders', desc: 'Set message reminders', C: Reminders,
          props: { message: null, onSetReminder: (r) => setReminders([...reminders, r]) } },
        { id: 'dnd', name: 'Do Not Disturb', desc: 'Silence notifications at night', C: DoNotDisturb,
          props: { settings: dnd, onUpdate: setDnd } },
        { id: 'bulksender', name: 'Bulk Sender', desc: 'Send a message to many chats', C: BulkSender,
          props: { conversations: allChats, user } },
        { id: 'documents', name: 'Documents', desc: 'Manage shared documents', C: DocumentSharing,
          props: { documents, onUpload: (d) => setDocuments([...documents, d]), onDownload: () => {}, onDelete: (id) => setDocuments(documents.filter(d => d.id !== id)), onShare: () => {} } },
      ]
    },
    {
      title: 'Account', icon: UserCircle,
      items: [
        { id: 'phone', name: 'Phone Number', desc: 'View your account phone number', C: PhoneNumber,
          props: { user, onUpdate: () => {} } },
        { id: 'profile-status', name: 'Profile Status', desc: 'Update your about/status text', C: ProfileStatus,
          props: { user, onUpdateStatus: (status) => updateProfile?.({ about: status }) } },
        { id: 'business', name: 'Business Profile', desc: 'Manage your business info', C: BusinessProfileManager,
          props: { businessProfile, onUpdate: setBusinessProfile } },
        { id: 'avatar', name: 'Avatar Manager', desc: 'Change your profile picture', C: AvatarManager,
          props: { user, onUpdateAvatar: () => {}, } },
      ]
    },
  ];

  // Derived data shared by the wired panels
  const firstGroup = allChats.find(c => c.isGroup) || selectedChat || null;
  const groupMembers = firstGroup?.participants || [];
  const demoContact = contacts?.[0] || { _id: 'demo-contact', username: 'Demo Contact', phoneNumber: '255700000000' };
  const demoMessage = {
    _id: 'demo-msg', content: 'Hello! This is a sample message for previewing the feature.',
    sender: { _id: user?._id || 'demo', username: user?.username || 'You' },
    createdAt: new Date().toISOString(), messageType: 'text'
  };
  const demoImage = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  const demoVideo = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  const categories2 = [
    {
      title: 'Groups & Chats', icon: Users,
      items: [
        { id: 'g-admin', name: 'Group Admin', desc: 'Promote/demote admins, remove members', C: GroupAdmin,
          props: { group: firstGroup, members: groupMembers, onPromoteAdmin: () => {}, onDemoteAdmin: () => {}, onRemoveMember: () => {} } },
        { id: 'g-members', name: 'Group Members', desc: 'Manage group participants', C: GroupMemberManagement,
          props: { group: firstGroup, members: groupMembers, contacts, onAddMember: () => {}, onRemoveMember: () => {}, onPromoteAdmin: () => {}, onDemoteAdmin: () => {} } },
        { id: 'g-description', name: 'Group Description', desc: 'Edit the group description', C: GroupDescription,
          props: { group: firstGroup, onUpdate: () => {} } },
        { id: 'g-avatar', name: 'Group Avatar', desc: 'Change the group photo', C: GroupAvatar,
          props: { group: firstGroup, onUpdate: () => {} } },
        { id: 'g-privacy', name: 'Group Privacy', desc: 'Control who can find the group', C: GroupPrivacy,
          props: { group: firstGroup, onUpdate: () => {} } },
        { id: 'g-announcement', name: 'Group Announcement', desc: 'Post a pinned announcement', C: GroupAnnouncement,
          props: { group: firstGroup, onCreateAnnouncement: () => {}, onUpdateAnnouncement: () => {}, onDeleteAnnouncement: () => {} } },
        { id: 'g-qr', name: 'Group QR Code', desc: 'Show the group invite QR', C: GroupQRCode,
          props: { groupId: firstGroup?._id || 'group', groupName: firstGroup?.groupName || 'Group' } },
        { id: 'g-invite', name: 'Group Invite Link', desc: 'Generate an invite link', C: GroupInviteLink,
          props: { groupId: firstGroup?._id || 'group' } },
        { id: 'mute-notify', name: 'Mute Notifications', desc: 'Mute a chat', C: MuteNotifications,
          props: { chat: selectedChat, onMute: () => {}, onUnmute: () => {} } },
        { id: 'disappearing', name: 'Disappearing Messages', desc: 'Set a self-destruct timer', C: DisappearingMessages,
          props: { chat: selectedChat, onSetTimer: () => {}, onDisable: () => {} } },
        { id: 'chat-delete', name: 'Chat Delete', desc: 'Delete a conversation', C: ChatDelete,
          props: { chat: selectedChat, chats: allChats, onDelete: () => {} } },
        { id: 'chat-settings', name: 'Chat Settings', desc: 'Per-chat settings', C: ChatSettings,
          props: { chatSettings: { wallpaper: '', mute: false }, onUpdateSettings: () => {} } },
      ]
    },
    {
      title: 'Message Tools', icon: MessageSquare,
      items: [
        { id: 'm-editing', name: 'Message Editing', desc: 'Configure edit permissions', C: MessageEditingSettings,
          props: { settings: messageEditing, onUpdate: setMessageEditing } },
        { id: 'm-forward', name: 'Forward Message', desc: 'Forward to chats or contacts', C: MessageForwarding,
          props: { message: demoMessage, chats: allChats, contacts, onForward: () => {} } },
        { id: 'm-reactions', name: 'Reactions', desc: 'React to a message', C: MessageReactions,
          props: { message: demoMessage, onReact: () => {}, onRemoveReaction: () => {} } },
        { id: 'm-recall', name: 'Recall Message', desc: 'Recall a sent message', C: MessageRecall, preview: true,
          props: { message: demoMessage, onRecall: () => {}, onCancel: close } },
        { id: 'm-delete', name: 'Delete Message', desc: 'Delete or unsend', C: MessageDeletion,
          props: { message: demoMessage, onDelete: () => {}, onUnsend: () => {} } },
        { id: 'm-bookmark', name: 'Message Bookmark', desc: 'Bookmark important messages', C: MessageBookmark,
          props: { message: demoMessage, bookmarks: [], onAddBookmark: () => {}, onRemoveBookmark: () => {} } },
        { id: 'm-labels', name: 'Message Labels', desc: 'Tag messages with labels', C: MessageLabels,
          props: { labels, onLabelMessage: () => {}, onCreateLabel: (l) => setLabels([...labels, l]), onUpdateLabel: () => {}, onDeleteLabel: (id) => setLabels(labels.filter(x => x.id !== id)) } },
        { id: 'm-template', name: 'Message Templates', desc: 'Reusable message templates', C: MessageTemplate,
          props: { templates, onCreateTemplate: (t) => setTemplates([...templates, t]), onUpdateTemplate: () => {}, onDeleteTemplate: (id) => setTemplates(templates.filter(x => x.id !== id)), onUseTemplate: () => {} } },
        { id: 'm-priority', name: 'Message Priority', desc: 'Mark a message as urgent', C: MessagePriority,
          props: { message: demoMessage, onSetPriority: () => {} } },
        { id: 'm-highlight', name: 'Message Highlight', desc: 'Highlight a message', C: MessageHighlight,
          props: { message: demoMessage, onHighlight: () => {}, onRemoveHighlight: () => {} } },
        { id: 'm-mention', name: 'Mention Someone', desc: 'Mention a contact', C: MessageMention,
          props: { message: demoMessage, contacts, onMention: () => {} } },
        { id: 'm-share-status', name: 'Share to Status', desc: 'Share a message to status', C: MessageShareToStatus,
          props: { message: demoMessage, onShareToStatus: () => {} } },
        { id: 'm-reply-thread', name: 'Reply Thread', desc: 'View a reply thread', C: MessageReplyThread,
          props: { message: demoMessage, threadReplies: [], onReply: () => {} } },
        { id: 'm-thread', name: 'Message Thread', desc: 'Browse message replies', C: MessageThread,
          props: { message: demoMessage, replies: [], onReply: () => {}, onJumpToMessage: () => {} } },
        { id: 'm-group-reply', name: 'Group Reply', desc: 'Reply inside a group', C: MessageGroupReply,
          props: { message: demoMessage, groupMembers, onGroupReply: () => {} } },
        { id: 'm-quick-action', name: 'Quick Actions', desc: 'Custom message quick actions', C: MessageQuickAction,
          props: { message: demoMessage, actions: [], onCreateAction: () => {}, onUpdateAction: () => {}, onDeleteAction: () => {}, onExecuteAction: () => {} } },
        { id: 'm-swipe', name: 'Swipe Actions', desc: 'Configure swipe gestures', C: MessageSwipeActions, preview: true,
          props: { message: demoMessage, onSwipeLeft: () => {}, onSwipeRight: () => {}, settings: { reply: true, delete: false } } },
        { id: 'm-doubletap', name: 'Double-Tap', desc: 'Preview double-tap action', C: MessageDoubleTap, preview: true,
          props: { message: demoMessage, onDoubleTap: () => {}, children: <span className="text-sm">Tap the message to preview.</span> } },
        { id: 'm-longpress', name: 'Long-Press', desc: 'Preview long-press action', C: MessageLongPress, preview: true,
          props: { message: demoMessage, onAction: () => {}, children: <span className="text-sm">Hold the message to preview.</span> } },
        { id: 'm-quoting', name: 'Message Quoting', desc: 'Preview a quoted reply', C: MessageQuoting, preview: true,
          props: { message: demoMessage, onQuote: () => {}, onCancel: close } },
        { id: 'm-ephemeral', name: 'Ephemeral Message', desc: 'Self-destruct preview', C: EphemeralMessage, preview: true,
          props: { message: demoMessage, onTimerSet: () => {}, onTimerChange: () => {} } },
        { id: 'm-safe', name: 'Safe Message', desc: 'Verify message safety', C: SafeMessage,
          props: { message: demoMessage, onVerify: () => {}, onReport: () => {} } },
        { id: 'm-viewonce', name: 'View-Once Message', desc: 'Preview view-once media', C: ViewOnceMessage,
          props: { message: demoMessage, onViewed: () => {} } },
        { id: 'm-viewonce-media', name: 'View-Once Media', desc: 'Preview view-once image', C: ViewOnceMedia,
          props: { media: demoImage, onViewed: () => {} } },
        { id: 'm-mentions', name: 'Mentions', desc: 'Preview @-mention UI', C: Mentions, preview: true,
          props: { message: demoMessage, onMention: () => {}, chatParticipants: groupMembers, currentUser: user } },
        { id: 'm-comments', name: 'Comments', desc: 'Comment on a status', C: Comments,
          props: { statusId: 'demo', comments: [], onAddComment: () => {}, onDeleteComment: () => {}, onLikeComment: () => {} } },
        { id: 'm-hashtags', name: 'Hashtags', desc: 'Search status hashtags', C: Hashtags,
          props: { hashtags, onSearch: () => {}, onFilter: () => {} } },
        { id: 'm-linkpreview', name: 'Link Previews', desc: 'Preview links', C: LinkPreviews,
          props: { links: [], onPreview: () => {} } },
      ]
    },
    {
      title: 'Contacts & Devices', icon: Users,
      items: [
        { id: 'contact-mgmt', name: 'Contact Management', desc: 'Add, edit, delete contacts', C: ContactManagement,
          props: { contacts, onCreateContact: () => {}, onUpdateContact: () => {}, onDeleteContact: () => {}, onFavoriteContact: () => {} } },
        { id: 'broadcast', name: 'Broadcast Lists', desc: 'Create broadcast lists', C: BroadcastLists,
          props: { lists: broadcastLists, contacts, onCreateList: (l) => setBroadcastLists([...broadcastLists, l]), onUpdateList: () => {}, onDeleteList: (id) => setBroadcastLists(broadcastLists.filter(x => x.id !== id)), onSendBroadcast: () => {} } },
        { id: 'community-mgr', name: 'Community Manager', desc: 'Create or join communities', C: CommunityManager,
          props: { onCreateCommunity: () => {}, onJoinCommunity: () => {} } },
        { id: 'phone-sync', name: 'Phone Contacts Sync', desc: 'Sync device contacts', C: PhoneContactsSync },
        { id: 'device-link', name: 'Device Linking', desc: 'Link & manage devices', C: DeviceLinking,
          props: { linkedDevices: [], onLinkDevice: () => {}, onUnlinkDevice: () => {} } },
        { id: 'multi-accounts', name: 'Multi-Accounts', desc: 'Switch between accounts', C: MultiAccountsPanel,
          props: { user } },
        { id: 'block-user', name: 'Block User', desc: 'Block a specific user', C: BlockUserModal,
          props: { userId: demoContact._id, username: demoContact.username } },
        { id: 'report-user', name: 'Report User', desc: 'Report a user', C: ReportUser,
          props: { user: demoContact, onReport: () => {} } },
        { id: 'secret-chat', name: 'Secret Chat', desc: 'Start an encrypted chat', C: SecretChat,
          props: { contact: demoContact, onCreateSecretChat: () => {}, onSendMessage: () => {} } },
        { id: 'live-loc', name: 'Live Location', desc: 'Share live location', C: LiveLocationSharing,
          props: { activeShares, onStartSharing: () => {}, onStopSharing: (id) => setActiveShares(activeShares.filter(s => s.id !== id)) } },
        { id: 'loc-picker', name: 'Location Picker', desc: 'Pick & send a location', C: LocationPicker,
          props: { currentUser: user, selectedChat, onLocationSelect: () => {} } },
      ]
    },
    {
      title: 'Content', icon: ImageIcon,
      items: [
        { id: 'gif', name: 'GIF Picker', desc: 'Search & send GIFs', C: GIFPicker, props: { onSelect: () => {} } },
        { id: 'emojis', name: 'Custom Emojis', desc: 'Create custom emoji', C: CustomEmojis,
          props: { emojis: customEmojis, onCreateEmoji: (e) => setCustomEmojis([...customEmojis, e]), onDeleteEmoji: (id) => setCustomEmojis(customEmojis.filter(x => x.id !== id)) } },
        { id: 'events', name: 'Group Events', desc: 'Create & RSVP events', C: EventManager,
          props: { events, onCreateEvent: (e) => setEvents([...events, e]), onUpdateEvent: () => {}, onDeleteEvent: (id) => setEvents(events.filter(x => x.id !== id)), onRSVP: () => {} } },
        { id: 'crop', name: 'Crop & Rotate', desc: 'Edit an image', C: CropRotatePanel,
          props: { image: demoImage, onSave: () => {} } },
        { id: 'popup-notify', name: 'Popup Notification', desc: 'Preview an incoming popup', C: PopupNotification,
          props: { notification: { title: 'New message', body: 'Demo notification preview', sender: demoContact.username }, onAction: () => {}, onDismiss: () => {} } },
      ]
    },
    {
      title: 'QR Code', icon: QrCode,
      items: [
        { id: 'qr-gen', name: 'QR Generator', desc: 'Generate a QR code', C: QRCodeGenerator,
          props: { data: user?._id || 'genz-user', type: 'profile' } },
        { id: 'qr-scan', name: 'QR Scanner', desc: 'Scan a QR code', C: QRCodeScanner,
          props: { onScan: () => {} } },
        { id: 'qr-settings', name: 'QR Settings', desc: 'Configure QR behaviour', C: QRCodeSettings,
          props: { settings: { autoScan: true, sound: true }, onUpdate: () => {} } },
        { id: 'qr-share', name: 'QR Sharing', desc: 'Share your QR code', C: QRCodeSharing,
          props: { qrData: user?._id || 'genz-user', onGenerate: () => {}, onShare: () => {}, onCopy: () => {} } },
      ]
    },
    {
      title: 'Security', icon: Shield,
      items: [
        { id: 'bio-auth', name: 'Biometric Auth', desc: 'Test biometric sign-in', C: BiometricAuth,
          props: { onSuccess: () => {}, onCancel: close } },
        { id: 'bio-lock', name: 'Biometric Lock', desc: 'Lock with biometrics', C: BiometricLock,
          props: { isEnabled: false, onToggle: () => {}, onClose: close } },
        { id: 'fingerprint', name: 'Fingerprint Sim', desc: 'Simulate a fingerprint scan', C: FingerprintSimulation,
          props: { onComplete: () => {} } },
        { id: 'secure-backup', name: 'Secure Backup', desc: 'Backup & restore your data', C: SecureBackup,
          props: { backupStatus, onCreateBackup: () => setBackupStatus({ ...backupStatus, lastBackup: new Date().toISOString() }), onRestoreBackup: () => {}, onVerifyBackup: () => {} } },
      ]
    },
    {
      title: 'Account', icon: UserCircle,
      items: [
        { id: 'about', name: 'About', desc: 'About this account', C: About,
          props: { user, onUpdate: () => {} } },
        { id: 'acct-mgmt', name: 'Account Management', desc: 'Account-wide settings', C: AccountManagementSettings,
          props: { settings: { autoSave: true }, onUpdate: () => {} } },
        { id: 'profile-delete', name: 'Delete Account', desc: 'Permanently delete account', C: ProfileDelete,
          props: { user, onDeleteAccount: () => {} } },
        { id: 'profile-links', name: 'Profile Links', desc: 'Add links to your profile', C: ProfileLinks,
          props: { links: profileLinks, onAddLink: (l) => setProfileLinks([...profileLinks, l]), onEditLink: () => {}, onDeleteLink: (id) => setProfileLinks(profileLinks.filter(x => x.id !== id)) } },
        { id: 'profile-security', name: 'Profile Security', desc: 'Security settings for your profile', C: ProfileSecurity,
          props: { user, securitySettings: profileSecurity, onUpdateSecurity: setProfileSecurity } },
        { id: 'web-login', name: 'Web Login', desc: 'Login on another device via QR', C: WebLogin,
          props: { user, onGenerateQR: () => {}, onVerifyLogin: () => {} } },
      ]
    },
    {
      title: 'Payments & UI', icon: Crown,
      items: [
        { id: 'pay-features', name: 'Payment Features', desc: 'Browse payment features', C: PaymentFeatures },
        { id: 'pay-manager', name: 'Payment Manager', desc: 'Manage payment options', C: PaymentFeaturesManager },
        { id: 'ui-skeleton', name: 'Skeleton Loader', desc: 'Loading placeholder preview', C: SkeletonLoader, preview: true,
          props: { type: 'chat', count: 3 } },
        { id: 'ui-tabs', name: 'Tab System', desc: 'Tabbed navigation preview', C: TabSystem, preview: true,
          props: { tabs, activeTab: tabs[0]?.id, onTabChange: () => {}, onAddTab: () => {}, onDeleteTab: () => {} } },
        { id: 'ui-textmenu', name: 'Text Menu', desc: 'Composer action menu preview', C: TextMenu, preview: true,
          props: { isOpen: true, onClose: close, onEmojiSelect: () => {}, onAttachmentSelect: () => {} } },
        { id: 'ui-toast', name: 'Toast', desc: 'Toast notification preview', C: ToastPreview, preview: true,
          props: {} },
        { id: 'ui-typing', name: 'Typing Dots', desc: 'Typing indicator preview', C: TypingDots, preview: true,
          props: { size: 'md' } },
        { id: 'ui-video', name: 'Video Player', desc: 'Video playback preview', C: VideoPlayer, preview: true,
          props: { videoUrl: demoVideo, autoPlay: false, onDownload: () => {}, onShare: () => {} } },
      ]
    },
  ];

  const categoriesAll = [...categories, ...categories2];

  const renderActive = () => {
    if (!active) return null;
    const item = categoriesAll.flatMap(c => c.items).find(i => i.id === active);
    if (!item) return null;
    const C = item.C;
    // WallpaperSelector is a special case (isOpen prop + own overlay)
    if (item.id === 'wallpaper-selector') {
      return <C isOpen onClose={close} onSelect={item.props.onSelect} currentWallpaper={item.props.currentWallpaper} onRemove={item.props.onRemove} />;
    }
    // Inline/UI-primitive previews get a shared overlay so they don't render raw on the page
    if (item.preview) {
      return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={close}>
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-sm max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{item.name}</h3>
              <button onClick={close} className="p-1 rounded-full hover:bg-dark-hover" aria-label="Close"><X size={18} /></button>
            </div>
            <C {...item.props} onClose={close} />
          </div>
        </div>
      );
    }
    return <C {...item.props} onClose={close} />;
  };

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <div className="sticky top-0 z-30 bg-dark-surface border-b border-dark-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/settings')} className="p-2 rounded-full hover:bg-dark-hover" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-lg leading-tight">Feature Library</h1>
          <p className="text-xs text-dark-textSecondary">All GENZ features, one place</p>
        </div>
        <button onClick={() => navigate('/settings')} className="ml-auto p-2 rounded-full hover:bg-dark-hover" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-8">
        {categoriesAll.map((cat, index) => (
          <section key={cat.title + '-' + index}>

            <div className="flex items-center gap-2 mb-3">
              <cat.icon size={18} className="text-primary-500" />
              <h2 className="font-semibold">{cat.title}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cat.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className="text-left bg-dark-surface border border-dark-border rounded-xl p-4 hover:border-primary-500/50 hover:bg-dark-hover transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.name}</span>
                    <LayoutGrid size={14} className="text-dark-textSecondary" />
                  </div>
                  <p className="text-xs text-dark-textSecondary mt-1">{item.desc}</p>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {renderActive()}
    </div>
  );
};

export default FeatureLibrary;
