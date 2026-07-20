import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import BroadcastModal from './BroadcastModal';
import MassSenderModal from './MassSenderModal';

import StatusViewer from './StatusViewer';
import StatusCreator from './StatusCreator';
import ProfileEditor from './ProfileEditor';
import StoryHighlights from './StoryHighlights';
import StatusScrollFeed from './StatusScrollFeed';
import { AnimatePresence } from 'framer-motion';
import { decryptMessage } from '../utils/formatDate';
import { isClientE2EEMessageContent } from '../utils/e2eeContent';
import {
  MessageCircle,
  Users,
  Settings,
  LogOut,
  Search,
  Plus,
  MoreVertical,
  UserPlus,
  CircleUserRound,
  Pin,
  Archive,
  VolumeX,
  Phone,
  Megaphone,
  Video,
  Send,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Check,
  CheckCheck,
  User,
  PlusCircle,
  Trash2,
  PenTool,
  Camera,
  Pencil,
  Zap,
  Shield,
  MonitorSmartphone,
  Circle,
  X,
  Tag,
  CheckSquare,
  Square
} from 'lucide-react';
import ProfileEnlarger from './ProfileEnlarger';
import AccountSwitcher from './AccountSwitcher';
import { formatConversationTime } from '../utils/formatDate';
import { getAvatarUrl } from '../utils/avatar';
import { addConversationTag, removeConversationTag, getAvailableTags, loadConversationTags } from '../utils/conversationTags';

