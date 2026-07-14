import React, { useState } from 'react';
import { Pin, X, Search, Check, MessageSquare, Users, Clock, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PinnedChats = ({ chats, onPin, onUnpin, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChats, setSelectedChats] = useState([]);

  const filteredChats = chats.filter(chat =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTogglePin = (chatId) => {
    const chat = chats.find(c => c._id === chatId);
    if (chat.isPinned) {
      onUnpin?.(chatId);
    } else {
      onPin?.(chatId);
    }
  };

  const pinnedChats = filteredChats.filter(chat => chat.isPinned);
  const unpinnedChats = filteredChats.filter(chat => !chat.isPinned);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Pin size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Pinned Chats</h2>
              <p className="text-gray-400 text-sm">{pinnedChats.length} pinned</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Pinned Section */}
          {pinnedChats.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                <Pin size={14} className="text-[#00a884]" />
                Pinned Chats
              </p>
              <div className="space-y-2">
                {pinnedChats.map(chat => (
                  <motion.div
                    key={chat._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                        {chat.isGroup ? (
                          <Users size={24} className="text-[#00a884]" />
                        ) : (
                          <MessageSquare size={24} className="text-[#00a884]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium">{chat.name}</h3>
                          <Pin size={12} className="text-[#00a884]" />
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-1">{chat.lastMessage}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <Clock size={10} />
                          <span>{new Date(chat.lastMessageTime).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleTogglePin(chat._id)}
                        className="text-[#00a884] hover:text-white transition-colors"
                        title="Unpin"
                      >
                        <Pin size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Unpinned Section */}
          {unpinnedChats.length > 0 && (
            <div>
              <p className="text-gray-400 text-sm mb-2">Other Chats</p>
              <div className="space-y-2">
                {unpinnedChats.map(chat => (
                  <motion.div
                    key={chat._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 hover:border-[#00a884]/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                        {chat.isGroup ? (
                          <Users size={24} className="text-[#00a884]" />
                        ) : (
                          <MessageSquare size={24} className="text-[#00a884]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{chat.name}</h3>
                        <p className="text-gray-400 text-sm line-clamp-1">{chat.lastMessage}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <Clock size={10} />
                          <span>{new Date(chat.lastMessageTime).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleTogglePin(chat._id)}
                        className="text-gray-400 hover:text-[#00a884] transition-colors"
                        title="Pin"
                      >
                        <Pin size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {filteredChats.length === 0 && (
            <div className="text-center py-12">
              <Pin className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">
                {searchQuery ? 'No chats found' : 'No chats available'}
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        {pinnedChats.length > 0 && (
          <div className="p-4 border-t border-[#00a884]/20">
            <div className="bg-[#00a884]/10 border border-[#00a884]/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Pin className="text-[#00a884] flex-shrink-0 mt-0.5" size={14} />
                <p className="text-[#00a884] text-xs">
                  Pinned chats stay at the top of your chat list for quick access.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Pin Button Component
export const PinButton = ({ isPinned, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-full transition-colors ${
        isPinned
          ? 'text-[#00a884] hover:text-white'
          : 'text-gray-400 hover:text-[#00a884]'
      }`}
      title={isPinned ? 'Unpin chat' : 'Pin chat'}
    >
      <Pin size={18} />
    </button>
  );
};

// Pinned Chats Settings Component
export const PinnedChatsSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Pin size={18} className="text-[#00a884]" />
            Pinned Chats
          </p>
          <p className="text-gray-400 text-sm">Keep important chats at top</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, pinnedChatsEnabled: !settings.pinnedChatsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.pinnedChatsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.pinnedChatsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.pinnedChatsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Max pinned chats</p>
            <select
              value={settings.maxPinnedChats || '3'}
              onChange={(e) => onUpdate({ ...settings, maxPinnedChats: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="3">3 chats</option>
              <option value="5">5 chats</option>
              <option value="10">10 chats</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show pinned badge</p>
              <p className="text-gray-400 text-xs">Display pin indicator</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showPinnedBadge: !settings.showPinnedBadge })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showPinnedBadge ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showPinnedBadge ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Pinned Chat Indicator Component
export const PinnedChatIndicator = ({ isPinned }) => {
  return (
    <AnimatePresence>
      {isPinned && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute top-2 right-2 bg-[#00a884] rounded-full p-1"
        >
          <Pin size={12} className="text-white" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Pinned Chats List Component
export const PinnedChatsList = ({ chats, onChatClick }) => {
  const pinnedChats = chats.filter(chat => chat.isPinned);

  if (pinnedChats.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-4">
        <Pin size={14} className="text-[#00a884]" />
        <span className="text-gray-400 text-sm">Pinned</span>
      </div>
      <div className="space-y-1">
        {pinnedChats.map(chat => (
          <button
            key={chat._id}
            onClick={() => onChatClick?.(chat)}
            className="w-full p-3 rounded-lg hover:bg-[#00a884]/10 transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
              {chat.isGroup ? (
                <Users size={20} className="text-[#00a884]" />
              ) : (
                <MessageSquare size={20} className="text-[#00a884]" />
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium">{chat.name}</p>
                <Pin size={10} className="text-[#00a884]" />
              </div>
              <p className="text-gray-400 text-sm line-clamp-1">{chat.lastMessage}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PinnedChats;
