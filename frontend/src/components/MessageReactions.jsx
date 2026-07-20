import React, { useState } from 'react';
import { Heart, ThumbsUp, Laugh, Wow, Sad, Angry, MoreHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageReactions = ({ message, onReact, onRemoveReaction, onClose }) => {
  const [showAllReactions, setShowAllReactions] = useState(false);

  const reactions = [
    { id: 'love', icon: Heart, color: 'text-red-500', label: 'Love' },
    { id: 'like', icon: ThumbsUp, color: 'text-blue-500', label: 'Like' },
    { id: 'laugh', icon: Laugh, color: 'text-yellow-500', label: 'Laugh' },
    { id: 'wow', icon: Wow, color: 'text-purple-500', label: 'Wow' },
    { id: 'sad', icon: Sad, color: 'text-gray-400', label: 'Sad' },
    { id: 'angry', icon: Angry, color: 'text-orange-500', label: 'Angry' },
  ];

  const quickReactions = reactions.slice(0, 4);

  const handleReact = (reactionId) => {
    if (onReact) {
      onReact(message._id, reactionId);
    }
    onClose();
  };

  const handleRemoveReaction = (reactionId) => {
    if (onRemoveReaction) {
      onRemoveReaction(message._id, reactionId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#1a2e35] rounded-2xl p-4 shadow-xl border border-[#00a884]/30"
    >
      <div className="flex items-center gap-3">
        {quickReactions.map(reaction => {
          const hasReacted = message.reactions?.some(r => r.type === reaction.id && r.userId === 'current-user');
          return (
            <motion.button
              key={reaction.id}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => hasReacted ? handleRemoveReaction(reaction.id) : handleReact(reaction.id)}
              className={`p-3 rounded-full bg-[#0b141a] hover:bg-[#1a2e35] transition-colors ${reaction.color} ${
                hasReacted ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a2e35]' : ''
              }`}
              title={reaction.label}
            >
              <reaction.icon size={24} fill={hasReacted ? 'currentColor' : 'none'} />
            </motion.button>
          );
        })}

        <button
          onClick={() => setShowAllReactions(!showAllReactions)}
          className="p-3 rounded-full bg-[#0b141a] hover:bg-[#1a2e35] text-gray-400 hover:text-white transition-colors"
        >
          <MoreHorizontal size={24} />
        </button>
      </div>

      <AnimatePresence>
        {showAllReactions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-[#00a884]/20"
          >
            <div className="flex flex-wrap gap-2">
              {reactions.map(reaction => {
                const hasReacted = message.reactions?.some(r => r.type === reaction.id && r.userId === 'current-user');
                return (
                  <motion.button
                    key={reaction.id}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => hasReacted ? handleRemoveReaction(reaction.id) : handleReact(reaction.id)}
                    className={`p-2 rounded-lg bg-[#0b141a] hover:bg-[#1a2e35] transition-colors ${reaction.color} ${
                      hasReacted ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a2e35]' : ''
                    }`}
                    title={reaction.label}
                  >
                    <reaction.icon size={20} fill={hasReacted ? 'currentColor' : 'none'} />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Message Reaction Display Component
export const MessageReactionDisplay = ({ reactions, onRemoveReaction }) => {
  const reactionCounts = reactions.reduce((acc, reaction) => {
    acc[reaction.type] = (acc[reaction.type] || 0) + 1;
    return acc;
  }, {});

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
    <div className="flex items-center gap-1 flex-wrap mt-2">
      {Object.entries(reactionCounts).map(([type, count]) => {
        const Icon = reactionIcons[type];
        const color = reactionColors[type];
        return (
          <div
            key={type}
            className={`flex items-center gap-1 px-2 py-1 rounded-full bg-[#0b141a] ${color}`}
          >
            <Icon size={14} fill="currentColor" />
            <span className="text-xs">{count}</span>
          </div>
        );
      })}
    </div>
  );
};

// Message Reaction Button Component
export const MessageReactionButton = ({ message, onReact, onRemoveReaction }) => {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowReactions(!showReactions)}
        className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      >
        <Heart size={18} />
      </button>

      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-2 z-50"
          >
            <MessageReactions
              message={message}
              onReact={(messageId, reactionId) => {
                onReact(messageId, reactionId);
                setShowReactions(false);
              }}
              onRemoveReaction={(messageId, reactionId) => {
                onRemoveReaction(messageId, reactionId);
              }}
              onClose={() => setShowReactions(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Message Reactions Settings Component
export const MessageReactionsSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Heart size={18} className="text-[#00a884]" />
            Message Reactions
          </p>
          <p className="text-gray-400 text-sm">Allow reactions on messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, messageReactionsEnabled: !settings.messageReactionsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.messageReactionsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.messageReactionsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.messageReactionsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show reaction counts</p>
              <p className="text-gray-400 text-xs">Display number of reactions</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showReactionCounts: !settings.showReactionCounts })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showReactionCounts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showReactionCounts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Notification on reaction</p>
              <p className="text-gray-400 text-xs">Get notified when reacted</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, reactionNotifications: !settings.reactionNotifications })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.reactionNotifications ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.reactionNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Who can react</p>
            <select
              value={settings.whoCanReact || 'everyone'}
              onChange={(e) => onUpdate({ ...settings, whoCanReact: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">My contacts only</option>
              <option value="admins">Admins only</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Reaction Notification Component
export const ReactionNotification = ({ reaction, onView, onDismiss }) => {
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

  const Icon = reactionIcons[reaction.type];
  const color = reactionColors[reaction.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-[#00a884]/20 border-l-4 border-[#00a884] p-4 rounded-r-lg mb-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Icon size={20} className={color} fill="currentColor" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium mb-1">
            {reaction.userName} reacted to your message
          </p>
          <p className="text-gray-300 text-sm capitalize">{reaction.type}</p>
          <p className="text-gray-500 text-xs mt-1 line-clamp-1">{reaction.messagePreview}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <button
        onClick={onView}
        className="mt-3 text-[#00a884] text-sm hover:underline"
      >
        View Message
      </button>
    </motion.div>
  );
};

export default MessageReactions;
