import React, { useState } from 'react';
import { ArrowUpDown, X, Check, Clock, MessageSquare, User, Users, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatSort = ({ chats, onSort, onClose }) => {
  const [selectedSort, setSelectedSort] = useState('recent'); // recent, name, unread, messages

  const sortOptions = [
    { id: 'recent', label: 'Recent', icon: Clock, description: 'Sort by last message' },
    { id: 'name', label: 'Name', icon: User, description: 'Sort alphabetically' },
    { id: 'unread', label: 'Unread', icon: MessageSquare, description: 'Sort by unread count' },
    { id: 'messages', label: 'Messages', icon: RefreshCw, description: 'Sort by total messages' },
  ];

  const handleSort = () => {
    onSort?.(selectedSort);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Sort Chats</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sort Options */}
        <div className="space-y-2 mb-4">
          {sortOptions.map(option => {
            const Icon = option.icon;
            const isSelected = selectedSort === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedSort(option.id)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                  isSelected
                    ? 'border-[#00a884] bg-[#00a884]/10'
                    : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                }`}
              >
                <Icon size={20} className={isSelected ? 'text-[#00a884]' : 'text-gray-400'} />
                <div className="flex-1">
                  <p className="text-white font-medium">{option.label}</p>
                  <p className="text-gray-400 text-sm">{option.description}</p>
                </div>
                {isSelected && <Check size={18} className="text-[#00a884]" />}
              </button>
            );
          })}
        </div>

        {/* Sort Order Toggle */}
        <div className="mb-4 p-4 bg-[#0b141a] rounded-lg border border-[#00a884]/20">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm">Sort order</span>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  true ? 'bg-[#00a884] text-white' : 'bg-[#0b141a] text-gray-400'
                }`}
              >
                Descending
              </button>
              <button
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  false ? 'bg-[#00a884] text-white' : 'bg-[#0b141a] text-gray-400'
                }`}
              >
                Ascending
              </button>
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <button
          onClick={handleSort}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
        >
          <ArrowUpDown size={18} />
          Apply Sort
        </button>
      </div>
    </motion.div>
  );
};

// Chat Sort Button Component
export const ChatSortButton = ({ onOpen, currentSort }) => {
  return (
    <button
      onClick={onOpen}
      className={`p-2 rounded-full transition-colors ${
        currentSort ? 'text-[#00a884]' : 'text-gray-400 hover:text-white'
      }`}
      title="Sort chats"
    >
      <ArrowUpDown size={20} />
    </button>
  );
};

// Chat Sort Badge Component
export const ChatSortBadge = ({ sortType, onRemove }) => {
  const labels = {
    recent: 'Recent',
    name: 'Name',
    unread: 'Unread',
    messages: 'Messages'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-3 py-1 rounded-full text-sm"
    >
      <ArrowUpDown size={12} />
      <span>{labels[sortType] || sortType}</span>
      {onRemove && (
        <button
          onClick={() => onRemove()}
          className="hover:opacity-70"
        >
          <X size={12} />
        </button>
      )}
    </motion.div>
  );
};

// Chat Sort Settings Component
export const ChatSortSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <ArrowUpDown size={18} className="text-[#00a884]" />
            Chat Sorting
          </p>
          <p className="text-gray-400 text-sm">Sort your chat list</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, chatSortingEnabled: !settings.chatSortingEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.chatSortingEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.chatSortingEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.chatSortingEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Default sort order</p>
            <select
              value={settings.defaultSortOrder || 'recent'}
              onChange={(e) => onUpdate({ ...settings, defaultSortOrder: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            >
              <option value="recent">Recent</option>
              <option value="name">Name</option>
              <option value="unread">Unread</option>
              <option value="messages">Messages</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Pinned chats first</p>
              <p className="text-gray-400 text-xs">Always show pinned at top</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, pinnedFirst: !settings.pinnedFirst })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.pinnedFirst ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.pinnedFirst ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSort;
