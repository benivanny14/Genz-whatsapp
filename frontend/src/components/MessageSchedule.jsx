import React, { useState } from 'react';
import { Clock, X, Check, RefreshCw, Calendar, Send, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageSchedule = ({ message, onSchedule, onClose }) => {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState('');

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) {
      setError('Please select both date and time');
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const now = new Date();

    if (scheduledDateTime <= now) {
      setError('Scheduled time must be in the future');
      return;
    }

    setIsScheduling(true);
    setError('');

    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsScheduling(false);

    if (onSchedule) {
      onSchedule({
        message: message,
        scheduledFor: scheduledDateTime.toISOString()
      });
    }
    onClose();
  };

  const handleQuickSchedule = (minutes) => {
    const now = new Date();
    const scheduled = new Date(now.getTime() + minutes * 60 * 1000);
    setScheduledDate(scheduled.toISOString().split('T')[0]);
    setScheduledTime(scheduled.toTimeString().slice(0, 5));
  };

  const today = new Date().toISOString().split('T')[0];
  const minTime = new Date().toTimeString().slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Schedule Message</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Preview */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-[#00a884]/20">
          <p className="text-gray-400 text-xs mb-2">Message to schedule:</p>
          <p className="text-white text-sm line-clamp-3">{message.content}</p>
        </div>

        {/* Quick Schedule Options */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Quick schedule</p>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleQuickSchedule(15)}
              className="bg-[#0b141a] text-gray-300 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              15 min
            </button>
            <button
              onClick={() => handleQuickSchedule(30)}
              className="bg-[#0b141a] text-gray-300 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              30 min
            </button>
            <button
              onClick={() => handleQuickSchedule(60)}
              className="bg-[#0b141a] text-gray-300 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              1 hour
            </button>
            <button
              onClick={() => handleQuickSchedule(1440)}
              className="bg-[#0b141a] text-gray-300 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              1 day
            </button>
          </div>
        </div>

        {/* Date Picker */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Select date</p>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            min={today}
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
          />
        </div>

        {/* Time Picker */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Select time</p>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
          />
        </div>

        {/* Scheduled Time Display */}
        {scheduledDate && scheduledTime && (
          <div className="bg-[#00a884]/10 border border-[#00a884]/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#00a884]" />
              <span className="text-white text-sm">
                Scheduled for: {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={14} />
              <p className="text-red-500 text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Schedule Button */}
        <button
          onClick={handleSchedule}
          disabled={!scheduledDate || !scheduledTime || isScheduling}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isScheduling ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Scheduling...
            </>
          ) : (
            <>
              <Clock size={18} />
              Schedule Message
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Message Schedule Settings Component
export const MessageScheduleSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Clock size={18} className="text-[#00a884]" />
            Message Scheduling
          </p>
          <p className="text-gray-400 text-sm">Schedule messages to send later</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, messageSchedulingEnabled: !settings.messageSchedulingEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.messageSchedulingEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.messageSchedulingEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.messageSchedulingEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Send notification when sent</p>
              <p className="text-gray-400 text-xs">Alert on delivery</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, scheduleNotification: !settings.scheduleNotification })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.scheduleNotification ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.scheduleNotification ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-cancel if offline</p>
              <p className="text-gray-400 text-xs">Cancel when no connection</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoCancelOffline: !settings.autoCancelOffline })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoCancelOffline ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoCancelOffline ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Schedule Message Button Component
export const ScheduleMessageButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Schedule message"
    >
      <Clock size={18} />
    </button>
  );
};

// Scheduled Message Indicator Component
export const ScheduledMessageIndicator = ({ scheduledFor }) => {
  const timeUntil = new Date(scheduledFor) - new Date();
  const hours = Math.floor(timeUntil / (1000 * 60 * 60));
  const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 bg-blue-500/20 border border-blue-500 rounded-full px-3 py-1"
    >
      <Clock size={14} className="text-blue-500" />
      <span className="text-white text-xs">
        {hours > 0 ? `in ${hours}h ${minutes}m` : `in ${minutes}m`}
      </span>
    </motion.div>
  );
};

// Scheduled Messages List Component
export const ScheduledMessagesList = ({ messages, onCancel, onEdit }) => {
  return (
    <div className="space-y-2">
      {messages.map(message => (
        <motion.div
          key={message._id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock size={20} className="text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm line-clamp-2 mb-1">{message.content}</p>
              <p className="text-gray-400 text-xs">
                Scheduled: {new Date(message.scheduledFor).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit?.(message)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Clock size={16} />
              </button>
              <button
                onClick={() => onCancel?.(message._id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default MessageSchedule;
