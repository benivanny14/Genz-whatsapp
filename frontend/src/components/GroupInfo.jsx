import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import {
  ArrowLeft, Users, Image as ImageIcon, Shield, Trash2, UserPlus,
  Link as LinkIcon, Bell, BellOff, Clock, Search, Check, X, Edit2,
  UserMinus, MessageSquare, ChevronRight, Loader2, QrCode, Ban,
  Crown, UserCheck, UserX, Zap, Calendar, ChevronDown, AlertTriangle,
  Copy, RefreshCw, Settings, Eye, EyeOff, Volume2, VolumeX, Star,
  Info, Grid, Share2, Plus
} from 'lucide-react';
import { formatConversationTime } from '../utils/formatDate';
import ContactPickerModal from './ContactPickerModal';
import MediaGallery from './MediaGallery';
import { mediaAPI } from '../services/api';

// ─── Constants ───────────────────────────────────────────────────────────────
const DISAPPEARING_OPTIONS = [
  { label: 'Off', value: 'Off' },
  { label: '24 hours', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: '90 days', value: '90d' },
];

const SLOW_MODE_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '10 seconds', value: 10 },
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
];

const formatDisappearingLabel = (settings) => {
  if (!settings?.enabled) return 'Off';
  const d = settings.duration;
  if (d === '24h') return 'On • 24 hours';
  if (d === '7d') return 'On • 7 days';
  if (d === '90d') return 'On • 90 days';
  if (typeof d === 'string' && d.endsWith('h')) return `On • ${d.replace('h', ' hours')}`;
  return `On • ${d || '24h'}`;
};

// ─── Sub-components ──────────────────────────────────────────────────────────
const SectionRow = ({ icon: Icon, iconColor = 'text-[#00a884]', label, value, onClick, danger, disabled, badge }) => (
  <button
    type="button"
    className={`w-full flex items-center gap-4 px-5 py-3.5 transition-colors
      ${danger ? 'hover:bg-red-500/10' : 'hover:bg-white/5'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
  >
    {Icon && <Icon size={20} className={danger ? 'text-red-400' : iconColor} />}
    <div className="flex-1 text-left">
      <span className={`text-sm ${danger ? 'text-red-400' : 'text-white'}`}>{label}</span>
    </div>
    {badge && <span className="text-xs bg-[#00a884] text-white px-2 py-0.5 rounded-full font-bold">{badge}</span>}
    {value && <span className="text-[#8696a0] text-xs">{value}</span>}
    {onClick && !value && <ChevronRight size={16} className="text-[#8696a0]" />}
  </button>
);

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-[#00a884]' : 'bg-[#374151]'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : ''}`} />
  </button>
);

const Avatar = ({ src, name, size = 10 }) => {
  const initials = (name || '?').charAt(0).toUpperCase();
  return src ? (
    <img src={src} alt={name} className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`w-${size} h-${size} rounded-full bg-[#2a3942] flex items-center justify-center flex-shrink-0`}>
      <span className="text-white font-semibold text-sm">{initials}</span>
    </div>
  );
};

