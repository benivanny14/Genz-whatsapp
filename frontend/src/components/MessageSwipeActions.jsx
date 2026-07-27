import React, { useState } from 'react';
import { SwipeLeft, SwipeRight, Archive, Trash2, Reply, Star, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

const MessageSwipeActions = ({ message, onSwipeLeft, onSwipeRight, settings }) => {
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeProgress, setSwipeProgress] = useState(0);

  const handleSwipe = (direction) => {
    if (direction === 'left') {
      onSwipeLeft?.(message);
    } else {
      onSwipeRight?.(message);
    }
    setSwipeDirection(null);
    setSwipeProgress(0);
  };

  const leftActions = settings?.swipeLeftActions || ['archive', 'delete'];
  const rightActions = settings?.swipeRightActions || ['reply', 'star'];

  const getLeftIcon = () => {
    if (leftActions.includes('archive')) return Archive;
    if (leftActions.includes('delete')) return Trash2;
    return Archive;
  };

  const getRightIcon = () => {
    if (rightActions.includes('reply')) return Reply;
    if (rightActions.includes('star')) return Star;
    return Reply;
  };

  const LeftIcon = getLeftIcon();
  const RightIcon = getRightIcon();

  return (
    <div className="relative overflow-hidden">
      {/* Left Swipe Actions */}
      <motion.div
        initial={{ x: -100 }}
        animate={{ x: swipeDirection === 'left' ? -swipeProgress * 100 : -100 }}
        className="absolute inset-y-0 left-0 flex items-center justify-end pr-4 bg-red-500/20 border-r border-red-500"
        style={{ width: `${swipeProgress * 100}%` }}
      >
        <LeftIcon size={24} className="text-red-500" />
      </motion.div>

      {/* Right Swipe Actions */}
      <motion.div
        initial={{ x: 100 }}
        animate={{ x: swipeDirection === 'right' ? swipeProgress * 100 : 100 }}
        className="absolute inset-y-0 right-0 flex items-center justify-start pl-4 bg-[#00a884]/20 border-l border-[#00a884]"
        style={{ width: `${swipeProgress * 100}%` }}
      >
        <RightIcon size={24} className="text-[#00a884]" />
      </motion.div>

      {/* Message Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.1}
        onDrag={(e, info) => {
          const progress = Math.min(Math.abs(info.offset.x) / 100, 1);
          setSwipeProgress(progress);
          setSwipeDirection(info.offset.x < 0 ? 'left' : info.offset.x > 0 ? 'right' : null);
        }}
        onDragEnd={(e, info) => {
          if (Math.abs(info.offset.x) > 50) {
            handleSwipe(info.offset.x < 0 ? 'left' : 'right');
          } else {
            setSwipeDirection(null);
            setSwipeProgress(0);
          }
        }}
        className="relative z-10"
      >
        {message.content}
      </motion.div>
    </div>
  );
};

// Swipe Actions Settings Component
export const SwipeActionsSettings = ({ settings, onUpdate }) => {
  const leftOptions = [
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'delete', label: 'Delete', icon: Trash2 },
    { id: 'mute', label: 'Mute', icon: Archive },
  ];

  const rightOptions = [
    { id: 'reply', label: 'Reply', icon: Reply },
    { id: 'star', label: 'Star', icon: Star },
    { id: 'forward', label: 'Forward', icon: Reply },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <SwipeLeft size={18} className="text-[#00a884]" />
            Swipe Actions
          </p>
          <p className="text-gray-400 text-sm">Swipe messages for quick actions</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, swipeActionsEnabled: !settings.swipeActionsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.swipeActionsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.swipeActionsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.swipeActionsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Swipe left action</p>
            <div className="grid grid-cols-3 gap-2">
              {leftOptions.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => onUpdate({ ...settings, swipeLeftActions: [option.id] })}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                      settings.swipeLeftActions?.includes(option.id)
                        ? 'border-[#00a884] bg-[#00a884]/10'
                        : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                    }`}
                  >
                    <Icon size={18} className={settings.swipeLeftActions?.includes(option.id) ? 'text-[#00a884]' : 'text-gray-400'} />
                    <span className="text-xs text-white">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Swipe right action</p>
            <div className="grid grid-cols-3 gap-2">
              {rightOptions.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => onUpdate({ ...settings, swipeRightActions: [option.id] })}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                      settings.swipeRightActions?.includes(option.id)
                        ? 'border-[#00a884] bg-[#00a884]/10'
                        : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                    }`}
                  >
                    <Icon size={18} className={settings.swipeRightActions?.includes(option.id) ? 'text-[#00a884]' : 'text-gray-400'} />
                    <span className="text-xs text-white">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Swipe Action Indicator Component
export const SwipeActionIndicator = ({ direction }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1 text-gray-400 text-xs"
    >
      {direction === 'left' ? (
        <>
          <SwipeLeft size={12} />
          <span>Swipe left</span>
        </>
      ) : (
        <>
          <SwipeRight size={12} />
          <span>Swipe right</span>
        </>
      )}
    </motion.div>
  );
};

export default MessageSwipeActions;
