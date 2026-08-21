import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useChat, applyVoiceEffect } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import { ArrowLeft, MoreVertical, Search, Smile, Paperclip, Send, Mic, Image as ImageIcon, MessageCircle, Ghost, Forward, Square, MapPin, ShieldCheck, Globe, BarChart2, CalendarClock, Info, UserMinus, UserCheck, ShieldAlert, Copy, Link, Pin, X, Edit, Briefcase, Plus, Eye, EyeOff, Clock, Lock, Sticker, Download, FileText, Camera, Contact, Trash2, Reply, Share2, Star, Archive, BellOff, Bell, Radio, Users, Languages, Grid3x3, Lock as LockIcon, Unlock, ChevronLeft, AtSign, DollarSign, Video as VideoIcon, Heart, Flag } from 'lucide-react';
import { formatMessageTime, decryptMessage } from '../utils/formatDate';
import { exportChatAsTxt, exportChatAsWhatsAppTxt } from '../utils/chatExporter';
import FormattedText from './FormattedText';
import { wrapWithMarker } from '../utils/formatText';
import SignedMedia from './SignedMedia';
import { getSocket } from '../services/socket';
import { applyAntiScreenshot, initAntiScreenshotListeners, setScreenshotAttemptCallback, getScreenshotAttemptCallback, isAntiScreenshotActive } from '../utils/antiScreenshot';
import { hasStaleBlobUrl } from '../utils/blobUtils';
import { AnimatePresence } from 'framer-motion';
import PollModal from './PollModal';
import FilePreview from './FilePreview';
import SearchMessages from './SearchMessages';
import MediaGallery from './MediaGallery';
import MessageContextMenu from './MessageContextMenu';
import MessageInfo from './MessageInfo';
import ForwardDialog from './ForwardDialog';
import ReportDialog from './ReportDialog';
import VoiceWaveform from './VoiceWaveform';
import VoiceMessageBubble from './VoiceMessageBubble';
import VoiceRecorder from './VoiceRecorder';
import DocumentMessage from './DocumentMessage';
import AudioPlayer from './AudioPlayer';
import LiveReactions from './LiveReactions';
import MediaPickerPanel from './MediaPickerPanel';
import DrawingPanel from './DrawingPanel';
import CropRotatePanel from './CropRotatePanel';
import PaymentRequestModal, { PaymentRequestsPanel } from './PaidFeatures/PaymentRequestModal';
import ChunkedUploader from './ChunkedUploader';
import ContactInfo from './ContactInfo';
import GroupInfo from './GroupInfo';
import StickerPicker from './StickerPicker';
import StickerImage, { hasEmojiChar } from './StickerImage';
import { useStickers } from '../context/StickerContext';
import { uploadVoiceNote, getAudioDuration, analyzeAudioForWaveform } from '../services/voiceService';
import toast from 'react-hot-toast';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';
import { compressImage } from '../utils/imageCompression';
// New components for enhanced features
import MediaViewer from './MediaViewer';
import ProfileEnlarger from './ProfileEnlarger';
import TypingIndicator from './TypingIndicator';
import TypingStatus from './TypingStatus';
import ReplyMessage from './ReplyMessage';
import ContactPickerModal from './ContactPickerModal';
import ProductCatalogue from './ProductCatalogue';
import AutoRefreshIndicator from './AutoRefreshIndicator';
import FloatingStickerOverlay from './FloatingStickerOverlay';
import LeafletMap from './LeafletMap';
import { getNotificationSettings, vibrateTyping } from '../services/notificationService';
import { spawnBubbleBurst } from '../utils/bubbleBurst';

const API_URL = resolveApiBase() || '/api';

import {
  DISAPPEARING_OPTIONS, FONT_OPTIONS, headerClass, extractFirstUrl,
  getEmojiStickerSuggestions, escapeRegExp, getEntityId, getMentionName,
  getActiveMentionToken, buildMentionPayload
} from '../utils/chatTextHelpers';
import { renderTextWithMentions, LinkPreviewCard } from '../utils/chatText';
import MessageBubbleList from './MessageBubbleList';
import MessageComposer from './MessageComposer';
import ConversationHeader from './ConversationHeader';
import MessageListArea from './MessageListArea';
import ChatModals from './ChatModals';


