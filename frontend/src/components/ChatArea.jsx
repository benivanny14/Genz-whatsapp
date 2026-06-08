import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChat, applyVoiceEffect } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import { ArrowLeft, MoreVertical, Phone, Video, Search, Smile, Paperclip, Send, Mic, Image as ImageIcon, MessageCircle, Ghost, Forward, Square, MapPin, ShieldCheck, Globe, BarChart2, CalendarClock, PhoneOff, MicOff, VideoOff, Info, UserMinus, UserCheck, ShieldAlert, Copy, Link, Pin, X, Edit, Briefcase, Plus, Eye, EyeOff, Clock, Lock, Sticker, Download, FileText, Camera, Headphones, Contact, Trash2, Reply, Share2, Star, Archive, BellOff, Bell, Radio, Users, Languages, Grid3x3, Lock as LockIcon, Unlock, ChevronLeft, Wand2, TrendingUp, Sparkles, AtSign } from 'lucide-react';
import { formatMessageTime, decryptMessage } from '../utils/formatDate';
import SignedMedia from './SignedMedia';
import encryptionService from '../services/encryptionService';
import { getE2EEEnvelope } from '../utils/e2eeContent';
import { getSocket } from '../services/socket';
import { AnimatePresence } from 'framer-motion';
const EmojiPicker = React.lazy(() => import('emoji-picker-react'));
import PollModal from './PollModal';
import FilePreview from './FilePreview';
import SearchMessages from './SearchMessages';
import MediaGallery from './MediaGallery';
import MessageContextMenu from './MessageContextMenu';
import MessageInfo from './MessageInfo';
import ForwardDialog from './ForwardDialog';
import ReportDialog from './ReportDialog';
import GIFPicker from './GIFPicker';
import VoiceWaveform from './VoiceWaveform';
import VoiceMessageBubble from './VoiceMessageBubble';
import VoiceRecorder from './VoiceRecorder';
import AudioPlayer from './AudioPlayer';
import LiveReactions from './LiveReactions';
import TrendingStickers from './TrendingStickers';
import AICaption from './AICaption';
import ChunkedUploader from './ChunkedUploader';
import ContactInfo from './ContactInfo';
import GroupInfo from './GroupInfo';
import { uploadVoiceNote, getAudioDuration, analyzeAudioForWaveform } from '../services/voiceService';
import toast from 'react-hot-toast';
import { authFetch } from '../utils/authFetch';
import { compressImage } from '../utils/imageCompression';

const API_URL = import.meta.env.VITE_API_URL || '';

const DISAPPEARING_OPTIONS = [
  { label: 'Off', value: 'Off' },
  { label: '24 hours', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: '90 days', value: '90d' },
];

// ── URL detection helper ──
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const extractFirstUrl = (text) => {
  if (!text || typeof text !== 'string') return null;
  const matches = text.match(URL_REGEX);
  return matches ? matches[0] : null;
};

const EMOJI_STICKER_SUGGESTIONS = {
  '😂': [
    'https://media.giphy.com/media/3o6ozvv0zsJskzOCbu/giphy.gif',
    'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif'
  ],
  '🤣': [
    'https://media.giphy.com/media/l0ExayQDzrI2xOb8A/giphy.gif',
    'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif'
  ],
  '❤️': [
    'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif',
    'https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif'
  ],
  '😍': [
    'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif',
    'https://media.giphy.com/media/xTiTnMhJTwNHChdTZS/giphy.gif'
  ],
  '👍': [
    'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    'https://media.giphy.com/media/d2Z9QYzB2pQ5ieHQY/giphy.gif'
  ],
  '🙏': [
    'https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif',
    'https://media.giphy.com/media/26gsjCZpPolPr3sBy/giphy.gif'
  ],
  '🔥': [
    'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    'https://media.giphy.com/media/3o72FfM5HJydzafgUE/giphy.gif'
  ]
};

const getEmojiStickerSuggestions = (text = '') => {
  const found = Object.keys(EMOJI_STICKER_SUGGESTIONS).find((emoji) => text.includes(emoji));
  if (!found) return [];
  return EMOJI_STICKER_SUGGESTIONS[found].map((url, index) => ({
    id: `${found}-${index}`,
    emoji: found,
    url
  }));
};

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const getEntityId = (entity) => String(entity?._id || entity?.id || entity || '');
const getMentionName = (participant = {}) => participant.username || participant.name || participant.phoneNumber || '';

const getActiveMentionToken = (value = '', cursor = value.length) => {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/(^|\s)@([^\s@]*)$/);
  if (!match) return null;
  return {
    query: match[2] || '',
    start: beforeCursor.length - match[2].length - 1,
    cursor
  };
};

const buildMentionPayload = (text = '', participants = [], currentUserId = '') => {
  if (!text || !participants?.length) return [];
  return participants
    .filter((participant) => {
      const participantId = getEntityId(participant);
      const name = getMentionName(participant);
      if (!participantId || participantId === String(currentUserId) || !name) return false;
      return new RegExp(`(^|\\s)@${escapeRegExp(name)}(?=$|\\s|[.,!?;:)\\]])`, 'i').test(text);
    })
    .map((participant) => ({
      userId: getEntityId(participant),
      username: getMentionName(participant)
    }));
};

