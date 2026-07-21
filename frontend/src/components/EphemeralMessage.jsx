import React, { useState, useEffect } from 'react';
import { Clock, Timer, AlertCircle, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EphemeralMessage = ({ message, onTimerSet, onTimerChange }) => {
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState(message.disappearingTimer || 0);

  const timerOptions = [
    { value: 0, label: 'Off', icon: <X size={16} /> },
    { value: 24 * 60 * 60, label: '24 hours', icon: <Clock size={16} /> },
    { value: 7 * 24 * 60 * 60, label: '7 days', icon: <Timer size={16} /> },
    { value: 90 * 24 * 60 * 60, label: '90 days', icon: <Clock size={16} /> },
  ];

  const handleTimerSelect = (value) => {
    setSelectedTimer(value);
    setShowTimerMenu(false);
    if (onTimerSet) {
      onTimerSet(message._id, value);
    }
  };

  const getTimerLabel = () => {
    const option = timerOptions.find(opt => opt.value === selectedTimer);
    return option ? option.label : 'Off';
  };

  const getTimeRemaining = () => {
    if (!message.disappearingTimestamp) return null;
    const remaining = message.disappearingTimestamp - Date.now();
    if (remaining <= 0) return null;
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  return (
    <div className="relative">
      {/* Timer Indicator */}
      {message.disappearingTimer > 0 && (
        <div className="flex items-center gap-1 text-[#00a884] text-xs mb-1">
          <Clock size={12} />
          <span>Disappearing {getTimerLabel()}</span>
          {getTimeRemaining() && (
            <span className="text-gray-400">• {getTimeRemaining()} left</span>
          )}
        </div>
      )}

      {/* Timer Menu Button */}
      <button
        onClick={() => setShowTimerMenu(!showTimerMenu)}
        className="text-gray-400 hover:text-[#00a884] transition-colors"
        title="Set disappearing timer"
      >
        <Timer size={16} />
      </button>

      {/* Timer Menu */}
      <AnimatePresence>
        {showTimerMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 top-8 bg-[#1a2e35] rounded-lg shadow-xl border border-[#00a884]/30 z-50 w-48"
          >
            <div className="p-2">
              <p className="text-white text-sm font-medium mb-2 px-2">Disappearing Messages</p>
              {timerOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimerSelect(option.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedTimer === option.value
                      ? 'bg-[#00a884]/20 text-[#00a884]'
                      : 'text-gray-300 hover:bg-[#00a884]/10'
                  }`}
                >
                  {option.icon}
                  <span>{option.label}</span>
                  {selectedTimer === option.value && (
                    <Check size={14} className="ml-auto" />
                  )}
                </button>
              ))}
            </div>

            {/* Info Notice */}
            <div className="border-t border-[#00a884]/20 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-[#00a884] flex-shrink-0 mt-0.5" />
                <p className="text-gray-400 text-xs">
                  Messages will disappear for everyone after the timer ends
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Ephemeral Settings Component
export const EphemeralSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Disappearing Messages</p>
          <p className="text-gray-400 text-sm">Enable disappearing messages feature</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, ephemeralEnabled: !settings.ephemeralEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.ephemeralEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.ephemeralEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.ephemeralEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Default Timer</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 24 * 60 * 60, label: '24 hours' },
                { value: 7 * 24 * 60 * 60, label: '7 days' },
                { value: 90 * 24 * 60 * 60, label: '90 days' },
                { value: 0, label: 'Off' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => onUpdate({ ...settings, defaultTimer: option.value })}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    settings.defaultTimer === option.value
                      ? 'bg-[#00a884] text-white'
                      : 'bg-[#0b141a] text-gray-400 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-delete media</p>
              <p className="text-gray-400 text-xs">Delete media with messages</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoDeleteMedia: !settings.autoDeleteMedia })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoDeleteMedia ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoDeleteMedia ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show timer in chat</p>
              <p className="text-gray-400 text-xs">Display timer on messages</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showTimerInChat: !settings.showTimerInChat })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showTimerInChat ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showTimerInChat ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Chat-level Ephemeral Settings
export const ChatEphemeralSettings = ({ chat, onTimerSet }) => {
  const [selectedTimer, setSelectedTimer] = useState(chat.disappearingTimer || 0);

  const timerOptions = [
    { value: 0, label: 'Off' },
    { value: 24 * 60 * 60, label: '24 hours' },
    { value: 7 * 24 * 60 * 60, label: '7 days' },
    { value: 90 * 24 * 60 * 60, label: '90 days' },
  ];

  const handleTimerSelect = (value) => {
    setSelectedTimer(value);
    if (onTimerSet) {
      onTimerSet(chat._id, value);
    }
  };

  return (
    <div className="bg-[#1a2e35] rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <Timer className="text-[#00a884]" size={20} />
        <div>
          <p className="text-white font-medium">Disappearing Messages</p>
          <p className="text-gray-400 text-sm">Set timer for this chat</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {timerOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleTimerSelect(option.value)}
            className={`py-3 px-4 rounded-lg font-medium transition-all ${
              selectedTimer === option.value
                ? 'bg-[#00a884] text-white'
                : 'bg-[#0b141a] text-gray-400 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {selectedTimer > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 pt-4 border-t border-[#00a884]/20"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-[#00a884] flex-shrink-0 mt-0.5" />
            <p className="text-gray-300 text-sm">
              New messages will disappear after {timerOptions.find(opt => opt.value === selectedTimer)?.label.toLowerCase()} for everyone in this chat.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EphemeralMessage;
