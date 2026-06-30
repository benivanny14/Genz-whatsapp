import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Search,
  Image as ImageIcon,
  Bell,
  BellOff,
  Lock,
  Unlock,
  Shield,
  ShieldAlert,
  Clock,
  Trash2,
  Download,
  UserMinus,
  UserCheck,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Phone,
  Info,
  Eye,
  Share2,
  Flag,
  MessageSquare,
} from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { useChat } from '../context/ChatContext';

const API_URL = import.meta.env.VITE_API_URL || '';

/* ───────── helpers ───────── */

const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return '';
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'last seen just now';
  if (diffMins < 60) return `last seen ${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return `last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) {
    const day = date.toLocaleDateString([], { weekday: 'long' });
    return `last seen ${day} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `last seen ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const disappearingOptions = [
  { label: 'Off', value: 'Off' },
  { label: '24 hours', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: '90 days', value: '90d' },
];

/* ───────── Fullscreen Image Viewer ───────── */

const FullscreenImageViewer = ({ src, alt, onClose }) => {
  const [scale, setScale] = useState(1);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.5, 5));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.5, 1));

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setScale((s) => {
      const next = s + (e.deltaY < 0 ? 0.25 : -0.25);
      return Math.min(Math.max(next, 1), 5);
    });
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-white/70 text-sm truncate max-w-[60%]">{alt}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ZoomOut size={20} className="text-white" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ZoomIn size={20} className="text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={22} className="text-white" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex items-center justify-center overflow-auto w-full h-full"
        onWheel={handleWheel}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
          style={{ transform: `scale(${scale})` }}
          draggable={false}
          onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 2.5))}
        />
      </div>
    </motion.div>
  );
};

/* ───────── Encryption Verification Modal ───────── */