const renderTextWithMentions = (text = '', mentions = [], currentUserId = '') => {
  const names = [...new Set(
    (mentions || [])
      .map((mention) => mention.username || mention.displayName || mention.user?.username)
      .filter(Boolean)
  )].sort((a, b) => b.length - a.length);

  if (!text || !names.length) return text;

  const mentionByName = new Map(
    (mentions || []).map((mention) => [
      String(mention.username || mention.displayName || mention.user?.username || '').toLowerCase(),
      mention
    ])
  );
  const regex = new RegExp(`@(${names.map(escapeRegExp).join('|')})(?=$|\\s|[.,!?;:)\\]])`, 'gi');
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const name = match[1];
    const mention = mentionByName.get(String(name).toLowerCase());
    const mentionedUserId = getEntityId(mention?.user || mention?.userId);
    const isCurrentUser = mentionedUserId && mentionedUserId === String(currentUserId);
    parts.push(
      <span
        key={`${match.index}-${name}`}
        className={`inline-flex rounded-md px-1 font-semibold ${isCurrentUser ? 'bg-amber-300/25 text-amber-100' : 'bg-primary-500/20 text-primary-100'
          }`}
        title={`@${name}`}
      >
        @{name}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

// ── Link Preview Card Component ──
const LinkPreviewCard = ({ url }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    authFetch(`${API_URL}/advanced/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => { if (data.success) setPreview(data.preview); })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return (
    <div className="mt-2 border border-white/10 rounded-xl overflow-hidden animate-pulse bg-white/5 h-16" />
  );
  if (!preview) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="mt-2 block border border-white/10 rounded-xl overflow-hidden hover:bg-white/5 transition-colors no-underline">
      {preview.image && (
        <img src={preview.image} alt="preview" className="w-full h-28 object-cover" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
      )}
      <div className="p-2">
        <p className="text-[10px] text-primary-400 font-bold uppercase truncate">{preview.domain}</p>
        <p className="text-xs font-semibold text-white truncate">{preview.title}</p>
        {preview.description && <p className="text-[10px] text-white/50 truncate mt-0.5">{preview.description}</p>}
      </div>
    </a>
  );
};

const ChatArea = ({ sidebarOpen, onOpenSidebar, mods, onOpenGENZSettings }) => { // Added mods and onOpenGENZSettings
  const { user: localUser } = useUser();
  const {
    user: chatUser,
    selectedConversation, messages, setMessages, loading, sendMessage,
    editMessage, deleteMessage, clearChat, deleteChat, addReaction,
    sendTypingStatus, forwardMessage, conversations,
    sendRecordingStatus, isOtherUserTyping, isOtherUserRecording,
    onlineUsers, blockedUsers, blockUser, unblockUser,
    createPoll, votePoll, scheduleMessage, scheduledMessages, cancelScheduledMessage,
    initiateCall, endCall, activeCall,
    updateGroupMember, joinGroup, updateDisappearingMessages, toggleAdminOnlyMessaging, updateGroupPermission, createCustomRole, assignRole, viewProfile,
    pinMessage, unpinMessage, pinnedMessages, presenceHistory, unlockedSessionChats, verifyChatUnlock, toggleChatLock, stickerPacks, downloadedStickers, downloadStickerPack, sendSticker, addFavoriteSticker, toggleStarMessage, toggleMessageLock, toggleMuteChat, toggleArchiveChat, transcribeAudio, markAsRead, markViewOnceViewed, getUserStatusWithGhostMode,
    isDNDMode, toggleDNDMode, selectConversation, setMods
  } = useChat();
  const user = chatUser || localUser;
  const [messageInput, setMessageInput] = useState('');
  const [mentionState, setMentionState] = useState({
    open: false,
    query: '',
    start: -1,
    cursor: 0,
    activeIndex: 0
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showStickerStore, setShowStickerStore] = useState(false);
  const [isLiveLocationActive, setIsLiveLocationActive] = useState(false); // State for live location
  const [showGIFPicker, setShowGIFPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [lockPinInput, setLockPinInput] = useState('');
  const [showPollModal, setShowPollModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null); // {id, content}
  const [isViewOnceEnabled, setIsViewOnceEnabled] = useState(false);
  const [showDisappearingPicker, setShowDisappearingPicker] = useState(false);
  const [peerPresence, setPeerPresence] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showSearchMessages, setShowSearchMessages] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [messageContextMenu, setMessageContextMenu] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [audioData, setAudioData] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [showRecordingUI, setShowRecordingUI] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [stickerSearchQuery, setStickerSearchQuery] = useState('');
  const [voiceRecorderActive, setVoiceRecorderActive] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [translatedMessages, setTranslatedMessages] = useState({});
  const liveLocationWatchIdRef = useRef(null);
  const liveLocationIntervalRef = useRef(null);
  const lastLocationSentRef = useRef(null);
  const [showLiveLocationModal, setShowLiveLocationModal] = useState(false);
  const [liveLocationDuration, setLiveLocationDuration] = useState(15);
  const [liveLocationComment, setLiveLocationComment] = useState('');
  const [showCurrentLocationModal, setShowCurrentLocationModal] = useState(false);
  const [currentLocationComment, setCurrentLocationComment] = useState('');
  const [currentLocationCoords, setCurrentLocationCoords] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [viewOnceModalOpen, setViewOnceModalOpen] = useState(false);
  const [viewOnceMessageData, setViewOnceMessageData] = useState(null);

  // Debug showScheduleModal state
  useEffect(() => {
    console.log('[ChatArea] showScheduleModal changed:', showScheduleModal);
  }, [showScheduleModal]);
  const [cameraMode, setCameraMode] = useState('photo'); // 'photo' or 'video'
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoTimerRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraMediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);

  const [showAudioModal, setShowAudioModal] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioTimerRef = useRef(null);
  const attachmentAudioStreamRef = useRef(null);
  const attachmentAudioRecorderRef = useRef(null);
  const attachmentAudioChunksRef = useRef([]);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);

  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [showLiveReactions, setShowLiveReactions] = useState(false);
  const [showTrendingStickers, setShowTrendingStickers] = useState(false);
  const [showAICaption, setShowAICaption] = useState(false);
  const [showChunkedUploader, setShowChunkedUploader] = useState(false);
  const [e2eePlain, setE2eePlain] = useState({});
  const [visibleCount, setVisibleCount] = useState(50);
  const [showMessageInfoModal, setShowMessageInfoModal] = useState(false);
  const [messageInfoId, setMessageInfoId] = useState(null);
  const [aiWritingLoading, setAiWritingLoading] = useState(false);
  const [aiWritingSuggestion, setAiWritingSuggestion] = useState('');
  const [showAIWritingHelp, setShowAIWritingHelp] = useState(false);

  // Custom role state variables
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState({
    canSendMedia: true,
    canCreatePolls: true,
    canChangeGroupInfo: true,
  });

  const plaintextOf = useCallback((m) => {
    if (m == null) return '';
    const id = m._id ?? m.id;
    if (id != null && Object.prototype.hasOwnProperty.call(e2eePlain, id)) {
      return e2eePlain[id];
    }
    return decryptMessage(m.content || m.message);
  }, [e2eePlain]);

  // Glass mode classes
  const glassMode = mods?.glassMode;
  const headerClass = glassMode ? 'glass-header' : 'bg-dark-surface';
  const inputAreaClass = glassMode ? 'glass-input' : 'bg-dark-surface';
  const bubbleSentClass = glassMode ? 'glass-bubble-sent' : 'message-bubble-sent';
  const bubbleReceivedClass = glassMode ? 'glass-bubble-received' : 'message-bubble-received';
  const chatAreaClass = glassMode ? 'glass-chat-area' : 'bg-dark-bg';

  useEffect(() => {
    return () => {
      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current);
        audioTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setE2eePlain({});
  }, [selectedConversation?._id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const list = messages || [];
      if (!list.length) return;
      const todo = list.filter((m) => getE2EEEnvelope(m.content));
      if (!todo.length) return;
      const ok = await encryptionService.initialize().catch(() => false);
      if (!ok || cancelled) return;
      const updates = {};
      for (const m of todo) {
        const env = getE2EEEnvelope(m.content);
        if (!env) continue;
        const mid = m._id ?? m.id;
        if (mid == null) continue;
        try {
          const r = await encryptionService.decryptMessage(env);
          if (r?.decryptedData !== undefined) updates[mid] = r.decryptedData;
        } catch {
          updates[mid] = '🔒 Haiwezi kusimbuliwa';
        }
      }
      if (!cancelled && Object.keys(updates).length) {
        setE2eePlain((prev) => ({ ...prev, ...updates }));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [messages, selectedConversation?._id]);

  // Smart scroll: only auto-scroll when user is at bottom or new messages arrive
  const userScrollPositionRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    shouldAutoScrollRef.current = isAtBottom;
    
    if (shouldAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [messages]);
  
  // Track user scroll position
  const handleMessagesScroll = (e) => {
    const container = e.target;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    shouldAutoScrollRef.current = isAtBottom;
    
    // Load more messages when scrolling to top
    if (container.scrollTop === 0) {
      setVisibleCount(prev => Math.min(prev + 50, filteredMessages.length));
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      document.title = getConversationName();
    }
  }, [selectedConversation]);

  // Mark chat as read when opened — unread badge always clears; read receipts respect privacy mods
  useEffect(() => {
    if (selectedConversation?._id) {
      markAsRead(selectedConversation._id);
    }
  }, [selectedConversation?._id, messages.length]);

  const lastFetchedUserIdRef = useRef(null);

  useEffect(() => {
    if (!selectedConversation || selectedConversation.isGroup) {
      setPeerPresence(null);
      lastFetchedUserIdRef.current = null;
      return;
    }
    const me = String(user?.id || user?._id || '');
    const other = (selectedConversation.participants || []).find(
      (p) => String(p?._id || p?.id || p) !== me
    );
    const otherId = other?._id || other?.id || other;
    if (!otherId) return;

    // Use socket-based presence instead of HTTP polling to prevent server overload
    // The socket connection already handles real-time online/offline status
    // No need to fetch via HTTP - this was causing ERR_INSUFFICIENT_RESOURCES
    console.log(`[ChatArea] Using socket-based presence for user: ${otherId}`);
    
    return () => {
      // Cleanup if needed
    };
  }, [selectedConversation?._id]);

  // GENZ MOD: Chat Background Music Logic
  useEffect(() => {
    if (mods?.chatMusic && mods?.chatMusicUrl && selectedConversation) {
      if (!audioRef.current) {
        audioRef.current = new Audio(mods.chatMusicUrl);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.3;
      } else if (audioRef.current.src !== mods.chatMusicUrl) {
        audioRef.current.src = mods.chatMusicUrl;
      }

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => console.log("User interaction required for music"));
      }
    } else {
      if (audioRef.current) audioRef.current.pause();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [selectedConversation, mods?.chatMusic, mods?.chatMusicUrl]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleUploadWallpaper = async (file) => {
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 1080, 0.7);
        const customWallpapers = { ...(mods.customWallpapers || {}) };
        if (selectedConversation?._id) {
          customWallpapers[selectedConversation._id] = {
            wallpaper: compressedBase64,
            dim: mods.chatWallpaperDim || 0,
            zoom: mods.chatWallpaperZoom || 1,
            doodle: mods.chatWallpaperDoodle !== false
          };
          setMods(prev => ({ ...prev, customWallpapers }));
          toast.success('Wallpaper applied to this chat!');
        } else {
          setMods(prev => ({ ...prev, chatWallpaper: compressedBase64 }));
          toast.success('Global wallpaper updated!');
        }
      } catch (err) {
        toast.error('Failed to process image');
      }
    }
  };

  const getConversationName = () => {
    if (!selectedConversation) return '';
    if (selectedConversation.isGroup) {
      return selectedConversation.groupName;
    }
    const otherUser = selectedConversation.participants.find((p) => p._id !== user?.id);
    return otherUser?.username || 'Unknown';
  };

  const getConversationAvatar = () => {
    if (!selectedConversation) return '';
    if (selectedConversation.isGroup) {
      if (!hasStaleBlobUrl(selectedConversation.groupPhoto) && selectedConversation.groupPhoto) {
        return selectedConversation.groupPhoto;
      }
      // Fallback: use first participant's avatar or generic group avatar
      const firstParticipant = selectedConversation.participants?.[0];
      if (firstParticipant?.profilePicture && !hasStaleBlobUrl(firstParticipant.profilePicture)) {
        return firstParticipant.profilePicture;
      }
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedConversation.groupName || 'Group')}&background=random&color=fff`;
    }
    const otherUser = selectedConversation.participants?.find((p) => p._id !== user?.id);
    if (otherUser?.profilePicture && !hasStaleBlobUrl(otherUser.profilePicture)) {
      return otherUser.profilePicture;
    }
    // Fallback: generic avatar from ui-avatars
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.username || 'User')}&background=random&color=fff`;
  };

  const handleGIFSelect = (gif) => {
    if (!selectedConversation) return;
    const gifUrl = gif?.images?.fixed_height?.url || gif?.url;
    if (!gifUrl) {
      toast.error('GIF is missing a valid URL');
      return;
    }

    const messageData = {
      content: gifUrl,
      gifUrl,
      gifTitle: gif.title || 'GIF',
      type: 'gif',
      senderName: user?.username || 'GENZ User',
      replyTo: replyingTo
    };

    sendMessage(messageData.content, messageData.senderName, {
      messageType: 'gif',
      mediaUrl: gifUrl,
      gif: { url: gifUrl, title: gif.title || 'GIF' },
      replyTo: replyingTo
    });

    setReplyingTo(null);
    setShowGIFPicker(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    const rawMessage = messageInput.trim();
    const mentions = buildMentionPayload(
      rawMessage,
      selectedConversation?.participants || [],
      user?.id || user?._id
    );

    // Input sanitization - remove potentially dangerous HTML
    const sanitizedMessage = rawMessage
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();

    if (editingMessage) {
      await editMessage(editingMessage.id, sanitizedMessage);
      setEditingMessage(null);
    } else {
      await sendMessage(sanitizedMessage, user?.username || 'Me', {
        chatId: selectedConversation._id,
        isGroup: selectedConversation.isGroup,
        ghostMode: mods.ghostMode,
        isSelfDestruct: Boolean(mods.selfDestruct),
        selfDestructTimer: mods.selfDestruct ? 10 : null,
        isViewOnce: mods.selfDestruct ? false : isViewOnceEnabled,
        mentions
      });
    }
    setMessageInput('');
    setIsViewOnceEnabled(false);
    setMentionState({ open: false, query: '', start: -1, cursor: 0, activeIndex: 0 });
    setShowEmojiPicker(false);
    setReplyingTo(null);
  };

  const handleTyping = (value, cursor = value.length) => {
    setMessageInput(value);
    const activeMention = getActiveMentionToken(value, cursor);
    if (activeMention) {
      setMentionState({
        open: true,
        query: activeMention.query,
        start: activeMention.start,
        cursor: activeMention.cursor,
        activeIndex: 0
      });
    } else {
      setMentionState((prev) => ({ ...prev, open: false, query: '', start: -1, cursor }));
    }
    if (!mods.ghostMode) { // Assuming mods is passed to ChatArea, or retrieved from context
      sendTypingStatus(true);
      // Reset timeout on every key stroke
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => sendTypingStatus(false), 2000); // Stop typing after 2s of inactivity
    }
  };

  const handleAIWritingHelp = async () => {
    if (!selectedConversation) return;
    setAiWritingLoading(true);
    setShowAIWritingHelp(true);
    setAiWritingSuggestion('');

    const recentContext = (messages || [])
      .slice(-8)
      .map((message) => {
        const senderName = message.sender?.username || (message.senderId === user?.id ? user?.username : 'User');
        return `${senderName}: ${plaintextOf(message)}`;
      })
      .join('\n');

    try {
      const response = await authFetch(`${API_URL}/advanced/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: [
            'Write exactly one concise ready-to-send WhatsApp-style message.',
            'Match the language and tone of the chat. Do not add explanations.',
            messageInput.trim()
              ? `Improve this draft without changing its meaning:\n${messageInput.trim()}`
              : `Suggest a helpful reply using this recent context:\n${recentContext || 'No context available.'}`
          ].join('\n\n'),
          conversationId: selectedConversation._id
        })
      });
      const data = await response.json();
      const suggestion = (data?.response || '').trim();
      if (!response.ok || !suggestion) {
        throw new Error(data?.message || 'AI writing help failed');
      }
      setAiWritingSuggestion(suggestion);
    } catch (error) {
      console.error('AI writing help error:', error);
      const fallback = messageInput.trim()
        ? messageInput.trim().replace(/\s+/g, ' ')
        : 'Sawa, nimekupata. Nitakujibu vizuri muda si mrefu.';
      setAiWritingSuggestion(fallback);
      toast.error('AI helper used an offline fallback');
    } finally {
      setAiWritingLoading(false);
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setMessageInput((prev) => prev + emojiObject.emoji);
    inputRef.current?.focus();
  };

  const startTimer = useCallback(() => {
    setRecordingDuration(0);
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setRecordingDuration(0);
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up audio analyzer for waveform
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateWaveform = () => {
        if (!isRecording) return;
        analyser.getByteFrequencyData(dataArray);
        setAudioData(new Uint8Array(dataArray));
        requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Clean up audio context
        audioContext.close();

        // ── VOICE CHANGER: Apply pitch effect before upload ──
        let audioBlob = rawBlob;
        if (mods?.voiceEffect && mods.voiceEffect !== 'none') {
          try {
            audioBlob = await applyVoiceEffect(rawBlob, mods.voiceEffect);
          } catch (e) {
            console.warn('Voice effect failed, using original audio:', e);
            audioBlob = rawBlob;
          }
        }

        const mime = audioBlob.type || 'audio/webm';
        const ext = mime.includes('wav') ? 'wav' : mime.includes('mpeg') ? 'mp3' : 'webm';
        const audioFile = new File([audioBlob], `voice-note.${ext}`, { type: mime });

        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('duration', recordingDuration);

        try {
          const API_URL = import.meta.env.VITE_API_URL || '';
          const response = await authFetch(`${API_URL}/media/upload`, {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          if (data.success || data.fileUrl || data.url) {
            const uploadedUrl = data.fileUrl || data.url;
            if (!uploadedUrl) throw new Error('Upload succeeded without a media URL');
            await sendMessage('Voice note', user?.username, {
              messageType: 'audio',
              mediaUrl: uploadedUrl,
              fileName: audioFile.name,
              voiceEffect: mods?.voiceEffect || 'none',
              duration: recordingDuration,
              size: audioFile.size,
              chatId: selectedConversation._id,
              isGroup: selectedConversation.isGroup,
              isViewOnce: isViewOnceEnabled
            });
            setIsViewOnceEnabled(false);
          } else {
            toast.error(`Upload failed: ${data.error || data.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Voice note upload failed:', error);
          toast.error('Failed to upload voice note. Please check your connection and try again.');
        }

        stream.getTracks().forEach(track => track.stop());
        setAudioData(null);
      };

      mediaRecorder.start(100); // Collect data every 100ms for better quality
      setIsRecording(true);
      setShowRecordingUI(true);
      setSwipeDirection(null);
      startTimer();
      if (!mods.ghostMode) sendRecordingStatus(true);

      // Haptic feedback for mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setShowRecordingUI(false);
      setIsRecordingLocked(false);
      stopTimer();
      if (!mods.ghostMode) sendRecordingStatus(false);
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecording(false);
      setShowRecordingUI(false);
      setIsRecordingLocked(false);
      stopTimer();
      setSwipeDirection(null);
      setAudioData(null);
      if (!mods.ghostMode) sendRecordingStatus(false);
    }
  };

  const handleLockRecording = () => {
    setIsRecordingLocked(true);
  };

  const handleSendLockedRecording = () => {
    handleStopRecording();
  };

  // Gesture handlers for recording
  const micButtonRef = useRef(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  const handleMicMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    handleStartRecording();
  };

  const handleMicMouseMove = (e) => {
    if (!isRecording || isRecordingLocked) return;

    const deltaX = e.clientX - startXRef.current;
    const deltaY = startYRef.current - e.clientY; // Up is negative

    // Swipe left to delete
    if (deltaX < -50) {
      setSwipeDirection('left');
    }
    // Swipe up to lock
    else if (deltaY < -50) {
      setSwipeDirection('up');
    }
    else {
      setSwipeDirection(null);
    }
  };

  const handleMicMouseUp = (e) => {
    if (!isRecording || isRecordingLocked) return;

    const deltaX = e.clientX - startXRef.current;
    const deltaY = startYRef.current - e.clientY;

    // Swipe left to delete
    if (deltaX < -50) {
      handleCancelRecording();
    }
    // Swipe up to lock
    else if (deltaY < -50) {
      handleLockRecording();
    }
    // Normal release - send
    else {
      handleStopRecording();
    }

    setSwipeDirection(null);
  };

  // Touch event handlers for mobile
  const handleMicTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    handleStartRecording();
  };

  const handleMicTouchMove = (e) => {
    if (!isRecording || isRecordingLocked) return;

    const deltaX = e.touches[0].clientX - startXRef.current;
    const deltaY = startYRef.current - e.touches[0].clientY;

    // Swipe left to delete
    if (deltaX < -50) {
      setSwipeDirection('left');
      if (navigator.vibrate) navigator.vibrate(50);
    }
    // Swipe up to lock
    else if (deltaY < -50) {
      setSwipeDirection('up');
      if (navigator.vibrate) navigator.vibrate(50);
    }
    else {
      setSwipeDirection(null);
    }
  };

  const handleMicTouchEnd = (e) => {
    if (!isRecording || isRecordingLocked) return;

    const deltaX = e.changedTouches[0].clientX - startXRef.current;
    const deltaY = startYRef.current - e.changedTouches[0].clientY;

    // Swipe left to delete
    if (deltaX < -50) {
      handleCancelRecording();
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }
    // Swipe up to lock
    else if (deltaY < -50) {
      handleLockRecording();
      if (navigator.vibrate) navigator.vibrate(100);
    }
    // Normal release - send
    else {
      handleStopRecording();
    }

    setSwipeDirection(null);
  };

  // VoiceRecorder: blob is already processed with VoiceRecorder effective effect + GENZ default mod
  const handleVoiceNoteSend = async (audioBlob, durationSecs, appliedVoiceEffect, viewOnceFlag = false) => {
    try {
      if (!audioBlob || !selectedConversation) return;

      const mime = audioBlob.type || 'audio/webm';
      const ext = mime.includes('wav') ? 'wav' : mime.includes('mpeg') ? 'mp3' : 'webm';
      const audioFile = new File([audioBlob], `voice-note.${ext}`, { type: mime });
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('duration', String(durationSecs || 0));

      const response = await authFetch(`${API_URL}/media/upload`, { method: 'POST', body: formData });
      const data = await response.json().catch(() => ({}));

      if (response.ok && (data.success || data.fileUrl || data.url)) {
        const uploadedUrl = data.fileUrl || data.url;
        if (!uploadedUrl) throw new Error('Upload succeeded without a media URL');
        const voiceFxLabel = appliedVoiceEffect ?? mods?.voiceEffect ?? 'none';
        const useViewOnce = Boolean(viewOnceFlag || isViewOnceEnabled);
        await sendMessage('Voice note', user?.username, {
          messageType: 'audio',
          mediaUrl: uploadedUrl,
          fileName: audioFile.name,
          voiceEffect: voiceFxLabel,
          duration: durationSecs || 0,
          size: audioFile.size,
          chatId: selectedConversation._id,
          isGroup: selectedConversation.isGroup,
          isViewOnce: useViewOnce
        });
        if (useViewOnce) setIsViewOnceEnabled(false);
      } else {
        toast.error(`Voice note upload failed: ${data.error || data.message || 'Upload failed'}`);
      }
    } catch (error) {
      console.error('Voice note upload error:', error);
      toast.error('Voice note upload failed. Please check your connection and try again.');
    }
  };

  const handleDeleteForEveryone = async (messageId) => {
    try {
      if (!confirm('Delete this message for everyone?')) return;

      if (String(messageId).startsWith('client-message-')) {
        deleteMessage(messageId);
        toast.success("Message deleted for everyone");
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await authFetch(`${API_URL}/chat/messages/${messageId}/delete-for-everyone`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        deleteMessage(messageId);
        toast.success("Message deleted for everyone");
      } else {
        toast.error('Failed to delete message for everyone');
      }
    } catch (error) {
      console.error('Delete for everyone error:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleAutoPlayNext = (currentMessageId) => {
    // Find the next voice message in the chat
    const currentIndex = messages.findIndex(m => (m.id || m._id) === currentMessageId);
    if (currentIndex === -1) return;

    const nextMessage = messages.slice(currentIndex + 1).find(m => m.messageType === 'audio');
    if (nextMessage) {
      console.log('Auto-playing next voice message:', nextMessage.id || nextMessage._id);
      // The AudioPlayer component will handle the auto-play
    }
  };

  const handleShareLocation = (type) => {
    setShowAttachmentMenu(false);
    if (!navigator.geolocation) {
      toast.error('GENZ WhatsApp: Your browser does not support location sharing.');
      return;
    }

    if (type === 'current') {
      const toastId = toast.loading('GENZ WhatsApp: Fetching your current location...');

      const handleFallback = (errMsg) => {
        toast.dismiss(toastId);
        // Default fallback to Dar es Salaam/Nairobi region coordinates
        const fallbackCoords = { latitude: -6.7924, longitude: 39.2083, accuracy: 1500 };
        setCurrentLocationCoords(fallbackCoords);
        setCurrentLocationComment('');
        setShowCurrentLocationModal(true);
        toast.error(`GENZ WhatsApp: GPS error (${errMsg}). Opened with default location.`);
      };

      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            toast.dismiss(toastId);
            const { latitude, longitude, accuracy } = position.coords;
            setCurrentLocationCoords({ latitude, longitude, accuracy: accuracy || 15 });
            setCurrentLocationComment('');
            setShowCurrentLocationModal(true);
          },
          (error) => {
            console.warn('Geolocation error code:', error.code, error.message);
            handleFallback(error.message || 'GPS failed');
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      } catch (err) {
        console.error('Geolocation exception:', err);
        handleFallback('API blocked/unsupported');
      }
    } else if (type === 'live') {
      if (isLiveLocationActive) return; // Already sharing
      setShowLiveLocationModal(true);
    }
  };

  const confirmShareCurrentLocation = () => {
    if (!currentLocationCoords) return;
    const { latitude, longitude } = currentLocationCoords;
    const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const msgText = currentLocationComment
      ? `${currentLocationComment}\n\n📍 Current Location\n${locationUrl}`
      : `📍 Current Location\n${locationUrl}`;
    sendMessage(
      msgText,
      user?.username,
      {
        messageType: 'location',
        latitude,
        longitude,
        caption: currentLocationComment
      }
    );
    setShowCurrentLocationModal(false);
    setCurrentLocationComment('');
  };

  const confirmShareLiveLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (startPos) => {
        const { latitude, longitude } = startPos.coords;
        const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const msgText = liveLocationComment ? `${liveLocationComment}\n\n📍 Live Location Sharing Started\n${locationUrl}` : `📍 Live Location Sharing Started\n${locationUrl}`;
        sendMessage(
          msgText,
          user?.username,
          { messageType: 'location', latitude, longitude, isLiveLocation: true, duration: liveLocationDuration }
        );
        setIsLiveLocationActive(true);
        setShowLiveLocationModal(false);
        setLiveLocationComment('');
        lastLocationSentRef.current = { latitude, longitude };

        liveLocationWatchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const newLat = pos.coords.latitude;
            const newLng = pos.coords.longitude;
            const last = lastLocationSentRef.current;
            const moved = !last ||
              Math.abs(newLat - last.latitude) > 0.0001 ||
              Math.abs(newLng - last.longitude) > 0.0001;
            if (moved) {
              lastLocationSentRef.current = { latitude: newLat, longitude: newLng };
              const newUrl = `https://www.google.com/maps?q=${newLat},${newLng}`;
              sendMessage(
                `📍 Live Update\n${newUrl}`,
                user?.username,
                { messageType: 'location', latitude: newLat, longitude: newLng, isLiveLocation: true }
              );
            }
          },
          (err) => console.warn('Live location error:', err),
          { maximumAge: 30000, timeout: 15000, enableHighAccuracy: true }
        );

        // Auto-stop after duration
        setTimeout(() => {
          handleStopLiveLocation();
        }, liveLocationDuration * 60 * 1000);
      },
      () => toast.error('GENZ WhatsApp: Failed to get initial location.')
    );
  };

  const handleStopLiveLocation = () => {
    if (liveLocationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(liveLocationWatchIdRef.current);
      liveLocationWatchIdRef.current = null;
    }
    if (liveLocationIntervalRef.current) {
      clearInterval(liveLocationIntervalRef.current);
      liveLocationIntervalRef.current = null;
    }
    setIsLiveLocationActive(false);
    sendMessage('🛑 Live Location Sharing Stopped.', user?.username, { messageType: 'text' });
  };

  const handleFileUpload = async (e, forcedType = null, isViewOnce = isViewOnceEnabled) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = (mods?.highResMedia ? 50 : 10) * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`GENZ WhatsApp: File too large (max ${mods?.highResMedia ? 50 : 10}MB)`);
      return;
    }

    // GENZ MOD: Ask for caption if it's an image or video
    const caption = (file.type.startsWith('image/') || file.type.startsWith('video/')) ? window.prompt("Add a caption (optional):") : null;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await authFetch(`${API_URL}/media/upload`, {
        method: 'POST',
        // No auth headers needed

        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.success || data.fileUrl || data.url)) {
        const uploadedUrl = data.fileUrl || data.url;
        if (!uploadedUrl) throw new Error('Upload succeeded without a media URL');
        let type = forcedType || 'file';
        if (!forcedType) {
          if (file.type.startsWith('image/')) type = 'image';
          else if (file.type.startsWith('video/')) type = 'video';
          else if (file.type.startsWith('audio/')) type = 'audio';
        }

        const mediaContent = caption?.trim()
          || (type === 'image' ? 'Photo' : type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : file.name || 'Document');

        await sendMessage(mediaContent, user?.username, {
          messageType: type,
          mediaUrl: uploadedUrl,
          fileName: file.name,
          caption: caption,
          isViewOnce: isViewOnce,
          chatId: selectedConversation._id,
          isGroup: selectedConversation.isGroup
        });
      } else {
        toast.error(`GENZ WhatsApp: ${data.error || data.message || 'Upload failed'}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
        toast.error("GENZ WhatsApp: Failed to upload file. Please try again.");
    }
    setIsViewOnceEnabled(false);
    if (e?.target) e.target.value = '';
  };

  // Open View Once modal - shows content without marking as viewed yet
  const openViewOnceModal = (message) => {
    setViewOnceMessageData(message);
    setViewOnceModalOpen(true);
  };

  // Close View Once modal - NOW mark as viewed/consumed
  const closeViewOnceModal = async () => {
    if (viewOnceMessageData) {
      const messageId = viewOnceMessageData.id || viewOnceMessageData._id;
      const senderId = String(viewOnceMessageData.sender?._id || viewOnceMessageData.sender || '');
      const me = String(user?.id || user?._id || '');
      
      // Only mark as viewed if not the sender
      if (senderId && senderId !== me) {
        try {
          await markViewOnceViewed(messageId);
        } catch (err) {
          console.error('Failed to mark view-once as viewed:', err);
        }
      }
    }
    setViewOnceModalOpen(false);
    setViewOnceMessageData(null);
  };

  // --- CAMERA MODAL HANDLERS ---
  const openCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraInputRef.current?.click();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;
      setRecordedVideoUrl(null);
      setShowCameraModal(true);
      setShowAttachmentMenu(false);
    } catch (err) {
      console.error('Camera error:', err);
      cameraInputRef.current?.click();
    }
  };

  const closeCamera = () => {
    setShowCameraModal(false);
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    setIsRecordingVideo(false);
    clearInterval(videoTimerRef.current);
  };

  useEffect(() => {
    if (showCameraModal && videoRef.current && cameraStreamRef.current && !recordedVideoUrl) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [showCameraModal, recordedVideoUrl]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);
      const caption = window.prompt("Add a caption (optional):");

      try {
        const response = await authFetch(`${API_URL}/media/upload`, { method: 'POST', body: formData });
        const data = await response.json();
        if (response.ok && (data.success || data.fileUrl || data.url)) {
          const uploadedUrl = data.fileUrl || data.url;
          if (!uploadedUrl) throw new Error('Upload succeeded without a media URL');
          await sendMessage(caption?.trim() || 'Photo', user?.username, {
            messageType: 'image',
            mediaUrl: uploadedUrl,
            fileName: file.name,
            caption: caption,
            chatId: selectedConversation._id,
            isGroup: selectedConversation.isGroup
          });
        }
      } catch (err) {
        toast.error('Failed to send photo');
      }
      closeCamera();
    }, 'image/jpeg');
  };

  const startVideoRecording = () => {
    if (!cameraStreamRef.current) return;
    videoChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(cameraStreamRef.current, { mimeType });
    cameraMediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) videoChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(videoChunksRef.current, { type: recorder.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    };

    recorder.start();
    setIsRecordingVideo(true);
    setVideoDuration(0);
    videoTimerRef.current = setInterval(() => {
      setVideoDuration(prev => prev + 1);
    }, 1000);
  };

  const stopVideoRecording = () => {
    if (cameraMediaRecorderRef.current && isRecordingVideo) {
      cameraMediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
      clearInterval(videoTimerRef.current);
    }
  };

  const sendRecordedVideo = async () => {
    const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
    const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
    const formData = new FormData();
    formData.append('file', file);
    const caption = window.prompt("Add a caption (optional):");

    try {
      const response = await authFetch(`${API_URL}/media/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (response.ok && (data.success || data.fileUrl || data.url)) {
        const uploadedUrl = data.fileUrl || data.url;
        if (!uploadedUrl) throw new Error('Upload succeeded without a media URL');
        await sendMessage(caption?.trim() || 'Video', user?.username, {
          messageType: 'video',
          mediaUrl: uploadedUrl,
          fileName: file.name,
          caption: caption,
          chatId: selectedConversation._id,
          isGroup: selectedConversation.isGroup
        });
      }
    } catch (err) {
      toast.error('Failed to send video');
    }
    closeCamera();
  };

  // --- AUDIO ATTACHMENT MODAL HANDLERS ---
  const openAudioAttachment = () => {
    audioInputRef.current?.click();
    setShowAttachmentMenu(false);
  };

  const closeAudioAttachment = () => {
    setShowAudioModal(false);
    if (attachmentAudioStreamRef.current) {
      attachmentAudioStreamRef.current.getTracks().forEach(track => track.stop());
      attachmentAudioStreamRef.current = null;
    }
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setIsRecordingAudio(false);
    clearInterval(audioTimerRef.current);
  };

  const startAudioAttachmentRecording = () => {
    if (!attachmentAudioStreamRef.current) return;
    attachmentAudioChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const recorder = new MediaRecorder(attachmentAudioStreamRef.current, { mimeType });
    attachmentAudioRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) attachmentAudioChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(attachmentAudioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedAudioUrl(url);
    };

    recorder.start();
    setIsRecordingAudio(true);
    setAudioDuration(0);
    audioTimerRef.current = setInterval(() => {
      setAudioDuration(prev => prev + 1);
    }, 1000);
  };

  const stopAudioAttachmentRecording = () => {
    if (attachmentAudioRecorderRef.current && isRecordingAudio) {
      attachmentAudioRecorderRef.current.stop();
      setIsRecordingAudio(false);
      clearInterval(audioTimerRef.current);
    }
  };

  const sendRecordedAudioAttachment = async () => {
    const blob = new Blob(attachmentAudioChunksRef.current, { type: 'audio/webm' });
    const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await authFetch(`${API_URL}/media/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (response.ok && (data.success || data.fileUrl || data.url)) {
        const uploadedUrl = data.fileUrl || data.url;
        if (!uploadedUrl) throw new Error('Upload succeeded without a media URL');
        await sendMessage('Audio', user?.username, {
          messageType: 'audio',
          mediaUrl: uploadedUrl,
          fileName: file.name,
          chatId: selectedConversation._id,
          isGroup: selectedConversation.isGroup
        });
      }
    } catch (err) {
      toast.error('Failed to send audio');
    }
    closeAudioAttachment();
  };

  const handleContactSimulation = () => {
    const name = window.prompt("GENZ Sim: Enter contact name to share:");
    if (name) {
      sendMessage(`Shared Contact: ${name}`, user?.username, { messageType: 'text' });
    }
  };

  const handleFilePreview = (message) => {
    if (message.messageType === 'file' || message.messageType === 'document') {
      setPreviewFile({
        fileUrl: message.mediaUrl,
        fileName: message.fileName || 'Unknown File'
      });
      setShowFilePreview(true);
    }
  };

  const AttachmentIcon = ({ icon, label, onClick, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-2 hover:bg-dark-hover rounded-lg cursor-pointer flex flex-col items-center gap-1 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={label}
    >
      {icon}
      <span className="text-[10px] text-dark-text">{label}</span>
    </button>
  );

  const handleConfirmForward = (targetConv) => {
    if (!forwardingMessage) return;
    const content = plaintextOf(forwardingMessage);
    // GENZ MOD: If noForwardLabel is on, send as new message without 'Forwarded' tag
    if (mods?.noForwardLabel) {
      sendMessage(content, user?.username, { chatId: selectedConversation?._id });
    } else {
      forwardMessage(content, user?.username);
    }
    setForwardingMessage(null);
  };

  const handleEditClick = (message) => {
    try {
      const messageId = message?._id || message?.id;
      const content = message?.message || message?.content;
      const decryptedContent = typeof content === 'string' ? content : decryptMessage(content);

      setEditingMessage({ id: messageId, content: decryptedContent });
      setMessageInput(decryptedContent);
      inputRef.current?.focus();
      setActiveMessageMenu(null);
    } catch (err) {
      console.error('Edit error:', err);
      toast.error('Could not edit message');
    }
  };

  const handleDoubleClick = (messageId) => {
    // GENZ MOD: Quick reaction on double click
    addReaction(messageId, '❤️');
  };

  const handleSetDisappearingMessages = () => {
    if (!selectedConversation?._id) return;
    setShowDisappearingPicker(true);
    setShowAttachmentMenu(false);
  };

  const applyDisappearingMessages = async (duration) => {
    if (!selectedConversation?._id) return;
    try {
      const result = await updateDisappearingMessages(selectedConversation._id, duration);
      if (result?.success === false) throw new Error(result.message || 'Failed to update disappearing messages');
      toast.success(duration === 'Off' ? 'Disappearing messages off' : `Disappearing messages set to ${duration}`);
    } catch (err) {
      console.error('Disappearing messages update failed:', err);
      toast.error(err.message || 'Could not update disappearing messages');
    }
  };

  const handlePollSubmit = (question, options) => {
    if (selectedConversation?._id) {
      createPoll(question, options);
      setShowPollModal(false);
    }
  };

  const handleSchedule = () => {
    console.log('[handleSchedule] Called, messageInput:', messageInput);
    if (!messageInput.trim()) {
      toast.error('Type a message first, then click Schedule.');
      return;
    }
    console.log('[handleSchedule] Setting showScheduleModal to true');
    setShowScheduleModal(true);
    console.log('[handleSchedule] showScheduleModal state should be true now');
  };

  const confirmSchedule = async () => {
    console.log('[confirmSchedule] Called');
    if (!scheduleDateTime) { toast.error('Please select a date and time.'); return; }
    const sendAt = new Date(scheduleDateTime);
    if (sendAt <= new Date()) { toast.error('Please select a future time.'); return; }

    // Validate conversation ID
    if (!selectedConversation?._id) {
      toast.error('Please select a conversation first.');
      return;
    }

    // Check if conversation ID is a valid MongoDB ObjectId (24 hex characters)
    const conversationId = selectedConversation._id;
    console.log('[confirmSchedule] conversationId:', conversationId);
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(conversationId);
    console.log('[confirmSchedule] isValidObjectId:', isValidObjectId);
    if (!isValidObjectId) {
      toast.error('Invalid conversation ID. Please select a valid conversation.');
      return;
    }

    try {
      console.log('[confirmSchedule] Calling scheduleMessage');
      await scheduleMessage(messageInput, conversationId, sendAt.toISOString());
      setMessageInput('');
      setScheduleDateTime('');
      setShowScheduleModal(false);
      toast.success(`✅ Message scheduled for ${sendAt.toLocaleString()}`);
    } catch (error) {
      console.error('[confirmSchedule] Error:', error);
      toast.error(error.message || 'Failed to schedule message');
    }
  };

  // ── Chat Export (Item 17) ──
  const handleExportChat = (format = 'txt') => {
    if (!selectedConversation || !messages.length) return;
    const chatName = getConversationName();
    const date = new Date().toLocaleDateString();

    if (format === 'txt') {
      const lines = [
        `GENZ WhatsApp Export`,
        `Chat: ${chatName}`,
        `Exported: ${date}`,
        `Total Messages: ${messages.length}`,
        `${'='.repeat(50)}`,
        '',
        ...(messages).map(m => {
          const sender = typeof m.sender === 'object' ? m.sender.username : m.sender;
          const time = new Date(m.createdAt).toLocaleString();
          const content = plaintextOf(m) || '[media]';
          return `[${time}] ${sender}: ${content}`;
        })
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `GENZ_${chatName}_${date}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (format === 'json') {
      const data = {
        chatName,
        exportedAt: new Date().toISOString(),
        totalMessages: messages.length,
        messages: messages.map(m => ({
          sender: typeof m.sender === 'object' ? m.sender.username : m.sender,
          content: plaintextOf(m),
          type: m.messageType || 'text',
          time: m.createdAt,
          status: m.status
        }))
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `GENZ_${chatName}_${date}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  const handleTranslate = async (messageId, text) => {
    if (translatedMessages[messageId]) {
      // Toggle back to original
      const newTranslations = { ...translatedMessages };
      delete newTranslations[messageId];
      setTranslatedMessages(newTranslations);
      return;
    }

    // Detect target language: if text looks Swahili -> translate to English, else to Swahili
    const textLower = text.toLowerCase();
    const looksSwahili = /\b(habari|mambo|poa|asante|karibu|ndio|hapana|nzuri|sawa|rafiki|wewe|mimi|tena|kweli)\b/.test(textLower);
    const targetLang = looksSwahili ? 'en' : 'sw';
    const targetLabel = looksSwahili ? 'English' : 'Kiswahili';

    // Show loading state
    setTranslatedMessages(prev => ({ ...prev, [messageId]: '🔄 Translating...' }));

    try {
      // Try backend translation endpoint first
      const res = await authFetch(`${API_URL}/advanced/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target: targetLang })
      });
      if (res.ok) {
        const data = await res.json();
        const translated = data.translatedText || data.translatedContent || text;
        setTranslatedMessages(prev => ({ ...prev, [messageId]: `🌐 ${targetLabel}: ${translated}` }));
        return;
      }
    } catch (e) { }

    // Fallback: Try LibreTranslate public API
    try {
      const libre = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: 'auto', target: targetLang, format: 'text' })
      });
      if (libre.ok) {
        const data = await libre.json();
        setTranslatedMessages(prev => ({ ...prev, [messageId]: `🌐 ${targetLabel}: ${data.translatedText}` }));
        return;
      }
    } catch (e) { }

    // Final fallback: basic keyword translation
    const simulated = looksSwahili
      ? `🌐 English: ${text} [offline translation]`
      : `🌐 Kiswahili: ${text} [offline tafsiri]`;
    setTranslatedMessages(prev => ({ ...prev, [messageId]: simulated }));
  };

  const handleReaction = (messageId, emoji) => {
    addReaction(messageId, emoji);
    setSelectedMessage(null);
  };

  const handleContextMenuDelete = (message) => {
    const messageId = message?.id || message?._id;
    if (!messageId) return;
    deleteMessage(messageId);
    setMessageContextMenu(null);
  };

  const handleContextMenuStar = (message) => {
    const messageId = message?.id || message?._id;
    if (!messageId) return;
    toggleStarMessage(messageId);
  };

  const handleClearCurrentChat = async () => {
    const chatId = selectedConversation?._id;
    if (!chatId) return;
    setShowHeaderMenu(false);
    if (!confirm('Clear all messages in this chat?')) return;

    const result = await clearChat(chatId);
    if (result?.success) {
      toast.success('Chat cleared');
    } else {
      toast.error(result?.message || 'Failed to clear chat');
    }
  };

  const handleDeleteCurrentChat = async () => {
    const chatId = selectedConversation?._id;
    if (!chatId) return;
    setShowHeaderMenu(false);
    if (!confirm('Delete this chat? This will remove it from your chat list.')) return;

    const result = await deleteChat(chatId);
    if (result?.success) {
      toast.success('Chat deleted');
    } else {
      toast.error(result?.message || 'Failed to delete chat');
    }
  };

  const isOwnMessage = (message) => {
    if (!message || !message.sender || !user) return false;
    // Compare by username string since server sends it as a string
    const senderName = typeof message.sender === 'object' ? message.sender.username : message.sender;
    const currentName = user?.username || 'Me';
    return senderName === currentName;
  };

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="bg-primary-600/10 p-6 rounded-full inline-block mb-4">
            <MessageCircle className="w-16 h-16 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-dark-text mb-2">GENZ WhatsApp Web</h2>
          <p className="text-dark-textSecondary">
            Send and receive messages without keeping your phone online.
          </p>
        </div>
      </div>
    );
  }

  // CHAT LOCK CHECK
  const isLocked = selectedConversation.isLocked && !unlockedSessionChats.has(String(selectedConversation._id));

  if (isLocked) {
    return (
      <div className="flex-1 flex flex-col bg-dark-bg items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-primary-600/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-primary-600" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Locked Chat</h2>
        <p className="text-dark-textSecondary text-sm mb-6 max-w-xs">Enter your 4-digit PIN to access this private conversation.</p>
        <input
          type="password"
          maxLength="4"
          value={lockPinInput}
          onChange={(e) => {
            setLockPinInput(e.target.value);
            if (e.target.value.length === 4) {
              if (verifyChatUnlock(selectedConversation._id, e.target.value)) {
                setLockPinInput('');
              } else {
                toast.error("Incorrect PIN!");
                setLockPinInput('');
              }
            }
          }}
          className="bg-dark-surface border border-dark-border text-center text-2xl tracking-widest p-3 rounded-xl w-32 focus:outline-none focus:border-primary-500"
        />
      </div>
    );
  }

  // Get online history for the current user
  const otherUser = selectedConversation.participants.find(p => p._id !== user?.id);
  const history = presenceHistory[otherUser?._id] || [];

  // GENZ MOD: Logic moved here to ensure selectedConversation is not null
  const currentUserIsAdmin = selectedConversation?.isGroup &&
    selectedConversation.participants.find(p => p._id === user?.id)?.role === 'admin'; // Added null check for selectedConversation
  const adminOnlyMessagingEnabled = selectedConversation?.isGroup && selectedConversation.adminOnlyMessaging; // Added null check
  const canSendMedia = selectedConversation?.isGroup ? (selectedConversation.canSendMedia || currentUserIsAdmin) : true; // Added null check
  const canCreatePolls = selectedConversation?.isGroup ? (selectedConversation.canCreatePolls || currentUserIsAdmin) : true; // Added null check
  const canChangeGroupInfo = selectedConversation?.isGroup ? (selectedConversation.canChangeGroupInfo || currentUserIsAdmin) : true; // Added null check
  const groupOnlineCount = selectedConversation?.isGroup
    ? (selectedConversation.participants || []).filter((participant) => (
      String(participant?._id) !== String(user?.id) &&
      (onlineUsers || []).some((id) => String(id) === String(participant?._id))
    )).length
    : 0;
  const stickerSuggestions = getEmojiStickerSuggestions(messageInput);
  const currentUserId = String(user?.id || user?._id || '');
  const mentionableParticipants = (selectedConversation?.participants || [])
    .filter((participant) => {
      const participantId = getEntityId(participant);
      return participantId && participantId !== currentUserId && getMentionName(participant);
    })
    .map((participant) => ({
      ...participant,
      _mentionId: getEntityId(participant),
      _mentionName: getMentionName(participant)
    }));
  const mentionSuggestions = mentionState.open
    ? mentionableParticipants
      .filter((participant) =>
        participant._mentionName.toLowerCase().includes(mentionState.query.toLowerCase())
      )
      .slice(0, 8)
    : [];

  const closeMentionPicker = () => {
    setMentionState((prev) => ({ ...prev, open: false, activeIndex: 0 }));
  };

  const selectMention = (participant) => {
    if (!participant) return;
    const cursor = mentionState.cursor || inputRef.current?.selectionStart || messageInput.length;
    const start = mentionState.start >= 0 ? mentionState.start : cursor;
    const before = messageInput.slice(0, start);
    const after = messageInput.slice(cursor).replace(/^\s+/, '');
    const insertion = `@${participant._mentionName} `;
    const nextValue = `${before}${insertion}${after}`;
    const nextCursor = before.length + insertion.length;

    setMessageInput(nextValue);
    setMentionState({ open: false, query: '', start: -1, cursor: nextCursor, activeIndex: 0 });
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleMentionKeyDown = (event) => {
    if (!mentionState.open || !mentionSuggestions.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMentionState((prev) => ({
        ...prev,
        activeIndex: (prev.activeIndex + 1) % mentionSuggestions.length
      }));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setMentionState((prev) => ({
        ...prev,
        activeIndex: (prev.activeIndex - 1 + mentionSuggestions.length) % mentionSuggestions.length
      }));
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      selectMention(mentionSuggestions[mentionState.activeIndex] || mentionSuggestions[0]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMentionPicker();
    }
  };

  const pinnedMessageId = selectedConversation ? pinnedMessages[selectedConversation._id] : null; // Added null check
  const pinnedMessage = pinnedMessageId ? messages.find(m => (m._id || m.id) === pinnedMessageId) : null; // Added null check

  const hasStaleBlobUrl = (value) => typeof value === 'string' && value.startsWith('blob:');
  const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);
  const mediaSourceOf = (message = {}) => (
    message.mediaUrl ||
    message.fileUrl ||
    (isHttpUrl(message.content) ? message.content : '')
  );
  const isStaleBlobMessage = (message = {}) => (
    hasStaleBlobUrl(message.content) ||
    hasStaleBlobUrl(message.mediaUrl) ||
    hasStaleBlobUrl(message.fileUrl) ||
    hasStaleBlobUrl(message.thumbnailUrl) ||
    hasStaleBlobUrl(message.quotedStatus?.mediaUrl)
  );
  const visibleMessages = (messages || []).filter((message) => {
    if (isStaleBlobMessage(message)) return false;
    if (message.disappearAt && new Date(message.disappearAt).getTime() <= Date.now()) return false;

    const isSender = String(message.sender?._id || message.sender) === String(user?.id || user?._id);
    
    // View once logic: Hide from recipient after consumed, always show to sender
    if (message.isViewOnce && !isSender) {
      // If anti-view-once is enabled, always show
      if (mods.antiViewOnce) return true;
      // If consumed, hide from recipient
      if (message.isConsumed) return false;
    }
    
    // Self-destruct: disappears for everyone after timer (default 10s)
    if (message.isSelfDestruct) {
      if (mods.antiViewOnce) return true;
      if (message.disappearAt && new Date(message.disappearAt) <= new Date()) return false;
      if (!isSender && message.isConsumed) return false;
    }

    return true;
  });
  const safeChatWallpaper = hasStaleBlobUrl(mods.chatWallpaper) ? null : mods.chatWallpaper;

  // Custom per-chat wallpaper logic (TM Style)
  const chatConfig = mods?.customWallpapers?.[selectedConversation?._id] || {};
  const activeWallpaper = chatConfig.wallpaper || safeChatWallpaper;
  const activeDim = chatConfig.dim !== undefined ? chatConfig.dim : (mods?.chatWallpaperDim || 0);
  const activeDoodle = chatConfig.doodle !== undefined ? chatConfig.doodle : (mods?.chatWallpaperDoodle !== false);

  const activeZoom = chatConfig.zoom !== undefined ? chatConfig.zoom : (mods?.chatWallpaperZoom || 1);

  const wallpaperStyle = activeWallpaper ? {
    backgroundColor: activeWallpaper.startsWith('#') ? activeWallpaper : '#0b141a',
    backgroundImage: activeWallpaper.startsWith('#')
      ? `linear-gradient(rgba(0,0,0,${activeDim}), rgba(0,0,0,${activeDim}))`
      : `linear-gradient(rgba(0,0,0,${activeDim}), rgba(0,0,0,${activeDim})), url(${activeWallpaper})`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    transform: `scale(${activeZoom})`,
    transformOrigin: 'center',
    transition: 'transform 0.2s ease-in-out'
  } : {
    backgroundColor: '#0b141a',
    transform: `scale(${activeZoom})`,
    transformOrigin: 'center',
    transition: 'transform 0.2s ease-in-out'
  };

  // Filter messages for search
  const filteredMessages = chatSearchQuery
    ? visibleMessages.filter(m => plaintextOf(m).toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : visibleMessages;

  return (
    <div className="flex-1 flex flex-col bg-dark-bg min-w-0 w-full overflow-hidden relative">
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={wallpaperStyle}
      />

      <header
        style={{ backgroundColor: mods.customTheme }}
        className="border-b border-white/10 px-4 py-3 flex items-center gap-4 shadow-lg transition-all duration-500 z-[100]"
      >
        {/* Mobile back arrow to close chat and show list */}
        <button onClick={() => selectConversation(null)} className="md:hidden p-2 hover:bg-dark-hover rounded-lg mr-1 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Desktop sidebar toggle button */}
        {!sidebarOpen && (
          <button onClick={onOpenSidebar} className="hidden md:block p-2 hover:bg-dark-hover rounded-lg">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        )}
        <div className="flex items-center gap-3 flex-1">
          {isSearching ? (
            <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full flex-1">
              <Search size={14} className="text-white/60" />
              <input
                autoFocus
                className="bg-transparent border-none focus:ring-0 text-base md:text-xs text-white w-full"
                placeholder="Search messages..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
              />
              <button onClick={() => { setIsSearching(false); setChatSearchQuery(''); }}><X size={14} className="text-white" /></button>
            </div>
          ) : (
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-white/5 p-1 -ml-1 rounded-lg transition-colors"
              onClick={() => setShowContactInfo(true)}
            >
              {isLiveLocationActive && (
                <span className="text-red-500 text-xs font-bold animate-pulse flex items-center gap-1 mr-2"><Radio size={14} /> LIVE</span>
              )}
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/10">
                {getConversationAvatar() ? (
                  <img src={getConversationAvatar()} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-semibold">
                    {getConversationName().charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-white font-medium">{getConversationName()}</h2>
                {selectedConversation.isGroup && !isOtherUserTyping && (
                  <p className="text-[10px] text-white/60 truncate">
                    {groupOnlineCount} online · {(selectedConversation.participants || []).length} members
                  </p>
                )}
                {!selectedConversation.isGroup && peerPresence && !isOtherUserTyping && (
                  <p className="text-[10px] text-white/60 truncate">
                    {peerPresence.isOnline
                      ? 'online'
                      : peerPresence.lastSeen
                        ? `last seen ${formatMessageTime(peerPresence.lastSeen)}`
                        : 'offline'}
                  </p>
                )}
                {!selectedConversation.isGroup && !peerPresence && history.length > 0 && !isOtherUserTyping && (
                  <p className="text-[10px] text-white/60 truncate">
                    Last 24h activity: {history.slice(-3).map(h => formatMessageTime(h.time)).join(', ')}
                  </p>
                )}
                {isOtherUserTyping && (
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-white/70">typing</p>
                    <div className="flex gap-0.5 mt-1">
                      <div className="w-1 h-1 bg-white/70 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1 h-1 bg-white/70 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1 h-1 bg-white/70 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
                {isOtherUserRecording && (
                  <p className="text-sm text-white/70 animate-pulse">recording audio...</p>
                )}
                {mods.ghostMode && (
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <Ghost size={10} /> Ghost Mode Active
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Header right-side action buttons */}
        {!isSearching && (
          <div className="flex items-center gap-1 ml-auto relative">
            {/* Voice call */}
            <button onClick={() => !isDNDMode && initiateCall('audio', selectedConversation.participants[0])}
              title="Voice Call"
              disabled={isDNDMode}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40">
              <Phone size={18} className="text-white/80" />
            </button>
            {/* Video call */}
            <button onClick={() => !isDNDMode && initiateCall('video', selectedConversation.participants[0])}
              title="Video Call"
              disabled={isDNDMode}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40">
              <Video size={18} className="text-white/80" />
            </button>
            {/* AI Assistant (Coming Soon) */}
            <button onClick={() => {
              import('react-hot-toast').then(({ default: toast }) => {
                toast('GENZ AI Assistant is Coming Soon!', { icon: '✨', style: { background: '#333', color: '#fff' } });
              });
            }} title="AI Assistant"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Sparkles size={18} className="text-purple-400" />
            </button>
            {/* Search in chat */}
            <button onClick={() => setShowSearchMessages(true)} title="Search messages"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Search size={18} className="text-white/80" />
            </button>
            <button onClick={() => setShowMediaGallery(true)} title="Media gallery"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ImageIcon size={18} className="text-white/80" />
            </button>

            {/* Actions Dropdown Toggle (Three Dots) */}
            <button
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              className="block p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="More Options"
            >
              <MoreVertical size={18} className="text-white/80" />
            </button>

            {/* Actions Dropdown List */}
            {showHeaderMenu && (
              <div className="absolute right-0 top-11 bg-dark-surface/95 backdrop-blur-md border border-dark-border rounded-xl shadow-2xl py-2 w-48 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Mobile DND toggle */}
                <button
                  onClick={() => {
                    toggleDNDMode();
                    setShowHeaderMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white"
                >
                  <span className="text-sm font-bold w-4 text-center text-orange-500">{isDNDMode ? '🌙' : '🔔'}</span>
                  <span>{isDNDMode ? 'Disable DND' : 'Do Not Disturb'}</span>
                </button>

                {/* Search messages */}
                <button
                  onClick={() => {
                    setShowSearchMessages(true);
                    setShowHeaderMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white"
                >
                  <Search size={16} className="text-white/60" />
                  <span>Search Messages</span>
                </button>

                <button
                  onClick={() => {
                    setShowMediaGallery(true);
                    setShowHeaderMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white"
                >
                  <ImageIcon size={16} className="text-white/60" />
                  <span>Media Gallery</span>
                </button>

                <button
                  onClick={handleClearCurrentChat}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white border-t border-white/5 mt-1 pt-3"
                >
                  <Trash2 size={16} className="text-white/60" />
                  <span>Clear Chat</span>
                </button>

                <button
                  onClick={handleDeleteCurrentChat}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-red-400"
                >
                  <Trash2 size={16} />
                  <span>Delete Chat</span>
                </button>

                {/* Export chat */}
                <button
                  onClick={() => {
                    handleExportChat('txt');
                    setShowHeaderMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white border-t border-white/5 mt-1 pt-3"
                >
                  <Download size={16} className="text-white/60" />
                  <span>Export Chat (.txt)</span>
                </button>

                {/* Edit Wallpaper */}
                <button
                  onClick={() => {
                    setShowHeaderMenu(false);
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (file) handleUploadWallpaper(file);
                    };
                    input.click();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white"
                >
                  <ImageIcon size={16} className="text-white/60" />
                  <span>Edit Wallpaper</span>
                </button>

                {/* Mobile Group Info */}
                {selectedConversation?.isGroup && (
                  <button
                    onClick={() => {
                      setShowGroupInfo(true);
                      setShowHeaderMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-hover text-left text-sm text-white border-t border-white/5"
                  >
                    <Users size={16} className="text-white/60" />
                    <span>Group Info</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className={`flex-1 overflow-y-auto p-4 scrollbar-thin transition-all relative z-10 ${mods?.fontSize === 'small' ? 'text-xs' :
          mods?.fontSize === 'large' ? 'text-base' :
            mods?.fontSize === 'xlarge' ? 'text-lg' : 'text-sm'
          }`}
      >
        {activeDoodle && (
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm1-61c3.13 0 5.665-2.535 5.665-5.665S38.13 17.67 35 17.67s-5.665 2.535-5.665 5.665S31.87 29 35 29zM9 75c3.13 0 5.665-2.535 5.665-5.665S12.13 63.67 9 63.67 3.335 66.205 3.335 69.33 5.87 75 9 75zm51-61c3.13 0 5.665-2.535 5.665-5.665S57.13 2.67 54 2.67 48.335 5.205 48.335 8.33 50.87 14 54 14zm26 62c3.13 0 5.665-2.535 5.665-5.665S77.13 64.67 74 64.67 68.335 67.205 68.335 70.33 70.87 76 74 76z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
              mixBlendMode: 'overlay',
              zIndex: 0
            }}
          />
        )}
        <div className="relative z-10 w-full flex flex-col min-h-full">
          {loading ? (
            <div className="flex items-center justify-center flex-1 h-full my-auto">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-4 w-full">
              {selectedConversation?.disappearingMessages?.enabled && (
                <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-2 text-yellow-700 dark:text-yellow-300 text-xs rounded-md shadow-sm mb-2 mx-auto max-w-md">
                  <p className="font-medium">⏰ Disappearing Messages</p>
                  <p>Messages disappear after {selectedConversation.disappearingMessages?.duration || selectedConversation.disappearingMessages}</p>
                </div>
              )}
              {selectedConversation?.pinnedMessages?.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-2 text-blue-700 dark:text-blue-300 text-xs rounded-md shadow-sm mb-4 mx-auto max-w-md">
                  <p className="font-medium flex items-center gap-1"><Pin size={12} className="text-blue-500" /> {selectedConversation.pinnedMessages.length} Pinned Message(s)</p>
                </div>
              )}
              {(filteredMessages || []).slice(-visibleCount).map((message, index) => (
                <div
                  id={`msg-${message.id || message._id}`}
                  key={message.id || message._id}
                  className={`flex w-full ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMessageContextMenu({
                      message,
                      position: { x: e.clientX, y: e.clientY }
                    });
                  }}
                  onDoubleClick={() => handleDoubleClick(message._id || message.id)}
                >
                  <div
                    className={`max-w-[75%] relative group shadow-sm transition-all duration-300 ${(message.messageType === 'audio' || message.messageType === 'voice')
                      ? 'bg-transparent p-0'
                      : `px-4 py-2 ${mods?.bubbleStyle === 'sharp' ? 'rounded-none' :
                        mods?.bubbleStyle === 'bubble' ? 'rounded-3xl' :
                          mods?.bubbleStyle === 'rounded' ? 'rounded-2xl' :
                            mods?.bubbleStyle === 'ios' ? 'rounded-[20px]' :
                              'rounded-2xl'
                      } ${isOwnMessage(message)
                        ? 'bg-primary-600 text-white rounded-tr-none ml-12'
                        : 'bg-dark-surface text-dark-text rounded-tl-none mr-12'}`
                      }`}
                    style={
                      (message.messageType !== 'audio' && message.messageType !== 'voice')
                        ? {
                          backgroundColor: isOwnMessage(message)
                            ? (mods?.bubbleSentColor || undefined)
                            : (mods?.bubbleReceivedColor || undefined)
                        }
                        : {}
                    }
                  >
                    {message.isAdmin && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-primary-600 mb-1 bg-white/90 px-2 py-0.5 rounded-full w-fit shadow-sm border border-primary-200">
                        <ShieldCheck size={10} className="text-primary-600" /> GENZ ADMIN
                      </div>
                    )}
                    {/* ── Quoted Reply ── */}
                    {message.replyTo && (
                      <div className="mb-2 bg-black/20 border-l-4 border-[#25d366] rounded-lg p-2 text-xs">
                        <p className="text-[#25d366] font-bold mb-0.5 text-[11px]">
                          {typeof message.replyTo.senderName === 'string' ? message.replyTo.senderName : 'Mtumiaji'}
                        </p>
                        <p className="text-white/70 truncate">
                          {typeof message.replyTo.content === 'string' ? (message.replyTo.content?.substring(0, 60) + (message.replyTo.content?.length > 60 ? '...' : '')) : 'Reply'}
                        </p>
                      </div>
                    )}
                    {/* ── Quoted Status Reply (WhatsApp style) ── */}
                    {message.quotedStatus?.statusId && (
                      <div className="mb-2 bg-black/25 border-l-4 border-[#25d366] rounded-lg p-2 text-xs cursor-pointer hover:bg-black/30 transition-colors">
                        <div className="flex items-center gap-1.5 text-[#25d366] font-bold text-[11px] mb-1">
                          <span>📸</span>
                          <span>{typeof message.quotedStatus.ownerName === 'string' ? message.quotedStatus.ownerName : 'Status'}</span>
                        </div>
                        {message.quotedStatus.mediaUrl ? (
                          <div className="flex items-center gap-2">
                            <img src={message.quotedStatus.mediaUrl} alt="Status" className="w-10 h-10 rounded object-cover" onError={e => { e.target.style.display = 'none'; }} />
                            <p className="text-white/60 text-[11px] truncate">{typeof message.quotedStatus.preview === 'string' ? message.quotedStatus.preview : 'Status'}</p>
                          </div>
                        ) : (
                          <p className="text-white/60 italic truncate">{typeof message.quotedStatus.preview === 'string' ? message.quotedStatus.preview : '📸 Status'}</p>
                        )}
                      </div>
                    )}
                    {/* ── Forwarded Label ── */}
                    {message.isForwarded && !mods?.noForwardLabel && (
                      <div className="flex items-center gap-1 text-[10px] opacity-60 italic mb-1">
                        <Forward size={10} /> Forwarded
                      </div>
                    )}
                    {/* ── GIF Message ── */}
                    {message.messageType === 'gif' && (message.gif?.url || message.mediaUrl || message.content) && (
                      <div className="mb-1">
                        <img
                          src={message.gif?.url || message.mediaUrl || message.content}
                          alt={typeof message.gif?.title === 'string' ? message.gif.title : 'GIF'}
                          className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer"
                          loading="lazy"
                          onClick={() => window.open(message.gif?.url || message.mediaUrl || message.content, '_blank')}
                        />
                        <p className="text-[10px] text-white/40 mt-0.5">GIF</p>
                      </div>
                    )}

                    {/* 📽️ Video Message 📽️ */}
                    {message.messageType === 'video' && mediaSourceOf(message) && (
                      (message.isViewOnce || message.isSelfDestruct) && !mods.antiViewOnce && message.isConsumed ? (
                        <div className="flex items-center gap-2 text-dark-textSecondary py-2 italic text-sm">
                          <Eye size={16} /> {message.isSelfDestruct ? 'Self-destructed' : 'Opened'}
                        </div>
                      ) : (message.isViewOnce || message.isSelfDestruct) && !mods.antiViewOnce ? (
                        <div className="relative mb-1">
                          <video
                            src={mediaSourceOf(message)}
                            className="max-w-full rounded-lg max-h-64 w-full cursor-pointer blur-md"
                          onClick={() => openViewOnceModal(message)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg pointer-events-none">
                            <Eye size={24} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="mb-1">
                          <SignedMedia
                            as="video"
                            src={mediaSourceOf(message)}
                            controls
                            className="max-w-full rounded-lg max-h-64 w-full"
                            preload="metadata"
                          />
                          {message.caption && <p className="text-xs mt-1 opacity-80">{typeof message.caption === 'string' ? message.caption : 'Caption'}</p>}
                        </div>
                      )
                    )}

                    {/* ── Sticker Message ── */}
                    {message.messageType === 'sticker' && (
                      <div className="mb-1">
                        <img
                          src={message.content || message.mediaUrl}
                          alt={typeof message.content === 'string' ? message.content : 'Sticker'}
                          className="w-24 h-24 object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* ── Image Message ── */}
                    {message.messageType === 'image' && (
                      (message.isViewOnce || message.isSelfDestruct) && !mods.antiViewOnce && message.isConsumed ? (
                        <div className="flex items-center gap-2 text-dark-textSecondary py-2 italic text-sm">
                          <Eye size={16} /> {message.isSelfDestruct ? 'Self-destructed' : 'Opened'}
                        </div>
                      ) : (message.isViewOnce || message.isSelfDestruct) && !mods.antiViewOnce ? (
                        <div className="relative">
                          <SignedMedia
                            src={mediaSourceOf(message)}
                            alt={typeof message.content === 'string' ? message.content : 'Media'}
                            className="max-w-full rounded-lg cursor-pointer"
                            loading="lazy"
                            onClick={() => openViewOnceModal(message)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                            <Eye size={24} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <SignedMedia
                            src={mediaSourceOf(message)}
                            alt={typeof message.content === 'string' ? message.content : 'Image'}
                            className="max-w-full rounded-lg"
                            loading="lazy"
                          />
                          {message.caption && <p className="text-xs mt-1 opacity-80">{typeof message.caption === 'string' ? message.caption : 'Caption'}</p>}
                          <button onClick={() => window.open(mediaSourceOf(message), '_blank')} className="mt-2 bg-primary-600 text-white px-3 py-1 rounded-full text-xs hover:bg-primary-700">
                            Download
                          </button>
                        </div>
                      )
                    )}
                    {message.isViewOnce && mods.antiViewOnce && (
                      <div className="flex items-center gap-1 text-[9px] text-purple-500 font-bold uppercase mb-1">
                        <EyeOff size={10} /> View Once (Anti-Delete)
                      </div>
                    )}
                    {message.messageType === 'file' && (
                      <a
                        href={message.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 underline"
                      >
                        <Paperclip className="w-4 h-4" />
                        {typeof message.fileName === 'string' ? message.fileName : 'File'}
                      </a>
                    )}
                    {message.messageType === 'poll' && message.poll && (
                      <div className="mb-2 min-w-[250px] bg-dark-bg/20 p-3 rounded-xl border border-dark-border/50">
                        <p className="font-bold text-dark-text mb-3">{typeof message.poll.question === 'string' ? message.poll.question : 'Poll Question'}</p>
                        <div className="space-y-2">
                          {message.poll.options?.map((option, idx) => {
                            const totalVotes = message.poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
                            const optionVotes = option.votes?.length || 0;
                            const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                            const userId = user?._id || user?.id;
                            const hasVoted = option.votes?.some((v) => String(v) === String(userId));

                            return (
                              <button
                                key={idx}
                                onClick={() => votePoll(message.id || message._id, idx)}
                                className={`w-full p-3 rounded-lg text-left transition-all ${hasVoted ? 'bg-primary-600 text-white' : 'bg-dark-bg/50 hover:bg-dark-bg/80 text-dark-text'
                                  }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium">{option.text}</span>
                                  <span className="text-sm">{percentage}%</span>
                                  <span className="opacity-60">{option.votes?.length || 0} votes</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {message.messageType === 'location' && (() => {
                      const isLive = message.mediaUrl === 'live';
                      return (
                        <div className="mb-1 w-[260px] rounded-lg overflow-hidden border border-white/10 bg-[#e5e5e5] shadow-sm relative group cursor-pointer" onClick={() => window.open(plaintextOf(message), '_blank')}>
                          {/* Map Pattern/Grid Simulation */}
                          <div className="h-[140px] relative w-full flex items-center justify-center opacity-80" style={{
                            backgroundImage: `radial-gradient(#c8d2d9 2px, transparent 2px)`,
                            backgroundSize: '20px 20px',
                            backgroundColor: '#e0e7ec'
                          }}>
                            {/* Map Pin Area */}
                            <div className="relative flex flex-col items-center z-10">
                              {isLive ? (
                                <div className="relative flex items-center justify-center">
                                  <div className="absolute rounded-full border-[3px] border-red-500 w-14 h-14 animate-ping opacity-60" />
                                  <div className="w-10 h-10 rounded-full border-[3px] border-red-500 shadow-xl overflow-hidden z-10 bg-white">
                                    <img src={getConversationAvatar() || ''} className="w-full h-full object-cover" />
                                  </div>
                                </div>
                              ) : (
                                <MapPin className="w-10 h-10 text-red-500 drop-shadow-md z-10" fill="#ef4444" stroke="white" strokeWidth={1.5} />
                              )}
                            </div>
                          </div>
                          {/* Bottom Bar Info */}
                          <div className="bg-white p-3 flex flex-col border-t border-black/10">
                            <p className="text-sm font-bold text-gray-800 truncate">
                              {isLive ? 'Live location' : 'Location'}
                            </p>
                            <span className="text-xs text-blue-500 mt-0.5 truncate hover:underline">
                              View on Google Maps
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    {(message.messageType === 'audio' || message.messageType === 'voice') && (() => {
                      // Find sender info for avatar
                      const sender = selectedConversation?.participants?.find(
                        p => p._id === (message.sender?._id || message.sender)
                      );
                      const senderAvatar = sender?.profilePicture || message.sender?.profilePicture || null;
                      const senderName = sender?.username || message.sender?.username || '';
                      return (
                        <AudioPlayer
                          audioUrl={mediaSourceOf(message)}
                          isOwn={isOwnMessage(message)}
                          duration={message.duration}
                          senderAvatar={senderAvatar}
                          senderName={senderName}
                          autoPlay={mods?.voiceAutoPlay && index === messages.length - 1 && !isOwnMessage(message) && !message.isViewOnce}
                          defaultSpeed={mods?.voiceDefaultSpeed || 1}
                          messageId={message.id || message._id}
                          isLocked={message.isLocked || false}
                          isViewOnce={Boolean(message.isViewOnce) && !mods?.antiViewOnce}
                          onViewOnceComplete={() => openViewOnceMessage(message)}
                          onToggleLock={toggleMessageLock}
                          onDownload={() => {
                            const link = document.createElement('a');
                            link.href = mediaSourceOf(message);
                            link.download = `voice-note-${message.id || message._id}.webm`;
                            link.click();
                          }}
                        />
                      );
                    })()}
                    {message.transcript && (
                      <p className="text-[10px] bg-white/10 p-2 rounded-lg italic text-dark-textSecondary mb-2 border-l-2 border-primary-500">
                        {typeof message.transcript === 'string' ? message.transcript : 'Transcript'}
                      </p>
                    )}
                    {/* Anti-Delete: show revoked badge but keep content */}
                    {message._antiDeletePreserved && (
                      <div className="flex items-center gap-1 text-[9px] text-orange-400 font-bold uppercase mb-1 bg-orange-400/10 px-2 py-0.5 rounded-full w-fit">
                        <span>🚫</span> Deleted (Anti-Delete Active)
                      </div>
                    )}
                    {message.isViewOnce &&
                      !message.isSelfDestruct &&
                      message.messageType === 'text' &&
                      !isOwnMessage(message) &&
                      !mods?.antiViewOnce &&
                      !message.isConsumed && (
                        <button
                          type="button"
                          onClick={() => openViewOnceModal(message)}
                          className="flex items-center gap-2 text-sm italic text-dark-textSecondary py-2 px-3 rounded-lg bg-black/20 border border-white/10 hover:bg-black/30 transition-colors"
                        >
                          <Eye size={16} /> Tap to view once
                        </button>
                      )}
                    {message.isSelfDestruct && !message.isConsumed && (
                      <p className="text-[9px] text-orange-400/90 font-medium mb-1">Disappears in 10 seconds</p>
                    )}
                    {message.isViewOnce &&
                      (!isOwnMessage(message) && !mods?.antiViewOnce || message.isConsumed) &&
                      message.isConsumed && (
                        <div className="flex items-center gap-2 text-dark-textSecondary py-2 italic text-sm">
                          <Eye size={16} /> Opened
                        </div>
                      )}
                    {(!['image', 'video', 'location', 'sticker', 'audio', 'gif'].includes(message.messageType) ||
                      (plaintextOf(message) &&
                        plaintextOf(message) !== mediaSourceOf(message) &&
                        plaintextOf(message) !== `${message.messageType} message` &&
                        !plaintextOf(message).includes('firebasestorage.googleapis.com') &&
                        !plaintextOf(message).includes('res.cloudinary.com') &&
                        !/https?:\/\/[^ ]+\/uploads\//i.test(plaintextOf(message)) &&
                        !plaintextOf(message).includes('maps.google.com') &&
                        !plaintextOf(message).includes('maps.apple.com') &&
                        plaintextOf(message).trim() !== '')) &&
                      !(
                        message.isViewOnce &&
                        !message.isSelfDestruct &&
                        message.messageType === 'text' &&
                        !isOwnMessage(message) &&
                        !mods?.antiViewOnce &&
                        !message.isConsumed
                      ) && !message.isConsumed && (
                        <p className="break-words whitespace-pre-wrap">
                          {mods?.debugEncryption
                            ? (() => {
                              const txt = plaintextOf(message) || '';
                              try { return btoa(unescape(encodeURIComponent(txt))).substring(0, 40) + '... [E2E Encrypted]'; }
                              catch (e) { return '******************* [E2E]'; }
                            })()
                            : renderTextWithMentions(
                              plaintextOf(message),
                              message.mentions || [],
                              user?.id || user?._id
                            )}
                        </p>
                      )}
                    {/* Link Preview - respect mods.linkPreview toggle */}
                    {message.messageType === 'text' && mods?.linkPreview !== false && (() => {
                      const text = plaintextOf(message) || '';
                      const url = extractFirstUrl(text);
                      return url ? <LinkPreviewCard key={url} url={url} /> : null;
                    })()}
                    {translatedMessages[message._id] && (
                      <div className="mt-1 pt-1 border-t border-current border-opacity-20 italic text-xs">
                        {typeof translatedMessages[message.id || message._id] === 'string' ? translatedMessages[message.id || message._id] : 'Translation'}
                      </div>
                    )}
                    <div className={`flex items-center gap-1 mt-1 justify-end ${isOwnMessage(message) ? 'text-white/80' : 'text-dark-textSecondary'
                      }`}>
                      {(message._antiDeletePreserved || message.deletedForEveryone) && (
                        <span title="This message was deleted by the sender (Anti-Delete)" className="text-red-500 mr-1 text-xs">🚫</span>
                      )}
                      {message.isStarred && (
                        <Star size={10} className="text-yellow-500 fill-yellow-500 mr-1" />
                      )}
                      {selectedConversation?.pinnedMessages?.includes(message.id || message._id) && (
                        <Pin size={10} className={isOwnMessage(message) ? "text-white/80 mr-1" : "text-dark-textSecondary mr-1"} />
                      )}
                      <span className="text-xs opacity-70">{formatMessageTime(message.createdAt)}</span>
                      {isOwnMessage(message) && (
                        <span
                          className={`text-[10px] font-black ${message.status === 'read' && !mods?.hideBlueTickColor && (!mods?.tickStyle || mods?.tickStyle === 'default' || mods?.tickStyle === 'ios')
                            ? 'text-blue-400'
                            : message.status === 'delivered'
                              ? 'text-white/70'
                              : 'text-white/40'
                            }`}
                          title={typeof message.status === 'string' ? message.status : 'Status'}
                        >
                          {(() => {
                            const status = message.status;
                            const style = mods?.tickStyle || 'default';
                            const isSent = status === 'sent';

                            switch (style) {
                              case 'batman': return isSent ? '🦇' : '🦇🦇';
                              case 'minions': return isSent ? '🍌' : '🍌🍌';
                              case 'hacker': return isSent ? '/' : '//';
                              case 'hearts': return isSent ? '💖' : '💖💖';
                              case 'ios':
                              case 'default':
                              default: return isSent ? '✓' : '✓✓';
                            }
                          })()}
                        </span>
                      )}
                    </div>
                    {/* ── Quick Emoji Reaction Bar (TM WhatsApp style) ── */}
                    <div className="hidden group-hover:flex absolute -bottom-6 left-0 gap-1 bg-dark-surface border border-dark-border rounded-full px-2 py-1 shadow-xl z-40 animate-in fade-in duration-150">
                      {['❤️', '😂', '😮', '😢', '😡', '👍'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={(e) => { e.stopPropagation(); handleReaction(message._id || message.id, emoji); }}
                          className="text-base hover:scale-125 transition-transform leading-none"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {/* Group reactions by emoji */}
                        {Object.entries(
                          (message.reactions || []).reduce((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message._id || message.id, emoji)}
                            className="flex items-center gap-0.5 text-xs bg-dark-bg/60 border border-dark-border rounded-full px-1.5 py-0.5 hover:bg-dark-hover transition-colors"
                          >
                            <span>{emoji}</span>
                            {count > 1 && <span className="text-[10px] text-dark-textSecondary">{count}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* GENZ MOD: Three-dot Menu for Messages */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMessageMenu(activeMessageMenu === (message.id || message._id) ? null : (message.id || message._id));
                        }}
                        className="absolute top-0 right-0 hidden group-hover:flex bg-dark-surface border border-dark-border rounded-full p-1.5 shadow-lg -mt-8 -mr-2 hover:bg-dark-hover transition-colors z-50"
                        title="More options"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {activeMessageMenu === (message.id || message._id) && (
                        <div className="absolute top-0 right-0 -mt-8 -mr-2 bg-dark-surface border border-dark-border rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden">
                          <div className="py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  setReplyingTo(message);
                                  setActiveMessageMenu(null);
                                } catch (err) {
                                  console.error('Reply error:', err);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                            >
                              <Reply size={14} className="text-dark-text" /> Reply
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  const text = plaintextOf(message);
                                  navigator.clipboard.writeText(text || '');
                                  alert("Text Copied!");
                                  setActiveMessageMenu(null);
                                } catch (err) {
                                  console.error('Copy error:', err);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                            >
                              <Copy size={14} className="text-dark-text" /> Copy
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  setForwardingMessage(message);
                                  setShowForwardModal(true);
                                  setActiveMessageMenu(null);
                                } catch (err) {
                                  console.error('Forward error:', err);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                            >
                              <Forward size={14} className="text-dark-text" /> Forward
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  const messageId = message.id || message._id;
                                  if (messageId && selectedConversation?._id) {
                                    const isPinned = selectedConversation?.pinnedMessages?.includes(messageId);
                                    if (isPinned) {
                                      unpinMessage(messageId);
                                    } else {
                                      pinMessage(messageId);
                                    }
                                  }
                                  setActiveMessageMenu(null);
                                } catch (err) {
                                  console.error('Pin error:', err);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                            >
                              <Pin size={14} className={selectedConversation?.pinnedMessages?.includes(message.id || message._id) ? "text-primary-500" : "text-dark-text"} /> {selectedConversation?.pinnedMessages?.includes(message.id || message._id) ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  const messageId = message.id || message._id;
                                  if (messageId) {
                                    toggleStarMessage(messageId);
                                  }
                                  setActiveMessageMenu(null);
                                } catch (err) {
                                  console.error('Star error:', err);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                            >
                              <Star size={14} className={message.isStarred ? "text-yellow-500 fill-yellow-500" : "text-dark-text"} /> {message.isStarred ? 'Unstar' : 'Star'}
                            </button>
                            {isOwnMessage(message) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    handleEditClick(message);
                                    setActiveMessageMenu(null);
                                  } catch (err) {
                                    console.error('Edit error:', err);
                                  }
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                              >
                                <Edit size={14} className="text-dark-text" /> Edit
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  const id = message._id || message.id;
                                  setMessageInfoId(id);
                                  setShowMessageInfoModal(true);
                                  setActiveMessageMenu(null);
                                } catch (err) {
                                  console.error('Info error:', err);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3"
                            >
                              <Info size={14} className="text-dark-text" /> Info
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  const messageId = message.id || message._id;
                                  if (messageId) {
                                    deleteMessage(messageId);
                                  }
                                  setActiveMessageMenu(null);
                                } catch (err) {
                                  console.error('Delete error:', err);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3 text-red-400"
                            >
                              <Trash2 size={14} /> Delete for me
                            </button>
                            {isOwnMessage(message) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    const messageId = message.id || message._id;
                                    if (messageId) {
                                      handleDeleteForEveryone(messageId);
                                    }
                                    setActiveMessageMenu(null);
                                  } catch (err) {
                                    console.error('Delete error:', err);
                                  }
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-dark-hover flex items-center gap-3 text-red-500"
                              >
                                <Trash2 size={14} /> Delete for everyone
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Download button for media types */}
                    {(message.messageType === 'image' || message.messageType === 'video' || message.messageType === 'audio' || message.messageType === 'file') && mediaSourceOf(message) && (
                      <a href={mediaSourceOf(message)} download className="absolute top-0 left-0 hidden group-hover:flex bg-dark-surface px-2 py-1 rounded text-sm hover:bg-dark-hover -mt-8" title="Download">
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {/* Render pending scheduled messages for this conversation */}
              {(scheduledMessages || [])
                .filter(
                  sm =>
                    String(sm.conversationId?._id || sm.conversationId) === String(selectedConversation._id) &&
                    sm.status === 'pending'
                )
                .map((sm) => (
                  <div
                    key={sm._id}
                    className="flex w-full justify-end opacity-75"
                  >
                    <div
                      className={`max-w-[75%] relative group shadow-sm transition-all duration-300 px-4 py-2 bg-primary-600/60 text-white rounded-2xl rounded-tr-none ml-12 border border-dashed border-white/30`}
                    >
                      <div className="flex items-center gap-1 text-[10px] text-white/80 font-bold uppercase mb-1">
                        <Clock size={10} className="animate-pulse" /> Scheduled Message
                      </div>
                      <p className="break-words whitespace-pre-wrap italic">
                        {sm.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 justify-end">
                        <span className="text-[10px] bg-black/25 px-1.5 py-0.5 rounded text-white/80">
                          Sends at: {new Date(sm.sendAt).toLocaleString()}
                        </span>
                        <button
                          onClick={() => {
                            if (confirm('Cancel this scheduled message?')) {
                              cancelScheduledMessage(sm._id);
                            }
                          }}
                          className="text-[10px] bg-red-600/80 hover:bg-red-700 px-1.5 py-0.5 rounded text-white font-bold transition-colors"
                          title="Cancel scheduled message"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              <div ref={messagesEndRef} /> {/* Fixed messagesEndRef */}
            </div>
          )}
        </div>
      </div>

      {
        replyingTo && (
          <div className="bg-dark-surface border-t border-dark-border px-4 py-2 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <p className="text-xs text-dark-textSecondary">Replying to:</p>
              <div className="flex items-center gap-2">
                {replyingTo.messageType === 'audio' && <Mic size={14} className="text-primary-500" />}
                <p className="text-sm text-dark-text truncate">
                  {replyingTo.messageType === 'audio' ? 'Voice Note' : (typeof replyingTo.content === 'string' ? replyingTo.content : (typeof replyingTo.message === 'string' ? replyingTo.message : 'Message'))}
                </p>
              </div>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-dark-textSecondary hover:text-dark-text">
              ✕
            </button>
          </div>
        )
      }

      <div className="bg-dark-surface border-t border-dark-border p-4 relative z-10">
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-2 right-2 md:left-4 md:right-auto md:w-[350px] max-w-[calc(100vw-1rem)] z-50 overflow-hidden rounded-lg shadow-2xl border border-dark-border bg-dark-surface min-h-[350px] flex items-center justify-center">
            <React.Suspense fallback={<div className="animate-pulse text-dark-textSecondary">Loading emojis...</div>}>
              <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" width="100%" />
            </React.Suspense>
          </div>
        )}

        {/* STICKER STORE SIMULATION */}
        {showStickerStore && (
          <div className="absolute bottom-20 left-2 right-2 md:left-4 md:right-auto md:w-72 max-w-[calc(100vw-1rem)] bg-dark-surface border border-dark-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom duration-200">
            <div className="p-3 bg-primary-600 text-white font-bold flex justify-between items-center text-xs">
              <span>GENZ Sticker Store</span>
              <button onClick={() => setShowStickerStore(false)}>✕</button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <h4 className="text-[10px] uppercase font-black text-dark-textSecondary mb-2">My Stickers</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {(downloadedStickers || []).map((s, i) => (
                      <img key={i} src={s} className="w-12 h-12 cursor-pointer hover:scale-110 transition-transform" onClick={() => sendSticker(s)} />
                    ))}
                    {downloadedStickers.length === 0 && <p className="text-[10px] text-gray-500 col-span-4 italic">No stickers yet. Visit store below.</p>}
                  </div>
                </div>
                <hr className="border-dark-border" />
                <div>
                  <h4 className="text-[10px] uppercase font-black text-dark-textSecondary mb-2">Search Stickers</h4>
                  <input
                    type="text"
                    placeholder="Search for stickers..."
                    value={stickerSearchQuery}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg p-2 text-dark-text focus:outline-none focus:border-primary-500 mb-3"
                    onChange={(e) => setStickerSearchQuery(e.target.value)}
                  />
                  <h4 className="text-[10px] uppercase font-black text-dark-textSecondary mb-2">Sticker Store</h4>
                  {(stickerPacks || []).filter(pack =>
                    !stickerSearchQuery ||
                    pack.name.toLowerCase().includes(stickerSearchQuery.toLowerCase()) ||
                    pack.author.toLowerCase().includes(stickerSearchQuery.toLowerCase())
                  ).map(pack => (
                    <div key={pack.id} className="bg-dark-bg p-2 rounded-lg flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-bold text-white">{pack.name}</p>
                        <p className="text-[9px] text-gray-500">by {pack.author}</p>
                      </div>
                      <button onClick={() => downloadStickerPack(pack)} className="p-1.5 bg-primary-600 rounded text-white hover:bg-primary-700">
                        <Download size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2 p-3 bg-dark-bg border-t border-dark-border" role="form" aria-label="Send message">
          {!voiceRecorderActive && (
            <div className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar max-w-[140px] md:max-w-none flex-shrink-0 snap-x">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 hover:bg-dark-hover rounded-full transition-colors text-primary-500 snap-center shrink-0"
                title="Emoji"
                aria-label="Toggle emoji picker"
                aria-expanded={showEmojiPicker}
              >
                <Smile className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <button
                type="button"
                onClick={() => setShowStickerStore(!showStickerStore)}
                className={`p-2 rounded-lg transition-colors snap-center shrink-0 ${showStickerStore ? 'bg-primary-600 text-white' : 'hover:bg-dark-hover text-dark-text'}`}
              >
                <Sticker className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className={`p-2 rounded-lg transition-colors snap-center shrink-0 ${showAttachmentMenu ? 'bg-primary-600 text-white' : 'hover:bg-dark-hover text-dark-text'}`}
                title="Attachments"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setIsViewOnceEnabled(!isViewOnceEnabled)}
                className={`p-2 rounded-lg transition-colors snap-center shrink-0 ${isViewOnceEnabled ? 'bg-purple-600 text-white' : 'hover:bg-dark-hover text-dark-text'}`}
                title="Send as View Once"
              >
                <Eye size={20} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Schedule button clicked, calling handleSchedule');
                  handleSchedule();
                  console.log('handleSchedule called, showScheduleModal should be true');
                }}
                className="p-2 hover:bg-dark-hover rounded-lg transition-colors snap-center shrink-0"
                title="Schedule Message"
              >
                <CalendarClock className="w-5 h-5 text-dark-text" />
              </button>
              <button
                disabled={adminOnlyMessagingEnabled && !currentUserIsAdmin}
                type="button"
                onClick={handleAIWritingHelp}
                className={`p-2 rounded-lg transition-colors snap-center shrink-0 ${showAIWritingHelp ? 'bg-yellow-500/20 text-yellow-300' : 'hover:bg-dark-hover text-dark-text'}`}
                title="AI Writing Help"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Attachment Menu */}
          {showAttachmentMenu && (
            <div className="absolute bottom-14 left-2 right-2 md:left-0 md:right-auto md:w-max md:max-w-2xl bg-dark-surface border border-dark-border rounded-xl shadow-xl p-3 grid grid-cols-4 gap-2 md:flex md:flex-row md:flex-wrap md:gap-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <AttachmentIcon icon={<FileText className="text-blue-500" />} label="Document" onClick={() => docInputRef.current?.click()} disabled={!canSendMedia && !currentUserIsAdmin} />
              <AttachmentIcon
                icon={<Camera className="text-pink-500" />}
                label="Camera"
                onClick={openCamera}
                disabled={!canSendMedia && !currentUserIsAdmin}
                title="Camera (Emulator may need permission)"
              />
              <AttachmentIcon icon={<ImageIcon className="text-purple-500" />} label="Gallery" onClick={() => fileInputRef.current?.click()} disabled={!canSendMedia && !currentUserIsAdmin} />
              <AttachmentIcon icon={<Headphones className="text-orange-500" />} label="Audio" onClick={openAudioAttachment} disabled={!canSendMedia && !currentUserIsAdmin} title="Audio (Emulator may need permission)" />
              <AttachmentIcon icon={<MapPin className="text-green-500" />} label="Location" onClick={() => handleShareLocation('current')} disabled={!canSendMedia && !currentUserIsAdmin} />
              <AttachmentIcon icon={<MapPin className="text-red-500" />} label="Live Loc." onClick={() => handleShareLocation('live')} disabled={!canSendMedia && !currentUserIsAdmin} />
              <AttachmentIcon icon={<Contact className="text-blue-400" />} label="Contact" onClick={handleContactSimulation} disabled={!canSendMedia && !currentUserIsAdmin} />
              <AttachmentIcon icon={<Grid3x3 className="text-pink-400" />} label="GIF" onClick={() => setShowGIFPicker(true)} disabled={!canSendMedia && !currentUserIsAdmin} />
              <AttachmentIcon icon={<BarChart2 className="text-yellow-600" />} label="Poll" disabled={!canCreatePolls && !currentUserIsAdmin} onClick={() => setShowPollModal(true)} />
              <AttachmentIcon icon={<Clock className="text-purple-600" />} label="Disappear" onClick={() => handleSetDisappearingMessages()} disabled={!selectedConversation} />
              {/* GENZ Ultra Attachments */}
              {mods?.trendingStickers && (
                <AttachmentIcon icon={<TrendingUp className="text-pink-500" />} label="Stickers" onClick={() => { setShowTrendingStickers(true); setShowAttachmentMenu(false); }} />
              )}
              {mods?.aiCaption && (
                <AttachmentIcon icon={<Wand2 className="text-purple-400" />} label="AI Caption" onClick={() => { setShowAICaption(true); setShowAttachmentMenu(false); }} />
              )}
              <AttachmentIcon icon={<Sparkles className="text-yellow-400" />} label="Big File" onClick={() => { setShowChunkedUploader(true); setShowAttachmentMenu(false); }} />
            </div>
          )}
          {showAIWritingHelp && (
            <div className="absolute bottom-16 left-2 right-2 md:left-40 md:right-16 bg-dark-surface border border-yellow-500/30 rounded-xl shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 text-yellow-300 text-xs font-bold">
                  <Sparkles size={14} />
                  AI Writing Help
                </div>
                <button
                  type="button"
                  onClick={() => setShowAIWritingHelp(false)}
                  className="text-dark-textSecondary hover:text-dark-text"
                  aria-label="Close AI writing help"
                >
                  <X size={14} />
                </button>
              </div>
              {aiWritingLoading ? (
                <p className="text-xs text-dark-textSecondary">Preparing suggestion...</p>
              ) : (
                <>
                  <p className="text-sm text-dark-text leading-relaxed bg-black/20 rounded-lg p-2 max-h-28 overflow-y-auto">
                    {aiWritingSuggestion || 'No suggestion yet'}
                  </p>
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleAIWritingHelp}
                      className="px-3 py-1.5 rounded-lg bg-white/10 text-dark-text text-xs hover:bg-white/15"
                    >
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMessageInput(aiWritingSuggestion);
                        setShowAIWritingHelp(false);
                        inputRef.current?.focus();
                      }}
                      disabled={!aiWritingSuggestion}
                      className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs hover:bg-primary-500 disabled:opacity-50"
                    >
                      Use
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {stickerSuggestions.length > 0 && !mentionState.open && !showAttachmentMenu && !showAIWritingHelp && (
            <div className="absolute bottom-16 left-2 right-2 md:left-40 md:right-auto md:w-80 bg-dark-surface border border-dark-border rounded-xl shadow-xl p-2 z-40">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] uppercase tracking-wide text-dark-textSecondary whitespace-nowrap">Sticker suggestions</span>
                {stickerSuggestions.map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    onClick={() => {
                      sendSticker(sticker.url);
                      setMessageInput('');
                    }}
                    className="w-12 h-12 rounded-lg bg-white/5 hover:bg-white/10 p-1 flex-shrink-0"
                    title={`Send ${sticker.emoji} sticker`}
                  >
                    <img src={sticker.url} alt={`${sticker.emoji} sticker`} className="w-full h-full object-contain" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {mentionState.open && mentionSuggestions.length > 0 && !showAttachmentMenu && !showAIWritingHelp && (
            <div className="absolute bottom-16 left-2 right-2 md:left-40 md:right-auto md:w-80 bg-dark-surface border border-dark-border rounded-xl shadow-xl p-2 z-50">
              <div className="flex items-center gap-2 px-2 pb-2 text-[10px] uppercase tracking-wide text-dark-textSecondary">
                <AtSign size={12} />
                Mention
              </div>
              <div className="max-h-64 overflow-y-auto">
                {mentionSuggestions.map((participant, index) => (
                  <button
                    key={participant._mentionId}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectMention(participant);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${index === mentionState.activeIndex ? 'bg-primary-600/20' : 'hover:bg-white/10'
                      }`}
                    title={`Mention @${participant._mentionName}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary-600/20 overflow-hidden flex items-center justify-center text-sm font-semibold text-primary-100">
                      {participant.profilePicture ? (
                        <img src={participant.profilePicture} alt={participant._mentionName} className="w-full h-full object-cover" />
                      ) : (
                        participant._mentionName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-dark-text truncate">{participant._mentionName}</p>
                      <p className="text-xs text-dark-textSecondary truncate">@{participant._mentionName}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Hidden file inputs */}
          <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e)} className="hidden" accept="image/*,video/*" />
          <input type="file" ref={docInputRef} onChange={(e) => handleFileUpload(e, 'file')} className="hidden" accept=".pdf,.doc,.docx,.txt" />
          <input type="file" ref={audioInputRef} onChange={(e) => handleFileUpload(e, 'audio')} className="hidden" accept="audio/*" />
          <input type="file" ref={cameraInputRef} onChange={(e) => handleFileUpload(e)} className="hidden" accept="image/*,video/*" capture />

          {/* ── Text input — hidden while VoiceRecorder is recording ── */}
          {!voiceRecorderActive && (
            <input
              ref={inputRef}
              type="text"
              disabled={adminOnlyMessagingEnabled && !currentUserIsAdmin}
              value={messageInput}
              onChange={(e) => handleTyping(e.target.value, e.target.selectionStart)}
              onKeyDown={handleMentionKeyDown}
              onBlur={() => window.setTimeout(closeMentionPicker, 120)}
              placeholder="Type a message..."
              className="flex-1 min-w-[100px] px-4 py-2.5 bg-dark-bg border border-dark-border rounded-2xl text-dark-text placeholder-dark-textSecondary focus:outline-none focus:border-primary-500 transition-colors text-base md:text-sm"
            />
          )}

          {/* ── TM WhatsApp Voice Recorder ── */}
          {(!messageInput.trim() || voiceRecorderActive) && (
            <VoiceRecorder
              onSend={handleVoiceNoteSend}
              canSend={canSendMedia || currentUserIsAdmin}
              ghostMode={mods?.ghostMode}
              sendRecordingStatus={sendRecordingStatus}
              onActiveChange={setVoiceRecorderActive}
              voiceEffectMod={mods?.voiceEffect ?? 'none'}
              onFallback={() => audioInputRef.current?.click()}
              voiceConstraints={{
                echoCancellation: mods?.voiceEchoCancellation !== false,
                noiseSuppression: mods?.voiceNoiseSuppression !== false,
                autoGainControl: true
              }}
            />
          )}

          {/* ── Send button — hidden while recording ── */}
          {!voiceRecorderActive && messageInput.trim() && (
            <button
              type="submit"
              disabled={adminOnlyMessagingEnabled && !currentUserIsAdmin}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-primary-600 hover:bg-primary-500 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 shadow-md shadow-primary-600/30"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          )}
        </form>

        {/* Live Reactions — floating emoji layer */}
        {mods?.liveReactions && (
          <LiveReactions
            chatId={selectedConversation?._id}
            socket={getSocket()}
            enabled={true}
          />
        )}
      </div>

      {
        showForwardModal && forwardingMessage && (
          <ForwardDialog
            messageId={forwardingMessage._id || forwardingMessage.id}
            messageContent={typeof forwardingMessage.content === 'string' ? forwardingMessage.content : (forwardingMessage.message || '')}
            conversationId={selectedConversation?._id}
            onClose={() => { setShowForwardModal(false); setForwardingMessage(null); }}
          />
        )
      }

      {/* SearchMessages modal */}
      {showSearchMessages && (
        <SearchMessages
          conversationId={selectedConversation?._id}
          onSelectMessage={(msg) => {
            try {
              const id = msg._id || msg.id;
              if (id) {
                const el = document.getElementById(`msg-${id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            } catch (e) { }
            setShowSearchMessages(false);
          }}
          onClose={() => setShowSearchMessages(false)}
        />
      )}

      {/* Media gallery modal */}
      {showMediaGallery && (
        <MediaGallery
          conversationId={selectedConversation?._id}
          onClose={() => setShowMediaGallery(false)}
        />
      )}

      {/* Message context menu (right-click) */}
      {messageContextMenu && (
        <MessageContextMenu
          message={messageContextMenu.message}
          position={messageContextMenu.position}
          conversationId={selectedConversation?._id}
          currentUserId={user?.id}
          onDelete={() => handleContextMenuDelete(messageContextMenu.message)}
          onEdit={() => { handleEditClick(messageContextMenu.message); }}
          onToggleStar={() => handleContextMenuStar(messageContextMenu.message)}
          onClose={() => setMessageContextMenu(null)}
        />
      )}

      {/* Message Info modal (from header / menu) */}
      {showMessageInfoModal && messageInfoId && (
        <MessageInfo
          messageId={messageInfoId}
          onClose={() => { setShowMessageInfoModal(false); setMessageInfoId(null); }}
        />
      )}

      {
        showPollModal && (
          <PollModal
            onClose={() => setShowPollModal(false)}
            onSubmit={handlePollSubmit}
          />
        )
      }

      {/* Group Info Panel */}
      <AnimatePresence>
        {showGroupInfo && selectedConversation?.isGroup && (
          <GroupInfo
            group={selectedConversation}
            currentUserId={user?._id || user?.id}
            onClose={() => setShowGroupInfo(false)}
          />
        )}
      </AnimatePresence>

      {showFilePreview && previewFile && (
        <FilePreview
          fileUrl={previewFile.fileUrl}
          fileName={previewFile.fileName}
          onClose={() => setShowFilePreview(false)}
        />
      )}
      {showSearchMessages && selectedConversation?._id && (
        <SearchMessages
          conversationId={selectedConversation?._id}
          onSelectMessage={(message) => {
            setChatSearchQuery(plaintextOf(message) || message.content || '');
            setIsSearching(true);
          }}
          onClose={() => setShowSearchMessages(false)}
        />
      )}
      {showMediaGallery && selectedConversation?._id && (
        <MediaGallery
          conversationId={selectedConversation?._id}
          onClose={() => setShowMediaGallery(false)}
        />
      )}
      {messageContextMenu && (
        <MessageContextMenu
          message={messageContextMenu.message}
          position={messageContextMenu.position}
          conversationId={selectedConversation?._id}
          currentUserId={user?.id || user?._id}
          onClose={() => setMessageContextMenu(null)}
          onDelete={() => handleContextMenuDelete(messageContextMenu.message)}
          onEdit={() => {
            handleEditClick(messageContextMenu.message);
            setMessageContextMenu(null);
          }}
          onToggleStar={() => handleContextMenuStar(messageContextMenu.message)}
        />
      )}
      {/* \u2500\u2500 Schedule Message Modal (Item 28) \u2500\u2500 */}
      {
        showScheduleModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl w-full max-w-sm mx-4 shadow-2xl border border-dark-border overflow-hidden">
              <div className="p-4 bg-primary-600 text-white flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2"><CalendarClock size={18} /> Schedule Message</h3>
                <button onClick={() => setShowScheduleModal(false)} className="hover:bg-white/20 p-1 rounded-full">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-dark-bg rounded-xl p-3 border border-dark-border">
                  <p className="text-xs text-dark-textSecondary mb-1">Message to schedule:</p>
                  <p className="text-sm text-dark-text font-medium truncate">{messageInput}</p>
                </div>
                <div>
                  <label className="text-xs text-dark-textSecondary font-bold uppercase block mb-2">Send at:</label>
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={e => setScheduleDateTime(e.target.value)}
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-dark-text focus:outline-none focus:border-primary-500 text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowScheduleModal(false)}
                    className="flex-1 py-2 rounded-xl border border-dark-border text-dark-textSecondary hover:bg-dark-hover transition-colors text-sm">
                    Cancel
                  </button>
                  <button onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Schedule button] Clicked');
                    confirmSchedule();
                  }}
                    className="flex-1 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-bold">
                    ⏰ Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* ── GIF Picker Modal ── */}
      {
        showGIFPicker && (
          <GIFPicker
            onSelect={handleGIFSelect}
            onClose={() => setShowGIFPicker(false)}
          />
        )
      }

      {/* ── DND Mode overlay indicator ── */}
      {
        isDNDMode && (
          <div className="fixed top-4 right-4 bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xl z-[999] flex items-center gap-2 animate-pulse">
            🔕 DND Mode Active
          </div>
        )
      }

      {/* ── Search results count ── */}
      {
        isSearching && chatSearchQuery && (
          <div className="absolute top-16 left-0 right-0 bg-dark-surface/90 text-center text-xs text-white/70 py-1 z-30 backdrop-blur-sm">
            {filteredMessages?.length || 0} result{filteredMessages?.length !== 1 ? 's' : ''} for "{chatSearchQuery}"
          </div>
        )
      }

      {/* ── GENZ Ultra: Trending Stickers Modal ── */}
      {showTrendingStickers && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-lg bg-[#0d1f35] rounded-t-3xl shadow-2xl overflow-hidden border-t border-white/10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-bold flex items-center gap-2">
                <TrendingUp size={18} className="text-pink-400" /> Trending Stickers
              </span>
              <button onClick={() => setShowTrendingStickers(false)} className="text-white/60 hover:text-white p-1"><X size={20} /></button>
            </div>
            <TrendingStickers
              onSelect={(sticker) => {
                sendSticker(sticker);
                setShowTrendingStickers(false);
              }}
            />
          </div>
        </div>
      )}

      {/* ── GENZ Ultra: AI Caption Modal ── */}
      {showAICaption && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <AICaption
            onSelect={(caption) => {
              setMessageInput(prev => prev ? `${prev} ${caption}` : caption);
              setShowAICaption(false);
            }}
            onClose={() => setShowAICaption(false)}
          />
        </div>
      )}

      {/* ── GENZ Ultra: Chunked Uploader (10GB files) ── */}
      {showChunkedUploader && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <ChunkedUploader
            onComplete={(fileUrl, fileName) => {
              sendMessage(fileName || 'Big File', user?.username, {
                messageType: 'file',
                mediaUrl: fileUrl,
                fileName: fileName || 'Big File'
              });
              setShowChunkedUploader(false);
            }}
            onClose={() => setShowChunkedUploader(false)}
          />
        </div>
      )}

      {/* ── Camera / Video Modal ── */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black z-[1000] flex flex-col">
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
            <button onClick={closeCamera} className="text-white hover:bg-white/20 p-2 rounded-full"><X size={24} /></button>
            <div className="flex gap-4">
              <button onClick={() => setCameraMode('photo')} className={`px-4 py-1 rounded-full font-bold ${cameraMode === 'photo' ? 'bg-primary-600 text-white' : 'bg-white/20 text-white'}`}>Photo</button>
              <button onClick={() => setCameraMode('video')} className={`px-4 py-1 rounded-full font-bold ${cameraMode === 'video' ? 'bg-red-600 text-white' : 'bg-white/20 text-white'}`}>Video</button>
            </div>
            <div className="w-8"></div>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
            {recordedVideoUrl ? (
              <video src={recordedVideoUrl} controls className="max-h-full w-full object-contain" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="p-6 bg-gradient-to-t from-black to-transparent absolute bottom-0 w-full flex justify-center items-center">
            {recordedVideoUrl ? (
              <div className="flex gap-6">
                <button onClick={() => setRecordedVideoUrl(null)} className="p-4 bg-white/20 text-white rounded-full"><Trash2 size={24} /></button>
                <button onClick={sendRecordedVideo} className="p-4 bg-primary-600 text-white rounded-full"><Send size={24} /></button>
              </div>
            ) : cameraMode === 'photo' ? (
              <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white"></div>
              </button>
            ) : (
              isRecordingVideo ? (
                <div className="flex items-center gap-6">
                  <div className="text-red-500 font-mono text-xl animate-pulse">{Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}</div>
                  <button onClick={stopVideoRecording} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                    <div className="w-10 h-10 rounded bg-red-600"></div>
                  </button>
                </div>
              ) : (
                <button onClick={startVideoRecording} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-600"></div>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* ── Audio Attachment Short-Clip Modal ── */}
      {showAudioModal && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-dark-surface w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-dark-border">
            <div className="p-4 border-b border-dark-border flex justify-between items-center bg-primary-600/10">
              <h3 className="text-white font-bold flex items-center gap-2"><Mic size={18} className="text-primary-500" /> Record Audio</h3>
              <button onClick={closeAudioAttachment} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-8 flex flex-col items-center">
              {recordedAudioUrl ? (
                <div className="w-full flex flex-col items-center gap-4">
                  <audio src={recordedAudioUrl} controls className="w-full" />
                  <div className="flex gap-4 w-full">
                    <button onClick={() => setRecordedAudioUrl(null)} className="flex-1 py-2 bg-dark-bg text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 border border-dark-border"><Trash2 size={16} /> Delete</button>
                    <button onClick={sendRecordedAudioAttachment} className="flex-1 py-2 bg-primary-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Send size={16} /> Send</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="text-3xl font-mono text-primary-500">
                    {Math.floor(audioDuration / 60)}:{(audioDuration % 60).toString().padStart(2, '0')}
                  </div>
                  {isRecordingAudio ? (
                    <button onClick={stopAudioAttachmentRecording} className="w-24 h-24 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center animate-pulse border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                      <Square size={32} className="fill-current" />
                    </button>
                  ) : (
                    <button onClick={startAudioAttachmentRecording} className="w-24 h-24 bg-primary-600 text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(37,211,102,0.3)]">
                      <Mic size={40} />
                    </button>
                  )}
                  <p className="text-white/50 text-xs">
                    {isRecordingAudio ? "Recording in progress..." : "Tap to start recording"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showLiveLocationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`${headerClass} rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-white/10`}>
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-white font-medium text-lg">Share live location</h3>
              <button onClick={() => setShowLiveLocationModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="relative h-48 bg-[#e0e7ec]" style={{ backgroundImage: 'radial-gradient(#c8d2d9 2px, transparent 2px)', backgroundSize: '20px 20px' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border-[3px] border-red-500 overflow-hidden shadow-lg z-10 bg-white">
                  <img src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.username}`} className="w-full h-full object-cover" alt="Me" />
                </div>
                <div className="absolute rounded-full border-4 border-red-500/30 w-24 h-24 animate-ping"></div>
              </div>
              <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur text-xs px-3 py-2 rounded-lg text-center font-medium text-gray-800 shadow-md">
                Participants in this chat will see your location in real-time. This feature shares your location for the duration you choose.
              </div>
            </div>
            <div className="p-4 flex flex-col gap-4 bg-dark-bg">
              <div>
                <label className="text-xs text-gray-400 font-medium mb-2 block">Share for</label>
                <div className="flex bg-white/5 rounded-xl p-1 gap-1 border border-white/10">
                  {[
                    { id: 15, label: '15 minutes' },
                    { id: 60, label: '1 hour' },
                    { id: 480, label: '8 hours' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setLiveLocationDuration(opt.id)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${liveLocationDuration === opt.id ? 'bg-primary-500 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={liveLocationComment}
                onChange={(e) => setLiveLocationComment(e.target.value)}
                placeholder="Add comment"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary-500"
              />
              <div className="flex justify-end mt-2">
                <button onClick={confirmShareLiveLocation} className="bg-primary-500 hover:bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-transform hover:scale-105 active:scale-95">
                  <Send size={20} className="ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCurrentLocationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`${headerClass} rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-white/10`}>
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-white font-medium text-lg">Send current location</h3>
              <button onClick={() => setShowCurrentLocationModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="relative h-48 bg-[#d8f3dc]/30" style={{ backgroundImage: 'radial-gradient(#b7e4c7 2px, transparent 2px)', backgroundSize: '20px 20px' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border-[3px] border-emerald-500 overflow-hidden shadow-lg z-10 bg-white">
                  <img src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.username}`} className="w-full h-full object-cover" alt="Me" />
                </div>
                <div className="absolute rounded-full border-4 border-emerald-500/30 w-20 h-20 animate-pulse"></div>
              </div>
              <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur text-xs px-3 py-2 rounded-lg text-center font-medium text-gray-800 shadow-md flex flex-col gap-0.5">
                <span className="text-emerald-700 font-bold">📍 Send this location</span>
                {currentLocationCoords && (
                  <span className="text-gray-600">
                    Accurate to {Math.round(currentLocationCoords.accuracy || 15)} meters • Lat: {currentLocationCoords.latitude.toFixed(5)}, Lng: {currentLocationCoords.longitude.toFixed(5)}
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 flex flex-col gap-4 bg-dark-bg">
              <input
                type="text"
                value={currentLocationComment}
                onChange={(e) => setCurrentLocationComment(e.target.value)}
                placeholder="Add caption"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end">
                <button onClick={confirmShareCurrentLocation} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-transform hover:scale-105 active:scale-95">
                  <Send size={20} className="ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View Once Modal ── */}
      {viewOnceModalOpen && viewOnceMessageData && (
        <div className="fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center" onClick={closeViewOnceModal}>
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={closeViewOnceModal}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <X size={24} />
            </button>
            
            {/* Content */}
            {viewOnceMessageData.messageType === 'image' ? (
              <img
                src={mediaSourceOf(viewOnceMessageData)}
                alt="View Once"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            ) : viewOnceMessageData.messageType === 'video' ? (
              <video
                src={mediaSourceOf(viewOnceMessageData)}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            ) : viewOnceMessageData.messageType === 'audio' ? (
              <div className="bg-dark-surface p-8 rounded-2xl border border-dark-border">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary-600/20 flex items-center justify-center">
                    <Mic size={24} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Voice Note</p>
                    <p className="text-dark-textSecondary text-sm">
                      {viewOnceMessageData.duration ? `${Math.floor(viewOnceMessageData.duration / 60)}:${(viewOnceMessageData.duration % 60).toString().padStart(2, '0')}` : ''}
                    </p>
                  </div>
                </div>
                <AudioPlayer
                  audioUrl={mediaSourceOf(viewOnceMessageData)}
                  isOwn={false}
                  duration={viewOnceMessageData.duration}
                  autoPlay={true}
                />
              </div>
            ) : (
              <div className="bg-[#0b141a] p-8 rounded-2xl border border-white/10 max-w-lg mx-4">
                <p className="text-white text-xl whitespace-pre-wrap break-words text-left leading-relaxed">
                  {plaintextOf(viewOnceMessageData)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Contact Info Panel ── */}
      <AnimatePresence>
        {showContactInfo && (
          <ContactInfo
            contact={otherUser}
            conversation={selectedConversation}
            onClose={() => setShowContactInfo(false)}
            onSearchMessages={() => {
              setShowContactInfo(false);
              setIsSearching(true);
            }}
            onMediaGallery={() => {
              setShowContactInfo(false);
              setShowMediaGallery(true);
            }}
            onMuteChat={toggleMuteChat}
            onBlockUser={blockUser}
            onUnblockUser={unblockUser}
            onClearChat={handleClearCurrentChat}
            onDeleteChat={handleDeleteCurrentChat}
            onExportChat={() => handleExportChat('txt')}
            onToggleDisappearing={updateDisappearingMessages}
            onToggleChatLock={(chatId) => toggleChatLock(chatId, !selectedConversation?.isLocked, '')}
            onWallpaperChange={(chatId, color) => {
              const customWallpapers = { ...(mods.customWallpapers || {}) };
              if (color === 'default') {
                delete customWallpapers[chatId];
              } else {
                customWallpapers[chatId] = {
                  ...customWallpapers[chatId],
                  wallpaper: color
                };
              }
              setMods(prev => ({ ...prev, customWallpapers }));
              if (window.toast) window.toast.success('Chat wallpaper applied!');
            }}
            isMuted={selectedConversation?.isMuted}
            isBlocked={blockedUsers?.some(b => String(b._id || b) === String(otherUser?._id))}
            isLocked={selectedConversation?.isLocked}
            currentUserId={user?.id}
            disappearingDuration={selectedConversation?.disappearingMessages?.duration || 'Off'}
          />
        )}
      </AnimatePresence>

      {showDisappearingPicker && (
        <div
          className="fixed inset-0 z-[180] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowDisappearingPicker(false)}
        >
          <div
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
              {DISAPPEARING_OPTIONS.map((opt) => {
                const current = selectedConversation?.disappearingMessages?.enabled
                  ? (selectedConversation.disappearingMessages.duration || '24h')
                  : 'Off';
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      applyDisappearingMessages(opt.value);
                      setShowDisappearingPicker(false);
                    }}
                    className={`w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors ${
                      current === opt.value ? 'text-[#00a884]' : 'text-white'
                    }`}
                  >
                    <span className="text-sm">{opt.label}</span>
                    {current === opt.value ? (
                      <div className="w-5 h-5 rounded-full border-2 border-[#00a884] flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#00a884]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-white/30" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div >
  );
};

export default ChatArea;


