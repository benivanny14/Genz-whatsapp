import React, { useState } from 'react';
import { Reply, X, ChevronRight, ChevronDown, User, Clock, Send, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageReplyThread = ({ message, threadReplies, onReply, onClose }) => {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSending(false);

    if (onReply) {
      onReply({
        threadId: message._id,
        content: replyText,
        timestamp: new Date().toISOString()
      });
    }
    setReplyText('');
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
              <Reply size={20} className="text-[#00a884]" />
            </div>
            <div>
              <p className="text-white font-medium flex items-center gap-2">
                Reply Thread
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

            {/* Thread Replies */}
            <div className="divide-y divide-[#00a884]/10 max-h-64 overflow-y-auto">
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Reply to thread..."
                  className="flex-1 bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                />
                <button
                  onClick={handleSendReply}
                  disabled={isSending || !replyText.trim()}
                  className="bg-[#00a884] text-white p-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <Clock className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Reply Thread Indicator Component
export const ReplyThreadIndicator = ({ threadReplies, onClick }) => {
  if (!threadReplies || threadReplies.length === 0) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="flex items-center gap-1 text-[#00a884] hover:text-[#008f72] transition-colors text-sm"
    >
      <Reply size={14} />
      <span>{threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}</span>
    </motion.button>
  );
};

// Reply Thread Button Component
export const ReplyThreadButton = ({ onOpen, hasReplies }) => {
  return (
    <button
      onClick={onOpen}
      className={`p-2 rounded-full transition-colors ${
        hasReplies ? 'text-[#00a884]' : 'text-gray-400 hover:text-[#00a884]'
      }`}
      title="Reply thread"
    >
      <Reply size={18} />
    </button>
  );
};

// Reply Thread List Component
export const ReplyThreadList = ({ threads, onJumpToThread }) => {
  return (
    <div className="space-y-2">
      {threads.map(thread => (
        <motion.div
          key={thread._id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => onJumpToThread?.(thread._id)}
          className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 cursor-pointer hover:border-[#00a884]/50 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Reply size={20} className="text-[#00a884]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-white font-medium text-sm line-clamp-1">{thread.message}</p>
                <span className="text-gray-400 text-xs">{thread.replyCount} replies</span>
              </div>
              <p className="text-gray-400 text-xs">
                {new Date(thread.lastReply).toLocaleDateString()}
              </p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </motion.div>
      ))}

      {threads.length === 0 && (
        <div className="text-center py-8">
          <Reply className="text-gray-600 mx-auto mb-4" size={32} />
          <p className="text-gray-400">No reply threads yet</p>
        </div>
      )}
    </div>
  );
};

// Reply Thread Settings Component
export const ReplyThreadSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Reply size={18} className="text-[#00a884]" />
            Reply Threads
          </p>
          <p className="text-gray-400 text-sm">Organize replies into threads</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, replyThreadsEnabled: !settings.replyThreadsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.replyThreadsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.replyThreadsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.replyThreadsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-group replies</p>
              <p className="text-gray-400 text-xs">Group replies automatically</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoGroupReplies: !settings.autoGroupReplies })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoGroupReplies ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoGroupReplies ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show reply indicators</p>
              <p className="text-gray-400 text-xs">Display reply badges</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showReplyIndicators: !settings.showReplyIndicators })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showReplyIndicators ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showReplyIndicators ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageReplyThread;