const EncryptionModal = ({ contactName, onClose }) => {
  const securityCode = Array.from({ length: 12 }, () =>
    String(Math.floor(Math.random() * 100000)).padStart(5, '0')
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[180] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#202c33] w-full max-w-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-[#00a884] flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Verify Security Code</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {/* Simulated QR Code */}
          <div className="w-40 h-40 bg-white rounded-lg p-2 flex items-center justify-center">
            <div className="w-full h-full grid grid-cols-8 grid-rows-8 gap-[1px]">
              {Array.from({ length: 64 }, (_, i) => (
                <div
                  key={i}
                  className={`rounded-[1px] ${Math.random() > 0.45 ? 'bg-black' : 'bg-white'}`}
                />
              ))}
            </div>
          </div>

          <p className="text-white/60 text-xs text-center leading-relaxed">
            To verify that messages you send to {contactName} are end-to-end encrypted,
            compare the number above with the number on their phone.
          </p>

          {/* Security code */}
          <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-center">
            {securityCode.map((code, i) => (
              <span key={i} className="text-white font-mono text-sm tracking-wider">
                {code}
              </span>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full bg-[#00a884] hover:bg-[#00a884]/80 text-white font-bold py-3 rounded-xl transition-colors mt-2"
          >
            OK
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ───────── Disappearing Messages Picker ───────── */

const DisappearingPicker = ({ current, onSelect, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[180] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-[#202c33] w-full max-w-xs rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 border-b border-white/10">
        <h3 className="text-white font-bold text-base">Disappearing messages</h3>
        <p className="text-white/50 text-xs mt-1">
          Make new messages disappear after a set time.
        </p>
      </div>
      <div className="py-2">
        {disappearingOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { onSelect(opt.value); onClose(); }}
            className={`w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors ${current === opt.value ? 'text-[#00a884]' : 'text-white'
              }`}
          >
            <span className="text-sm">{opt.label}</span>
            {current === opt.value && (
              <div className="w-5 h-5 rounded-full border-2 border-[#00a884] flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00a884]" />
              </div>
            )}
            {current !== opt.value && (
              <div className="w-5 h-5 rounded-full border-2 border-white/30" />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

/* ───────── New Modals ───────── */

const ReportModal = ({ contactName, onClose, onReport }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[180] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#202c33] w-full max-w-sm rounded-xl shadow-2xl border border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-white font-medium text-lg mb-4">Report {contactName}?</h3>
          <p className="text-white/70 text-sm mb-6">
            The last 5 messages from this contact will be forwarded to GENZ. This contact will not be notified.
          </p>
          <div className="flex items-center gap-3 mb-6">
            <input type="checkbox" id="block-report" className="w-4 h-4 accent-[#00a884] bg-white/10 border-white/20 rounded" defaultChecked />
            <label htmlFor="block-report" className="text-white/90 text-sm">Block contact and clear chat</label>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-[#00a884] font-medium hover:bg-white/5 rounded-lg transition-colors text-sm">Cancel</button>
            <button onClick={() => { onReport(); onClose(); }} className="px-4 py-2 bg-[#00a884] hover:bg-[#029676] text-white font-medium rounded-lg transition-colors text-sm">Report</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const WallpaperModal = ({ onClose, onSelect }) => {
  const colors = ['#111b21', '#ece5dd', '#dcf8c6', '#34b7f1', '#ffcda2', '#ff8a8c', '#a1887f'];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[180] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#202c33] w-full max-w-sm rounded-xl shadow-2xl border border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-white font-medium text-lg">Chat Wallpaper</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full text-white"><X size={20} /></button>
        </div>
        <div className="p-6">
          <p className="text-white/70 text-sm mb-4">Choose a solid color wallpaper:</p>
          <div className="grid grid-cols-4 gap-3">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => { onSelect(color); onClose(); }}
                className="w-full aspect-square rounded-lg shadow-inner hover:scale-105 transition-transform border border-white/10"
                style={{ backgroundColor: color }}
              />
            ))}
            <button
              onClick={() => { onSelect('default'); onClose(); }}
              className="w-full aspect-square rounded-lg shadow-inner hover:scale-105 transition-transform bg-[#111b21] flex flex-col items-center justify-center border border-white/20 text-white/50 text-[10px]"
            >
              Default
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CustomNotifModal = ({ onClose, currentTone, onSelect }) => {
  const tones = ['Default (Tring)', 'Droplet', 'Chime', 'Echo', 'Silent'];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[180] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#202c33] w-full max-w-sm rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-white font-medium text-lg">Message Tone</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full text-white"><X size={20} /></button>
        </div>
        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {tones.map(tone => (
            <button
              key={tone}
              onClick={() => { onSelect(tone); onClose(); }}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between hover:bg-white/5 transition-colors ${currentTone === tone || (currentTone === 'default' && tone.startsWith('Default')) ? 'text-[#00a884]' : 'text-white'}`}
            >
              <span className="text-sm font-medium">{tone}</span>
              {(currentTone === tone || (currentTone === 'default' && tone.startsWith('Default'))) && <div className="w-2 h-2 rounded-full bg-[#00a884]" />}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════
   ContactInfo – main component
   ═══════════════════════════════════════════════════ */

const ContactInfo = ({
  contact,
  conversation,
  onClose,
  onSearchMessages,
  onMediaGallery,
  onMuteChat,
  onBlockUser,
  onUnblockUser,
  onClearChat,
  onDeleteChat,
  onExportChat,
  onToggleDisappearing,
  onToggleChatLock,
  onWallpaperChange,
  isMuted,
  isBlocked,
  isLocked,
  currentUserId,
  disappearingDuration = 'Off',
}) => {
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);
  const [showDisappearingPicker, setShowDisappearingPicker] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showCustomNotifModal, setShowCustomNotifModal] = useState(false);

  const [mediaPreview, setMediaPreview] = useState([]);
  const [mediaCount, setMediaCount] = useState(0);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const isStatusConversation = conversation?._id?.startsWith('conv-status-') || conversation?.isStatusReply;

  const { messages, contacts } = useChat();

  /* Fetch media preview */
  useEffect(() => {
    if (!conversation?._id) return;

    // Filter messages directly from memory
    const convId = conversation._id;
    const convMessages = (messages || []).filter(m =>
      String(m.conversationId || m.conversation) === String(convId) || !m.conversationId
    );

    const mediaItems = [];
    for (const msg of convMessages) {
      const type = msg.messageType || 'text';
      const url = msg.mediaUrl || msg.content || msg.url || '';

      const isLink = type === 'link' || (type === 'text' && /https?:\/\/[^\s]+/.test(url));

      if (['image', 'video', 'gif', 'document', 'file', 'audio', 'voice'].includes(type) && url) {
        mediaItems.push({ ...msg, _displayUrl: url });
      } else if (isLink) {
        mediaItems.push({ ...msg, _displayUrl: url });
      }
    }

    setMediaPreview(mediaItems.slice(0, 4));
    setMediaCount(mediaItems.length);
  }, [conversation?._id, messages]);

  /* Derived values */
  const savedContact = (contacts || []).find(c => c.user && (c.user._id === contact?._id || c.user === contact?._id));
  const savedName = savedContact?.savedName;
  const systemName = contact?.username || 'Unknown';
  const displayName = savedName || systemName;
  const profilePicture = contact?.profilePicture || '';
  const phoneNumber = contact?.phoneNumber || contact?.email || '';
  const aboutText = contact?.about || 'Hey there! I am using GENZ.';
  const isOnline = contact?.isOnline;

  /* ── Section row helper ── */
  const SectionRow = ({ icon: Icon, iconColor, label, value, onClick, rightElement, className = '' }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors text-left ${className}`}
    >
      {Icon && <Icon size={20} className={iconColor || 'text-white/50'} />}
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm">{label}</span>
        {value && <p className="text-white/50 text-xs mt-0.5 truncate">{value}</p>}
      </div>
      {rightElement || <ChevronRight size={18} className="text-white/30 flex-shrink-0" />}
    </button>
  );

  /* ── Divider ── */
  const Divider = () => <div className="h-2 bg-[#111b21]" />;

  return (
    <>
      {/* ── Slide-in Panel ── */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
        className="absolute inset-y-0 right-0 z-[100] w-full sm:w-[400px] bg-[#111b21] flex flex-col border-l border-white/10 shadow-2xl"
      >
        {/* ─── 1. Header ─── */}
        <div className="flex items-center gap-4 px-4 py-3 bg-[#202c33] flex-shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={22} className="text-white" />
          </button>
          <h2 className="text-white font-semibold text-base">Contact info</h2>
        </div>

        {/* ─── Scrollable body ─── */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">

          {/* ─── 2. Profile Section ─── */}
          <div className="bg-[#202c33] pt-7 pb-5 flex flex-col items-center gap-1">
            {/* Avatar */}
            <button
              onClick={() => profilePicture && setShowImageViewer(true)}
              className="relative group mb-2"
            >
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={displayName}
                  className="w-[120px] h-[120px] rounded-full object-cover border-2 border-white/10 group-hover:brightness-90 transition-all"
                />
              ) : (
                <div className="w-[120px] h-[120px] rounded-full bg-[#6b7b8d] flex items-center justify-center text-white text-4xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {profilePicture && (
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                  <Eye size={24} className="text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                </div>
              )}
            </button>

            {/* Name */}
            <h3 className="text-white text-xl font-semibold">{displayName}</h3>
            {savedName && systemName !== savedName && (
              <p className="text-white/50 text-sm">~ {systemName}</p>
            )}

            {/* Phone */}
            {phoneNumber && (
              <p className="text-white/60 text-sm mt-1">{phoneNumber}</p>
            )}

            {/* Online status */}
            <div className="flex items-center gap-1.5 mt-1">
              {isOnline ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00a884] inline-block" />
                  <span className="text-[#00a884] text-xs font-medium">Online</span>
                </>
              ) : (
                <span className="text-white/40 text-xs">
                  {formatLastSeen(contact?.lastSeen)}
                </span>
              )}
            </div>
          </div>

          <Divider />

          {/* ─── 3. About ─── */}
          <div className="bg-[#202c33] px-5 py-4">
            <p className="text-white/50 text-xs mb-1">About</p>
            <p className="text-white text-sm leading-relaxed">{aboutText}</p>
          </div>

          <Divider />

          {/* ─── 4. Encryption ─── */}
          <div className="bg-[#202c33]">
            <SectionRow
              icon={Shield}
              iconColor="text-[#00a884]"
              label="Encryption"
              value="Messages and calls are end-to-end encrypted. Tap to verify."
              onClick={() => setShowEncryptionModal(true)}
            />
          </div>

          <Divider />

          {/* ─── 5. Media, Links, and Docs ─── */}
          <div className="bg-[#202c33]">
            <button
              onClick={onMediaGallery}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
            >
              <span className="text-white text-sm">Media, links, and docs</span>
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-sm">{mediaCount}</span>
                <ChevronRight size={18} className="text-white/30" />
              </div>
            </button>

            {/* Thumbnails row */}
            {mediaPreview.length > 0 && (
              <div className="px-5 pb-4 flex gap-2">
                {mediaPreview.map((item, i) => (
                  <button
                    key={item._id || i}
                    onClick={onMediaGallery}
                    className="w-[76px] h-[76px] rounded-lg overflow-hidden bg-white/5 flex-shrink-0 hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={item._displayUrl || item.mediaUrl || item.url || ''}
                      alt="media"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </button>
                ))}
              </div>
            )}

            {loadingMedia && (
              <div className="px-5 pb-4 flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-[76px] h-[76px] rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
                ))}
              </div>
            )}
          </div>

          <Divider />

          {/* ─── 6. Notifications ─── */}
          <div className="bg-[#202c33]">
            <SectionRow
              icon={isMuted ? BellOff : Bell}
              iconColor="text-white/50"
              label="Mute notifications"
              onClick={() => onMuteChat?.(conversation?._id)}
              rightElement={
                <div
                  className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${isMuted ? 'bg-[#00a884]' : 'bg-white/20'
                    }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isMuted ? 'translate-x-4' : 'translate-x-0'
                      }`}
                  />
                </div>
              }
            />
            <SectionRow
              icon={Bell}
              iconColor="text-white/50"
              label="Custom notifications"
              onClick={() => setShowCustomNotifModal(true)}
            />
          </div>

          <Divider />

          {/* ─── 7. Disappearing Messages ─── */}
          <div className="bg-[#202c33]">
            <SectionRow
              icon={Clock}
              iconColor="text-white/50"
              label="Disappearing messages"
              value={
                disappearingDuration === 'Off'
                  ? 'Off'
                  : disappearingDuration === '24h'
                    ? '24 hours'
                    : disappearingDuration === '7d'
                      ? '7 days'
                      : disappearingDuration === '90d'
                        ? '90 days'
                        : disappearingDuration
              }
              onClick={() => setShowDisappearingPicker(true)}
            />
          </div>

          <Divider />

          {/* ─── 8. Chat Lock ─── */}
          <div className="bg-[#202c33]">
            <SectionRow
              icon={isLocked ? Lock : Unlock}
              iconColor="text-white/50"
              label="Chat lock"
              value={isLocked ? 'On' : 'Off'}
              onClick={() => onToggleChatLock?.(conversation?._id)}
              rightElement={
                <div
                  className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${isLocked ? 'bg-[#00a884]' : 'bg-white/20'
                    }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isLocked ? 'translate-x-4' : 'translate-x-0'
                      }`}
                  />
                </div>
              }
            />
          </div>

          <Divider />

          {/* ─── 9. Chat Wallpaper ─── */}
          <div className="bg-[#202c33]">
            <SectionRow
              icon={ImageIcon}
              iconColor="text-white/50"
              label="Wallpaper"
              value="Default"
              onClick={() => setShowWallpaperModal(true)}
            />
          </div>

          <Divider />

          {/* ─── 10. Action Buttons ─── */}
          <div className="bg-[#202c33]">
            {/* Block / Unblock & Report (Hidden for status replies) */}
            {!isStatusConversation && (
              <>
                <button
                  onClick={() => isBlocked ? onUnblockUser?.(contact?._id) : onBlockUser?.(contact?._id)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors"
                >
                  {isBlocked ? (
                    <UserCheck size={20} className="text-red-400" />
                  ) : (
                    <UserMinus size={20} className="text-red-400" />
                  )}
                  <span className="text-red-400 text-sm">
                    {isBlocked ? `Unblock ${displayName}` : `Block ${displayName}`}
                  </span>
                </button>

                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors"
                >
                  <Flag size={20} className="text-red-400" />
                  <span className="text-red-400 text-sm">Report {displayName}</span>
                </button>
              </>
            )}

            {/* Clear chat */}
            <button
              onClick={onClearChat}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors"
            >
              <MessageSquare size={20} className="text-white/50" />
              <span className="text-white text-sm">Clear chat</span>
            </button>

            {/* Export chat */}
            <button
              onClick={onExportChat}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors"
            >
              <Share2 size={20} className="text-white/50" />
              <span className="text-white text-sm">Export chat</span>
            </button>

            {/* Delete chat */}
            <button
              onClick={onDeleteChat}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors"
            >
              <Trash2 size={20} className="text-red-400" />
              <span className="text-red-400 text-sm">Delete chat</span>
            </button>
          </div>

          {/* Bottom spacer */}
          <div className="h-6 bg-[#111b21]" />
        </div>
      </motion.div>

      {/* ── Modals (rendered outside the panel for correct stacking) ── */}
      <AnimatePresence>
        {showImageViewer && profilePicture && (
          <FullscreenImageViewer
            key="image-viewer"
            src={profilePicture}
            alt={displayName}
            onClose={() => setShowImageViewer(false)}
          />
        )}

        {showEncryptionModal && (
          <EncryptionModal
            key="encryption-modal"
            contactName={displayName}
            onClose={() => setShowEncryptionModal(false)}
          />
        )}

        {showReportModal && (
          <ReportModal
            key="report-modal"
            contactName={displayName}
            onClose={() => setShowReportModal(false)}
            onReport={() => {
              // Simulate report
              setTimeout(() => {
                toast.success('Report submitted successfully');
              }, 500);
            }}
          />
        )}

        {showWallpaperModal && (
          <WallpaperModal
            key="wallpaper-modal"
            onClose={() => setShowWallpaperModal(false)}
            onSelect={(color) => {
              if (onWallpaperChange) {
                onWallpaperChange(conversation?._id, color);
              } else {
                localStorage.setItem(`wallpaper_${conversation?._id}`, color);
                toast.success('Chat wallpaper applied');
              }
            }}
          />
        )}

        {showCustomNotifModal && (
          <CustomNotifModal
            key="custom-notif-modal"
            currentTone={localStorage.getItem(`notif_${conversation?._id}`) || 'Default (Tring)'}
            onClose={() => setShowCustomNotifModal(false)}
            onSelect={(tone) => {
              localStorage.setItem(`notif_${conversation?._id}`, tone);
              toast.success(`Message tone set to ${tone}`);
            }}
          />
        )}

        {showDisappearingPicker && (
          <DisappearingPicker
            key="disappearing-picker"
            current={disappearingDuration}
            onSelect={(value) => {
              onToggleDisappearing?.(conversation?._id, value);
            }}
            onClose={() => setShowDisappearingPicker(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ContactInfo;

