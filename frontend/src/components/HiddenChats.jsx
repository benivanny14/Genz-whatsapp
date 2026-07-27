import React, { useState } from 'react';
import { Eye, EyeOff, X, Search, Lock, Unlock, RefreshCw, Shield, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HiddenChats = ({ chats, onHide, onUnhide, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChats, setSelectedChats] = useState([]);
  const [isHiding, setIsHiding] = useState(false);

  const filteredChats = chats.filter(chat =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleHide = (chatId) => {
    setSelectedChats(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleHide = async () => {
    setIsHiding(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsHiding(false);
    if (onHide) {
      onHide(selectedChats);
    }
    setSelectedChats([]);
  };

  const hiddenChats = filteredChats.filter(chat => chat.isHidden);
  const visibleChats = filteredChats.filter(chat => !chat.isHidden);

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
              <EyeOff size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Hidden Chats</h2>
              <p className="text-gray-400 text-sm">{hiddenChats.length} hidden</p>
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

        {/* Selected Chats */}
        {selectedChats.length > 0 && (
          <div className="p-4 border-b border-[#00a884]/20 bg-[#00a884]/10">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">{selectedChats.length} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={handleHide}
                  disabled={isHiding}
                  className="bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                >
                  {isHiding ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      Hiding...
                    </>
                  ) : (
                    'Hide Selected'
                  )}
                </button>
                <button
                  onClick={() => setSelectedChats([])}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Hidden Section */}
          {hiddenChats.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                <EyeOff size={14} className="text-[#00a884]" />
                Hidden Chats
              </p>
              <div className="space-y-2">
                {hiddenChats.map(chat => (
                  <motion.div
                    key={chat._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/30"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedChats.includes(chat._id)}
                        onChange={() => handleToggleHide(chat._id)}
                        className="w-5 h-5 rounded"
                      />
                      <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={20} className="text-[#00a884]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium">{chat.name}</h3>
                          <EyeOff size={12} className="text-[#00a884]" />
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-1">{chat.lastMessage}</p>
                      </div>
                      <button
                        onClick={() => onUnhide?.(chat._id)}
                        className="text-[#00a884] hover:text-white transition-colors"
                        title="Unhide"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Visible Section */}
          {visibleChats.length > 0 && (
            <div>
              <p className="text-gray-400 text-sm mb-2">Visible Chats</p>
              <div className="space-y-2">
                {visibleChats.map(chat => (
                  <motion.div
                    key={chat._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 hover:border-[#00a884]/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedChats.includes(chat._id)}
                        onChange={() => handleToggleHide(chat._id)}
                        className="w-5 h-5 rounded"
                      />
                      <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={20} className="text-[#00a884]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{chat.name}</h3>
                        <p className="text-gray-400 text-sm line-clamp-1">{chat.lastMessage}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {filteredChats.length === 0 && (
            <div className="text-center py-12">
              <EyeOff className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">
                {searchQuery ? 'No chats found' : 'No chats available'}
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        {hiddenChats.length > 0 && (
          <div className="p-4 border-t border-[#00a884]/20">
            <div className="bg-[#00a884]/10 border border-[#00a884]/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="text-[#00a884] flex-shrink-0 mt-0.5" size={14} />
                <p className="text-[#00a884] text-xs">
                  Hidden chats are moved to a separate folder and require authentication to access.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Hidden Chats Settings Component
export const HiddenChatsSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <EyeOff size={18} className="text-[#00a884]" />
            Hidden Chats
          </p>
          <p className="text-gray-400 text-sm">Hide sensitive conversations</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, hiddenChatsEnabled: !settings.hiddenChatsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.hiddenChatsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.hiddenChatsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.hiddenChatsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Require authentication</p>
              <p className="text-gray-400 text-xs">PIN or biometric to access</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, hiddenAuthRequired: !settings.hiddenAuthRequired })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.hiddenAuthRequired ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.hiddenAuthRequired ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show in notifications</p>
              <p className="text-gray-400 text-xs">Display hidden chat alerts</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showHiddenNotifications: !settings.showHiddenNotifications })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showHiddenNotifications ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showHiddenNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-hide sensitive chats</p>
              <p className="text-gray-400 text-xs">Hide chats with keywords</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoHideSensitive: !settings.autoHideSensitive })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoHideSensitive ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoHideSensitive ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Hidden Chats Button Component
export const HiddenChatsButton = ({ onOpen, hiddenCount }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors relative"
      title="Hidden chats"
    >
      <EyeOff size={18} />
      {hiddenCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#00a884] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {hiddenCount}
        </span>
      )}
    </button>
  );
};

// Hidden Chat Indicator Component
export const HiddenChatIndicator = ({ isHidden }) => {
  return (
    <AnimatePresence>
      {isHidden && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex items-center gap-2 bg-[#00a884]/20 border border-[#00a884] rounded-full px-3 py-1"
        >
          <EyeOff size={14} className="text-[#00a884]" />
          <span className="text-white text-xs">Hidden</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Quick Hide Chat Component
export const QuickHideChat = ({ chat, onHide }) => {
  return (
    <button
      onClick={() => onHide?.(chat._id)}
      className="flex items-center gap-2 bg-[#0b141a] px-3 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors"
    >
      <EyeOff size={16} className="text-[#00a884]" />
      <span className="text-white text-sm">Hide Chat</span>
    </button>
  );
};

export default HiddenChats;