// ─── Modals ──────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4" onClick={onClose}>
    <div
      className={`bg-[#202c33] rounded-2xl shadow-2xl border border-white/10 overflow-hidden ${wide ? 'w-full max-w-md' : 'w-full max-w-sm'}`}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <h3 className="text-white font-bold text-base">{title}</h3>
        <button onClick={onClose} className="text-[#8696a0] hover:text-white p-1"><X size={18} /></button>
      </div>
      <div className="overflow-y-auto max-h-[70vh]">{children}</div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const GroupInfo = ({ group, onClose, currentUserId }) => {
  const {
    getGroupInfo, updateGroupInfo, removeAdmin, makeAdmin,
    addParticipant, removeParticipant, leaveGroup,
    updateGroupPermission, regenerateGroupInvite,
    toggleMuteChat, updateDisappearingMessages,
    banGroupMember, unbanGroupMember, getGroupBannedMembers,
    transferGroupOwnership,
    getGroupPendingRequests, approveGroupJoinRequest, rejectGroupJoinRequest,
    updateGroupAntiSpam, updateGroupJoinApproval,
    getGroupQRCode,
    fetchGroupEvents, createGroupEventFn, rsvpGroupEventFn,
  } = useChat();

  const [info, setInfo] = useState(group);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // info | members | media | events | settings
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMemberBusy, setAddMemberBusy] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(group?.groupName || '');
  const [editDesc, setEditDesc] = useState(group?.groupDescription || '');
  const [saving, setSaving] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDisappearingPicker, setShowDisappearingPicker] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [bannedMembers, setBannedMembers] = useState([]);
  const [showBanned, setShowBanned] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showPending, setShowPending] = useState(false);
  const [showTransferOwnership, setShowTransferOwnership] = useState(false);
  const [showAntiSpam, setShowAntiSpam] = useState(false);
  const [antiSpam, setAntiSpam] = useState({ enabled: false, maxMessagesPerMinute: 20, slowModeSeconds: 0 });
  const [events, setEvents] = useState([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', startTime: '', endTime: '' });
  const [eventBusy, setEventBusy] = useState(false);
  const photoInputRef = useRef(null);

  // Load group info
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getGroupInfo(group._id);
        if (res?.success && mounted) {
          setInfo(res.data);
          setEditName(res.data.groupName || '');
          setEditDesc(res.data.groupDescription || '');
          setAntiSpam(res.data.antiSpam || { enabled: false, maxMessagesPerMinute: 20, slowModeSeconds: 0 });
        }
      } catch (e) {
        console.error('Fetch group error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (group?._id) load();
    return () => { mounted = false; };
  }, [group?._id]);

  const sameId = (a, b) => String(a?._id || a || '') === String(b?._id || b || '');
  const isAdmin = info?.admins?.some(a => sameId(a, currentUserId));
  const isOwner = sameId(info?.owner || info?.createdBy, currentUserId);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await updateGroupInfo(group._id, { groupName: editName, groupDescription: editDesc });
      if (res?.success) {
        setInfo(prev => ({ ...prev, groupName: editName, groupDescription: editDesc }));
        setEditMode(false);
      }
    } finally { setSaving(false); }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    await removeParticipant(group._id, memberId);
    setInfo(prev => ({ ...prev, participants: prev.participants.filter(p => !sameId(p._id, memberId)) }));
  };

  const handleBanMember = async (memberId, memberName) => {
    const reason = window.prompt(`Ban reason for ${memberName || 'member'} (optional):`) ?? null;
    if (reason === null) return; // cancelled
    const res = await banGroupMember(group._id, memberId, reason);
    if (res?.success) {
      setInfo(prev => ({ ...prev, participants: prev.participants.filter(p => !sameId(p._id, memberId)) }));
    }
  };

  const handleMakeAdmin = async (memberId) => {
    if (!window.confirm('Make this member an admin?')) return;
    await makeAdmin(group._id, memberId);
    setInfo(prev => ({ ...prev, admins: [...(prev.admins || []), memberId] }));
  };

  const handleRemoveAdmin = async (memberId) => {
    if (!window.confirm('Remove admin role?')) return;
    await removeAdmin(group._id, memberId);
    setInfo(prev => ({ ...prev, admins: (prev.admins || []).filter(a => !sameId(a, memberId)) }));
  };

  const handleAddMember = async (contact) => {
    if (!contact?._id) return;
    if (info?.participants?.some(p => sameId(p._id, contact._id))) {
      alert(`${contact.username || contact.name} is already in this group`);
      return;
    }
    setAddMemberBusy(true);
    try {
      const res = await addParticipant(group._id, contact._id);
      if (res?.success === false) { alert(res.message || 'Could not add member'); return; }
      setInfo(prev => ({ ...prev, participants: [...(prev.participants || []), contact] }));
    } catch { alert('Could not add member'); }
    finally { setAddMemberBusy(false); }
  };

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isAdmin) return;
    setUploadingPhoto(true);
    try {
      const res = await mediaAPI.uploadFile(file);
      const fileUrl = res?.data?.fileUrl;
      if (!fileUrl) { alert('Could not upload photo.'); return; }
      const result = await updateGroupInfo(group._id, { groupPhoto: fileUrl });
      if (result?.success) setInfo(prev => ({ ...prev, groupPhoto: fileUrl }));
    } finally { setUploadingPhoto(false); }
  };

  const handlePickDisappearing = async (value) => {
    const enabled = value !== 'Off';
    await updateDisappearingMessages?.(group._id, { enabled, duration: enabled ? value : 'Off', timer: enabled ? parseInt(value) : 0 });
    setInfo(prev => ({ ...prev, disappearingMessages: { enabled, duration: value, timer: parseInt(value) || 0 } }));
    setShowDisappearingPicker(false);
  };

  const handleRegenerateInvite = async () => {
    if (!window.confirm('Reset the invite link? The old link will no longer work.')) return;
    setInviteBusy(true);
    try {
      const res = await regenerateGroupInvite(group._id);
      if (res?.inviteCode) setInfo(prev => ({ ...prev, groupInviteCode: res.inviteCode }));
    } finally { setInviteBusy(false); }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/join/${group._id}/${info?.groupInviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  };

  const handleShowQR = async () => {
    setShowQR(true);
    if (qrData) return;
    setQrLoading(true);
    try {
      const res = await getGroupQRCode(group._id);
      if (res?.success) setQrData(res);
    } finally { setQrLoading(false); }
  };

  const handleLoadBanned = async () => {
    const res = await getGroupBannedMembers(group._id);
    if (res?.success) setBannedMembers(res.bannedMembers || []);
    setShowBanned(true);
  };

  const handleUnban = async (userId) => {
    await unbanGroupMember(group._id, userId);
    setBannedMembers(prev => prev.filter(b => b.user?._id !== userId));
  };

  const handleLoadPending = async () => {
    const res = await getGroupPendingRequests(group._id);
    if (res?.success) setPendingRequests(res.requests || []);
    setShowPending(true);
  };

  const handleApproveRequest = async (userId) => {
    await approveGroupJoinRequest(group._id, userId);
    setPendingRequests(prev => prev.filter(r => r.user?._id !== userId));
    const user = pendingRequests.find(r => r.user?._id === userId)?.user;
    if (user) setInfo(prev => ({ ...prev, participants: [...(prev.participants || []), user] }));
  };

  const handleRejectRequest = async (userId) => {
    await rejectGroupJoinRequest(group._id, userId);
    setPendingRequests(prev => prev.filter(r => r.user?._id !== userId));
  };

  const handleTransferOwnership = async (memberId) => {
    const member = info?.participants?.find(p => sameId(p._id, memberId));
    if (!window.confirm(`Transfer ownership to ${member?.username || 'this member'}? You will no longer be the owner.`)) return;
    const res = await transferGroupOwnership(group._id, memberId);
    if (res?.success) {
      setInfo(prev => ({ ...prev, owner: memberId, createdBy: memberId }));
      setShowTransferOwnership(false);
    }
  };

  const handleSaveAntiSpam = async () => {
    await updateGroupAntiSpam(group._id, antiSpam);
    setShowAntiSpam(false);
  };

  const handleJoinApprovalToggle = async (val) => {
    await updateGroupJoinApproval(group._id, val);
    setInfo(prev => ({ ...prev, requireJoinApproval: val }));
  };

  const handleAdminOnlyToggle = async () => {
    const next = !info?.adminOnlyMessaging;
    await updateGroupPermission(group._id, 'adminOnlyMessaging', next);
    setInfo(prev => ({ ...prev, adminOnlyMessaging: next }));
  };

  // Generic toggle for the other group permission switches — mirrors
  // handleAdminOnlyToggle above but works for any boolean permission field.
  const handlePermissionToggle = async (field) => {
    const next = !info?.[field];
    await updateGroupPermission(group._id, field, next);
    setInfo(prev => ({ ...prev, [field]: next }));
  };

  const handleLoadEvents = async () => {
    const res = await fetchGroupEvents(group._id);
    if (res?.success) setEvents(res.events || []);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) return;
    setEventBusy(true);
    const res = await createGroupEventFn(group._id, newEvent);
    if (res?.success) {
      setEvents(prev => [...prev, res.event]);
      setNewEvent({ title: '', description: '', startTime: '', endTime: '' });
      setShowCreateEvent(false);
    }
    setEventBusy(false);
  };

  const handleRSVP = async (eventId, status) => {
    await rsvpGroupEventFn(group._id, eventId, status);
    setEvents(prev => prev.map(e => {
      if (e._id !== eventId) return e;
      const rsvp = (e.rsvp || []).filter(r => r.user?._id !== currentUserId);
      rsvp.push({ user: { _id: currentUserId }, status });
      return { ...e, rsvp };
    }));
  };

  // ─── Filter members ────────────────────────────────────────────────────────
  const filteredMembers = (info?.participants || []).filter(p => {
    if (!memberSearch) return true;
    const name = (p?.username || p?.phoneNumber || '').toLowerCase();
    return name.includes(memberSearch.toLowerCase());
  });

  // ─── TABS ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'info', label: 'Info', icon: Info },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'media', label: 'Media', icon: Grid },
    { id: 'events', label: 'Events', icon: Calendar },
    ...(isAdmin ? [{ id: 'settings', label: 'Settings', icon: Settings }] : []),
  ];

  useEffect(() => {
    if (activeTab === 'events') {
      handleLoadEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, group?._id]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-0 md:relative md:inset-auto bg-[#0b141a] z-50 flex flex-col overflow-hidden"
      style={{ maxWidth: '400px', marginLeft: 'auto' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#202c33] flex-shrink-0">
        <button onClick={onClose} className="text-[#aebac1] hover:text-white p-1">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-white font-semibold text-base flex-1">Group Info</h2>
        {isAdmin && !editMode && (
          <button onClick={() => setEditMode(true)} className="text-[#aebac1] hover:text-white p-1">
            <Edit2 size={18} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-[#111b21] flex-shrink-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-0 flex flex-col items-center py-3 px-2 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-[#00a884] border-[#00a884]'
                : 'text-[#8696a0] border-transparent hover:text-white'
            }`}
          >
            <tab.icon size={16} className="mb-1" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={28} className="text-[#00a884] animate-spin" />
          </div>
        ) : (
          <>
            {/* ── INFO TAB ───────────────────────────────────────────────── */}
            {activeTab === 'info' && (
              <div>
                {/* Group Photo & Name */}
                <div className="flex flex-col items-center pt-6 pb-4 bg-[#111b21]">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden">
                      {info?.groupPhoto ? (
                        <img src={info.groupPhoto} alt="Group" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#2a3942] flex items-center justify-center">
                          <Users size={40} className="text-[#aebac1]" />
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="absolute bottom-0 right-0 bg-[#00a884] rounded-full p-2 hover:bg-[#06cf9c] transition-colors"
                      >
                        {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                      </button>
                    )}
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelected} />
                  </div>

                  {editMode ? (
                    <div className="w-full px-4 mt-4 space-y-3">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Group name"
                        maxLength={50}
                        className="w-full bg-[#2a3942] text-white px-3 py-2 rounded-lg text-sm outline-none border border-[#00a884] focus:ring-1 focus:ring-[#00a884]"
                      />
                      <textarea
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        placeholder="Group description"
                        maxLength={200}
                        rows={3}
                        className="w-full bg-[#2a3942] text-white px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-[#00a884] resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setEditMode(false)} className="flex-1 py-2 rounded-lg text-sm text-[#8696a0] hover:bg-white/5">Cancel</button>
                        <button
                          onClick={handleSave}
                          disabled={saving || !editName.trim()}
                          className="flex-1 py-2 rounded-lg text-sm bg-[#00a884] text-white hover:bg-[#06cf9c] disabled:opacity-50"
                        >
                          {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center mt-3 px-4">
                      <h3 className="text-white text-lg font-bold">{info?.groupName}</h3>
                      <p className="text-[#8696a0] text-xs mt-1">
                        Group • {info?.participants?.length || 0} members
                      </p>
                      {info?.groupDescription && (
                        <p className="text-[#aebac1] text-sm mt-2 leading-relaxed">{info.groupDescription}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Created info */}
                <div className="px-5 py-3 text-[#8696a0] text-xs">
                  Created {info?.createdAt ? formatConversationTime(info.createdAt) : ''}
                  {info?.createdBy?.username ? ` by ${info.createdBy.username}` : ''}
                </div>

                {/* Invite Link */}
                <div className="bg-[#111b21] mt-2 py-1">
                  <SectionRow icon={LinkIcon} label="Invite link" onClick={handleCopyLink}
                    value={inviteCopied ? '✓ Copied!' : undefined} />
                  <SectionRow icon={QrCode} label="QR code invite" onClick={handleShowQR} />
                  {isAdmin && (
                    <SectionRow icon={RefreshCw} label="Reset invite link"
                      onClick={handleRegenerateInvite} disabled={inviteBusy} />
                  )}
                </div>

                {/* Mute / Notifications */}
                <div className="bg-[#111b21] mt-2 py-1">
                  <SectionRow
                    icon={info?.isMuted ? BellOff : Bell}
                    label={info?.isMuted ? 'Unmute notifications' : 'Mute notifications'}
                    onClick={async () => {
                      await toggleMuteChat?.(group._id, !info?.isMuted);
                      setInfo(prev => ({ ...prev, isMuted: !prev?.isMuted }));
                    }}
                  />
                  <SectionRow
                    icon={Clock}
                    label="Disappearing messages"
                    value={formatDisappearingLabel(info?.disappearingMessages)}
                    onClick={() => setShowDisappearingPicker(true)}
                  />
                </div>

                {/* Owner Badge */}
                {isOwner && (
                  <div className="bg-[#111b21] mt-2 py-1">
                    <div className="px-5 py-3 flex items-center gap-3">
                      <Crown size={20} className="text-yellow-400" />
                      <div>
                        <p className="text-white text-sm font-medium">You are the group owner</p>
                        <p className="text-[#8696a0] text-xs">You can transfer ownership to another admin</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Exit Group */}
                <div className="bg-[#111b21] mt-2 py-1 mb-6">
                  <SectionRow
                    icon={Trash2}
                    label="Exit group"
                    danger
                    onClick={async () => {
                      if (!window.confirm('Exit this group?')) return;
                      const result = await leaveGroup(group._id);
                      if (result?.success === false) { alert(result.message || 'Could not exit group'); return; }
                      onClose?.();
                    }}
                  />
                </div>
              </div>
            )}

            {/* ── MEMBERS TAB ────────────────────────────────────────────── */}
            {activeTab === 'members' && (
              <div>
                {/* Search members */}
                <div className="px-4 py-3 bg-[#111b21] sticky top-0 z-10">
                  <div className="flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-2">
                    <Search size={16} className="text-[#8696a0]" />
                    <input
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder="Search members..."
                      className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-[#8696a0]"
                    />
                  </div>
                </div>

                {/* Add member */}
                {isAdmin && (
                  <button
                    onClick={() => setShowAddMembers(true)}
                    disabled={addMemberBusy}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center">
                      <UserPlus size={18} className="text-[#00a884]" />
                    </div>
                    <span className="text-[#00a884] text-sm font-medium">Add member</span>
                  </button>
                )}

                {/* Member count */}
                <p className="text-[#8696a0] text-xs px-5 py-2">
                  {filteredMembers.length} of {info?.participants?.length || 0} members
                </p>

                {/* Member list */}
                {filteredMembers.map((member) => {
                  const memberId = String(member?._id || '');
                  const isSelf = memberId === String(currentUserId);
                  const isMemberAdmin = (info?.admins || []).some(a => sameId(a, memberId));
                  const isGroupOwner = sameId(info?.owner || info?.createdBy, memberId);

                  return (
                    <div key={memberId} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5">
                      <Avatar src={member?.profilePicture} name={member?.username} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm font-medium truncate">
                            {isSelf ? 'You' : (member?.username || member?.phoneNumber || 'Unknown')}
                          </p>
                          {isGroupOwner && <Crown size={12} className="text-yellow-400 flex-shrink-0" />}
                          {isMemberAdmin && !isGroupOwner && <Shield size={12} className="text-[#00a884] flex-shrink-0" />}
                        </div>
                        <p className="text-[#8696a0] text-xs truncate">
                          {isMemberAdmin ? (isGroupOwner ? 'Owner' : 'Admin') : 'Member'}
                          {member?.about ? ` • ${member.about}` : ''}
                        </p>
                      </div>
                      {!isSelf && isAdmin && (
                        <div className="flex items-center gap-1">
                          {!isMemberAdmin ? (
                            <button onClick={() => handleMakeAdmin(memberId)} className="p-1.5 text-[#00a884] hover:bg-[#00a884]/20 rounded" title="Make Admin">
                              <Shield size={15} />
                            </button>
                          ) : (
                            <button onClick={() => handleRemoveAdmin(memberId)} className="p-1.5 text-yellow-400 hover:bg-yellow-400/20 rounded" title="Remove Admin">
                              <Shield size={15} />
                            </button>
                          )}
                          <button onClick={() => handleRemoveMember(memberId)} className="p-1.5 text-orange-400 hover:bg-orange-400/20 rounded" title="Remove">
                            <UserMinus size={15} />
                          </button>
                          <button onClick={() => handleBanMember(memberId, member?.username)} className="p-1.5 text-red-400 hover:bg-red-400/20 rounded" title="Ban">
                            <Ban size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Admin actions on members */}
                {isAdmin && (
                  <div className="bg-[#111b21] mt-4 py-1">
                    <SectionRow icon={Ban} label="Banned members" onClick={handleLoadBanned}
                      badge={bannedMembers.length > 0 ? String(bannedMembers.length) : undefined} />
                    {info?.pendingJoinRequests?.length > 0 && (
                      <SectionRow icon={UserCheck} label="Pending join requests" onClick={handleLoadPending}
                        badge={String(info.pendingJoinRequests.length)} />
                    )}
                    {isOwner && (
                      <SectionRow icon={Crown} label="Transfer ownership" onClick={() => setShowTransferOwnership(true)} />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── MEDIA TAB ──────────────────────────────────────────────── */}
            {activeTab === 'media' && (
              <div className="p-4">
                <button
                  onClick={() => setShowMediaGallery(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#2a3942] rounded-xl text-[#00a884] hover:bg-[#2a3942]/80 transition-colors"
                >
                  <Grid size={18} />
                  <span className="text-sm font-medium">Open media gallery</span>
                </button>
              </div>
            )}

            {/* ── EVENTS TAB ─────────────────────────────────────────────── */}
            {activeTab === 'events' && (
              <div>
                {isAdmin && (
                  <button
                    onClick={() => setShowCreateEvent(true)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center">
                      <Plus size={18} className="text-[#00a884]" />
                    </div>
                    <span className="text-[#00a884] text-sm font-medium">Create event</span>
                  </button>
                )}

                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-[#8696a0]">
                    <Calendar size={40} className="mb-3 opacity-40" />
                    <p className="text-sm">No events yet</p>
                  </div>
                ) : (
                  events.map(ev => {
                    const myRsvp = (ev.rsvp || []).find(r => sameId(r.user, currentUserId));
                    return (
                      <div key={ev._id} className="mx-4 my-2 bg-[#202c33] rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-white font-semibold text-sm">{ev.title}</h4>
                            {ev.description && <p className="text-[#8696a0] text-xs mt-0.5">{ev.description}</p>}
                          </div>
                          <Calendar size={16} className="text-[#00a884] flex-shrink-0 mt-0.5" />
                        </div>
                        {ev.startTime && (
                          <p className="text-[#8696a0] text-xs mb-3">
                            📅 {new Date(ev.startTime).toLocaleString()}
                            {ev.endTime && ` → ${new Date(ev.endTime).toLocaleString()}`}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {['going', 'maybe', 'notgoing'].map(s => (
                            <button
                              key={s}
                              onClick={() => handleRSVP(ev._id, s)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                myRsvp?.status === s
                                  ? s === 'going' ? 'bg-[#00a884] text-white'
                                    : s === 'maybe' ? 'bg-yellow-500 text-white'
                                    : 'bg-red-500 text-white'
                                  : 'bg-[#2a3942] text-[#8696a0] hover:bg-white/10'
                              }`}
                            >
                              {s === 'going' ? '✓ Going' : s === 'maybe' ? '? Maybe' : '✗ No'}
                            </button>
                          ))}
                        </div>
                        <p className="text-[#8696a0] text-xs mt-2">
                          {(ev.rsvp || []).filter(r => r.status === 'going').length} going •{' '}
                          {(ev.rsvp || []).filter(r => r.status === 'maybe').length} maybe
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── SETTINGS TAB (admin only) ───────────────────────────────── */}
            {activeTab === 'settings' && isAdmin && (
              <div>
                <p className="text-[#8696a0] text-xs px-5 pt-4 pb-2 uppercase tracking-wide">Permissions</p>
                <div className="bg-[#111b21] py-1">
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <MessageSquare size={20} className="text-[#00a884]" />
                      <div>
                        <p className="text-white text-sm">Admin-only messaging</p>
                        <p className="text-[#8696a0] text-xs">Only admins can send messages</p>
                      </div>
                    </div>
                    <Toggle checked={!!info?.adminOnlyMessaging} onChange={handleAdminOnlyToggle} />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <UserPlus size={20} className="text-[#00a884]" />
                      <div>
                        <p className="text-white text-sm">Add members</p>
                        <p className="text-[#8696a0] text-xs">Let all participants add new members, not just admins</p>
                      </div>
                    </div>
                    <Toggle checked={!!info?.canAddMembers} onChange={() => handlePermissionToggle('canAddMembers')} />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <ImageIcon size={20} className="text-[#00a884]" />
                      <div>
                        <p className="text-white text-sm">Send media</p>
                        <p className="text-[#8696a0] text-xs">Allow all participants to send photos, videos & files</p>
                      </div>
                    </div>
                    <Toggle checked={info?.canSendMedia !== false} onChange={() => handlePermissionToggle('canSendMedia')} />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Grid size={20} className="text-[#00a884]" />
                      <div>
                        <p className="text-white text-sm">Create polls</p>
                        <p className="text-[#8696a0] text-xs">Allow all participants to create polls</p>
                      </div>
                    </div>
                    <Toggle checked={info?.canCreatePolls !== false} onChange={() => handlePermissionToggle('canCreatePolls')} />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Edit2 size={20} className="text-[#00a884]" />
                      <div>
                        <p className="text-white text-sm">Edit group info</p>
                        <p className="text-[#8696a0] text-xs">Allow all participants to edit group name, icon & description</p>
                      </div>
                    </div>
                    <Toggle checked={info?.canChangeGroupInfo !== false} onChange={() => handlePermissionToggle('canChangeGroupInfo')} />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <UserCheck size={20} className="text-[#00a884]" />
                      <div>
                        <p className="text-white text-sm">Require join approval</p>
                        <p className="text-[#8696a0] text-xs">New members need admin approval</p>
                      </div>
                    </div>
                    <Toggle checked={!!info?.requireJoinApproval} onChange={handleJoinApprovalToggle} />
                  </div>
                </div>

                <p className="text-[#8696a0] text-xs px-5 pt-4 pb-2 uppercase tracking-wide">Anti-Spam</p>
                <div className="bg-[#111b21] py-1">
                  <SectionRow icon={Zap} label="Anti-spam settings" onClick={() => setShowAntiSpam(true)} />
                </div>

                <p className="text-[#8696a0] text-xs px-5 pt-4 pb-2 uppercase tracking-wide">Advanced</p>
                <div className="bg-[#111b21] py-1">
                  <SectionRow icon={Ban} label="Banned members" onClick={handleLoadBanned} />
                  {info?.pendingJoinRequests?.length > 0 && (
                    <SectionRow icon={UserCheck} label="Pending requests"
                      badge={String(info.pendingJoinRequests.length)} onClick={handleLoadPending} />
                  )}
                  {isOwner && (
                    <SectionRow icon={Crown} label="Transfer ownership" onClick={() => setShowTransferOwnership(true)} />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}

      {/* Disappearing messages */}
      {showDisappearingPicker && (
        <Modal title="Disappearing messages" onClose={() => setShowDisappearingPicker(false)}>
          <p className="text-[#8696a0] text-xs px-5 py-3">New messages will disappear after the selected time.</p>
          {DISAPPEARING_OPTIONS.map(opt => {
            const current = info?.disappearingMessages?.enabled ? (info.disappearingMessages.duration || '24h') : 'Off';
            return (
              <button key={opt.value} onClick={() => handlePickDisappearing(opt.value)}
                className={`w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 ${current === opt.value ? 'text-[#00a884]' : 'text-white'}`}>
                <span className="text-sm">{opt.label}</span>
                {current === opt.value && <Check size={16} />}
              </button>
            );
          })}
        </Modal>
      )}

      {/* QR Code */}
      {showQR && (
        <Modal title="QR Code Invite" onClose={() => setShowQR(false)}>
          <div className="flex flex-col items-center p-6 gap-4">
            {qrLoading ? (
              <Loader2 size={40} className="text-[#00a884] animate-spin" />
            ) : qrData?.qrCode ? (
              <>
                <img src={qrData.qrCode} alt="QR Code" className="w-48 h-48 rounded-xl" />
                <p className="text-[#8696a0] text-xs text-center">Scan to join {info?.groupName}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(qrData.inviteUrl); }}
                  className="flex items-center gap-2 text-[#00a884] text-sm hover:underline"
                >
                  <Copy size={14} /> Copy link
                </button>
              </>
            ) : (
              <p className="text-[#8696a0] text-sm">Could not generate QR code</p>
            )}
          </div>
        </Modal>
      )}

      {/* Banned members */}
      {showBanned && (
        <Modal title="Banned Members" onClose={() => setShowBanned(false)} wide>
          {bannedMembers.length === 0 ? (
            <p className="text-[#8696a0] text-sm text-center py-8">No banned members</p>
          ) : bannedMembers.map(b => (
            <div key={b.user?._id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5">
              <Avatar src={b.user?.profilePicture} name={b.user?.username} />
              <div className="flex-1">
                <p className="text-white text-sm">{b.user?.username || 'Unknown'}</p>
                <p className="text-[#8696a0] text-xs">{b.reason || 'No reason'}</p>
              </div>
              <button onClick={() => handleUnban(b.user?._id)} className="text-[#00a884] text-xs hover:underline">Unban</button>
            </div>
          ))}
        </Modal>
      )}

      {/* Pending join requests */}
      {showPending && (
        <Modal title="Join Requests" onClose={() => setShowPending(false)} wide>
          {pendingRequests.length === 0 ? (
            <p className="text-[#8696a0] text-sm text-center py-8">No pending requests</p>
          ) : pendingRequests.map(r => (
            <div key={r.user?._id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5">
              <Avatar src={r.user?.profilePicture} name={r.user?.username} />
              <div className="flex-1">
                <p className="text-white text-sm">{r.user?.username || 'Unknown'}</p>
                <p className="text-[#8696a0] text-xs">{new Date(r.requestedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleApproveRequest(r.user?._id)} className="bg-[#00a884] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#06cf9c]">
                  Approve
                </button>
                <button onClick={() => handleRejectRequest(r.user?._id)} className="bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg hover:bg-red-500/30">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </Modal>
      )}

      {/* Transfer ownership */}
      {showTransferOwnership && (
        <Modal title="Transfer Ownership" onClose={() => setShowTransferOwnership(false)} wide>
          <p className="text-[#8696a0] text-xs px-5 py-3">Select a member to become the new owner:</p>
          {(info?.participants || [])
            .filter(p => !sameId(p._id, currentUserId))
            .map(p => (
              <button key={p._id} onClick={() => handleTransferOwnership(p._id)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5">
                <Avatar src={p?.profilePicture} name={p?.username} />
                <div className="flex-1 text-left">
                  <p className="text-white text-sm">{p?.username || 'Unknown'}</p>
                  {(info?.admins || []).some(a => sameId(a, p._id)) && (
                    <p className="text-[#00a884] text-xs">Admin</p>
                  )}
                </div>
                <Crown size={16} className="text-yellow-400" />
              </button>
            ))}
        </Modal>
      )}

      {/* Anti-spam settings */}
      {showAntiSpam && (
        <Modal title="Anti-Spam Settings" onClose={() => setShowAntiSpam(false)}>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Enable anti-spam</p>
                <p className="text-[#8696a0] text-xs">Automatically limit message flood</p>
              </div>
              <Toggle checked={!!antiSpam.enabled} onChange={v => setAntiSpam(prev => ({ ...prev, enabled: v }))} />
            </div>
            {antiSpam.enabled && (
              <>
                <div>
                  <label className="text-[#8696a0] text-xs block mb-1">Max messages per minute</label>
                  <input
                    type="number" min={1} max={100}
                    value={antiSpam.maxMessagesPerMinute}
                    onChange={e => setAntiSpam(prev => ({ ...prev, maxMessagesPerMinute: Number(e.target.value) }))}
                    className="w-full bg-[#2a3942] text-white px-3 py-2 rounded-lg text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#8696a0] text-xs block mb-1">Slow mode</label>
                  <select
                    value={antiSpam.slowModeSeconds}
                    onChange={e => setAntiSpam(prev => ({ ...prev, slowModeSeconds: Number(e.target.value) }))}
                    className="w-full bg-[#2a3942] text-white px-3 py-2 rounded-lg text-sm outline-none"
                  >
                    {SLOW_MODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </>
            )}
            <button
              onClick={handleSaveAntiSpam}
              className="w-full py-2.5 bg-[#00a884] text-white rounded-lg text-sm font-medium hover:bg-[#06cf9c]"
            >
              Save Settings
            </button>
          </div>
        </Modal>
      )}

      {/* Create event */}
      {showCreateEvent && (
        <Modal title="Create Event" onClose={() => setShowCreateEvent(false)}>
          <div className="p-5 space-y-3">
            <input
              value={newEvent.title}
              onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Event title *"
              className="w-full bg-[#2a3942] text-white px-3 py-2 rounded-lg text-sm outline-none"
            />
            <textarea
              value={newEvent.description}
              onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description (optional)"
              rows={2}
              className="w-full bg-[#2a3942] text-white px-3 py-2 rounded-lg text-sm outline-none resize-none"
            />
            <div>
              <label className="text-[#8696a0] text-xs block mb-1">Start time</label>
              <input
                type="datetime-local"
                value={newEvent.startTime}
                onChange={e => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full bg-[#2a3942] text-white px-3 py-2 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-[#8696a0] text-xs block mb-1">End time</label>
              <input
                type="datetime-local"
                value={newEvent.endTime}
                onChange={e => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full bg-[#2a3942] text-white px-3 py-2 rounded-lg text-sm outline-none"
              />
            </div>
            <button
              onClick={handleCreateEvent}
              disabled={eventBusy || !newEvent.title.trim()}
              className="w-full py-2.5 bg-[#00a884] text-white rounded-lg text-sm font-medium hover:bg-[#06cf9c] disabled:opacity-50"
            >
              {eventBusy ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Create Event'}
            </button>
          </div>
        </Modal>
      )}

      {/* Add members */}
      {showAddMembers && (
        <ContactPickerModal
          title="Add to group"
          onClose={() => setShowAddMembers(false)}
          onSelect={handleAddMember}
        />
      )}

      {/* Media gallery */}
      {showMediaGallery && (
        <MediaGallery conversationId={group._id} onClose={() => setShowMediaGallery(false)} />
      )}
    </motion.div>
  );
};

export default GroupInfo;
