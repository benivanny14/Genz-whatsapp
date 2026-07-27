import React, { useState } from 'react';
import { Clock, X, Check, RefreshCw, Calendar, Image as ImageIcon, Video, FileText, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StatusSchedule = ({ status, onSchedule, onClose }) => {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) return;

    setIsScheduling(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsScheduling(false);

    if (onSchedule) {
      onSchedule({
        statusId: status._id,
        scheduledFor: new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      });
    }
    onClose();
  };

  const getStatusIcon = (status) => {
    if (status.type === 'image') return <ImageIcon size={16} className="text-[#00a884]" />;
    if (status.type === 'video') return <Video size={16} className="text-[#00a884]" />;
    return <FileText size={16} className="text-gray-400" />;
  };

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

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
            <h3 className="text-white font-semibold">Schedule Status</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Preview */}
        <div className="mb-4 p-4 bg-[#0b141a] rounded-lg border border-[#00a884]/20">
          <div className="w-16 h-24 rounded-lg bg-[#00a884]/20 flex items-center justify-center overflow-hidden mb-2">
            {status.media ? (
              <img
                src={status.media}
                alt="Status"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-xs text-center px-2">{status.text?.substring(0, 30)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <p className="text-white text-sm line-clamp-1">{status.text || 'Media status'}</p>
          </div>
        </div>

        {/* Date Selection */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Date</p>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            min={minDate}
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
          />
        </div>

        {/* Time Selection */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Time</p>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
          />
        </div>

        {/* Scheduled Preview */}
        {scheduledDate && scheduledTime && (
          <div className="mb-4 bg-[#00a884]/10 border border-[#00a884]/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#00a884]" />
              <p className="text-[#00a884] text-sm">
                Scheduled for {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
            <p className="text-yellow-500 text-xs">
              The status will be automatically posted at the scheduled time.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isScheduling}
            className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={isScheduling || !scheduledDate || !scheduledTime}
            className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isScheduling ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Scheduling...
              </>
            ) : (
              <>
                <Clock size={18} />
                Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Schedule Button Component
export const ScheduleButton = ({ onClick, isScheduled }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full transition-colors ${
        isScheduled ? 'text-[#00a884]' : 'text-gray-400 hover:text-white'
      }`}
      title={isScheduled ? 'Reschedule' : 'Schedule'}
    >
      <Clock size={18} />
    </button>
  );
};

// Scheduled Badge Component
export const ScheduledBadge = ({ scheduledFor }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full text-xs"
    >
      <Clock size={10} />
      <span>{new Date(scheduledFor).toLocaleDateString()}</span>
    </motion.div>
  );
};

export default StatusSchedule;
