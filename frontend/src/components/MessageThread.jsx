import React, { useState } from 'react';
import { MessageSquare, X, ChevronRight, ChevronDown, Reply, User, Clock, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageThread = ({ message, replies, onReply, onJumpToMessage, onClose }) => {
  const [expanded, setExpanded] = useState(false);

  const threadReplies = replies.filter(r => r.threadId === message._id) || [];

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0b141a] rounded-lg border border-[#00a884]/20 overflow-hidden"
    >
      {/* Thread Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 cursor-pointer hover:bg-[#1a2e35] transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <MessageSquare size={20} className="text-[#00a884]" />
            </div>
            <div>
              <p className="text-white font-medium flex items-center gap-2">
                Thread
                <span className="text-gray-400 text-sm font-normal">
                  {threadReplies.length} replies
                </span>
              </p>
              <p className="text-gray-400 text-sm line-clamp-1">{message.content}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Thread Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Original Message */}
            <div className="p-4 border-t border-[#00a884]/20 bg-[#1a2e35]/50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-[#00a884]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white text-sm font-medium">{message.sender?.name || 'You'}</p>
                    <p className="text-gray-400 text-xs">{new Date(message.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <p className="text-white text-sm">{message.content}</p>
                </div>
              </div>
            </div>

            {/* Replies */}
            <div className="divide-y divide-[#00a884]/10">
              {threadReplies.map(reply => (
                <div key={reply._id} className="p-4 hover:bg-[#1a2e35]/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      {reply.sender?.avatar ? (
                        <img
                          src={reply.sender.avatar}
                          alt={reply.sender.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User size={16} className="text-[#00a884]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white text-sm font-medium">{reply.sender?.name || 'Unknown'}</p>
                        <p className="text-gray-400 text-xs">{new Date(reply.timestamp).toLocaleTimeString()}</p>
                      </div>
                      <p className="text-white text-sm">{reply.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t border-[#00a884]/20">
              <button
                onClick={handleReply}
                className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
              >
                <Reply size={18} />
                Reply to thread
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Thread Indicator Component
export const ThreadIndicator = ({ message, replies, onClick }) => {
  const threadReplies = replies.filter(r => r.threadId === message._id) || [];
  const hasThread = threadReplies.length > 0;

  if (!hasThread) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="flex items-center gap-1 text-[#00a884] hover:text-[#008f72] transition-colors text-sm"
    >
      <MessageSquare size={14} />
      <span>{threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}</span>
    </motion.button>
  );
};

// Thread Button Component
export const ThreadButton = ({ onOpen, hasThread }) => {
  return (
    <button
      onClick={onOpen}
      className={`p-2 rounded-full transition-colors ${
        hasThread ? 'text-[#00a884]' : 'text-gray-400 hover:text-[#00a884]'
      }`}
      title="Thread"
    >
      <MessageSquare size={18} />
    </button>
  );
};

// Thread List Component
export const ThreadList = ({ threads, messages, onJumpToThread }) => {
  return (
    <div className="space-y-2">
      {threads.map(thread => {
        const threadReplies = messages.filter(m => m.threadId === thread._id);
        return (
          <motion.div
            key={thread._id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => onJumpToThread?.(thread._id)}
            className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 cursor-pointer hover:border-[#00a884]/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageSquare size={20} className="text-[#00a884]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-medium text-sm line-clamp-1">{thread.content}</p>
                  <span className="text-gray-400 text-xs">{threadReplies.length} replies</span>
                </div>
                <p className="text-gray-400 text-xs">
                  {new Date(thread.timestamp).toLocaleDateString()}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </motion.div>
        );
      })}

      {threads.length === 0 && (
        <div className="text-center py-8">
          <MessageSquare className="text-gray-600 mx-auto mb-4" size={32} />
          <p className="text-gray-400">No threads yet</p>
        </div>
      )}
    </div>
  );
};

// Thread Settings Component
export const ThreadSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <MessageSquare size={18} className="text-[#00a884]" />
            Message Threads
          </p>
          <p className="text-gray-400 text-sm">Organize conversations into threads</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, threadsEnabled: !settings.threadsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.threadsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.threadsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.threadsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-create threads</p>
              <p className="text-gray-400 text-xs">Create threads from replies</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoCreateThreads: !settings.autoCreateThreads })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoCreateThreads ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoCreateThreads ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show thread indicators</p>
              <p className="text-gray-400 text-xs">Display thread badges</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showThreadIndicators: !settings.showThreadIndicators })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showThreadIndicators ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showThreadIndicators ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageThread;
