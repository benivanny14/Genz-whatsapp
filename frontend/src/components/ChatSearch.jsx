import React, { useState } from 'react';
import { Search, X, Clock, MessageSquare, User, Filter, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatSearch = ({ chats, onChatSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, contacts, groups, archived

  const filterTypes = [
    { id: 'all', label: 'All' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'groups', label: 'Groups' },
    { id: 'archived', label: 'Archived' },
  ];

  const filteredChats = chats.filter(chat => {
    const matchesQuery = chat.name?.toLowerCase().includes(query.toLowerCase()) ||
                         chat.lastMessage?.toLowerCase().includes(query.toLowerCase());
    
    const matchesFilter = filterType === 'all' ||
                         (filterType === 'contacts' && !chat.isGroup) ||
                         (filterType === 'groups' && chat.isGroup) ||
                         (filterType === 'archived' && chat.isArchived);
    
    return matchesQuery && matchesFilter;
  });

  const handleChatSelect = (chat) => {
    onChatSelect?.(chat);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center gap-3 border-b border-[#00a884]/20">
          <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
            <Search size={20} className="text-[#00a884]" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats..."
            className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-[#00a884]/20">
          {filterTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                filterType === type.id
                  ? 'text-[#00a884] border-b-2 border-[#00a884]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length > 0 ? (
            <div className="divide-y divide-[#00a884]/10">
              {filteredChats.map(chat => (
                <button
                  key={chat._id}
                  onClick={() => handleChatSelect(chat)}
                  className="w-full p-4 hover:bg-[#00a884]/10 transition-colors flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-[#00a884]/20 flex items-center justify-center flex-shrink-0">
                    {chat.avatar ? (
                      <img
                        src={chat.avatar}
                        alt={chat.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User size={24} className="text-[#00a884]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-medium truncate">{chat.name}</p>
                      <p className="text-gray-400 text-xs">{new Date(chat.lastMessageTime).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-400 text-sm truncate">{chat.lastMessage}</p>
                      {chat.unreadCount > 0 && (
                        <span className="bg-[#00a884] text-white text-xs px-2 py-0.5 rounded-full">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">
                {query ? 'No chats found' : 'Search for chats...'}
              </p>
            </div>
          )}
        </div>

        {/* Recent Searches */}
        {query === '' && (
          <div className="p-4 border-t border-[#00a884]/20">
            <p className="text-gray-400 text-sm mb-3">Recent searches</p>
            <div className="space-y-2">
              {['Family group', 'Work updates', 'John Doe'].map((search, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(search)}
                  className="w-full p-2 rounded-lg hover:bg-[#00a884]/10 transition-colors flex items-center gap-3 text-left"
                >
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-white text-sm">{search}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Chat Search Button Component
export const ChatSearchButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Search chats"
    >
      <Search size={20} />
    </button>
  );
};

// Chat Search Input Component
export const ChatSearchInput = ({ onSearch, placeholder }) => {
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder || 'Search chats...'}
        className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
      />
      {query && (
        <button
          onClick={() => {
            setQuery('');
            onSearch?.('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

// Chat Search Settings Component
export const ChatSearchSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Search size={18} className="text-[#00a884]" />
            Chat Search
          </p>
          <p className="text-gray-400 text-sm">Search through your chats</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, chatSearchEnabled: !settings.chatSearchEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.chatSearchEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.chatSearchEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.chatSearchEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Search message content</p>
              <p className="text-gray-400 text-xs">Include messages in search</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, searchMessages: !settings.searchMessages })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.searchMessages ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.searchMessages ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Save search history</p>
              <p className="text-gray-400 text-xs">Remember recent searches</p>
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
        </div>
      )}
    </div>
  );
};

export default ChatSearch;
