import React, { useState } from 'react';
import { MessageSquare, X, Send, Heart, Laugh, ThumbsUp, Wow, Sad, Angry, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StatusReplies = ({ status, onReply, onClose }) => {
  const [replyText, setReplyText] = useState('');
  const [selectedReaction, setSelectedReaction] = useState(null);

  const reactions = [
    { id: 'love', icon: Heart, color: 'text-red-500' },
    { id: 'like', icon: ThumbsUp, color: 'text-blue-500' },
    { id: 'laugh', icon: Laugh, color: 'text-yellow-500' },
    { id: 'wow', icon: Wow, color: 'text-purple-500' },
    { id: 'sad', icon: Sad, color: 'text-gray-400' },
    { id: 'angry', icon: Angry, color: 'text-orange-500' },
  ];

  emojis = ['😀', '😂', '❤️', '👍', '🔥', '😮', '😢', '🎉', '💯', '✨'];

  const handleSendReply = () => {
    if (!replyText.trim() && !selectedReaction) return;

    const reply = {
      text: replyText,
      reaction: selectedReaction,
      statusId: status._id
    };

    onReply?.(reply);
    setReplyText('');
    setSelectedReaction(null);
    onClose();
  };

  const handleReactionSelect = (reactionId) => {
    setSelectedReaction(reactionId === selectedReaction ? null : reactionId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-[#1a2e35] rounded-2xl p-4 border border-[#00a884]/20"
    >
      {/* Status Preview */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#00a884]/20">
        <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center">
          <MessageSquare size={24} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">{status.userName}</p>
          <p className="text-gray-400 text-sm">{status.time}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Reactions */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {reactions.map(reaction => {
          const ReactionIcon = reaction.icon;
          return (
            <button
              key={reaction.id}
              onClick={() => handleReactionSelect(reaction.id)}
              className={`p-2 rounded-full bg-[#0b141a] hover:bg-[#1a2e35] transition-colors ${reaction.color} ${
                selectedReaction === reaction.id ? 'ring-2 ring-[#00a884]' : ''
              }`}
            >
              <ReactionIcon size={20} fill={selectedReaction === reaction.id ? 'currentColor' : 'none'} />
            </button>
          );
        })}
      </div>

      {/* Quick Emojis */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {emojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => setReplyText(prev => prev + emoji)}
            className="text-2xl hover:scale-125 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Reply Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply to status..."
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
          />
          <button
            onClick={() => setReplyText(prev => prev + '😊')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <Smile size={18} />
          </button>
        </div>
        <button
          onClick={handleSendReply}
          disabled={!replyText.trim() && !selectedReaction}
          className="bg-[#00a884] text-white px-4 py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </div>
    </motion.div>
  );
};

// Status Reply Button Component
export const StatusReplyButton = ({ status, onReply }) => {
  const [showReply, setShowReply] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowReply(true)}
        className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
        title="Reply to status"
      >
        <MessageSquare size={18} />
      </button>

      <AnimatePresence>
        {showReply && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-2 z-50"
          >
            <StatusReplies
              status={status}
              onReply={(reply) => {
                onReply(reply);
                setShowReply(false);
              }}
              onClose={() => setShowReply(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Status Reply Display Component
export const StatusReplyDisplay = ({ reply }) => {
  const reactionIcons = {
    love: Heart,
    like: ThumbsUp,
    laugh: Laugh,
    wow: Wow,
    sad: Sad,
    angry: Angry,
  };

  const reactionColors = {
    love: 'text-red-500',
    like: 'text-blue-500',
    laugh: 'text-yellow-500',
    wow: 'text-purple-500',
    sad: 'text-gray-400',
    angry: 'text-orange-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/20"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
          <MessageSquare size={16} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium text-sm">{reply.userName}</span>
            {reply.reaction && (
              <div className="flex items-center gap-1">
                {(() => {
                  const Icon = reactionIcons[reply.reaction];
                  const color = reactionColors[reply.reaction];
                  return <Icon size={14} className={color} fill="currentColor" />;
                })()}
              </div>
            )}
          </div>
          <p className="text-gray-300 text-sm">{reply.text}</p>
          <p className="text-gray-500 text-xs mt-1">{reply.time}</p>
        </div>
      </div>
    </motion.div>
  );
};

// Status Replies List Component
export const StatusRepliesList = ({ replies, onReply }) => {
  return (
    <div className="space-y-2 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={16} className="text-[#00a884]" />
        <span className="text-white font-medium text-sm">Replies ({replies.length})</span>
      </div>
      {replies.map(reply => (
        <StatusReplyDisplay key={reply._id} reply={reply} />
      ))}
    </div>
  );
};

// Status Replies Settings Component
export const StatusRepliesSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <MessageSquare size={18} className="text-[#00a884]" />
            Status Replies
          </p>
          <p className="text-gray-400 text-sm">Allow replies to status</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, statusRepliesEnabled: !settings.statusRepliesEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.statusRepliesEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.statusRepliesEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.statusRepliesEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Who can reply</p>
              <p className="text-gray-400 text-xs">Control reply permissions</p>
            </div>
            <select
              value={settings.whoCanReply || 'everyone'}
              onChange={(e) => onUpdate({ ...settings, whoCanReply: e.target.value })}
              className="bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">My contacts</option>
              <option value="none">No one</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Notification on reply</p>
              <p className="text-gray-400 text-xs">Get notified of replies</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, replyNotifications: !settings.replyNotifications })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.replyNotifications ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.replyNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show reaction bar</p>
              <p className="text-gray-400 text-xs">Display quick reactions</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showReactionBar: !settings.showReactionBar })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showReactionBar ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showReactionBar ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Quick Status Reply Component
export const QuickStatusReply = ({ status, onReply }) => {
  const [replyText, setReplyText] = useState('');

  const handleSend = () => {
    if (!replyText.trim()) return;
    onReply?.({ text: replyText, statusId: status._id });
    setReplyText('');
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Reply to status..."
        className="flex-1 bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <button
        onClick={handleSend}
        disabled={!replyText.trim()}
        className="bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
      >
        <Send size={16} />
      </button>
    </div>
  );
};

export default StatusReplies;
