import React, { useState, useRef } from 'react';
import { MoreVertical, Reply, Forward, Copy, Star, Archive, Trash2, Pin, Info, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageLongPress = ({ message, onAction, children }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [pressTimer, setPressTimer] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const messageRef = useRef(null);

  const actions = [
    { id: 'reply', label: 'Reply', icon: Reply },
    { id: 'forward', label: 'Forward', icon: Forward },
    { id: 'copy', label: 'Copy', icon: Copy },
    { id: 'star', label: 'Star', icon: Star },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'delete', label: 'Delete', icon: Trash2 },
    { id: 'pin', label: 'Pin', icon: Pin },
    { id: 'info', label: 'Info', icon: Info },
  ];

  const handleMouseDown = (e) => {
    const timer = setTimeout(() => {
      const rect = messageRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPosition({
          x: rect.left,
          y: rect.bottom + 5
        });
      }
      setShowMenu(true);
    }, 500);
    setPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleAction = (actionId) => {
    onAction?.(actionId, message);
    setShowMenu(false);
  };

  return (
    <div
      ref={messageRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {children}

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 z-40"
            />

            {/* Context Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed z-50 bg-[#1a2e35] rounded-lg border border-[#00a884]/20 shadow-xl min-w-[200px]"
              style={{
                left: `${Math.min(menuPosition.x, window.innerWidth - 220)}px`,
                top: `${Math.min(menuPosition.y, window.innerHeight - 300)}px`
              }}
            >
              <div className="p-2">
                {actions.map(action => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.id)}
                      className="w-full p-3 rounded-lg hover:bg-[#00a884]/10 transition-colors flex items-center gap-3 text-left"
                    >
                      <Icon size={18} className="text-gray-400" />
                      <span className="text-white">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Long Press Settings Component
export const LongPressSettings = ({ settings, onUpdate }) => {
  const availableActions = [
    { id: 'reply', label: 'Reply', icon: Reply },
    { id: 'forward', label: 'Forward', icon: Forward },
    { id: 'copy', label: 'Copy', icon: Copy },
    { id: 'star', label: 'Star', icon: Star },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'delete', label: 'Delete', icon: Trash2 },
    { id: 'pin', label: 'Pin', icon: Pin },
    { id: 'info', label: 'Info', icon: Info },
  ];

  const toggleAction = (actionId) => {
    const currentActions = settings.longPressActions || ['reply', 'forward', 'copy', 'delete'];
    const newActions = currentActions.includes(actionId)
      ? currentActions.filter(id => id !== actionId)
      : [...currentActions, actionId];
    onUpdate({ ...settings, longPressActions: newActions });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <MoreVertical size={18} className="text-[#00a884]" />
            Long Press Menu
          </p>
          <p className="text-gray-400 text-sm">Actions on message long press</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, longPressEnabled: !settings.longPressEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.longPressEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.longPressEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.longPressEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Long press duration</p>
            <select
              value={settings.longPressDuration || 500}
              onChange={(e) => onUpdate({ ...settings, longPressDuration: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            >
              <option value={300}>Short (0.3s)</option>
              <option value={500}>Normal (0.5s)</option>
              <option value={700}>Long (0.7s)</option>
            </select>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Available actions</p>
            <div className="grid grid-cols-2 gap-2">
              {availableActions.map(action => {
                const Icon = action.icon;
                const isSelected = (settings.longPressActions || ['reply', 'forward', 'copy', 'delete']).includes(action.id);
                return (
                  <button
                    key={action.id}
                    onClick={() => toggleAction(action.id)}
                    className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-[#00a884] bg-[#00a884]/10'
                        : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                    }`}
                  >
                    <Icon size={16} className={isSelected ? 'text-[#00a884]' : 'text-gray-400'} />
                    <span className="text-white text-sm">{action.label}</span>
                    {isSelected && <Check size={14} className="text-[#00a884] ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show haptic feedback</p>
              <p className="text-gray-400 text-xs">Vibrate on long press</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, hapticFeedback: !settings.hapticFeedback })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.hapticFeedback ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.hapticFeedback ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Long Press Indicator Component
export const LongPressIndicator = ({ progress }) => {
  return (
    <div className="absolute inset-0 bg-[#00a884]/10 rounded-lg pointer-events-none overflow-hidden">
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-[#00a884]/20"
        style={{ height: `${progress * 100}%` }}
      />
    </div>
  );
};

export default MessageLongPress;