const Sidebar = ({ isOpen, onToggle, onLogout, openGENZ, mods }) => { // Added mods prop
  const { user } = useUser();
  const navigate = useNavigate();
  
  // Debug: Wrap navigate to log all calls
  const debugNavigate = (path, options) => {
    console.log('[Sidebar] navigate called with:', path, options);
    console.log('[Sidebar] Current location:', window.location.pathname);
    navigate(path, options);
    console.log('[Sidebar] navigate() returned');
  };
  
  // Compute total unread count across all conversations
  const { conversations, selectConversation, selectedConversation, onlineUsers, togglePinChat, toggleMuteChat, toggleArchiveChat, clearChat, deleteChat, callLogs, statuses, addStatus, deleteStatus, uploadStatusMedia, profileVisitors, showProfileEditor, setShowProfileEditor, typingByConversation } = useChat();
  const currentUserId = String(user?._id || user?.id || 'anonymous');
  const defaultChatTabs = ['All', 'Personal', 'Work', 'Groups'];
  const totalUnread = useMemo(() =>
    conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );
  const chatTabsStorageKey = useMemo(() => `genz_chat_tabs:${currentUserId}`, [currentUserId]);
  const chatTabMapStorageKey = useMemo(() => `genz_chat_tab_map:${currentUserId}`, [currentUserId]);
  const chatListWallpaperKey = useMemo(() => `genz_chatlist_wallpaper:${currentUserId}`, [currentUserId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'calls'
  const [activeFolder, setActiveFolder] = useState('All');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showMassSenderModal, setShowMassSenderModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  // BUG FIX: the chat-row "..." menu used to be positioned with raw
  // `rect.left - 150` / `e.pageY` coordinates with no bounds checking. On a
  // narrow phone screen that pushed the menu off the left edge and/or below
  // the bottom of the viewport, so it looked like it was opening "from the
  // bottom" instead of appearing beside the button like a normal side menu.
  // This clamps it to stay fully on-screen, anchored next to where it was
  // opened, with a small margin.
  const CONTEXT_MENU_WIDTH = 208; // matches w-52 below
  const CONTEXT_MENU_MAX_HEIGHT = 420;
  const clampContextMenuPosition = (x, y) => {
    const margin = 8;
    const maxX = window.innerWidth - CONTEXT_MENU_WIDTH - margin;
    const maxY = window.innerHeight - Math.min(CONTEXT_MENU_MAX_HEIGHT, window.innerHeight - margin * 2) - margin;
    return {
      x: Math.max(margin, Math.min(x, Math.max(margin, maxX))),
      y: Math.max(margin, Math.min(y, Math.max(margin, maxY))),
    };
  };

  const handleContextMenuToggle = (chatId, pos, isMuted, isArchived) => {
    if (contextMenu?.chatId === chatId) {
      setContextMenu(null);
      return;
    }
    setContextMenu({ ...pos, chatId, isMuted, isArchived });
  };

  const handleTagMenuToggle = (chatId, pos) => {
    if (tagMenuChatId === chatId) {
      setTagMenuChatId(null);
      return;
    }
    setTagMenuChatId(chatId);
    setTagMenuPosition(pos);
  };

  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [enlargedProfile, setEnlargedProfile] = useState(null);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  // GENZ MOD: Custom Chat Tabs
  const [chatTabs, setChatTabs] = useState(() => {
    try {
      const stored = localStorage.getItem(chatTabsStorageKey) || localStorage.getItem('genz_chat_tabs');
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) && parsed.length ? parsed : defaultChatTabs;
      }
    } catch(e) {}
    return defaultChatTabs;
  });
  const [chatTabMap, setChatTabMap] = useState(() => {
    try {
      const stored = localStorage.getItem(chatTabMapStorageKey) || localStorage.getItem('genz_chat_tab_map');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return {};
  });
  const chatListWallpaperInputRef = useRef(null);
  const menuRef = useRef(null);
  const contextMenuRef = useRef(null);
  const tagMenuRef = useRef(null);
  const [chatListWallpaper, setChatListWallpaper] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(chatListWallpaperKey) || 'null');
    } catch (e) {
      return null;
    }
  });
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [tagMenuChatId, setTagMenuChatId] = useState(null);
  const [tagMenuPosition, setTagMenuPosition] = useState({ x: 0, y: 0 });
  const [statusUploading, setStatusUploading] = useState(false);
  const [showStatusCreator, setShowStatusCreator] = useState(false);
  const [statusCreatorMode, setStatusCreatorMode] = useState('text'); // 'text' or 'media'
  const [conversationTags, setConversationTags] = useState(() => loadConversationTags(currentUserId));
  const [availableTags, setAvailableTags] = useState(() => getAvailableTags(currentUserId));
  // Removed unnecessary forceUpdate logic that was causing re-render loops

  useEffect(() => {
    try {
      const storedTabs = localStorage.getItem(chatTabsStorageKey) || localStorage.getItem('genz_chat_tabs');
      const parsedTabs = storedTabs ? JSON.parse(storedTabs) : null;
      setChatTabs(Array.isArray(parsedTabs) && parsedTabs.length ? parsedTabs : defaultChatTabs);

      const storedMap = localStorage.getItem(chatTabMapStorageKey) || localStorage.getItem('genz_chat_tab_map');
      setChatTabMap(storedMap ? JSON.parse(storedMap) : {});
      setActiveFolder('All');
    } catch (e) {
      setChatTabs(defaultChatTabs);
      setChatTabMap({});
      setActiveFolder('All');
    }
  }, [chatTabMapStorageKey, chatTabsStorageKey, currentUserId]);

  useEffect(() => {
    try {
      setChatListWallpaper(JSON.parse(localStorage.getItem(chatListWallpaperKey) || 'null'));
    } catch (e) {
      setChatListWallpaper(null);
    }
  }, [chatListWallpaperKey]);

  useEffect(() => {
    setConversationTags(loadConversationTags(currentUserId));
    setAvailableTags(getAvailableTags(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    if (!showMenu) return;
    const handleOutsideClick = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setShowMenu(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenu]);

  // BUG FIX: the chat context menu previously only closed on `onMouseLeave`,
  // which never fires on a touchscreen — on mobile it could stay open,
  // overlapping the chat list, until the user tapped one of its items.
  useEffect(() => {
    if (!contextMenu) return;
    const handleOutsideTap = (event) => {
      if (contextMenuRef.current?.contains(event.target)) return;
      setContextMenu(null);
    };
    document.addEventListener('touchstart', handleOutsideTap);
    document.addEventListener('mousedown', handleOutsideTap);
    return () => {
      document.removeEventListener('touchstart', handleOutsideTap);
      document.removeEventListener('mousedown', handleOutsideTap);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (tagMenuChatId === null) return;
    const handleOutsideTap = (event) => {
      if (tagMenuRef.current?.contains(event.target)) return;
      setTagMenuChatId(null);
    };
    document.addEventListener('mousedown', handleOutsideTap);
    document.addEventListener('touchstart', handleOutsideTap);
    return () => {
      document.removeEventListener('mousedown', handleOutsideTap);
      document.removeEventListener('touchstart', handleOutsideTap);
    };
  }, [tagMenuChatId]);

  useEffect(() => {
    if (!selectedConversation) return;
    setTagMenuChatId(null);
  }, [selectedConversation?._id]);

  // Handler for when StatusCreator finishes
  const handleStatusSend = async (statusData) => {
    setStatusUploading(true);
    try {
      const collabFields = statusData.collabUserId
        ? { collabUserId: statusData.collabUserId, collabUsername: statusData.collabUsername }
        : {};

      if (statusData.type === 'text') {
        await addStatus({
          type: 'text',
          content: statusData.content,
          backgroundColor: statusData.bgColor,
          font: statusData.fontClass,
          ...collabFields
        });
      } else {
        const uploadResult = await uploadStatusMedia(statusData.mediaFile);
        await addStatus({
          type: uploadResult.mediaType || statusData.type,
          content: statusData.caption || '',
          caption: statusData.caption || '',
          mediaUrl: uploadResult.fileUrl,
          ...collabFields
        });
      }
    } catch (error) {
      console.error('Failed to send status:', error);
      alert('Failed to send status');
    } finally {
      setStatusUploading(false);
    }
  };

  const isChatPinned = (conv) => {
    if (conv.isPinned === true) return true;
    return conv.isPinned && conv.isPinned[user?._id] === true;
  };

  // GENZ MOD: Sort conversations (Pinned first, then by time)
  const sortedConversations = [...conversations].sort((a, b) => {
    const pinA = isChatPinned(a);
    const pinB = isChatPinned(b);
    if (pinA && !pinB) return -1;
    if (!pinA && pinB) return 1;
    const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  const handleViewStatus = () => {
    navigate('/status');
  };

  const handleViewCalls = () => {
    navigate('/calls');
  };

  const handleViewChannels = () => {
    navigate('/channels');
  };

  const handleViewBroadcast = () => {
    navigate('/broadcast');
  };

  const handleViewStarred = () => {
    navigate('/starred');
  };

  const handleViewArchived = () => {
    navigate('/archived');
  };

  const handleClearChat = async (chatId) => {
    if (!confirm('Are you sure you want to clear all messages in this chat?')) return;

    const result = await clearChat(chatId);
    if (!result?.success) alert(result?.message || 'Failed to clear chat');
  };

  const handleDeleteChat = async (chatId) => {
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) return;

    const result = await deleteChat(chatId);
    if (!result?.success) alert(result?.message || 'Failed to delete chat');
  };

  // FEATURE ADD: multi-select delete for chats, WhatsApp-style - long-press
  // (or a "Select chats" button) enters select mode, tap more chats, then
  // delete them all at once.
  const [chatSelectMode, setChatSelectMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState([]);

  const toggleChatSelectMode = () => {
    setChatSelectMode((prev) => !prev);
    setSelectedChatIds([]);
  };

  const toggleChatSelected = (id) => {
    setSelectedChatIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDeleteSelectedChats = async () => {
    if (selectedChatIds.length === 0) return;
    if (!confirm(`Delete ${selectedChatIds.length} selected chat(s)? This action cannot be undone.`)) return;
    await Promise.allSettled(selectedChatIds.map((id) => deleteChat(id)));
    setChatSelectMode(false);
    setSelectedChatIds([]);
  };

  const archivedCount = (conversations || []).filter(c => c.isArchived).length;

  const filteredConversations = (sortedConversations || []).filter((conv) => {
    // Filter based on Archive status
    if (showArchivedOnly && !conv.isArchived) return false;
    if (!showArchivedOnly && conv.isArchived) return false;

    // Folder filtering
    if (activeFolder !== 'All') {
      if (activeFolder === 'Groups') {
        if (!conv.isGroup) return false;
      } else {
        const tabsForChat = chatTabMap[conv._id] || [];
        if (!tabsForChat.includes(activeFolder)) return false;
      }
    }

    if (conv.isGroup) {
      return conv.groupName?.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      const otherUser = conv.participants?.find((p) => p._id !== user?.id);
      return otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    }
  });

  const handleNewChat = () => {
    navigate('/new-chat');
  };

  const handleAddTab = () => {
    if (newTabName.trim() && !chatTabs.includes(newTabName.trim())) {
      const updated = [...chatTabs, newTabName.trim()];
      setChatTabs(updated);
      localStorage.setItem(chatTabsStorageKey, JSON.stringify(updated));
      setNewTabName('');
      setShowAddTabModal(false);
      setActiveFolder(newTabName.trim());
    }
  };

  const handleAssignTab = (chatId, tabName) => {
    const currentTabs = chatTabMap[chatId] || [];
    let updatedTabs;
    if (currentTabs.includes(tabName)) {
      updatedTabs = currentTabs.filter(t => t !== tabName);
    } else {
      updatedTabs = [...currentTabs, tabName];
    }
    const newMap = { ...chatTabMap, [chatId]: updatedTabs };
    setChatTabMap(newMap);
    localStorage.setItem(chatTabMapStorageKey, JSON.stringify(newMap));
  };

  const handleDeleteTab = (tabName) => {
    if (defaultChatTabs.includes(tabName)) return;
    const updatedTabs = chatTabs.filter((tab) => tab !== tabName);
    const updatedMap = Object.fromEntries(
      Object.entries(chatTabMap).map(([chatId, tabs]) => [
        chatId,
        (tabs || []).filter((tab) => tab !== tabName)
      ])
    );
    setChatTabs(updatedTabs);
    setChatTabMap(updatedMap);
    localStorage.setItem(chatTabsStorageKey, JSON.stringify(updatedTabs));
    localStorage.setItem(chatTabMapStorageKey, JSON.stringify(updatedMap));
    if (activeFolder === tabName) setActiveFolder('All');
  };

  const handleTagToggle = (chatId, tag) => {
    const existingTags = conversationTags?.[chatId] || [];
    const nextTags = existingTags.includes(tag)
      ? removeConversationTag(currentUserId, chatId, tag)
      : addConversationTag(currentUserId, chatId, tag);
    setConversationTags(nextTags);
    setAvailableTags(getAvailableTags(currentUserId));
  };

  const handleCreateTag = (chatId) => {
    const trimmedTag = newTagName.trim();
    if (!trimmedTag) return;
    const normalizedTag = trimmedTag.replace(/\s+/g, ' ');
    const nextTags = addConversationTag(currentUserId, chatId, normalizedTag);
    setConversationTags(nextTags);
    setAvailableTags(getAvailableTags(currentUserId));
    setNewTagName('');
  };

  const handleChatListWallpaperUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please choose an image or video wallpaper');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextWallpaper = {
        type: file.type.startsWith('video/') ? 'video' : 'image',
        url: reader.result,
        name: file.name
      };
      try {
        localStorage.setItem(chatListWallpaperKey, JSON.stringify(nextWallpaper));
      } catch (e) {
        alert('Wallpaper file is too large for this browser storage');
        event.target.value = '';
        return;
      }
      setChatListWallpaper(nextWallpaper);
      setShowMenu(false);
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const clearChatListWallpaper = () => {
    localStorage.removeItem(chatListWallpaperKey);
    setChatListWallpaper(null);
    setShowMenu(false);
  };

  const getConversationName = (conv) => {
    if (conv.isGroup) {
      return conv.groupName;
    }
    const otherUser = conv.participants?.find((p) => p._id !== user?.id);
    return otherUser?.username || 'Unknown';
  };

  const getConversationAvatar = (conv) => {
    if (conv.isGroup) {
      // Group: use group photo or fallback to first participant's avatar
      if (conv.groupPhoto) return conv.groupPhoto;
      const firstParticipant = conv.participants?.[0];
      if (firstParticipant?.profilePicture) return firstParticipant.profilePicture;
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.groupName || 'Group')}&background=random&color=fff`;
    }
    const otherUser = conv.participants?.find((p) => p._id !== user?.id);
    if (otherUser?.profilePicture) return otherUser.profilePicture;
    // Fallback avatar: use ui-avatars service
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.username || 'User')}&background=random&color=fff`;
  };

  const getLastMessage = (conv) => {
    if (!conv.lastMessage) return 'No messages yet';

    if (conv.lastMessage.isConsumed) {
      if (conv.lastMessage.isSelfDestruct) return '💥 Message self-destructed';
      return '👁️ Opened';
    }

    if (conv.lastMessage.isViewOnce) {
      if (conv.lastMessage.messageType === 'image') return '📷 Photo (View once)';
      if (conv.lastMessage.messageType === 'video') return '🎥 Video (View once)';
      if (conv.lastMessage.messageType === 'audio') return '🎵 Voice note (View once)';
      return '🤫 View once message';
    }

    // Support for media previews in sidebar
    if (conv.lastMessage.messageType === 'gif') return '🎞️ GIF';
    if (conv.lastMessage.messageType === 'image') return '📷 Photo' + (conv.lastMessage.caption ? `: ${conv.lastMessage.caption}` : '');
    if (conv.lastMessage.messageType === 'video') return '🎥 Video' + (conv.lastMessage.caption ? `: ${conv.lastMessage.caption}` : '');
    if (conv.lastMessage.messageType === 'audio') return '🎵 Voice note';
    if (conv.lastMessage.messageType === 'sticker') return '🖼️ Sticker';

    if (!mods?.debugEncryption && isClientE2EEMessageContent(conv.lastMessage.content)) {
      return '🔒 Ujumbe uliosimbwa (E2EE)';
    }

    // Ikiwa encryption mode imewashwa, onyesha raw encrypted object. Ikiwa imezimwa, onyesha maneno ya kawaida.
    let content;
    if (mods?.debugEncryption) {
      // Show raw encrypted content for debugging
      if (typeof conv.lastMessage.content === 'object' && conv.lastMessage.content !== null) {
        content = '[Encrypted Message]';
      } else {
        content = String(conv.lastMessage.message || conv.lastMessage.content || '');
      }
    } else {
      // Decrypt and show normal text
      let decrypted = decryptMessage(conv.lastMessage.content);
      content = String(conv.lastMessage.message || decrypted || '');
    }

    if (content.startsWith('[Reply to status]: ') || conv.lastMessage.quotedStatus || conv.lastMessage.type === 'status-reply') {
      content = content.replace('[Reply to status]: ', '');
      return (
        <span className="flex items-center gap-1 truncate">
          <Circle className="w-3 h-3 text-primary-500 flex-shrink-0" />
          <span className="truncate">{content.substring(0, 50) + (content.length > 50 ? '...' : '')}</span>
        </span>
      );
    }

    return content.substring(0, 50) + (content.length > 50 ? '...' : '');
  };

  return (
    <aside
      className={`relative overflow-hidden bg-dark-surface border-r border-dark-border flex flex-col transition-all duration-300 ${isOpen ? 'w-full md:w-80' : 'w-0 md:w-16 overflow-hidden'}`}
    >
      {chatListWallpaper?.url && (
        chatListWallpaper.type === 'video' ? (
          <video
            src={chatListWallpaper.url}
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-60"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url(${chatListWallpaper.url})` }}
          />
        )
      )}
      <div className="relative z-50 p-2 border-b border-dark-border bg-dark-surface/90 backdrop-blur-[2px]">
        {/* Hidden wallpaper file input */}
        <input ref={chatListWallpaperInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleChatListWallpaperUpload} />

        <div className="flex items-center justify-between mb-4">
          {isOpen && (
            <div className="flex items-center gap-3 cursor-pointer hover:bg-dark-hover p-1 rounded-lg transition-colors" onClick={() => setShowProfileEditor(true)}>
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center overflow-hidden">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-semibold">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-white font-medium truncate flex items-center gap-1">
                {user?.username}
                {user?.emojiStatus && <span className="text-base" title="Emoji status">{user.emojiStatus}</span>}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">

            <button
              onClick={handleNewChat}
              className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
              title="New Chat" aria-label="New Chat"
            >
              <Plus className="w-5 h-5 text-dark-text" />
            </button>
            <button
              onClick={handleViewStatus}
              className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
              title="Status" aria-label="Status"
            >
              <CircleUserRound className="w-5 h-5 text-dark-text" />
            </button>
            <button
              onClick={handleViewChannels}
              className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
              title="Channels"
              aria-label="Channels"
            >
              <Megaphone className="w-5 h-5 text-dark-text" />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-dark-hover rounded-lg transition-colors relative"
                type="button"
                aria-label="Menu"
                aria-haspopup="true"
                aria-expanded={showMenu}
              >
                <MoreVertical className="w-5 h-5 text-dark-text" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 bg-black/20 z-[60]" onClick={() => setShowMenu(false)} />
                  <div className="fixed top-0 right-0 h-full w-[85vw] max-w-[320px] bg-dark-surface border-l border-dark-border shadow-2xl z-[70] overflow-y-auto">
                  <div className="p-3 border-b border-dark-border flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-dark-text">Menu</h2>
                    <button
                      onClick={() => setShowMenu(false)}
                      className="p-1.5 hover:bg-dark-hover rounded-lg transition-colors"
                     aria-label="Close">
                      <X className="w-4 h-4 text-dark-text" />
                    </button>
                  </div>
                  <div className="py-2">
                  {/* Header Actions (Moved to Menu) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('GENZ Settings button clicked');
                      console.log('[Sidebar] openGENZ function:', typeof openGENZ);
                      openGENZ();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-primary-500 font-bold"
                  >
                    <Settings className="w-4 h-4" />
                    <span>GENZ Settings</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Mass Sender button clicked');
                      console.log('[Sidebar] setShowMassSenderModal called with: true');
                      setShowMassSenderModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-primary-500"
                  >
                    <Send className="w-4 h-4" />
                    <span>Mass Sender</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('New Broadcast button clicked');
                      console.log('[Sidebar] setShowBroadcastModal called with: true');
                      setShowBroadcastModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-dark-text"
                  >
                    <Megaphone className="w-4 h-4" />
                    <span>New Broadcast</span>
                  </button>
                  <div className="border-t border-dark-border my-1" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Settings button clicked, navigating to /settings');
                      debugNavigate('/settings');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-dark-text"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Linked Devices button clicked, navigating to /linked-devices');
                      debugNavigate('/linked-devices');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-dark-text"
                  >
                    <MonitorSmartphone className="w-4 h-4" />
                    <span>Linked Devices</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/settings/security');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-dark-text"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Security</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('GENZ Mods button clicked, navigating to /genz-mods');
                      debugNavigate('/genz-mods');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-dark-text"
                  >
                    <Zap className="w-4 h-4 text-primary-500" />
                    <span>GENZ Mods</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Broadcast button clicked, navigating to /broadcast');
                      debugNavigate('/broadcast');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-dark-text"
                  >
                    <Megaphone className="w-4 h-4" />
                    <span>Broadcast</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Starred Messages button clicked, navigating to /starred');
                      debugNavigate('/starred');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-dark-text"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Starred Messages</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      chatListWallpaperInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-dark-text"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Chatlist wallpaper</span>
                  </button>
                  {chatListWallpaper?.url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearChatListWallpaper();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove wallpaper</span>
                    </button>
                  )}
                  <div className="border-t border-dark-border my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Logout button clicked');
                      console.log('[Sidebar] onLogout function:', typeof onLogout);
                      onLogout();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-red-500"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                  </div>
                </div>
                </>
              )}
            </div>
            <button
              onClick={onToggle}
              className="hidden md:block p-2 hover:bg-dark-hover rounded-lg transition-colors"
             aria-label="Message">
              <MessageCircle className="w-5 h-5 text-dark-text" />
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex gap-2 p-1 bg-dark-bg rounded-lg">
              <button
                onClick={() => setActiveTab('chats')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'chats' ? 'bg-primary-600 text-white shadow-lg' : 'text-dark-textSecondary hover:text-dark-text'}`}
              >
                Chats
              </button>
              <button
                onClick={() => setActiveTab('calls')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'calls' ? 'bg-primary-600 text-white shadow-lg' : 'text-dark-textSecondary hover:text-dark-text'}`}
              >
                Calls
              </button>
            </div>
            <button
              onClick={() => setActiveTab('status')}
              className={`w-full py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'status' ? 'bg-primary-600 text-white shadow-lg' : 'text-dark-textSecondary hover:text-dark-text'}`}
            >
              Status
            </button>
            <button
              onClick={() => setActiveTab('visitors')}
              className={`w-full py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'visitors' ? 'bg-primary-600 text-white shadow-lg' : 'text-dark-textSecondary hover:text-dark-text'}`}
            >
              Visitors
            </button>
          </div>
        )}

        {isOpen && activeTab === 'chats' && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-none py-1">
            {chatTabs.map(folder => {
              const tabIcons = { 'All': '💬', 'Personal': '👤', 'Work': '💼', 'Groups': '👥' };
              const icon = tabIcons[folder] || '📁';
              const isActive = activeFolder === folder;
              return (
                <div key={folder} className="relative flex items-center flex-shrink-0">
                  <button
                    onClick={() => setActiveFolder(folder)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold border transition-all whitespace-nowrap
                      ${isActive ? 'bg-[#00a884] border-[#00a884] text-white shadow-sm' : 'border-dark-border text-dark-textSecondary hover:bg-dark-hover hover:text-dark-text'}`}
                  >
                    <span className="text-xs">{icon}</span>
                    {folder}
                  </button>
                  {!defaultChatTabs.includes(folder) && (
                    <button
                      onClick={() => handleDeleteTab(folder)}
                      className="absolute -top-1 -right-0.5 w-4 h-4 rounded-full bg-dark-surface border border-dark-border text-dark-textSecondary hover:text-red-400 flex items-center justify-center transition-colors"
                      title={`Remove ${folder}`}
                      aria-label={`Remove ${folder}`}
                    >
                      <X size={9} />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => navigate('/new-chat')}
              className="flex-shrink-0 w-7 h-7 rounded-full border border-dark-border text-dark-textSecondary hover:bg-dark-hover hover:text-dark-text flex items-center justify-center transition-all"
              title="Add new contact"
              aria-label="Add new contact"
            >
              <UserPlus size={13} />
            </button>
            <button
              onClick={() => setShowAddTabModal(true)}
              className="flex-shrink-0 w-7 h-7 rounded-full border border-dark-border text-dark-textSecondary hover:bg-dark-hover hover:text-dark-text flex items-center justify-center transition-all"
              title="Add new tab"
              aria-label="Add new tab"
            >
              <Plus size={13} />
            </button>
            {(conversations || []).length > 0 && (
              <button
                onClick={toggleChatSelectMode}
                className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                  chatSelectMode
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'border-dark-border text-dark-textSecondary hover:bg-dark-hover hover:text-dark-text'
                }`}
                title="Select chats"
                aria-label="Select chats"
              >
                <CheckSquare size={13} />
              </button>
            )}
          </div>
        )}

        {isOpen && chatSelectMode ? (
          <div className="flex items-center justify-between gap-3 bg-primary-600/10 border border-primary-500/30 rounded-lg px-3 py-2">
            <span className="text-sm font-semibold text-dark-text">{selectedChatIds.length} zimechaguliwa</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteSelectedChats}
                disabled={selectedChatIds.length === 0}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/15 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Futa zilizochaguliwa" aria-label="Futa zilizochaguliwa"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={toggleChatSelectMode}
                className="p-2 rounded-lg text-dark-textSecondary hover:bg-dark-hover"
                title="Ghairi" aria-label="Ghairi"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : isOpen && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-textSecondary" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search conversations..."
              aria-label="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-textSecondary focus:outline-none focus:border-primary-500 text-base md:text-sm"
            />
          </div>
        )}
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-thin bg-dark-surface/70 backdrop-blur-[1px]">
        {isOpen && activeTab === 'chats' && archivedCount > 0 && (
          <button
            onClick={() => setShowArchivedOnly(!showArchivedOnly)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-dark-hover border-b border-dark-border transition-colors group"
          >
            <div className="flex items-center gap-4 text-primary-500">
              <Archive size={20} />
              <span className="font-medium">{showArchivedOnly ? 'Back to Chats' : 'Archived'}</span>
            </div>
            <span className="bg-primary-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{archivedCount}</span>
          </button>
        )}

        {isOpen && activeTab === 'chats' && (
          <div className="p-2">
            {(filteredConversations || []).map((conv) => (
              <div
                key={conv._id}
                className="relative group"
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (chatSelectMode) return;
                  const pos = clampContextMenuPosition(e.clientX, e.clientY);
                  setContextMenu({ ...pos, chatId: conv._id, isMuted: conv.isMuted, isArchived: conv.isArchived });
                }}
              >
                <button
                  onClick={() => (chatSelectMode ? toggleChatSelected(conv._id) : selectConversation(conv))}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${selectedConversation?._id === conv._id
                    ? 'bg-dark-hover'
                    : 'hover:bg-dark-hover'
                    } ${chatSelectMode && selectedChatIds.includes(conv._id) ? 'bg-primary-600/10 ring-1 ring-primary-500/40' : ''}`}
                >
                  {chatSelectMode && (
                    <div className="shrink-0 text-primary-500">
                      {selectedChatIds.includes(conv._id) ? <CheckSquare size={20} /> : <Square size={20} className="text-dark-textSecondary" />}
                    </div>
                  )}
                  <div className="relative w-12 h-12 flex-shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); if (!chatSelectMode) setEnlargedProfile(conv); }} title="Tap to enlarge profile picture">
                    <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity">
                      {getConversationAvatar(conv) ? (
                        <img
                          src={getConversationAvatar(conv)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold">
                          {getConversationName(conv)?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    {/* GENZ MOD: Online Indicator */}
                    {!conv.isGroup && onlineUsers.includes(conv.participants?.find(p => p._id !== user?.id)?._id) && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-[2.5px] border-[#111b21] rounded-full z-10 shadow-sm" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-dark-text font-medium truncate">
                        {getConversationName(conv)}
                      </h3>
                      <div className="flex items-center gap-2">
                        {conv.isMuted && <VolumeX size={12} className="text-dark-textSecondary" />}
                        {isChatPinned(conv) && <Pin size={12} className="text-primary-500 rotate-45" />}
                        {/* Unread count badge */}
                        {conv.unreadCount > 0 ? (
                          <span className="unread-badge">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </span>
                        ) : (
                          <span className="text-xs text-dark-textSecondary">
                            {conv.lastMessage && formatConversationTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2 mt-1 min-w-0">
                        {(conversationTags[conv._id] || []).length > 0 && (
                          <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
                            {(conversationTags[conv._id] || []).slice(0, 2).map((tag) => (
                              <span key={`${conv._id}-${tag}`} className="rounded-full border border-primary-500/40 bg-primary-500/10 px-2 py-0.5 text-[10px] font-semibold text-primary-300">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {typingByConversation[conv._id] ? (
                          <p className="text-sm truncate flex-1 text-left text-[#00a884] font-semibold flex items-center gap-1.5 min-w-0">
                            {typingByConversation[conv._id].type === 'recording' ? (
                              <>
                                <span className="flex gap-0.5 items-end">
                                  {[0,1,2,3,4].map((b,i) => (
                                    <span key={i} className="w-0.5 rounded-sm bg-[#00a884]"
                                      style={{ height: `${6 + (i % 3) * 3}px`, animation: 'recordWave 1s infinite ease-in-out', animationDelay: `${i * 0.1}s` }} />
                                  ))}
                                </span>
                                <span>recording...</span>
                                <style>{`@keyframes recordWave{0%,100%{transform:scaleY(0.5)}50%{transform:scaleY(1.2)}}`}</style>
                              </>
                            ) : (
                              <>
                                <span className="flex gap-0.5 items-end">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]" style={{ animation: 'typingBounce 1.2s infinite ease-in-out', animationDelay: '0s' }} />
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]" style={{ animation: 'typingBounce 1.2s infinite ease-in-out', animationDelay: '0.2s' }} />
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]" style={{ animation: 'typingBounce 1.2s infinite ease-in-out', animationDelay: '0.4s' }} />
                                </span>
                                <span>typing...</span>
                                <style>{`@keyframes typingBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}`}</style>
                              </>
                            )}
                          </p>
                        ) : (
                          <p className={`text-sm truncate flex-1 text-left min-w-0 ${
                            conv.unreadCount > 0 ? 'text-dark-text font-medium' : 'text-dark-textSecondary'
                          }`}>
                            {getLastMessage(conv)}
                          </p>
                        )}
                        {conv.lastMessage && (conv.lastMessage.sender?._id || conv.lastMessage.sender) === (user?._id || user?.id) && (
                          <div className="flex items-center gap-1 ml-2">
                            {conv.lastMessage.status === 'sent' && (
                              <Check size={12} className="text-dark-textSecondary" />
                            )}
                            {conv.lastMessage.status === 'delivered' && (
                              <CheckCheck size={12} className="text-dark-textSecondary" />
                            )}
                            {conv.lastMessage.status === 'read' && (
                              <CheckCheck size={12} className="text-blue-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
                {/* Action Buttons */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center gap-1 transition-all bg-dark-surface/60 md:bg-transparent rounded-lg backdrop-blur-[1px] p-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePinChat(conv._id); }}
                    className="p-1.5 hover:bg-dark-bg rounded text-dark-textSecondary"
                    title={isChatPinned(conv) ? "Unpin Chat" : "Pin Chat"}
                   aria-label="Pin">
                    <Pin size={14} className={isChatPinned(conv) ? "text-primary-500" : ""} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = clampContextMenuPosition(rect.right - CONTEXT_MENU_WIDTH, rect.bottom + 4);
                      handleContextMenuToggle(conv._id, pos, conv.isMuted, conv.isArchived);
                    }}
                    className="p-1.5 hover:bg-dark-bg rounded text-dark-textSecondary"
                    title="Options & Assign Tab" aria-label="Options & Assign Tab"
                  >
                    <MoreVertical size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = clampContextMenuPosition(rect.right - 220, rect.bottom + 6);
                      handleTagMenuToggle(conv._id, pos);
                    }}
                    className="p-1.5 hover:bg-dark-bg rounded text-dark-textSecondary"
                    title="Manage tags" aria-label="Manage tags"
                  >
                    <Tag size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GENZ MOD: Context Menu for Mute */}
        {tagMenuChatId && createPortal(
          <div ref={tagMenuRef} className="fixed z-[220] rounded-xl border border-dark-border bg-dark-surface p-3 shadow-2xl" style={{ top: tagMenuPosition.y, left: tagMenuPosition.x, minWidth: 220 }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-dark-text">Tags</p>
              <button onClick={() => setTagMenuChatId(null)} className="text-dark-textSecondary hover:text-dark-text" aria-label="Close tags">
                <X size={14} />
              </button>
            </div>
            <div className="mb-2 flex gap-2">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag"
                className="w-full rounded-lg border border-dark-border bg-dark-bg px-2 py-1.5 text-sm text-dark-text outline-none focus:border-primary-500"
              />
              <button
                type="button"
                onClick={() => handleCreateTag(tagMenuChatId)}
                className="rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-500"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const selected = (conversationTags[tagMenuChatId] || []).includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tagMenuChatId, tag)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${selected ? 'bg-primary-600 text-white' : 'bg-dark-bg text-dark-textSecondary hover:text-dark-text'}`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}

        {contextMenu && createPortal(
          <div
            ref={contextMenuRef}
            className="fixed z-[200] bg-dark-surface border border-dark-border rounded-lg shadow-2xl py-2 w-52 max-h-[420px] overflow-y-auto"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => { toggleMuteChat(contextMenu.chatId); setContextMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-dark-text transition-colors"
            >
              <VolumeX size={16} />
              <span>{contextMenu.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
            </button>
            <button
              onClick={() => { toggleArchiveChat(contextMenu.chatId); setContextMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-dark-text transition-colors"
            >
              <Archive size={16} />
              <span>{contextMenu.isArchived ? 'Unarchive Chat' : 'Archive Chat'}</span>
            </button>
            <div className="border-t border-dark-border my-1" />
            <div className="px-4 py-1 text-xs font-semibold text-dark-textSecondary uppercase tracking-wider">Assign to Tab</div>
            {chatTabs.filter(t => t !== 'All' && t !== 'Groups').map(tab => {
              const currentTabs = chatTabMap[contextMenu.chatId] || [];
              const isAssigned = currentTabs.includes(tab);
              return (
                <button
                  key={tab}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignTab(contextMenu.chatId, tab);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-dark-hover text-dark-text transition-colors text-sm"
                >
                  <span>{tab}</span>
                  {isAssigned && <Check size={14} className="text-primary-500" />}
                </button>
              );
            })}
            <div className="border-t border-dark-border my-1" />
            <button
              onClick={() => { handleClearChat(contextMenu.chatId); setContextMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-dark-text transition-colors"
            >
              <Trash2 size={16} />
              <span>Clear Chat</span>
            </button>
            <button
              onClick={() => { handleDeleteChat(contextMenu.chatId); setContextMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-dark-hover text-red-400 transition-colors"
            >
              <Trash2 size={16} />
              <span>Delete Chat</span>
            </button>
          </div>,
          document.body
        )}
        {isOpen && activeTab === 'calls' && (
          <div className="p-2 space-y-1">
            {(callLogs || []).length === 0 && (
              <p className="text-sm text-dark-textSecondary text-center py-6">Hakuna simu bado</p>
            )}
            {(callLogs || []).map((log) => {
              const isMissed = log.missed || log.status === 'missed';
              const isIncoming = log.type === 'incoming' || log.direction === 'incoming';
              const isOutgoing = log.type === 'outgoing' || log.direction === 'outgoing';
              const displayName = log.callerName || log.calleeName || log.peerName || log.username || 'Unknown';
              const when = log.timestamp || log.createdAt || log.startedAt;
              return (
              <div key={log._id} onClick={() => navigate('/calls')} className="flex items-center gap-3 p-3 hover:bg-dark-hover rounded-lg transition-colors group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-600">
                  <span className="font-bold">{displayName.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-dark-text font-medium truncate">{displayName}</h3>
                  <div className="flex items-center gap-1">
                    {isMissed ? <PhoneMissed size={12} className="text-red-500" /> :
                      isIncoming ? <PhoneIncoming size={12} className="text-green-500" /> :
                      isOutgoing ? <PhoneOutgoing size={12} className="text-primary-500" /> :
                        <Phone size={12} className="text-dark-textSecondary" />}
                    <span className="text-xs text-dark-textSecondary">
                      {isMissed ? 'Missed · ' : isIncoming ? 'Incoming · ' : isOutgoing ? 'Outgoing · ' : ''}
                      {when ? `${new Date(when).toLocaleDateString()} ${new Date(when).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </span>
                  </div>
                </div>
                <div className="text-primary-600">
                  {(log.callType === 'video' || log.type === 'video') ? <Video size={18} /> : <Phone size={18} />}
                </div>
              </div>
            );})}
          </div>
        )}
        {isOpen && activeTab === 'visitors' && (
          <div className="p-2 space-y-1">
            <h4 className="text-xs text-dark-textSecondary uppercase font-bold px-3 mb-2">Recent Profile Visitors</h4>
            {profileVisitors.length === 0 && <p className="text-sm text-dark-textSecondary text-center py-4">No visitors yet.</p>}
            {(profileVisitors || []).map((visitor, index) => (
              <div key={index} className="flex items-center gap-3 p-3 hover:bg-dark-hover rounded-lg transition-colors group cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-600">
                  <User size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-dark-text font-medium truncate">{visitor.visitorName}</h3>
                  <p className="text-xs text-dark-textSecondary">
                    Visited {new Date(visitor.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {/* Add a button to view their profile or chat */}
                <button className="text-primary-600 hover:text-primary-700" aria-label="Message"><MessageCircle size={18} /></button>
              </div>
            ))}
          </div>
        )}
        {isOpen && activeTab === 'status' && (
          <div className="p-2 space-y-4 relative h-full flex flex-col">
            {/* My Status */}
            <div
              className="flex items-center gap-3 p-3 hover:bg-dark-hover rounded-lg transition-colors cursor-pointer group"
              onClick={() => {
                const myStatuses = (statuses || []).filter(s => 
                  String(s.userId) === String(user?.id) || 
                  String(s.userId) === String(user?._id) ||
                  (s.username && user?.username && s.username === user.username)
                );
                if (myStatuses.length > 0) {
                  setSelectedStatus(myStatuses[myStatuses.length - 1]); // Show latest
                } else {
                  setStatusCreatorMode('media');
                  setShowStatusCreator(true);
                }
              }}
            >
              <div className="relative w-12 h-12 rounded-full border-2 border-primary-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={getAvatarUrl(user)} alt="My Status" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute bottom-0 right-0 bg-primary-600 rounded-full p-0.5 border border-dark-bg">
                  {statusUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <PlusCircle size={16} className="text-white bg-primary-600 rounded-full" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-dark-text font-medium">My Status</h3>
                <p className="text-xs text-dark-textSecondary">
                  {statusUploading ? 'Sending...' : ((statuses || []).some(s => String(s.userId) === String(user?.id) || String(s.userId) === String(user?._id)) ? 'Tap to view your status' : 'Tap to add status update')}
                </p>
              </div>
              {/* Delete latest status button */}
              {(statuses || []).filter(s => String(s.userId) === String(user?.id) || String(s.userId) === String(user?._id)).length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const myStatuses = (statuses || []).filter(s => String(s.userId) === String(user?.id) || String(s.userId) === String(user?._id));
                    if (myStatuses.length > 0) {
                      deleteStatus(myStatuses[myStatuses.length - 1]._id || myStatuses[myStatuses.length - 1].id);
                    }
                  }}
                  className="p-2 text-dark-textSecondary hover:text-red-500 rounded-full hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Status"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {/* GENZ Ultra: Story Highlights */}
            {mods?.storyHighlights && (
              <StoryHighlights statuses={(statuses || []).filter(s => String(s.userId) === String(user?.id) || String(s.userId) === String(user?._id))} />
            )}

            {/* Friends' Statuses */}
            <div className="space-y-2">
              <h4 className="text-xs text-dark-textSecondary uppercase font-bold px-3">Recent updates</h4>
              {(statuses || []).filter(s => String(s.userId) !== String(user?.id) && String(s.userId) !== String(user?._id)).map((status, index) => (
                <div
                  key={status.id || status._id || `status-${index}`}
                  className="flex items-center gap-3 p-3 hover:bg-dark-hover rounded-lg transition-colors cursor-pointer"
                  onClick={() => setSelectedStatus(status)}
                >
                  <div className="w-12 h-12 rounded-full border-2 border-green-500 flex items-center justify-center overflow-hidden">
                    {status.type === 'image' ? (
                      <img src={status.mediaUrl} alt="Status" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-white font-semibold bg-gray-500 w-full h-full flex items-center justify-center">{status.username?.charAt(0) || '?'}</span>
                    )}
                    {status.wasDeletedByOwner && mods?.antiDeleteStatus && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <Trash2 size={16} className="text-red-500 drop-shadow-md" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-dark-text font-medium">{status.username}</h3>
                    <p className="text-xs text-dark-textSecondary">{status?.content ? status.content.substring(0, 30) + '...' : ''}</p>
                  </div>
                  <span className="text-xs text-dark-textSecondary">{formatConversationTime(status.timestamp)}</span>
                </div>
              ))}
            </div>
            {/* TM WhatsApp Style Floating Action Buttons */}
            <div className="absolute bottom-6 right-4 flex flex-col gap-3">
              <button
                onClick={() => {
                  setStatusCreatorMode('text');
                  setShowStatusCreator(true);
                }}
                className="w-10 h-10 bg-dark-surface border border-dark-border hover:bg-dark-hover rounded-full flex items-center justify-center text-primary-500 shadow-lg transition-transform hover:scale-110"
                title="Text Status" aria-label="Text Status"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => {
                  setStatusCreatorMode('media');
                  setShowStatusCreator(true);
                }}
                className="w-14 h-14 bg-primary-600 hover:bg-primary-700 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-110"
                title="Camera/Media Status" aria-label="Camera/Media Status"
              >
                <Camera size={24} />
              </button>
            </div>
          </div>
        )}
        {!isOpen && ( // Collapsed sidebar view
          <div className="p-2 space-y-2">
            {filteredConversations.slice(0, 10).map((conv) => (
              <button
                key={conv._id}
                onClick={() => {
                  selectConversation(conv);
                  onToggle();
                }}
                className={`w-full p-2 rounded-lg transition-colors ${selectedConversation?._id === conv._id
                  ? 'bg-dark-hover'
                  : 'hover:bg-dark-hover'
                  }`}
                title={getConversationName(conv)}
              >
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center mx-auto overflow-hidden">
                  {getConversationAvatar(conv) ? (
                    <img
                      src={getConversationAvatar(conv)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-sm">
                      {getConversationName(conv)?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 p-4 border-t border-dark-border bg-dark-surface/85 backdrop-blur-sm">
        <button
          onClick={() => navigate('/new-group')}
          className={`flex items-center gap-2 w-full p-2 hover:bg-dark-hover rounded-lg transition-colors ${!isOpen ? 'justify-center' : ''
            }`}
        >
          <Users className="w-5 h-5 text-dark-text" />
          {isOpen && <span className="text-dark-text">New Group</span>}
        </button>
      </div>

      {showBroadcastModal && (
        <BroadcastModal onClose={() => setShowBroadcastModal(false)} />
      )}
      {showMassSenderModal && (
        <MassSenderModal onClose={() => setShowMassSenderModal(false)} />
      )}
      {showProfileEditor && (
        <ProfileEditor onClose={() => setShowProfileEditor(false)} />
      )}

      {showAddTabModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl w-full max-w-sm overflow-hidden shadow-2xl p-4">
            <h3 className="text-lg font-bold text-dark-text mb-4">Add Custom Tab</h3>
            <input
              type="text"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              placeholder="e.g. Family, Projects, Travel..."
              className="w-full bg-dark-bg border border-dark-border text-dark-text px-4 py-2 rounded-lg mb-4 focus:outline-none focus:border-primary-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowAddTabModal(false); setNewTabName(''); }}
                className="px-4 py-2 text-dark-textSecondary hover:text-dark-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTab}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showStatusCreator && (
          <StatusCreator
            onClose={() => setShowStatusCreator(false)}
            onSend={handleStatusSend}
            initialMode={statusCreatorMode}
            enableCollab={mods?.collabStatus}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedStatus && (
          mods?.reelMode ? (
            <StatusScrollFeed
              statuses={statuses}
              initialStatusId={selectedStatus._id || selectedStatus.id}
              currentUserId={user?.id}
              onClose={() => setSelectedStatus(null)}
            />
          ) : (
            <StatusViewer
              status={selectedStatus}
              onClose={() => setSelectedStatus(null)}
            />
          )
        )}
      </AnimatePresence>

      {showAccountSwitcher && (
        <AccountSwitcher onClose={() => setShowAccountSwitcher(false)} />
      )}
      {enlargedProfile && getConversationAvatar(enlargedProfile) && (
        <ProfileEnlarger
          src={getConversationAvatar(enlargedProfile)}
          alt={getConversationName(enlargedProfile)}
          onClose={() => setEnlargedProfile(null)}
        />
      )}
    </aside>
  );
};

export default Sidebar;
