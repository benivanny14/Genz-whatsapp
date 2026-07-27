import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, X, ChevronDown, ChevronUp, Clock, FileText, Image as ImageIcon, Video, Music, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdvancedMessageSearch = ({ messages, chats, onMessageSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSender, setSelectedSender] = useState('all');

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages([]);
      return;
    }

    const filtered = messages.filter(msg => {
      // Search in content
      const matchesContent = msg.content?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Search by sender
      const matchesSender = msg.sender?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Search by chat
      const matchesChat = chats.find(c => c._id === msg.chatId)?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by selected chat
      const matchesSelectedChat = selectedChat === 'all' || msg.chatId === selectedChat;
      
      // Filter by type
      const matchesType = selectedType === 'all' || msg.type === selectedType;
      
      // Filter by sender
      const matchesSelectedSender = selectedSender === 'all' || msg.senderId === selectedSender;
      
      // Filter by date range
      let matchesDate = true;
      if (dateRange !== 'all') {
        const msgDate = new Date(msg.timestamp);
        const now = new Date();
        
        switch (dateRange) {
          case 'today':
            matchesDate = msgDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = msgDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = msgDate >= monthAgo;
            break;
          case 'year':
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            matchesDate = msgDate >= yearAgo;
            break;
        }
      }

      return (matchesContent || matchesSender || matchesChat) && 
             matchesSelectedChat && 
             matchesType && 
             matchesSelectedSender && 
             matchesDate;
    });

    setFilteredMessages(filtered);
  }, [searchQuery, messages, chats, selectedChat, selectedType, dateRange, selectedSender]);

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon size={16} className="text-[#00a884]" />;
      case 'video': return <Video size={16} className="text-[#00a884]" />;
      case 'audio': case 'voice': return <Music size={16} className="text-[#00a884]" />;
      case 'location': return <MapPin size={16} className="text-[#00a884]" />;
      case 'document': return <FileText size={16} className="text-[#00a884]" />;
      default: return null;
    }
  };

  const uniqueSenders = [...new Set(messages.map(m => m.senderId))].map(id => ({
    id,
    name: messages.find(m => m.senderId === id)?.sender?.name || 'Unknown'
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Search size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Search Messages</h2>
              <p className="text-gray-400 text-sm">{filteredMessages.length} results</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages, contacts, or chats..."
                className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                autoFocus
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-lg transition-all ${
                showFilters ? 'bg-[#00a884]/20 text-[#00a884]' : 'bg-[#0b141a] text-gray-400 hover:text-white'
              }`}
            >
              <Filter size={20} />
            </button>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3"
              >
                {/* Chat Filter */}
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Chat</label>
                  <select
                    value={selectedChat}
                    onChange={(e) => setSelectedChat(e.target.value)}
                    className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  >
                    <option value="all">All Chats</option>
                    {chats.map(chat => (
                      <option key={chat._id} value={chat._id}>{chat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Message Type</label>
                  <div className="flex gap-2">
                    {['all', 'text', 'image', 'video', 'audio', 'document', 'location'].map(type => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-3 py-1 rounded-lg text-sm capitalize transition-all ${
                          selectedType === type
                            ? 'bg-[#00a884] text-white'
                            : 'bg-[#0b141a] text-gray-400 hover:text-white'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Date Range</label>
                  <div className="flex gap-2">
                    {['all', 'today', 'week', 'month', 'year'].map(range => (
                      <button
                        key={range}
                        onClick={() => setDateRange(range)}
                        className={`px-3 py-1 rounded-lg text-sm capitalize transition-all ${
                          dateRange === range
                            ? 'bg-[#00a884] text-white'
                            : 'bg-[#0b141a] text-gray-400 hover:text-white'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sender Filter */}
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Sender</label>
                  <select
                    value={selectedSender}
                    onChange={(e) => setSelectedSender(e.target.value)}
                    className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  >
                    <option value="all">All Senders</option>
                    {uniqueSenders.map(sender => (
                      <option key={sender.id} value={sender.id}>{sender.name}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredMessages.length > 0 ? (
            <div className="space-y-3">
              {filteredMessages.map(message => (
                <motion.div
                  key={message._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    onMessageSelect(message);
                    onClose();
                  }}
                  className="bg-[#0b141a] rounded-lg p-4 cursor-pointer hover:bg-[#1a2e35] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Message Type Icon */}
                    {getMessageTypeIcon(message.type) && (
                      <div className="mt-1">
                        {getMessageTypeIcon(message.type)}
                      </div>
                    )}

                    {/* Message Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{message.sender?.name}</span>
                        <span className="text-gray-500 text-xs">•</span>
                        <span className="text-gray-500 text-xs">
                          {chats.find(c => c._id === message.chatId)?.name}
                        </span>
                        <span className="text-gray-500 text-xs">•</span>
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(message.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm line-clamp-2">{message.content}</p>
                      {message.type !== 'text' && (
                        <p className="text-[#00a884] text-xs mt-1 capitalize flex items-center gap-1">
                          {getMessageTypeIcon(message.type)}
                          {message.type}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-12">
              <Search className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No messages found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">Type to search messages</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Search Suggestions Component
export const SearchSuggestions = ({ query, messages, onSuggestionClick }) => {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const matchingRecent = recentSearches.filter(s => 
      s.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3);

    const matchingContacts = [...new Set(messages.map(m => m.sender?.name))]
      .filter(name => name?.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3);

    setSuggestions([...matchingRecent, ...matchingContacts]);
  }, [query, messages]);

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-[#0b141a] rounded-lg mt-2 overflow-hidden">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSuggestionClick(suggestion)}
          className="w-full text-left px-4 py-2 hover:bg-[#00a884]/10 transition-colors text-gray-300 text-sm"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};

// Search History Component
export const SearchHistory = ({ onClearHistory, onSelectHistory }) => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setHistory(savedHistory);
  }, []);

  const handleClear = () => {
    localStorage.removeItem('searchHistory');
    setHistory([]);
    if (onClearHistory) onClearHistory();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Recent Searches</h3>
        <button
          onClick={handleClear}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2">
        {history.map((item, index) => (
          <button
            key={index}
            onClick={() => onSelectHistory(item.query)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#00a884]/10 transition-colors text-gray-300 text-sm flex items-center gap-2"
          >
            <Clock size={14} className="text-gray-500" />
            {item.query}
          </button>
        ))}
      </div>

      {history.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No recent searches
        </div>
      )}
    </div>
  );
};

// Search Settings Component
export const SearchSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Search size={18} className="text-[#00a884]" />
            Search History
          </p>
          <p className="text-gray-400 text-sm">Save search history</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, saveSearchHistory: !settings.saveSearchHistory })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.saveSearchHistory ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.saveSearchHistory ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm">Auto-suggest</p>
          <p className="text-gray-400 text-xs">Show search suggestions</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, autoSuggest: !settings.autoSuggest })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.autoSuggest ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.autoSuggest ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div>
        <p className="text-white text-sm mb-2">Max history items</p>
        <select
          value={settings.maxHistoryItems || 10}
          onChange={(e) => onUpdate({ ...settings, maxHistoryItems: parseInt(e.target.value) })}
          className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>
    </div>
  );
};

export default AdvancedMessageSearch;
