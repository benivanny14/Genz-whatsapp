import React, { useState } from 'react';
import { Calendar, X, Check, Filter, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageFilterByDate = ({ messages, onFilter, onClose }) => {
  const [selectedRange, setSelectedRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const dateRanges = [
    { id: 'all', label: 'All time', description: 'Show all messages' },
    { id: 'today', label: 'Today', description: 'Messages from today' },
    { id: 'yesterday', label: 'Yesterday', description: 'Messages from yesterday' },
    { id: 'week', label: 'This week', description: 'Messages from last 7 days' },
    { id: 'month', label: 'This month', description: 'Messages from last 30 days' },
    { id: 'year', label: 'This year', description: 'Messages from this year' },
    { id: 'custom', label: 'Custom range', description: 'Select specific dates' },
  ];

  const handleApplyFilter = async () => {
    setIsApplying(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsApplying(false);

    let filter = { type: 'date', range: selectedRange };

    if (selectedRange === 'custom') {
      filter.startDate = customStartDate;
      filter.endDate = customEndDate;
    }

    if (onFilter) {
      onFilter(filter);
    }
    onClose();
  };

  const getDateRange = (range) => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setDate(now.getDate() - 30);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return null;
    }

    return { start, end };
  };

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
            <h3 className="text-white font-semibold">Filter by Date</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Date Ranges */}
        <div className="space-y-2 mb-4">
          {dateRanges.map(range => (
            <button
              key={range.id}
              onClick={() => {
                setSelectedRange(range.id);
                if (range.id === 'custom') {
                  setShowCustom(true);
                } else {
                  setShowCustom(false);
                }
              }}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedRange === range.id
                  ? 'border-[#00a884] bg-[#00a884]/10'
                  : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{range.label}</p>
                  <p className="text-gray-400 text-sm">{range.description}</p>
                </div>
                {selectedRange === range.id && <Check size={18} className="text-[#00a884]" />}
              </div>
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        <AnimatePresence>
          {showCustom && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 mb-4 overflow-hidden"
            >
              <div>
                <p className="text-gray-400 text-sm mb-2">Start date</p>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">End date</p>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Apply Button */}
        <button
          onClick={handleApplyFilter}
          disabled={isApplying || (selectedRange === 'custom' && (!customStartDate || !customEndDate))}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isApplying ? (
            <>
              <Clock className="animate-spin" size={18} />
              Applying...
            </>
          ) : (
            <>
              <Filter size={18} />
              Apply Filter
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Date Filter Badge Component
export const DateFilterBadge = ({ filter, onRemove }) => {
  const getLabel = () => {
    switch (filter.range) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'This week';
      case 'month': return 'This month';
      case 'year': return 'This year';
      case 'custom': return `${filter.startDate} - ${filter.endDate}`;
      default: return 'All time';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-3 py-1 rounded-full text-sm"
    >
      <Calendar size={12} />
      <span>{getLabel()}</span>
      {onRemove && (
        <button
          onClick={() => onRemove()}
          className="hover:opacity-70"
        >
          <X size={12} />
        </button>
      )}
    </motion.div>
  );
};

// Date Filter Button Component
export const DateFilterButton = ({ onOpen, activeFilter }) => {
  return (
    <button
      onClick={onOpen}
      className={`p-2 rounded-full transition-colors ${
        activeFilter ? 'text-[#00a884] bg-[#00a884]/10' : 'text-gray-400 hover:text-white'
      }`}
      title="Filter by date"
    >
      <Calendar size={18} />
    </button>
  );
};

// Date Filter Settings Component
export const DateFilterSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Calendar size={18} className="text-[#00a884]" />
            Date Filtering
          </p>
          <p className="text-gray-400 text-sm">Filter messages by date</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, dateFilterEnabled: !settings.dateFilterEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.dateFilterEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.dateFilterEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.dateFilterEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show date indicators</p>
              <p className="text-gray-400 text-xs">Display date separators</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showDateIndicators: !settings.showDateIndicators })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showDateIndicators ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showDateIndicators ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageFilterByDate;
