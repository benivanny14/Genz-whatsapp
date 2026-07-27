import React, { useState } from 'react';
import { Mail, MailOpen, X, Check, RefreshCw, MessageSquare, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MarkAsUnread = ({ chats, onMarkAsUnread, onMarkAsRead, onClose }) => {
  const [selectedChats, setSelectedChats] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleChat = (chatId) => {
    setSelectedChats(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleMarkAsUnread = async () => {
    if (selectedChats.length === 0) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsProcessing(false);
    selectedChats.forEach(chatId => onMarkAsUnread?.(chatId));
    setSelectedChats([]);
  };

  const handleMarkAsRead = async () => {
    if (selectedChats.length === 0) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsProcessing(false);
    selectedChats.forEach(chatId => onMarkAsRead?.(chatId));
    setSelectedChats([]);
  };

  const unreadChats = chats.filter(chat => chat.unreadCount > 0);
  const readChats = chats.filter(chat => chat.unreadCount === 0);

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
              <Mail size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Mark as Unread</h2>
              <p className="text-gray-400 text-sm">{chats.length} chats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Selected Chats */}
        {selectedChats.length > 0 && (
          <div className="p-4 border-b border-[#00a884]/20 bg-[#00a884]/10">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">{selectedChats.length} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={handleMarkAsUnread}
                  disabled={isProcessing}
                  className="bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Mail size={14} />
                      Mark Unread
                    </>
                  )}
                </button>
                <button
                  onClick={handleMarkAsRead}
                  disabled={isProcessing}
                  className="bg-[#0b141a] text-white px-4 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <MailOpen size={14} />
                      Mark Read
                    </>
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
          <div className="space-y-2">
            {chats.map(chat => (
              <motion.div
                key={chat._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-[#0b141a] rounded-lg p-4 border cursor-pointer hover:border-[#00a884]/30 transition-colors ${
                  chat.unreadCount > 0 ? 'border-[#00a884]/20' : 'border-[#00a884]/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedChats.includes(chat._id)}
                    onChange={() => handleToggleChat(chat._id)}
                    className="w-5 h-5 rounded"
                  />
                  <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={20} className="text-[#00a884]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{chat.name}</h3>
                      {chat.unreadCount > 0 && (
                        <span className="bg-[#00a884] text-white text-xs px-2 py-0.5 rounded-full">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-1">{chat.lastMessage}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {chat.unreadCount > 0 ? (
                      <Mail size={16} className="text-[#00a884]" />
                    ) : (
                      <MailOpen size={16} className="text-gray-500" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {chats.length === 0 && (
            <div className="text-center py-12">
              <Mail className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No chats available</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 border-t border-[#00a884]/20">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Bell className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
              <p className="text-blue-500 text-xs">
                Marking chats as unread will show them with unread indicators even if you've read the messages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Mark as Unread Button Component
export const MarkAsUnreadButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Mark as unread"
    >
      <Mail size={18} />
    </button>
  );
};

// Unread Indicator Component
export const UnreadIndicator = ({ unreadCount }) => {
  return (
    <AnimatePresence>
      {unreadCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-[#00a884] text-white text-xs w-6 h-6 rounded-full flex items-center justify-center"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Quick Mark Unread Component
export const QuickMarkUnread = ({ chat, onMarkAsUnread }) => {
  return (
    <button
      onClick={() => onMarkAsUnread?.(chat._id)}
      className="flex items-center gap-2 bg-[#0b141a] px-3 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors"
    >
      <Mail size={16} className="text-[#00a884]" />
      <span className="text-white text-sm">Mark as Unread</span>
    </button>
  );
};

// Quick Mark Read Component
export const QuickMarkRead = ({ chat, onMarkAsRead }) => {
  return (
    <button
      onClick={() => onMarkAsRead?.(chat._id)}
      className="flex items-center gap-2 bg-[#0b141a] px-3 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors"
    >
      <MailOpen size={16} className="text-gray-400" />
      <span className="text-white text-sm">Mark as Read</span>
    </button>
  );
};

// Unread Badge Component
export const UnreadBadge = ({ count }) => {
  if (count === 0) return null;
  
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="bg-[#00a884] text-white text-xs font-bold px-2 py-0.5 rounded-full"
    >
      {count > 99 ? '99+' : count}
    </motion.div>
  );
};

export default MarkAsUnread;