const ChatArea = ({ sidebarOpen, onOpenSidebar, mods, onOpenGENZSettings }) => { // Added mods and onOpenGENZSettings
  mods = mods || {};
  const safeMods = mods;
  const { user: localUser } = useUser();
  const {
    user: chatUser,
    selectedConversation, messages, setMessages, loading, sendMessage,
  handleRetryMessage,
    updateLiveLocation, stopLiveLocation,
    editMessage, deleteMessage, clearChat, deleteChat, addReaction,
    sendTypingStatus, forwardMessage, conversations,
    sendRecordingStatus, isOtherUserTyping, isOtherUserRecording, typingByConversation,
    onlineUsers, lastSeenByUser, blockedUsers, blockUser, unblockUser,
    createPoll, votePoll, scheduleMessage, scheduledMessages, cancelScheduledMessage,
    updateGroupMember, joinGroup, updateDisappearingMessages, toggleAdminOnlyMessaging, updateGroupPermission, createCustomRole, assignRole, viewProfile,
    pinMessage, unpinMessage, pinnedMessages, presenceHistory, unlockedSessionChats, verifyChatUnlock, toggleChatLock, toggleStarMessage, toggleMessageLock, toggleMuteChat, toggleArchiveChat, markAsRead, revealViewOnce, markViewOnceViewed, getUserStatusWithGhostMode, reportMessage,
    sendFloatingSticker, floatingStickerHandlers, setFloatingStickerHandlers,
    isDNDMode, toggleDNDMode, selectConversation, setMods,
    loadOlderMessages, hasOlderMessages
  } = useChat();
  const { sendSticker, favoriteStickers, toggleFavoriteSticker } = useStickers();
  const user = chatUser || localUser;
  const [messageInput, setMessageInput] = useState('');
  const [selectedFont, setSelectedFont] = useState(mods?.defaultMessageFont || 'default');
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [mentionState, setMentionState] = useState({
    open: false,
    query: '',
    start: -1,
    cursor: 0,
    activeIndex: 0
  });
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState('emoji');
  const [selectedMedia, setSelectedMedia] = useState(null); // { type, url, meta } — composer staging (TikTok-style)
  const [viewerMedia, setViewerMedia] = useState(null); // media-viewer modal state (separate from composer staging)
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLiveLocationActive, setIsLiveLocationActive] = useState(false); // State for live location
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showTextMenu, setShowTextMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [textSelectionMenu, setTextSelectionMenu] = useState(null); // { x, y, messageId, text, ownMessage }
  const [lockPinInput, setLockPinInput] = useState('');
  const [quickReactionMsg, setQuickReactionMsg] = useState(null);
  const [reportTarget, setReportTarget] = useState(null); // message opened in ReportDialog

  // Follow the Default Message Text Font from Genz Settings (applies to outgoing messages)
  useEffect(() => {
    setSelectedFont(mods?.defaultMessageFont || 'default');
  }, [mods?.defaultMessageFont]);

  // Close message menu + quick reactions on outside click
  useEffect(() => {
    if (!activeMessageMenu && !quickReactionMsg) return;
    const handler = (event) => {
      const target = event.target;
      if (!target) return;
      if (
        target.closest('[data-message-menu-button]') ||
        target.closest('[data-quick-reaction-menu]')
      ) {
        return;
      }
      setActiveMessageMenu(null);
      setQuickReactionMsg(null);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [activeMessageMenu, quickReactionMsg]);

  useEffect(() => {
    if (!showHeaderMenu) return;
    const outsideClick = (event) => {
      if (headerMenuRef.current?.contains(event.target)) return;
      setShowHeaderMenu(false);
    };
    document.addEventListener('mousedown', outsideClick);
    return () => document.removeEventListener('mousedown', outsideClick);
  }, [showHeaderMenu]);

  useEffect(() => {
    if (!showAttachmentMenu) return;
    const outsideClick = (event) => {
      if (attachmentMenuRef.current?.contains(event.target)) return;
      setShowAttachmentMenu(false);
    };
    document.addEventListener('mousedown', outsideClick);
    return () => document.removeEventListener('mousedown', outsideClick);
  }, [showAttachmentMenu]);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null); // {id, content}
  const [isViewOnceEnabled, setIsViewOnceEnabled] = useState(false);
  const [allowScreenshotEnabled, setAllowScreenshotEnabled] = useState(false);
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
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProductCatalogue, setShowProductCatalogue] = useState(false); // msgId showing quick reactions
  // Swipe-to-reply touch tracking
  const swipeTouchStartRef = useRef({});
  const swipeActiveRef = useRef(null); // message id being swiped
  const swipeOffsetRef = useRef(0);
  const [swipeReplyAnim, setSwipeReplyAnim] = useState({}); // {msgId: offsetX}
  const [showRecordingUI, setShowRecordingUI] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [stickerSearchQuery, setStickerSearchQuery] = useState('');

  // ── TikTok-style: send a sticker together with whatever text is typed
  // and whatever message is currently being replied to. The caption and
  // the reply-quote both ride along in the same bubble as the sticker.
  const handleSendStickerWithCaption = (stickerUrl, options = {}) => {
    const caption = options.caption || messageInput.trim();
    sendSticker(stickerUrl, {
      replyTo: options.replyTo || replyingTo,
      caption: caption || undefined
    });
    setMessageInput('');
    setReplyingTo(null);
    setShowStickerStore(false);
    if (options.isFloating && sendFloatingSticker) {
      sendFloatingSticker(stickerUrl, { 
        ...options, 
        caption,
        chatId: selectedConversation?._id
      });
    }
  };
  const [voiceRecorderActive, setVoiceRecorderActive] = useState(false);
  const [showStickerStore, setShowStickerStore] = useState(false);
  const messagesEndRef = useRef(null);

  // Note: --app-height / --app-offset-top (mobile keyboard handling) is
  // already managed globally by initViewportHeightFix() in App.jsx, using
  // utils/useViewportHeight.js as the single source of truth.
  const textSelectionMenuRef = useRef(null);
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
  const messageMenuRef = useRef(null);
  const sendButtonRef = useRef(null);
  const headerMenuRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const liveLocationWatchIdRef = useRef(null);
  const liveLocationIntervalRef = useRef(null);
  const lastLocationSentRef = useRef(null);
  const liveLocationMessageIdRef = useRef(null);
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
  const viewOnceModalOpenRef = useRef(false);
  const [showDrawingEditor, setShowDrawingEditor] = useState(false);
  const [drawingImageUrl, setDrawingImageUrl] = useState('');
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');
  // showPaymentModal already declared above at line 329 (original) for subscription payments


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

  // ── Video Notes (WhatsApp-style circular video) ──
  const [showVideoNoteModal, setShowVideoNoteModal] = useState(false);
  const videoNoteStreamRef = useRef(null);
  const videoNoteRecorderRef = useRef(null);
  const videoNoteChunksRef = useRef([]);
  const [isRecordingVideoNote, setIsRecordingVideoNote] = useState(false);
  const [videoNoteDuration, setVideoNoteDuration] = useState(0);
  const videoNoteTimerRef = useRef(null);
  const [recordedVideoNoteUrl, setRecordedVideoNoteUrl] = useState(null);
  const videoNotePreviewRef = useRef(null);
  const videoNoteSendingRef = useRef(false);

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
  const [showStickerPacks, setShowStickerPacks] = useState(false);
  const [floatingStickerMode, setFloatingStickerMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [showChunkedUploader, setShowChunkedUploader] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showMessageInfoModal, setShowMessageInfoModal] = useState(false);
  const [messageInfoId, setMessageInfoId] = useState(null);
  const [floatingStickerSpawner, setFloatingStickerSpawner] = useState(null);
  const [ownFloatingStickers, setOwnFloatingStickers] = useState([]);
  const [receivedFloatingStickers, setReceivedFloatingStickers] = useState([]);

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
    if (m.messageType === 'structured' && Array.isArray(m.structuredContent)) {
      const textPart = m.structuredContent.find(c => c.type === 'text');
      return textPart ? textPart.value : '';
    }
    return decryptMessage(m.content || m.message);
  }, []);

  // Glass mode (frosted panels + video background) is handled by the
  // glass-mode-active class + CSS; the container gets the glass-panel hook
  // so the video shows through when glass mode is on.
  useEffect(() => {
    return () => {
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (videoTimerRef.current) clearInterval(videoTimerRef.current);
      if (liveLocationIntervalRef.current) clearInterval(liveLocationIntervalRef.current);
      if (liveLocationWatchIdRef.current) navigator.geolocation.clearWatch(liveLocationWatchIdRef.current);
      if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach(t => t.stop());
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Smart scroll: only auto-scroll when user is at bottom or new messages arrive
  const userScrollPositionRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const prevConversationIdRef = useRef(null);
  // Infinite scroll: anchor + counters to preserve scroll position when older
  // messages get prepended.
  const olderAnchorRef = useRef(null);
  const prevMessagesCountRef = useRef(0);
  
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (selectedConversation?._id !== prevConversationIdRef.current) {
      prevConversationIdRef.current = selectedConversation?._id;
      shouldAutoScrollRef.current = true;
      olderAnchorRef.current = null;
      prevMessagesCountRef.current = 0;
      setVisibleCount(50);
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 150);
      return;
    }
    
    if (shouldAutoScrollRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [messages, selectedConversation?._id]);

  // Derived message lists — computed BEFORE any useEffect that references them
  // (a dep array like [filteredMessages] must not sit above the declaration,
  // otherwise opening a chat crashes with a TDZ ReferenceError).
  const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);
  const mediaSourceOf = (message = {}) => (
    message.mediaUrl ||
    message.fileUrl ||
    (isHttpUrl(message.content) ? message.content : '')
  );
  // Animated (video) stickers — created from videos in StickerCreator. They are
  // stored with a video URL, so render them as <video> instead of a static image.
  const isVideoSticker = (message = {}) => {
    const raw = message.content || message.mediaUrl || '';
    return Boolean(message.isVideo) ||
      /^data:video\//i.test(raw) ||
      /\.(webm|mp4|mov)(\?|$)/i.test(raw.split('?')[0]);
  };
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

    // View Once logic
    const isSender = message.sender === user?.id || message.sender?._id === user?.id;
    if (message.isViewOnce) {
      if (safeMods.antiViewOnce) return true;
      if (message.isConsumed) return false;
    }
    if (message.messageType === 'viewOnce') {
      if (safeMods.antiViewOnce) return true;
      if (message.disappearAt && new Date(message.disappearAt) <= new Date()) return false;
      if (!isSender && message.isConsumed) return false;
    }
    return true;
  });

  const filteredMessages = chatSearchQuery
    ? visibleMessages.filter(m => m && plaintextOf(m)?.toLowerCase()?.includes(chatSearchQuery.toLowerCase()))
    : visibleMessages;

  // Preserve scroll position after older messages are prepended by infinite scroll
  useEffect(() => {
    const msgsCount = (filteredMessages || []).length;
    const added = msgsCount - prevMessagesCountRef.current;
    if (added > 0 && olderAnchorRef.current !== null) {
      setVisibleCount(prev => prev + added);
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight - olderAnchorRef.current;
      }
      olderAnchorRef.current = null;
    }
    prevMessagesCountRef.current = msgsCount;
  }, [filteredMessages]);

  // WhatsApp-style text-selection menu on messages: detect a non-empty
  // selection inside a message bubble and offer Copy / Select all / format.
  useEffect(() => {
    const onMouseUp = () => {
      const container = messagesContainerRef.current;
      if (!container) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setTextSelectionMenu(null);
        return;
      }
      const anchor = sel.anchorNode?.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentElement : sel.anchorNode;
      const bubble = anchor?.closest?.('[id^="msg-"]');
      if (!bubble || !container.contains(bubble)) {
        setTextSelectionMenu(null);
        return;
      }
      const messageId = bubble.id.replace('msg-', '');
      const msg = (filteredMessages || []).find(
        (m) => String(m._id || m.id) === messageId
      );
      if (!msg || typeof plaintextOf(msg) !== 'string') {
        setTextSelectionMenu(null);
        return;
      }
      const rect = sel.getRangeAt(0)?.getBoundingClientRect?.();
      if (!rect) {
        setTextSelectionMenu(null);
        return;
      }
      const isOwn = isOwnMessage(msg);
      setTextSelectionMenu({
        x: rect.left + rect.width / 2,
        y: rect.top,
        messageId,
        text: sel.toString(),
        ownMessage: isOwn,
      });
    };
    const onMouseDown = (e) => {
      if (textSelectionMenuRef.current?.contains(e.target)) return;
      setTextSelectionMenu(null);
    };
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [filteredMessages]);
  
  // ── Swipe-to-Reply handlers ─────────────────────────────────────────
  const handleMsgTouchStart = useCallback((e, message) => {
    const t = e.touches[0];
    swipeTouchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    swipeActiveRef.current = message._id || message.id;
    swipeOffsetRef.current = 0;
  }, []);

  const handleMsgTouchMove = useCallback((e, message) => {
    if (!swipeTouchStartRef.current.x) return;
    const t = e.touches[0];
    const dx = t.clientX - swipeTouchStartRef.current.x;
    const dy = Math.abs(t.clientY - swipeTouchStartRef.current.y);
    const msgId = message._id || message.id;
    // Only horizontal swipe right, ignore vertical scroll (improved threshold)
    if (dy > 20) { swipeTouchStartRef.current = {}; return; }
    if (dx > 5 && dx < 100) {
      swipeOffsetRef.current = dx;
      setSwipeReplyAnim(prev => ({ ...prev, [msgId]: dx }));
    }
  }, []);

  const handleMsgTouchEnd = useCallback((e, message) => {
    const offset = swipeOffsetRef.current;
    const msgId = message._id || message.id;
    // Improved threshold for better mobile experience
    if (offset > 60) {
      setReplyingTo(message);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    // Reset animation
    setSwipeReplyAnim(prev => ({ ...prev, [msgId]: 0 }));
    swipeTouchStartRef.current = {};
    swipeOffsetRef.current = 0;
  }, [setReplyingTo]);

  // Track user scroll position
  const handleMessagesScroll = (e) => {
    const container = e.target;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    shouldAutoScrollRef.current = isAtBottom;
    
    // Load more messages when scrolling to top
    if (container.scrollTop === 0) {
      const totalInMemory = filteredMessages.length;
      if (visibleCount < totalInMemory) {
        // Reveal more of what's already in memory
        setVisibleCount(prev => Math.min(prev + 50, totalInMemory));
      } else if (hasOlderMessages && selectedConversation?._id) {
        // Fetch the next older page (50) from the server
        olderAnchorRef.current = container.scrollHeight;
        setLoadingOlder(true);
        loadOlderMessages(selectedConversation._id).finally(() => setLoadingOlder(false));
      }
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      document.title = getConversationName();
    }
  }, [selectedConversation, localUser?.id]);

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
    if (!otherId) { setPeerPresence(null); return; }
    lastFetchedUserIdRef.current = String(otherId);

    // FEATURE FIX: this effect used to just reset peerPresence to null and
    // stop — it never actually read anything, so "online"/"last seen" never
    // rendered no matter what. Presence is fully real-time already (the
    // socket-driven onlineUsers list + lastSeenByUser map from ChatContext),
    // so we just derive peerPresence from those instead of polling HTTP.
    const isOnline = (onlineUsers || []).some((id) => String(id) === String(otherId));
    const lastSeen = lastSeenByUser?.[String(otherId)] || other?.lastSeen || null;
    setPeerPresence({ isOnline, lastSeen });

    return () => {
      // Cleanup if needed
    };
  }, [selectedConversation?._id, selectedConversation?.participants, user?.id, user?._id, onlineUsers, lastSeenByUser]);

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

  function getConversationName() {
    if (!selectedConversation) return '';
    if (selectedConversation.isGroup) {
      return selectedConversation.groupName || 'Group';
    }
    const otherUser = (selectedConversation.participants || []).find((p) => String(p?._id || p?.id || p) !== String(user?.id || user?._id));
    // Message yourself — single-participant self chat
    if (!otherUser && (selectedConversation.participants || []).length > 0) {
      return 'You';
    }
    return otherUser?.username || otherUser?.name || 'Unknown';
  }

  function getConversationAvatar() {
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
    const otherUser = (selectedConversation.participants || []).find((p) => String(p?._id || p?.id || p) !== String(user?.id || user?._id));
    if (otherUser?.profilePicture && !hasStaleBlobUrl(otherUser.profilePicture)) {
      return otherUser.profilePicture;
    }
    // Message yourself — use own avatar
    if (!otherUser && (selectedConversation.participants || []).length > 0 && user?.profilePicture && !hasStaleBlobUrl(user.profilePicture)) {
      return user.profilePicture;
    }
    // Fallback: generic avatar from ui-avatars
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.username || otherUser?.name || (!otherUser && (selectedConversation.participants || []).length === 1 ? 'You' : 'User'))}&background=random&color=fff`;
  }


  const handleSendMessage = async (e) => {
    e.preventDefault();
    // Allow sending when only a sticker preview is staged (no typed text yet)
    if ((!messageInput.trim() && !selectedMedia) || !selectedConversation) return;

    // Check if conversation is blocked before sending message
    const otherUser = selectedConversation.participants?.find(
      (p) => String(p?._id || p?.id || p) !== String(user?.id || user?._id)
    );
    if (otherUser?.blockedUsers?.includes(String(user?.id || user?._id))) {
      toast.error('You cannot send messages to this user');
      return;
    }
    if (blockedUsers?.some(id => String(id) === String(otherUser?._id || otherUser?.id))) {
      toast.error('You have blocked this user. Unblock them to send messages.');
      return;
    }

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
      let finalOptions = {
        chatId: selectedConversation._id,
        isGroup: selectedConversation.isGroup,
        ghostMode: safeMods.ghostMode,
        isSelfDestruct: Boolean(safeMods.selfDestruct),
        selfDestructTimer: safeMods.selfDestruct ? 10 : null,
        isViewOnce: safeMods.selfDestruct ? false : isViewOnceEnabled,
        allowScreenshot: allowScreenshotEnabled ? true : undefined,
        mentions,
        replyTo: replyingTo
      };

      if (selectedMedia?.type === 'sticker') {
        // TikTok-style combined message: sticker + typed text ride as ONE bubble
        await sendSticker(selectedMedia.url, {
          replyTo: replyingTo,
          caption: sanitizedMessage || undefined,
          isViewOnce: safeMods.selfDestruct ? false : isViewOnceEnabled
        });
      } else if (selectedMedia) {
        finalOptions.messageType = 'structured';
        finalOptions.structuredContent = [
          { type: 'text', value: sanitizedMessage, font: selectedFont !== 'default' ? selectedFont : undefined },
          { type: selectedMedia.type, value: selectedMedia.url, meta: selectedMedia.meta }
        ];
        await sendMessage(sanitizedMessage, user?.username || 'Me', finalOptions);
      } else {
        finalOptions.font = selectedFont !== 'default' ? selectedFont : undefined;
        await sendMessage(sanitizedMessage, user?.username || 'Me', finalOptions);
      }
      // GENZ Exclusive: "Chat Bubble Animations" — confetti/hearts burst.
      // This used to just toggle a CSS class with no matching styles
      // anywhere, so turning the mod on had zero visible effect.
      if (safeMods?.bubbleAnimations) {
        spawnBubbleBurst(sendButtonRef.current);
      }
    }

    setMessageInput('');
    setSelectedFont(mods?.defaultMessageFont || 'default');
    setIsViewOnceEnabled(false);
    setMentionState({ open: false, query: '', start: -1, cursor: 0, activeIndex: 0 });
    setShowMediaPanel(false);
    setSelectedMedia(null);
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
    if (!safeMods.ghostMode) { // Assuming mods is passed to ChatArea, or retrieved from context
      sendTypingStatus(true);
      // Reset timeout on every key stroke
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => sendTypingStatus(false), 2000); // Stop typing after 2s of inactivity
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setMessageInput((prev) => prev + emojiObject.emoji);
    inputRef.current?.focus();
  };

  // WhatsApp-style text formatting: wrap the selected text (or insert markers
  // at the cursor) with *bold* / _italic_ / ~strikethrough~ / `monospace`.
  const handleFormatText = (marker) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? messageInput.length;
    const end = input?.selectionEnd ?? messageInput.length;
    const { value, cursorStart, cursorEnd } = wrapWithMarker(messageInput, start, end, marker);
    setMessageInput(value);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  // Format text selected inside a message bubble (text-selection menu): for
  // own messages this opens the composer in edit mode with the selection
  // wrapped in the requested marker.
  const handleFormatSelection = (marker) => {
    const sel = textSelectionMenu;
    if (!sel) return;
    const msg = (filteredMessages || []).find(
      (m) => String(m._id || m.id) === sel.messageId
    );
    const fullText = typeof plaintextOf(msg) === 'string' ? plaintextOf(msg) : '';
    const selected = sel.text || '';
    const start = fullText.indexOf(selected);
    if (!msg || start === -1) {
      setTextSelectionMenu(null);
      return;
    }
    const { value } = wrapWithMarker(fullText, start, start + selected.length, marker);
    setTextSelectionMenu(null);
    // Open edit mode with the formatted text staged in the composer.
    setEditingMessage({ id: msg._id || msg.id, content: value });
    setMessageInput(value);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(value.length, value.length);
    });
  };

  // Copy the selected text from the message bubble, preserving markers so
  // formatting survives when pasted back into the composer.
  const handleCopySelection = () => {
    const sel = textSelectionMenu;
    if (!sel) return;
    navigator.clipboard?.writeText(sel.text).catch(() => {});
    setTextSelectionMenu(null);
  };

  // Select all text of the message bubble (WhatsApp text-menu feature).
  const handleSelectAllSelection = () => {
    const sel = textSelectionMenu;
    if (!sel) return;
    const bubble = document.getElementById(`msg-${sel.messageId}`);
    if (bubble) {
      const range = document.createRange();
      range.selectNodeContents(bubble);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    setTextSelectionMenu(null);
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
        if (mediaRecorderRef.current?.state !== 'recording') return;
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
        if (audioChunksRef.current.length === 0) {
          audioContext.close();
          return;
        }
        const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Clean up audio context
        audioContext.close();

        // ── VOICE CHANGER: Apply pitch effect before upload ──
        let audioBlob = rawBlob;
        if (safeMods?.voiceEffect && safeMods.voiceEffect !== 'none') {
          try {
            audioBlob = await applyVoiceEffect(rawBlob, safeMods.voiceEffect);
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
              voiceEffect: safeMods?.voiceEffect || 'none',
              duration: recordingDuration,
              size: audioFile.size,
              chatId: selectedConversation._id,
              isGroup: selectedConversation.isGroup,
              isViewOnce: isViewOnceEnabled,
              replyTo: replyingTo
            });
            setIsViewOnceEnabled(false);
            setReplyingTo(null);
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
      if (!safeMods.ghostMode) sendRecordingStatus(true);

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
      if (!safeMods.ghostMode) sendRecordingStatus(false);
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
      if (!safeMods.ghostMode) sendRecordingStatus(false);
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
    else if (deltaY > 50) {
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
    else if (deltaY > 50) {
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
        const voiceFxLabel = appliedVoiceEffect ?? safeMods?.voiceEffect ?? 'none';
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
          isViewOnce: useViewOnce,
          replyTo: replyingTo
        });
        if (useViewOnce) setIsViewOnceEnabled(false);
        setReplyingTo(null);
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
        deleteMessage(messageId, true);
        toast.success("Message deleted for everyone");
        return;
      }

      const response = await authFetch(`${API_URL}/chat/messages/${messageId}/delete-for-everyone`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        deleteMessage(messageId, true);
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
      toast.error('Your browser does not support location sharing.');
      return;
    }

    if (type === 'current') {
      const toastId = toast.loading('Fetching your current location...');

      const handleFallback = (errMsg) => {
        toast.dismiss(toastId);
        // Default fallback to Dar es Salaam/Nairobi region coordinates
        const fallbackCoords = { latitude: -6.7924, longitude: 39.2083, accuracy: 1500 };
        setCurrentLocationCoords(fallbackCoords);
        setCurrentLocationComment('');
        setShowCurrentLocationModal(true);
        toast.error('Could not get your exact location. Opened with default location.');
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
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
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
    const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}&layer=c`;
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
        caption: currentLocationComment,
        replyTo: replyingTo
      }
    );
    setReplyingTo(null);
    setShowCurrentLocationModal(false);
    setCurrentLocationComment('');
  };

  const confirmShareLiveLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (startPos) => {
        const { latitude, longitude } = startPos.coords;
        const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}&layer=c`;
        const msgText = liveLocationComment ? `${liveLocationComment}\n\n📍 Live Location Sharing Started\n${locationUrl}` : `📍 Live Location Sharing Started\n${locationUrl}`;
        const expiresAt = new Date(Date.now() + liveLocationDuration * 60 * 1000).toISOString();
        const result = await sendMessage(
          msgText,
          user?.username,
          {
            messageType: 'location',
            latitude,
            longitude,
            isLiveLocation: true,
            liveLocationExpiresAt: expiresAt,
            duration: liveLocationDuration,
            chatId: selectedConversation?._id,
            isGroup: selectedConversation?.isGroup,
            replyTo: replyingTo
          }
        );
        // Remember the persisted message id so subsequent GPS ticks update
        // THIS bubble in place instead of creating new chat messages.
        liveLocationMessageIdRef.current = result?.id || null;

        setIsLiveLocationActive(true);
        setShowLiveLocationModal(false);
        setLiveLocationComment('');
        setReplyingTo(null);
        lastLocationSentRef.current = { latitude, longitude };

        liveLocationWatchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const newLat = pos.coords.latitude;
            const newLng = pos.coords.longitude;
            const last = lastLocationSentRef.current;
            const moved = !last ||
              Math.abs(newLat - last.latitude) > 0.0001 ||
              Math.abs(newLng - last.longitude) > 0.0001;
            if (moved && liveLocationMessageIdRef.current) {
              lastLocationSentRef.current = { latitude: newLat, longitude: newLng };
              updateLiveLocation(liveLocationMessageIdRef.current, newLat, newLng);
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
      () => toast.error('Failed to get your initial location.')
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
    if (liveLocationMessageIdRef.current) {
      stopLiveLocation(liveLocationMessageIdRef.current);
      liveLocationMessageIdRef.current = null;
    }
    setIsLiveLocationActive(false);
    sendMessage('🛑 Live Location Sharing Stopped.', user?.username, { messageType: 'text' });
  };

  const handleFileUpload = async (e, forcedType = null, isViewOnce = isViewOnceEnabled) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = (safeMods?.highResMedia ? 50 : 10) * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large (max ${safeMods?.highResMedia ? 50 : 10}MB)`);
      return;
    }

    // TM WhatsApp feature: Crop then doodle on images before sending
    if (file.type.startsWith('image/') && !forcedType) {
      const blobUrl = URL.createObjectURL(file);
      setCropImageUrl(blobUrl);
      setPendingImageFile({ file, caption: '', opts: { isViewOnce, forcedType: null } });
      setShowCropEditor(true);
      if (e?.target) e.target.value = '';
      return;
    }

    uploadAndSendFile(file, null, isViewOnce, forcedType, e);
  };

  // Upload the (possibly edited) media file and send it as a message
  const uploadAndSendFile = async (file, caption, isViewOnce, forcedType, originalEvent) => {
    const maxSize = (safeMods?.highResMedia ? 50 : 10) * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large (max ${safeMods?.highResMedia ? 50 : 10}MB)`);
      return;
    }

    // Compress image attachments on send to reduce bandwidth and server storage.
    // We honor the high-res flag (used for wallpapers/avatars) — when that's on
    // we keep originals so users can upload full-resolution media.
    let outgoingFile = file;
    if (!safeMods?.highResMedia && file.type.startsWith('image/')) {
      try {
        const opts = safeMods?.compressionQuality
          ? { maxWidth: safeMods.compressionWidth || 1080, quality: safeMods.compressionQuality }
          : undefined;
        const result = opts ? await compressImage(file, opts.maxWidth, opts.quality) : await compressImage(file, 1080, 0.7);
        if (typeof result === 'string' && result.startsWith('data:image/jpeg')) {
          const byteString = atob(result.split(',')[1]);
          const mime = result.split(',')[0].match(/:(.*?);/)[1];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          outgoingFile = new File([new Blob([ab], { type: mime })], file.name, { type: 'image/jpeg' });
        }
      } catch (e) {
        console.warn('[ChatArea] Image compression failed, sending original:', e?.message || e);
      }
    }

    const resolvedCaption = caption ?? (
      (outgoingFile.type.startsWith('image/') || outgoingFile.type.startsWith('video/'))
        ? window.prompt("Add a caption (optional):", "")
        : null
    );

    const formData = new FormData();
    formData.append('file', outgoingFile);

    try {
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
          if (outgoingFile.type.startsWith('image/')) type = 'image';
          else if (outgoingFile.type.startsWith('video/')) type = 'video';
          else if (outgoingFile.type.startsWith('audio/')) type = 'audio';
        }

        const mediaContent = resolvedCaption?.trim()
          || (type === 'image' ? 'Photo' : type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : outgoingFile.name || 'Document');

        await sendMessage(mediaContent, user?.username, {
          messageType: type,
          mediaUrl: uploadedUrl,
          fileName: file.name,
          caption: resolvedCaption,
          isViewOnce: isViewOnce,
          chatId: selectedConversation._id,
          isGroup: selectedConversation.isGroup,
          replyTo: replyingTo
        });
        setReplyingTo(null);
      } else {
        toast.error(`Genz Messenger: ${data.error || data.message || 'Upload failed'}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
        toast.error("Genz Messenger: Failed to upload file. Please try again.");
    }
    setIsViewOnceEnabled(false);
    if (originalEvent?.target) originalEvent.target.value = '';
  };

  // TM WhatsApp feature: handle saving edited/doodled image from DrawingPanel
  const handleDrawingSave = async (editedBlob) => {
    setShowDrawingEditor(false);
    if (drawingImageUrl) URL.revokeObjectURL(drawingImageUrl);
    setDrawingImageUrl('');
    if (!pendingImageFile) return;

    const { file, caption, opts } = pendingImageFile;
    setPendingImageFile(null);

    // Convert the edited blob back to a File
    const editedFile = new File([editedBlob], file.name, {
      type: 'image/png',
      lastModified: Date.now()
    });

    await uploadAndSendFile(editedFile, caption, opts.isViewOnce, opts.forcedType, null);
  };

  // Handle saving cropped image from CropRotatePanel → then open doodle editor
  const handleCropSave = async (croppedBlob) => {
    setShowCropEditor(false);
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl('');
    if (!pendingImageFile) return;

    const { file, opts } = pendingImageFile;
    // Convert cropped blob to File
    const croppedFile = new File([croppedBlob], file.name, {
      type: 'image/png',
      lastModified: Date.now()
    });
    // Get URL for doodle editor
    const croppedUrl = URL.createObjectURL(croppedBlob);
    // Chain to doodle editor
    setPendingImageFile({ file: croppedFile, caption: '', opts });
    setDrawingImageUrl(croppedUrl);
    setShowDrawingEditor(true);
  };

  // FEATURE ADD: view-once media had zero screenshot/recording protection —
  // unlike WhatsApp, where a view-once photo/video is always shielded no
  // matter whether the general "anti-screenshot" mod is on. We reuse the
  // same best-effort blur/overlay/notify mechanism here, forced on for the
  // duration the modal is open, and restore whatever state it was in before.
  useEffect(() => {
    if (!viewOnceModalOpen) return;
    const wasActiveBefore = isAntiScreenshotActive();
    const previousCallback = getScreenshotAttemptCallback();
    initAntiScreenshotListeners();
    applyAntiScreenshot(true);
    setScreenshotAttemptCallback(() => {
      const socket = getSocket?.();
      const senderId = viewOnceMessageData?.sender?._id || viewOnceMessageData?.sender;
      const messageId = viewOnceMessageData?.id || viewOnceMessageData?._id;
      if (socket?.connected && senderId && messageId) {
        socket.emit('viewonce:screenshot_attempt', { messageId, senderId });
      }
    });
    return () => {
      applyAntiScreenshot(wasActiveBefore);
      // FIX: restore whatever callback was registered before (e.g. the
      // conversation-level anti-screenshot mod's own notifier) instead of
      // nulling it out, so that mod keeps working after a view-once modal
      // is closed.
      setScreenshotAttemptCallback(previousCallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewOnceModalOpen]);


  const openViewOnceModal = async (message) => {
    const messageId = message.id || message._id;
    // Clear stale data so the modal shows a loading state while we fetch the
    // real content through the reveal endpoint (the feed payload is stripped).
    setViewOnceMessageData(null);
    setViewOnceModalOpen(true);
    viewOnceModalOpenRef.current = true;
    try {
      const revealed = await revealViewOnce(messageId);
      // User may have closed the modal while the reveal was in flight.
      if (!viewOnceModalOpenRef.current) return;
      setViewOnceMessageData({ ...message, ...revealed });
    } catch (err) {
      console.error('Failed to reveal view-once message:', err);
      if (viewOnceModalOpenRef.current) {
        toast.error(err?.message || 'This view-once message has already been opened');
        setViewOnceModalOpen(false);
      }
      viewOnceModalOpenRef.current = false;
    }
  };

  // Close View Once modal - NOW mark as viewed/consumed
  const closeViewOnceModal = async () => {
    viewOnceModalOpenRef.current = false;
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
            isGroup: selectedConversation.isGroup,
            replyTo: replyingTo
          });
          setReplyingTo(null);
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
          isGroup: selectedConversation.isGroup,
          replyTo: replyingTo
        });
        setReplyingTo(null);
      }
    } catch (err) {
      toast.error('Failed to send video');
    }
    closeCamera();
  };

  // ── VIDEO NOTE HANDLERS (WhatsApp-style circular video) ──
  const openVideoNoteRecorder = async () => {
    setShowAttachmentMenu(false);
    if (!canSendMedia && !currentUserIsAdmin) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        audio: true
      });
      videoNoteStreamRef.current = stream;
      videoNoteChunksRef.current = [];
      setRecordedVideoNoteUrl(null);
      setIsRecordingVideoNote(false);
      setVideoNoteDuration(0);
      setShowVideoNoteModal(true);
      // Play the preview once the modal mounts
      setTimeout(() => {
        const v = videoNotePreviewRef.current;
        if (v && videoNoteStreamRef.current) {
          v.srcObject = videoNoteStreamRef.current;
          v.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      console.error('[ChatArea] Video note camera error:', err);
      toast.error('Could not access camera for video note');
    }
  };

  const toggleVideoNoteRecording = () => {
    if (isRecordingVideoNote) {
      stopVideoNoteRecording();
    } else {
      startVideoNoteRecording();
    }
  };

  const startVideoNoteRecording = () => {
    if (!videoNoteStreamRef.current) return;
    videoNoteChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(videoNoteStreamRef.current, { mimeType });
    videoNoteRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) videoNoteChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(videoNoteChunksRef.current, { type: recorder.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoNoteUrl(url);
    };
    recorder.start();
    setIsRecordingVideoNote(true);
    setVideoNoteDuration(0);
    videoNoteTimerRef.current = setInterval(() => {
      setVideoNoteDuration((prev) => {
        if (prev >= 60) {
          // WhatsApp-style 60s cap
          stopVideoNoteRecording();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopVideoNoteRecording = () => {
    clearInterval(videoNoteTimerRef.current);
    if (videoNoteRecorderRef.current && videoNoteRecorderRef.current.state === 'recording') {
      videoNoteRecorderRef.current.stop();
    }
    setIsRecordingVideoNote(false);
  };

  const sendVideoNote = async () => {
    if (!selectedConversation || videoNoteSendingRef.current) return;
    if (!videoNoteChunksRef.current.length) {
      toast.error('Record a video note first');
      return;
    }
    videoNoteSendingRef.current = true;
    try {
      const blob = new Blob(videoNoteChunksRef.current, { type: 'video/webm' });
      const file = new File([blob], `video-note-${Date.now()}.webm`, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('file', file);
      const response = await authFetch(`${API_URL}/media/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (response.ok && (data.success || data.fileUrl || data.url)) {
        const uploadedUrl = data.fileUrl || data.url;
        if (!uploadedUrl) throw new Error('Upload succeeded without a media URL');
        await sendMessage('Video note', user?.username, {
          messageType: 'video',
          mediaUrl: uploadedUrl,
          fileName: file.name,
          caption: '',
          isVideoNote: true,
          duration: videoNoteDuration || 0,
          chatId: selectedConversation._id,
          isGroup: selectedConversation.isGroup,
          replyTo: replyingTo
        });
        setReplyingTo(null);
        closeVideoNoteRecorder();
      } else {
        toast.error('Failed to upload video note');
      }
    } catch (err) {
      console.error('[ChatArea] Failed to send video note:', err);
      toast.error('Failed to send video note');
    } finally {
      videoNoteSendingRef.current = false;
    }
  };

  const closeVideoNoteRecorder = () => {
    clearInterval(videoNoteTimerRef.current);
    if (videoNoteRecorderRef.current && videoNoteRecorderRef.current.state === 'recording') {
      videoNoteRecorderRef.current.stop();
    }
    videoNoteRecorderRef.current = null;
    if (videoNoteStreamRef.current) {
      videoNoteStreamRef.current.getTracks().forEach((track) => track.stop());
      videoNoteStreamRef.current = null;
    }
    if (recordedVideoNoteUrl) {
      URL.revokeObjectURL(recordedVideoNoteUrl);
    }
    setRecordedVideoNoteUrl(null);
    setIsRecordingVideoNote(false);
    setVideoNoteDuration(0);
    setShowVideoNoteModal(false);
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
          isGroup: selectedConversation.isGroup,
          replyTo: replyingTo
        });
        setReplyingTo(null);
      }
    } catch (err) {
      toast.error('Failed to send audio');
    }
    closeAudioAttachment();
  };

  const handleContactSimulation = () => {
    const name = window.prompt("GENZ: Enter contact name to share:");
    if (!name) return;
    const phone = window.prompt(`GENZ: Enter phone number for ${name}:`) || '';
    const plain = `Shared Contact: ${name}${phone ? ` · ${phone}` : ''}`;
    sendMessage(plain, user?.username, {
      messageType: 'contact',
      structuredContent: [{ type: 'text', value: plain, meta: { contactName: name, contactPhone: phone } }],
      replyTo: replyingTo
    });
    setReplyingTo(null);
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
      onClick={(e) => {
        e.stopPropagation();
        setShowAttachmentMenu(false);
        setTimeout(() => onClick?.(), 0);
      }}
      disabled={disabled}
      className={`p-1.5 md:p-2 hover:bg-dark-hover rounded-lg cursor-pointer flex flex-col items-center gap-0.5 md:gap-1 transition-colors min-w-0 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={label}
    >
      {icon}
      <span className="text-[9px] md:text-[10px] text-dark-text truncate max-w-[60px] text-center">{label}</span>
    </button>
  );

  const handleConfirmForward = (targetConv) => {
    if (!forwardingMessage) return;
    const content = plaintextOf(forwardingMessage);
    // GENZ MOD: If noForwardLabel is on, send as new message without 'Forwarded' tag
    if (safeMods?.noForwardLabel) {
      sendMessage(content, user?.username, { chatId: targetConv });
    } else {
      forwardMessage(content, user?.username, targetConv);
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

   const handleReplyPrivately = async (message) => {
    try {
      const sender = message?.sender?._id || message?.senderId || message?.sender;
      if (sender && sender.toString() === (user?.id || user?._id)) return;

      // Find or create a direct conversation with the message sender
      const API_URL = resolveApiBase();

      const createRes = await authFetch(`${API_URL}/chat/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: sender })
      });
      const createData = await createRes.json();
      const conversationId = createData.conversation?._id || createData.conversation?.id;

      if (conversationId) {
        // Open the DM conversation and set reply context
        setActiveConversation(conversationId);
        setReplyingTo({
          ...message,
          conversationId: conversationId
        });
      }
    } catch (err) {
      console.error('Reply privately error:', err);
    }
    setMessageContextMenu(null);
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
    const convName = typeof getConversationName === 'function' ? getConversationName() : (selectedConversation?.groupName || 'Chat');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (format === 'whatsapp') {
      // Canonical WhatsApp .txt format — round-trips through Import Chat (chatImporter.js).
      exportChatAsWhatsAppTxt(messages, convName, currentUser._id);
    } else {
      // Rich export with header, sender names and reactions.
      exportChatAsTxt(messages, convName, currentUser._id);
    }
  };

  const handleShareContact = async (contact) => {
    if (!contact) return;
    const name = contact.username || contact.name || contact.savedName || 'Contact';
    const phone = contact.phoneNumber || contact.phone || '';
    await sendMessage(
      phone ? `📇 *${name}*\n${phone}` : `📇 *${name}*`,
      user?.username,
      { messageType: 'text', replyTo: replyingTo }
    );
    setReplyingTo(null);
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
    const senderId = typeof message.sender === 'object' ? (message.sender._id || message.sender.id) : null;
    if (senderId) {
      return String(senderId) === String(user.id || user._id);
    }
    const senderName = typeof message.sender === 'object' ? message.sender.username : message.sender;
    const currentName = user?.username || 'Me';
    return senderName === currentName;
  };


  // Get online history for the current user
  const otherUser = (selectedConversation?.participants || []).find((p) => String(p?._id || p?.id || p) !== String(user?.id || user?._id));
  const history = (otherUser && presenceHistory) ? (presenceHistory[otherUser?._id || otherUser?.id] || []) : [];

  // GENZ MOD: Logic moved here to ensure selectedConversation is not null
  const currentUserIsAdmin = selectedConversation?.isGroup &&
    (selectedConversation?.participants || []).find((p) => String(p?._id || p?.id || p) === String(user?.id || user?._id))?.role === 'admin';
  const adminOnlyMessagingEnabled = selectedConversation?.isGroup && selectedConversation.adminOnlyMessaging;
  const canSendMedia = selectedConversation?.isGroup ? (selectedConversation.canSendMedia || currentUserIsAdmin) : true;
  const canCreatePolls = selectedConversation?.isGroup ? (selectedConversation.canCreatePolls || currentUserIsAdmin) : true;
  const canChangeGroupInfo = selectedConversation?.isGroup ? (selectedConversation.canChangeGroupInfo || currentUserIsAdmin) : true;
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


  const safeChatWallpaper = safeMods && hasStaleBlobUrl(safeMods.chatWallpaper) ? null : safeMods?.chatWallpaper;

  // Custom per-chat wallpaper logic (TM Style)
  const chatConfig = (safeMods?.customWallpapers && selectedConversation?._id) ? (safeMods.customWallpapers[selectedConversation._id] || {}) : {};
  const activeWallpaper = chatConfig.wallpaper || safeChatWallpaper;
  const activeDim = chatConfig.dim !== undefined ? chatConfig.dim : (safeMods?.chatWallpaperDim || 0);
  const activeDoodle = chatConfig.doodle !== undefined ? chatConfig.doodle : (safeMods?.chatWallpaperDoodle !== false);

  const activeZoom = chatConfig.zoom !== undefined ? chatConfig.zoom : (safeMods?.chatWallpaperZoom || 1);

  const wallpaperStyle = activeWallpaper ? {
    backgroundColor: activeWallpaper.startsWith('#') ? activeWallpaper : '#0b141a',
    backgroundImage: activeWallpaper.startsWith('#')
      ? `linear-gradient(rgba(0,0,0,${activeDim}), rgba(0,0,0,${activeDim}))`
      : `linear-gradient(rgba(0,0,0,${activeDim}), rgba(0,0,0,${activeDim})), url(${activeWallpaper})`,
    backgroundSize: 'cover',
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

  const bubbleCtx = useMemo(() => ({
  filteredMessages, visibleCount, safeMods, user, selectedConversation, messages,
      favoriteStickers, activeMessageMenu, messageMenuRef,
      isOwnMessage, handleDoubleClick, setMessageContextMenu, setActiveMessageMenu,
      openViewOnceModal, setViewerMedia, mediaSourceOf, isVideoSticker,
      plaintextOf, votePoll, markViewOnceViewed, toggleMessageLock,
      handleRetryMessage, handleReaction, setReplyingTo, setForwardingMessage,
      setShowForwardModal, unpinMessage, pinMessage, toggleStarMessage,
      toggleFavoriteSticker, setReportTarget, handleEditClick, setMessageInfoId,
      setShowMessageInfoModal, deleteMessage, handleDeleteForEveryone
}), [filteredMessages, visibleCount, safeMods, user, selectedConversation, messages, favoriteStickers, activeMessageMenu, messageMenuRef, isOwnMessage, handleDoubleClick, setMessageContextMenu, setActiveMessageMenu, openViewOnceModal, setViewerMedia, mediaSourceOf, isVideoSticker, plaintextOf, votePoll, markViewOnceViewed, toggleMessageLock, handleRetryMessage, handleReaction, setReplyingTo, setForwardingMessage, setShowForwardModal, unpinMessage, pinMessage, toggleStarMessage, toggleFavoriteSticker, setReportTarget, handleEditClick, setMessageInfoId, setShowMessageInfoModal, deleteMessage, handleDeleteForEveryone]);

  const composerCtx = useMemo(() => ({
  replyingTo, setReplyingTo, showMediaPanel, setShowMediaPanel,
      activeMediaTab, setActiveMediaTab, handleEmojiClick,
      setSelectedMedia, selectedMedia, editingMessage, setEditingMessage,
      setMessageInput, messageInput, inputRef, voiceRecorderActive,
      setVoiceRecorderActive, handleFormatText, handleSendMessage,
      showAttachmentMenu, setShowAttachmentMenu, isViewOnceEnabled,
      setIsViewOnceEnabled, allowScreenshotEnabled, setAllowScreenshotEnabled,
      handleSchedule, attachmentMenuRef, docInputRef,
      canSendMedia, currentUserIsAdmin, openCamera, fileInputRef,
      openAudioAttachment, openVideoNoteRecorder, handleShareLocation,
      handleContactSimulation, canCreatePolls, setShowPollModal,
      handleSetDisappearingMessages, selectedConversation,
      setFloatingStickerMode, setShowPaymentModal, mentionState,
      mentionSuggestions, selectMention, handleFileUpload, audioInputRef,
      cameraInputRef, adminOnlyMessagingEnabled, handleTyping,
      handleMentionKeyDown, closeMentionPicker, selectedFont,
      setShowFontPicker, showFontPicker, handleVoiceNoteSend, safeMods,
      sendRecordingStatus, sendButtonRef, showStickerPacks, setShowStickerPacks,
      floatingStickerMode, handleSendStickerWithCaption, AttachmentIcon
}), [replyingTo, setReplyingTo, showMediaPanel, setShowMediaPanel, activeMediaTab, setActiveMediaTab, handleEmojiClick, setSelectedMedia, selectedMedia, editingMessage, setEditingMessage, setMessageInput, messageInput, inputRef, voiceRecorderActive, setVoiceRecorderActive, handleFormatText, handleSendMessage, showAttachmentMenu, setShowAttachmentMenu, isViewOnceEnabled, setIsViewOnceEnabled, allowScreenshotEnabled, setAllowScreenshotEnabled, handleSchedule, attachmentMenuRef, docInputRef, canSendMedia, currentUserIsAdmin, openCamera, fileInputRef, openAudioAttachment, openVideoNoteRecorder, handleShareLocation, handleContactSimulation, canCreatePolls, setShowPollModal, handleSetDisappearingMessages, selectedConversation, setFloatingStickerMode, setShowPaymentModal, mentionState, mentionSuggestions, selectMention, handleFileUpload, audioInputRef, cameraInputRef, adminOnlyMessagingEnabled, handleTyping, handleMentionKeyDown, closeMentionPicker, selectedFont, setShowFontPicker, showFontPicker, handleVoiceNoteSend, safeMods, sendRecordingStatus, sendButtonRef, showStickerPacks, setShowStickerPacks, floatingStickerMode, handleSendStickerWithCaption, AttachmentIcon]);

  const headerCtx = useMemo(() => ({
  safeMods, selectConversation, sidebarOpen, onOpenSidebar,
      isSearching, setIsSearching, chatSearchQuery, setChatSearchQuery,
      selectedConversation, setShowGroupInfo, setShowContactInfo,
      isLiveLocationActive, getConversationAvatar, getConversationName,
      peerPresence, isOtherUserTyping, groupOnlineCount, history,
      typingByConversation, isOtherUserRecording, setShowSearchMessages,
      setShowMediaGallery, headerMenuRef, setShowHeaderMenu, showHeaderMenu,
      toggleDNDMode, isDNDMode, handleClearCurrentChat, handleDeleteCurrentChat,
      handleExportChat, viewProfile, otherUser
}), [safeMods, selectConversation, sidebarOpen, onOpenSidebar, isSearching, setIsSearching, chatSearchQuery, setChatSearchQuery, selectedConversation, setShowGroupInfo, setShowContactInfo, isLiveLocationActive, getConversationAvatar, getConversationName, peerPresence, isOtherUserTyping, groupOnlineCount, history, typingByConversation, isOtherUserRecording, setShowSearchMessages, setShowMediaGallery, headerMenuRef, setShowHeaderMenu, showHeaderMenu, toggleDNDMode, isDNDMode, handleClearCurrentChat, handleDeleteCurrentChat, handleExportChat, viewProfile, otherUser]);

  const listCtx = useMemo(() => ({
  messagesContainerRef, handleMessagesScroll, safeMods, activeDoodle,
      loading, loadingOlder, selectedConversation, scheduledMessages,
      cancelScheduledMessage, isOtherUserTyping, isOtherUserRecording,
      messagesEndRef, bubbleCtx
}), [messagesContainerRef, handleMessagesScroll, safeMods, activeDoodle, loading, loadingOlder, selectedConversation, scheduledMessages, cancelScheduledMessage, isOtherUserTyping, isOtherUserRecording, messagesEndRef, bubbleCtx]);

  const modalsCtx = useMemo(() => ({
  showForwardModal, forwardingMessage, setShowForwardModal, setForwardingMessage,
      showSearchMessages, setShowSearchMessages,
      showMediaGallery, setShowMediaGallery,
      messageContextMenu, handleContextMenuDelete, handleEditClick,
      setMessageContextMenu, setReplyingTo, handleContextMenuStar,
      unpinMessage, pinMessage, addReaction, plaintextOf,
      handleReplyPrivately,
      textSelectionMenu, textSelectionMenuRef, handleCopySelection,
      handleSelectAllSelection, handleFormatSelection, setTextSelectionMenu,
      reportTarget, setReportTarget,
      showProductCatalogue, setShowProductCatalogue, sendMessage,
      replyingTo,
      showContactPicker, setShowContactPicker, handleShareContact,
      viewerMedia, setViewerMedia,
      showMessageInfoModal, messageInfoId, setShowMessageInfoModal, setMessageInfoId,
      showPollModal, setShowPollModal, handlePollSubmit,
      showGroupInfo, setShowGroupInfo,
      showFilePreview, previewFile, setShowFilePreview,
      showScheduleModal, setShowScheduleModal, messageInput, scheduleDateTime,
      setScheduleDateTime, confirmSchedule, isDNDMode, isSearching, chatSearchQuery,
      filteredMessages,
      showDrawingEditor, drawingImageUrl, setShowDrawingEditor, setDrawingImageUrl,
      setPendingImageFile, handleDrawingSave,
      showCropEditor, cropImageUrl, setShowCropEditor, setCropImageUrl, handleCropSave,
      showPaymentModal, setShowPaymentModal,
      showFontPicker, setShowFontPicker, setSelectedFont, inputRef, selectedFont,
      showChunkedUploader, setShowChunkedUploader,
      showCameraModal, closeCamera, setCameraMode, cameraMode, recordedVideoUrl,
      videoRef, canvasRef, setRecordedVideoUrl, sendRecordedVideo, capturePhoto,
      isRecordingVideo, videoDuration, stopVideoRecording, startVideoRecording,
      showVideoNoteModal, closeVideoNoteRecorder, recordedVideoNoteUrl,
      videoNotePreviewRef, setRecordedVideoNoteUrl, videoNoteChunksRef,
      sendVideoNote, isRecordingVideoNote, videoNoteDuration,
      stopVideoNoteRecording, startVideoNoteRecording,
      showAudioModal, closeAudioAttachment, recordedAudioUrl, setRecordedAudioUrl,
      sendRecordedAudioAttachment, audioDuration, isRecordingAudio,
      stopAudioAttachmentRecording, startAudioAttachmentRecording,
      showLiveLocationModal, setShowLiveLocationModal, setLiveLocationDuration,
      liveLocationDuration, liveLocationComment, setLiveLocationComment,
      confirmShareLiveLocation,
      showCurrentLocationModal, setShowCurrentLocationModal, currentLocationCoords,
      currentLocationComment, setCurrentLocationComment, confirmShareCurrentLocation,
      viewOnceModalOpen, viewOnceMessageData, closeViewOnceModal, mediaSourceOf,
      showContactInfo, otherUser, setShowContactInfo, setIsSearching, toggleMuteChat,
      blockUser, unblockUser, handleClearCurrentChat, handleDeleteCurrentChat,
      handleExportChat, updateDisappearingMessages, toggleChatLock, safeMods,
      setMods, blockedUsers, showDisappearingPicker, setShowDisappearingPicker,
      applyDisappearingMessages, user, selectedConversation
}), [showForwardModal, forwardingMessage, setShowForwardModal, setForwardingMessage, showSearchMessages, setShowSearchMessages, showMediaGallery, setShowMediaGallery, messageContextMenu, handleContextMenuDelete, handleEditClick, setMessageContextMenu, setReplyingTo, handleContextMenuStar, unpinMessage, pinMessage, addReaction, plaintextOf, handleReplyPrivately, textSelectionMenu, textSelectionMenuRef, handleCopySelection, handleSelectAllSelection, handleFormatSelection, setTextSelectionMenu, reportTarget, setReportTarget, showProductCatalogue, setShowProductCatalogue, sendMessage, replyingTo, showContactPicker, setShowContactPicker, handleShareContact, viewerMedia, setViewerMedia, showMessageInfoModal, messageInfoId, setShowMessageInfoModal, setMessageInfoId, showPollModal, setShowPollModal, handlePollSubmit, showGroupInfo, setShowGroupInfo, showFilePreview, previewFile, setShowFilePreview, showScheduleModal, setShowScheduleModal, messageInput, scheduleDateTime, setScheduleDateTime, confirmSchedule, isDNDMode, isSearching, chatSearchQuery, filteredMessages, showDrawingEditor, drawingImageUrl, setShowDrawingEditor, setDrawingImageUrl, setPendingImageFile, handleDrawingSave, showCropEditor, cropImageUrl, setShowCropEditor, setCropImageUrl, handleCropSave, showPaymentModal, setShowPaymentModal, showFontPicker, setShowFontPicker, setSelectedFont, inputRef, selectedFont, showChunkedUploader, setShowChunkedUploader, showCameraModal, closeCamera, setCameraMode, cameraMode, recordedVideoUrl, videoRef, canvasRef, setRecordedVideoUrl, sendRecordedVideo, capturePhoto, isRecordingVideo, videoDuration, stopVideoRecording, startVideoRecording, showVideoNoteModal, closeVideoNoteRecorder, recordedVideoNoteUrl, videoNotePreviewRef, setRecordedVideoNoteUrl, videoNoteChunksRef, sendVideoNote, isRecordingVideoNote, videoNoteDuration, stopVideoNoteRecording, startVideoNoteRecording, showAudioModal, closeAudioAttachment, recordedAudioUrl, setRecordedAudioUrl, sendRecordedAudioAttachment, audioDuration, isRecordingAudio, stopAudioAttachmentRecording, startAudioAttachmentRecording, showLiveLocationModal, setShowLiveLocationModal, setLiveLocationDuration, liveLocationDuration, liveLocationComment, setLiveLocationComment, confirmShareLiveLocation, showCurrentLocationModal, setShowCurrentLocationModal, currentLocationCoords, currentLocationComment, setCurrentLocationComment, confirmShareCurrentLocation, viewOnceModalOpen, viewOnceMessageData, closeViewOnceModal, mediaSourceOf, showContactInfo, otherUser, setShowContactInfo, setIsSearching, toggleMuteChat, blockUser, unblockUser, handleClearCurrentChat, handleDeleteCurrentChat, handleExportChat, updateDisappearingMessages, toggleChatLock, safeMods, setMods, blockedUsers, showDisappearingPicker, setShowDisappearingPicker, applyDisappearingMessages, user, selectedConversation]);

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-bg glass-panel">
        <div className="text-center">
          <div className="bg-primary-600/10 p-6 rounded-full inline-block mb-4">
            <MessageCircle className="w-16 h-16 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-dark-text mb-2">Genz Messenger Web</h2>
          <p className="text-dark-textSecondary">
            Send and receive messages without keeping your phone online.
          </p>
        </div>
      </div>
    );
  }

  // CHAT LOCK CHECK
  const isLocked = selectedConversation?.isLocked && unlockedSessionChats && !unlockedSessionChats.has(String(selectedConversation._id));

  if (isLocked) {
    return (
      <div className="flex-1 flex flex-col bg-dark-bg glass-panel items-center justify-center p-6 text-center">
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

  return (
    <div className="flex-1 flex flex-col bg-dark-bg glass-panel min-w-0 w-full overflow-hidden relative h-[100dvh] min-h-0" style={{ height: '100dvh', maxHeight: '100dvh' }}>
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={wallpaperStyle}
      />

      <ConversationHeader ctx={headerCtx} />

      <MessageListArea ctx={listCtx} />
      {/* Extra padding to ensure last message is visible above input area */}
      <div className="h-2 flex-shrink-0" />

      {/* GENZ Exclusive — Live Reactions (floating emoji), gated by the
          mods.liveReactions toggle in GENZ Settings → GENZ */}
      {mods.liveReactions && selectedConversation?._id && (
        <div className="absolute right-16 bottom-24 z-[120]">
          <LiveReactions
            chatId={String(selectedConversation._id)}
            socket={getSocket?.() || undefined}
          />
        </div>
      )}

      <MessageComposer ctx={composerCtx} />

      <ChatModals ctx={modalsCtx} /><FloatingStickerOverlay
        key="floating-stickers"
        isMobile={isMobile}
        onStickerReceived={(handler) => {
          if (!floatingStickerHandlers?.includes(handler)) {
            setFloatingStickerHandlers(prev => [...(prev || []), handler]);
          }
        }}
      />
    </div >
  );
};

export default ChatArea;



