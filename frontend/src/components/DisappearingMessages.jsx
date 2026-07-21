import React, { useState } from 'react';
import { Clock, X, Timer, Check, AlertCircle, Eye, EyeOff, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DisappearingMessages = ({ chat, onSetTimer, onDisable, onClose }) => {
  const [selectedTimer, setSelectedTimer] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const timers = [
    { value: 86400, label: '24 hours', description: 'Messages disappear after 1 day' },
    { value: 604800, label: '7 days', description: 'Messages disappear after 1 week' },
    { value: 2592000, label: '90 days', description: 'Messages disappear after 3 months' },
    { value: 'off', label: 'Off', description: 'Messages do not disappear' },
  ];

  const handleSetTimer = () => {
    if (selectedTimer === 'off') {
      onDisable?.(chat._id);
    } else if (selectedTimer) {
      onSetTimer?.(chat._id, selectedTimer);
    }
    onClose();
  };

  const formatTime = (seconds) => {
    if (seconds === 'off') return 'Off';
    const days = Math.floor(seconds / 86400);
    if (days === 1) return '24 hours';
    if (days === 7) return '7 days';
    if (days === 90) return '90 days';
    return `${days} days`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Timer className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Disappearing Messages</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Status */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Clock size={18} className="text-[#00a884]" />
            </div>
            <div>
              <p className="text-white font-medium">Current timer</p>
              <p className="text-gray-400 text-sm">{formatTime(chat.disappearingMessagesTimer || 'off')}</p>
            </div>
          </div>
        </div>

        {/* Timer Options */}
        <div className="space-y-2 mb-4">
          {timers.map(timer => (
            <button
              key={timer.value}
              onClick={() => setSelectedTimer(timer.value)}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                selectedTimer === timer.value
                  ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                  : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{timer.label}</p>
                  <p className="text-gray-400 text-sm">{timer.description}</p>
                </div>
                {selectedTimer === timer.value && <Check size={18} className="text-[#00a884]" />}
              </div>
            </button>
          ))}
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-yellow-500 text-xs">
              Once set, new messages will disappear after the selected time. This setting applies to both you and the recipient.
            </p>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={handleSetTimer}
          disabled={!selectedTimer}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          {selectedTimer === 'off' ? 'Disable' : 'Set Timer'}
        </button>
      </div>
    </motion.div>
  );
};

// Disappearing Messages Button Component
export const DisappearingMessagesButton = ({ chat, onSetTimer, onDisable }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
        title="Disappearing messages"
      >
        <Timer size={16} />
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <DisappearingMessages
              chat={chat}
              onSetTimer={(chatId, timer) => {
                onSetTimer(chatId, timer);
                setShowModal(false);
              }}
              onDisable={(chatId) => {
                onDisable(chatId);
                setShowModal(false);
              }}
              onClose={() => setShowModal(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Disappearing Messages Indicator Component
export const DisappearingMessagesIndicator = ({ timer }) => {
  const formatTime = (seconds) => {
    if (!seconds) return 'Off';
    const days = Math.floor(seconds / 86400);
    if (days === 1) return '24 hours';
    if (days === 7) return '7 days';
    if (days === 90) return '90 days';
    return `${days} days`;
  };

  return (
    <div className="flex items-center gap-2 text-yellow-500 text-xs">
      <Timer size={12} />
      <span>Disappearing in {formatTime(timer)}</span>
    </div>
  );
};

// Disappearing Messages Settings Component
export const DisappearingMessagesSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Timer size={18} className="text-[#00a884]" />
            Disappearing Messages
          </p>
          <p className="text-gray-400 text-sm">Auto-delete messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, disappearingMessagesEnabled: !settings.disappearingMessagesEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.disappearingMessagesEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.disappearingMessagesEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.disappearingMessagesEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Default timer</p>
            <select
              value={settings.defaultDisappearingTimer || 'off'}
              onChange={(e) => onUpdate({ ...settings, defaultDisappearingTimer: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="off">Off</option>
              <option value="86400">24 hours</option>
              <option value="604800">7 days</option>
              <option value="2592000">90 days</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show timer in chat</p>
              <p className="text-gray-400 text-xs">Display timer indicator</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showDisappearingTimer: !settings.showDisappearingTimer })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showDisappearingTimer ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showDisappearingTimer ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Warn before sending</p>
              <p className="text-gray-400 text-xs">Show confirmation dialog</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, warnBeforeSending: !settings.warnBeforeSending })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.warnBeforeSending ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.warnBeforeSending ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Message Expiry Countdown Component
export const MessageExpiryCountdown = ({ expiryTime, onExpiry }) => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!expiryTime) return;

    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiry = new Date(expiryTime).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        onExpiry?.();
        return null;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
      }

      return `${hours}h ${minutes}m ${seconds}s`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [expiryTime]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-1 text-yellow-500 text-xs">
      <Timer size={10} />
      <span>{timeLeft}</span>
    </div>
  );
};

export default DisappearingMessages;
