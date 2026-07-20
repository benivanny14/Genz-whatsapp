import React, { useState } from 'react';
import { Filter, X, Check, Users, User, Archive, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatFilter = ({ chats, onFilter, onClose }) => {
  const [selectedFilters, setSelectedFilters] = useState({
    type: [], // 'contact', 'group'
    status: [], // 'unread', 'muted', 'archived', 'pinned'
    time: 'all' // 'all', 'today', 'week', 'month'
  });

  const filterOptions = {
    type: [
      { id: 'contact', label: 'Contacts', icon: User },
      { id: 'group', label: 'Groups', icon: Users },
    ],
    status: [
      { id: 'unread', label: 'Unread', icon: RefreshCw },
      { id: 'muted', label: 'Muted', icon: Clock },
      { id: 'archived', label: 'Archived', icon: Archive },
      { id: 'pinned', label: 'Pinned', icon: Filter },
    ],
    time: [
      { id: 'all', label: 'All time' },
      { id: 'today', label: 'Today' },
      { id: 'week', label: 'This week' },
      { id: 'month', label: 'This month' },
    ]
  };

  const toggleFilter = (category, value) => {
    setSelectedFilters(prev => {
      if (category === 'time') {
        return { ...prev, [category]: value };
      }
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const handleApplyFilter = () => {
    onFilter?.(selectedFilters);
    onClose();
  };

  const handleClearAll = () => {
    setSelectedFilters({
      type: [],
      status: [],
      time: 'all'
    });
  };

  const hasActiveFilters = selectedFilters.type.length > 0 || 
                          selectedFilters.status.length > 0 || 
                          selectedFilters.time !== 'all';

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
            <Filter className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Filter Chats</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Type */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Chat type</p>
          <div className="grid grid-cols-2 gap-2">
            {filterOptions.type.map(option => {
              const Icon = option.icon;
              const isSelected = selectedFilters.type.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => toggleFilter('type', option.id)}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'border-[#00a884] bg-[#00a884]/10'
                      : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                  }`}
                >
                  <Icon size={16} className={isSelected ? 'text-[#00a884]' : 'text-gray-400'} />
                  <span className="text-white text-sm">{option.label}</span>
                  {isSelected && <Check size={14} className="text-[#00a884] ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Status</p>
          <div className="grid grid-cols-2 gap-2">
            {filterOptions.status.map(option => {
              const Icon = option.icon;
              const isSelected = selectedFilters.status.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => toggleFilter('status', option.id)}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'border-[#00a884] bg-[#00a884]/10'
                      : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                  }`}
                >
                  <Icon size={16} className={isSelected ? 'text-[#00a884]' : 'text-gray-400'} />
                  <span className="text-white text-sm">{option.label}</span>
                  {isSelected && <Check size={14} className="text-[#00a884] ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Time period</p>
          <div className="grid grid-cols-2 gap-2">
            {filterOptions.time.map(option => (
              <button
                key={option.id}
                onClick={() => toggleFilter('time', option.id)}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  selectedFilters.time === option.id
                    ? 'border-[#00a884] bg-[#00a884]/10'
                    : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                }`}
              >
                <span className="text-white text-sm">{option.label}</span>
                {selectedFilters.time === option.id && <Check size={14} className="text-[#00a884] mx-auto mt-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filters Count */}
        {hasActiveFilters && (
          <div className="bg-[#00a884]/10 border border-[#00a884]/30 rounded-lg p-3 mb-4">
            <p className="text-[#00a884] text-sm">
              {selectedFilters.type.length + selectedFilters.status.length} filter{selectedFilters.type.length + selectedFilters.status.length > 1 ? 's' : ''} active
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleClearAll}
            disabled={!hasActiveFilters}
            className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={handleApplyFilter}
            className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <Filter size={18} />
            Apply
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Chat Filter Button Component
export const ChatFilterButton = ({ onOpen, activeFilters }) => {
  const hasActiveFilters = activeFilters?.type?.length > 0 || 
                          activeFilters?.status?.length > 0 || 
                          activeFilters?.time !== 'all';

  return (
    <button
      onClick={onOpen}
      className={`p-2 rounded-full transition-colors ${
        hasActiveFilters ? 'text-[#00a884]' : 'text-gray-400 hover:text-white'
      }`}
      title="Filter chats"
    >
      <Filter size={20} />
    </button>
  );
};

// Chat Filter Badge Component
export const ChatFilterBadge = ({ filters, onRemove }) => {
  const labels = [];
  if (filters.type?.length > 0) labels.push(filters.type.join(', '));
  if (filters.status?.length > 0) labels.push(filters.status.join(', '));
  if (filters.time !== 'all') labels.push(filters.time);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-3 py-1 rounded-full text-sm"
    >
      <Filter size={12} />
      <span>{labels.join(' • ')}</span>
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

// Chat Filter Settings Component
export const ChatFilterSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Filter size={18} className="text-[#00a884]" />
            Chat Filters
          </p>
          <p className="text-gray-400 text-sm">Filter your chat list</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, chatFiltersEnabled: !settings.chatFiltersEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.chatFiltersEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.chatFiltersEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.chatFiltersEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show filter badges</p>
              <p className="text-gray-400 text-xs">Display active filters</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showFilterBadges: !settings.showFilterBadges })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showFilterBadges ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showFilterBadges ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatFilter;
