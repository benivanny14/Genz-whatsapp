import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  MoreVertical, 
  Archive, 
  Trash2, 
  Pin, 
  Mute, 
  Check, 
  CheckCheck,
  Clock,
  User,
  Users,
  Star,
  Filter,
  RefreshCw,
  Plus,
  ChevronRight
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

const ChatList = ({ onSelectChat }) => {
  const { conversations, fetchConversations, archiveConversation, deleteConversation } = useChat();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread, pinned, archived
  const [selectedChats, setSelectedChats] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [swipedChat, setSwipedChat] = useState(null);
  const [sections, setSections] = useState({ pinned: [], recent: [], archived: [] });
  const [loading, setLoading] = useState(false);
  const [pullToRefresh, setPullToRefresh] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef(null);

  // Fetch conversations on mount
  useEffect(() => {
    loadConversations();
  }, [filter]);

  // Organize conversations into sections
  useEffect(() => {
    organizeConversations();
  }, [conversations, filter, searchQuery]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      await fetchConversations();
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizeConversations = () => {
    const filtered = conversations.filter(conv => {
      const matchesSearch = conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (filter === 'archived') return matchesSearch && conv.isArchived;
      if (filter === 'unread') return matchesSearch && conv.unreadCount > 0;
      if (filter === 'pinned') return matchesSearch && conv.isPinned;
      return matchesSearch && !conv.isArchived;
    });

    const pinned = filtered.filter(c => c.isPinned);
    const recent = filtered.filter(c => !c.isPinned).sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    const archived = conversations.filter(c => c.isArchived);

    setSections({ pinned, recent, archived });
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSelectedChats(new Set());
    setIsSelectMode(false);
  };

  const handleChatSelect = (chat) => {
    if (isSelectMode) {
      toggleChatSelection(chat._id);
    } else {
      onSelectChat(chat);
    }
  };

  const toggleChatSelection = (chatId) => {
    const newSelection = new Set(selectedChats);
    if (newSelection.has(chatId)) {
      newSelection.delete(chatId);
    } else {
      newSelection.add(chatId);
    }
    setSelectedChats(newSelection);
    setIsSelectMode(newSelection.size > 0);
  };

  const handleLongPress = (chatId) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      setSelectedChats(new Set([chatId]));
    }
  };

  const handleSwipeStart = (chatId) => {
    setSwipedChat(chatId);
  };

  const handleSwipeEnd = () => {
    setSwipedChat(null);
  };

  const handleArchive = async (chatId) => {
    try {
      await archiveConversation(chatId);
      await loadConversations();
    } catch (error) {
      console.error('Error archiving chat:', error);
    }
  };

  const handleDelete = async (chatId) => {
    try {
      await deleteConversation(chatId);
      await loadConversations();
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handlePin = async (chatId) => {
    // Implement pin functionality
    console.log('Pin chat:', chatId);
  };

  const handleMute = async (chatId) => {
    // Implement mute functionality
    console.log('Mute chat:', chatId);
  };

  const handleBulkArchive = async () => {
    for (const chatId of selectedChats) {
      await handleArchive(chatId);
    }
    setSelectedChats(new Set());
    setIsSelectMode(false);
  };

  const handleBulkDelete = async () => {
    for (const chatId of selectedChats) {
      await handleDelete(chatId);
    }
    setSelectedChats(new Set());
    setIsSelectMode(false);
  };

  const handlePullToRefresh = async () => {
    setPullToRefresh(true);
    await loadConversations();
    setTimeout(() => setPullToRefresh(false), 500);
  };

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
    if (e.target.scrollTop < 50 && !loading) {
      handlePullToRefresh();
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const msgDate = new Date(date);
    const diff = now - msgDate;
    
    if (diff < 86400000) { // Less than 24 hours
      return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) { // Less than a week
      return msgDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const renderChatItem = (chat, section) => (
    <motion.div
      key={chat._id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`relative overflow-hidden ${selectedChats.has(chat._id) ? 'bg-green-50' : 'bg-white'}`}
    >
      {/* Swipe actions */}
      <AnimatePresence>
        {swipedChat === chat._id && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute inset-0 flex bg-gray-100"
          >
            <button
              onClick={() => handleArchive(chat._id)}
              className="flex-1 flex items-center justify-center bg-yellow-500 text-white"
            >
              <Archive className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleDelete(chat._id)}
              className="flex-1 flex items-center justify-center bg-red-500 text-white"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat item */}
      <div
        className={`relative p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
          swipedChat === chat._id ? 'translate-x-0' : ''
        }`}
        onTouchStart={() => handleSwipeStart(chat._id)}
        onTouchEnd={handleSwipeEnd}
        onMouseDown={() => handleSwipeStart(chat._id)}
        onMouseUp={handleSwipeEnd}
        onClick={() => handleChatSelect(chat)}
        onContextMenu={(e) => {
          e.preventDefault();
          handleLongPress(chat._id);
        }}
      >
        {/* Selection checkbox */}
        {isSelectMode && (
          <div
            className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
              selectedChats.has(chat._id) ? 'bg-green-500 border-green-500' : 'border-gray-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              toggleChatSelection(chat._id);
            }}
          >
            {selectedChats.has(chat._id) && <Check className="w-4 h-4 text-white" />}
          </div>
        )}

        {/* Avatar */}
        <div className="relative w-12 h-12 flex-shrink-0">
          {chat.isGroup ? (
            <div className="w-full h-full bg-green-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          ) : (
            <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          )}
          {chat.isPinned && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
              <Pin className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Chat info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-gray-800 truncate">{chat.name}</h4>
            <div className="flex items-center gap-2">
              {chat.isMuted && <Mute className="w-3 h-3 text-gray-400" />}
              <span className="text-xs text-gray-500">{formatTime(chat.updatedAt)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 truncate flex-1">
              {chat.lastMessage?.content || 'No messages yet'}
            </p>
            <div className="flex items-center gap-1">
              {chat.lastMessage?.sender === user._id && renderStatusIcon(chat.lastMessage?.status)}
              {chat.unreadCount > 0 && (
                <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderSection = (title, chats) => {
    if (chats.length === 0) return null;
    
    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
          {title}
        </h3>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {chats.map(chat => renderChatItem(chat, title))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-800">Chats</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={loadConversations}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {['all', 'unread', 'pinned', 'archived'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => handleFilterChange(filterOption)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === filterOption
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Selection mode actions */}
      <AnimatePresence>
        {isSelectMode && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-green-500 text-white p-3 flex items-center justify-between"
          >
            <span className="font-medium">{selectedChats.size} selected</span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkArchive}
                className="p-2 hover:bg-green-600 rounded-full transition-colors"
              >
                <Archive className="w-5 h-5" />
              </button>
              <button
                onClick={handleBulkDelete}
                className="p-2 hover:bg-green-600 rounded-full transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setSelectedChats(new Set());
                  setIsSelectMode(false);
                }}
                className="p-2 hover:bg-green-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {pullToRefresh && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-2"
          >
            <RefreshCw className="w-5 h-5 text-green-500 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-3"
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          <AnimatePresence>
            {sections.pinned.length > 0 && renderSection('Pinned', sections.pinned)}
            {sections.recent.length > 0 && renderSection('Recent', sections.recent)}
            {sections.archived.length > 0 && renderSection('Archived', sections.archived)}
            
            {sections.pinned.length === 0 && sections.recent.length === 0 && sections.archived.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No chats yet</p>
                <p className="text-sm mt-2">Start a conversation to see it here</p>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* FAB for new chat */}
      <button className="absolute bottom-6 right-6 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};

export default ChatList;
