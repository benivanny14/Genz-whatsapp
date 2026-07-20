import React, { useState, useRef } from 'react';
import { Heart, ThumbsUp, Laugh, Star, Zap, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

const MessageDoubleTap = ({ message, onDoubleTap, children }) => {
  const [lastTap, setLastTap] = useState(0);
  const [showReaction, setShowReaction] = useState(false);
  const [reactionType, setReactionType] = useState(null);
  const messageRef = useRef(null);

  const handleTap = (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected
      handleDoubleTap(e);
    }

    setLastTap(currentTime);
  };

  const handleDoubleTap = (e) => {
    const rect = messageRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Show reaction animation
      setReactionType(getDefaultReaction());
      setShowReaction(true);

      setTimeout(() => {
        setShowReaction(false);
      }, 1000);

      onDoubleTap?.(message, getDefaultReaction());
    }
  };

  const getDefaultReaction = () => {
    const reactions = ['love', 'like', 'laugh', 'star'];
    return reactions[Math.floor(Math.random() * reactions.length)];
  };

  const getReactionIcon = (type) => {
    switch (type) {
      case 'love': return Heart;
      case 'like': return ThumbsUp;
      case 'laugh': return Laugh;
      case 'star': return Star;
      default: return Heart;
    }
  };

  const getReactionColor = (type) => {
    switch (type) {
      case 'love': return 'text-red-500';
      case 'like': return 'text-blue-500';
      case 'laugh': return 'text-yellow-500';
      case 'star': return 'text-[#00a884]';
      default: return 'text-red-500';
    }
  };

  return (
    <div
      ref={messageRef}
      onClick={handleTap}
      className="relative cursor-pointer"
    >
      {children}

      {/* Double Tap Reaction Animation */}
      {showReaction && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          {(() => {
            const Icon = getReactionIcon(reactionType);
            return (
              <Icon
                size={48}
                className={getReactionColor(reactionType)}
              />
            );
          })()}
        </motion.div>
      )}
    </div>
  );
};

// Double Tap Settings Component
export const DoubleTapSettings = ({ settings, onUpdate }) => {
  const reactions = [
    { id: 'love', label: 'Love', icon: Heart, color: 'text-red-500' },
    { id: 'like', label: 'Like', icon: ThumbsUp, color: 'text-blue-500' },
    { id: 'laugh', label: 'Laugh', icon: Laugh, color: 'text-yellow-500' },
    { id: 'star', label: 'Star', icon: Star, color: 'text-[#00a884]' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Zap size={18} className="text-[#00a884]" />
            Double Tap
          </p>
          <p className="text-gray-400 text-sm">Quick reaction on double tap</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, doubleTapEnabled: !settings.doubleTapEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.doubleTapEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.doubleTapEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.doubleTapEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Default reaction</p>
            <div className="grid grid-cols-4 gap-2">
              {reactions.map(reaction => {
                const Icon = reaction.icon;
                const isSelected = settings.defaultDoubleTapReaction === reaction.id;
                return (
                  <button
                    key={reaction.id}
                    onClick={() => onUpdate({ ...settings, defaultDoubleTapReaction: reaction.id })}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'border-[#00a884] bg-[#00a884]/10'
                        : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                    }`}
                  >
                    <Icon size={20} className={isSelected ? reaction.color : 'text-gray-400'} />
                    <span className="text-xs text-white">{reaction.label}</span>
                    {isSelected && <Check size={12} className="text-[#00a884]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show animation</p>
              <p className="text-gray-400 text-xs">Display reaction animation</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, doubleTapAnimation: !settings.doubleTapAnimation })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.doubleTapAnimation ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.doubleTapAnimation ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Haptic feedback</p>
              <p className="text-gray-400 text-xs">Vibrate on double tap</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, doubleTapHaptic: !settings.doubleTapHaptic })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.doubleTapHaptic ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.doubleTapHaptic ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Double Tap Reaction Badge Component
export const DoubleTapBadge = ({ reaction }) => {
  const reactions = {
    love: { icon: Heart, color: 'text-red-500' },
    like: { icon: ThumbsUp, color: 'text-blue-500' },
    laugh: { icon: Laugh, color: 'text-yellow-500' },
    star: { icon: Star, color: 'text-[#00a884]' },
  };

  const reactionData = reactions[reaction] || reactions.love;
  const Icon = reactionData.icon;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full text-xs ${reactionData.color}`}
    >
      <Icon size={10} />
      <span className="capitalize">{reaction}</span>
    </motion.div>
  );
};

// Double Tap Tutorial Component
export const DoubleTapTutorial = ({ onDismiss }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-[#1a2e35] rounded-lg p-4 border border-[#00a884]/20"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Zap size={20} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium mb-1">Double Tap to React</p>
          <p className="text-gray-400 text-sm mb-3">
            Quickly double-tap any message to add a reaction
          </p>
          <button
            onClick={onDismiss}
            className="text-[#00a884] text-sm hover:underline"
          >
            Got it
          </button>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default MessageDoubleTap;
