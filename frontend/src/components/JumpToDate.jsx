import React, { useState } from 'react';
import { Calendar, X, Check, RefreshCw, Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const JumpToDate = ({ chat, onJumpToDate, onClose }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [isJumping, setIsJumping] = useState(false);

  const handleJump = async () => {
    if (!selectedDate) return;
    setIsJumping(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsJumping(false);
    if (onJumpToDate) {
      onJumpToDate(chat._id, new Date(selectedDate));
    }
    onClose();
  };

  const handleQuickJump = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const today = new Date().toISOString().split('T')[0];

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
            <Calendar className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Jump to Date</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Info */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-[#00a884]/20">
          <p className="text-white font-medium">{chat.name}</p>
          <p className="text-gray-400 text-sm">Jump to messages from a specific date</p>
        </div>

        {/* Quick Jump Options */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Quick jump</p>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleQuickJump(1)}
              className="bg-[#0b141a] text-gray-300 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              Yesterday
            </button>
            <button
              onClick={() => handleQuickJump(7)}
              className="bg-[#0b141a] text-gray-300 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              7 days
            </button>
            <button
              onClick={() => handleQuickJump(30)}
              className="bg-[#0b141a] text-gray-300 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              30 days
            </button>
            <button
              onClick={() => handleQuickJump(90)}
              className="bg-[#0b141a] text-gray-300 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              90 days
            </button>
          </div>
        </div>

        {/* Date Picker */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Select date</p>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={today}
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
          />
        </div>

        {/* Selected Date Display */}
        {selectedDate && (
          <div className="bg-[#00a884]/10 border border-[#00a884]/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#00a884]" />
              <span className="text-white text-sm">
                Selected: {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
        )}

        {/* Jump Button */}
        <button
          onClick={handleJump}
          disabled={!selectedDate || isJumping}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isJumping ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Jumping...
            </>
          ) : (
            <>
              <ArrowRight size={18} />
              Jump to Date
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Jump to Date Button Component
export const JumpToDateButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Jump to date"
    >
      <Calendar size={18} />
    </button>
  );
};

// Date Navigation Component
export const DateNavigation = ({ currentDate, onPreviousDay, onNextDay, onToday }) => {
  return (
    <div className="flex items-center gap-2 bg-[#0b141a] rounded-lg p-2">
      <button
        onClick={onPreviousDay}
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a2e35] transition-colors"
        title="Previous day"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="flex-1 text-center">
        <p className="text-white text-sm font-medium">
          {currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
      </div>
      <button
        onClick={onNextDay}
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a2e35] transition-colors"
        title="Next day"
      >
        <ChevronRight size={18} />
      </button>
      <button
        onClick={onToday}
        className="px-3 py-2 rounded-lg text-[#00a884] hover:bg-[#00a884]/10 transition-colors text-sm"
        title="Today"
      >
        Today
      </button>
    </div>
  );
};

// Date Indicator Component
export const DateIndicator = ({ date, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
    >
      <Calendar size={14} />
      <span className="text-sm">{date.toLocaleDateString()}</span>
    </button>
  );
};

// Date Separator Component
export const DateSeparator = ({ date }) => {
  return (
    <div className="flex items-center gap-4 my-4">
      <div className="flex-1 h-px bg-[#00a884]/20" />
      <div className="flex items-center gap-2 bg-[#0b141a] px-4 py-2 rounded-full">
        <Calendar size={14} className="text-[#00a884]" />
        <span className="text-gray-400 text-sm">
          {date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </span>
      </div>
      <div className="flex-1 h-px bg-[#00a884]/20" />
    </div>
  );
};

// Date Picker Modal Component
export const DatePickerModal = ({ isOpen, onClose, onDateSelect, selectedDate }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Select Date</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateSelect?.(e.target.value)}
          className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
        />
        <button
          onClick={onClose}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors mt-4"
        >
          Confirm
        </button>
      </div>
    </motion.div>
  );
};

export default JumpToDate;
