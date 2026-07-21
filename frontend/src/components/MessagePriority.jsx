import React, { useState } from 'react';
import { Flag, X, Check, RefreshCw, AlertTriangle, Zap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessagePriority = ({ message, onSetPriority, onClose }) => {
  const [selectedPriority, setSelectedPriority] = useState(message.priority || 'normal');
  const [isSetting, setIsSetting] = useState(false);

  const priorities = [
    { value: 'low', label: 'Low', icon: Shield, color: 'text-blue-500', bgColor: 'bg-blue-500/20' },
    { value: 'normal', label: 'Normal', icon: Check, color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
    { value: 'high', label: 'High', icon: Zap, color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' },
    { value: 'urgent', label: 'Urgent', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/20' }
  ];

  const handleSetPriority = async () => {
    setIsSetting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSetting(false);

    if (onSetPriority) {
      onSetPriority(message._id, selectedPriority);
    }
    onClose();
  };

  const PriorityIcon = priorities.find(p => p.value === selectedPriority)?.icon || Check;

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
            <Flag className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Message Priority</h3>
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
          <p className="text-gray-400 text-xs mb-2">Message:</p>
          <p className="text-white text-sm line-clamp-3">{message.content}</p>
        </div>

        {/* Priority Options */}
        <div className="space-y-2 mb-4">
          {priorities.map(priority => {
            const Icon = priority.icon;
            const isSelected = selectedPriority === priority.value;
            return (
              <button
                key={priority.value}
                onClick={() => setSelectedPriority(priority.value)}
                className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all ${
                  isSelected
                    ? `${priority.bgColor} ${priority.color} border-current`
                    : 'bg-[#0b141a] text-gray-400 border-[#00a884]/20 hover:border-[#00a884]/50'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{priority.label}</span>
                {isSelected && <Check size={20} className="ml-auto" />}
              </button>
            );
          })}
        </div>

        {/* Priority Description */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
          <p className="text-blue-500 text-xs">
            Priority helps organize messages. Urgent messages appear at the top and have special indicators.
          </p>
        </div>

        {/* Set Priority Button */}
        <button
          onClick={handleSetPriority}
          disabled={isSetting}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSetting ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Setting...
            </>
          ) : (
            <>
              <Flag size={18} />
              Set Priority
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Message Priority Settings Component
export const MessagePrioritySettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Flag size={18} className="text-[#00a884]" />
            Message Priority
          </p>
          <p className="text-gray-400 text-sm">Mark message importance</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, messagePriorityEnabled: !settings.messagePriorityEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.messagePriorityEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.messagePriorityEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.messagePriorityEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Sort by priority</p>
              <p className="text-gray-400 text-xs">Auto-sort messages</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, sortByPriority: !settings.sortByPriority })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.sortByPriority ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.sortByPriority ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show priority indicators</p>
              <p className="text-gray-400 text-xs">Display priority badges</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showPriorityIndicators: !settings.showPriorityIndicators })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showPriorityIndicators ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showPriorityIndicators ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Priority Button Component
export const PriorityButton = ({ onOpen, priority }) => {
  const priorityColors = {
    low: 'text-blue-500',
    normal: 'text-gray-400',
    high: 'text-yellow-500',
    urgent: 'text-red-500'
  };

  return (
    <button
      onClick={onOpen}
      className={`p-2 rounded-full hover:bg-[#00a884]/10 transition-colors ${priorityColors[priority] || 'text-gray-400'}`}
      title={`Priority: ${priority}`}
    >
      <Flag size={18} />
    </button>
  );
};

// Priority Indicator Component
export const PriorityIndicator = ({ priority }) => {
  const priorityConfig = {
    low: { color: 'bg-blue-500', label: 'Low' },
    normal: { color: 'bg-gray-500', label: 'Normal' },
    high: { color: 'bg-yellow-500', label: 'High' },
    urgent: { color: 'bg-red-500', label: 'Urgent' }
  };

  const config = priorityConfig[priority] || priorityConfig.normal;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1 ${config.color} text-white text-xs px-2 py-0.5 rounded-full`}
    >
      <Flag size={10} />
      <span>{config.label}</span>
    </motion.div>
  );
};

// Priority Badge Component
export const PriorityBadge = ({ priority, onClick }) => {
  const priorityConfig = {
    low: { color: 'text-blue-500', bgColor: 'bg-blue-500/20', icon: Shield },
    normal: { color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: Check },
    high: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/20', icon: Zap },
    urgent: { color: 'text-red-500', bgColor: 'bg-red-500/20', icon: AlertTriangle }
  };

  const config = priorityConfig[priority] || priorityConfig.normal;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 ${config.bgColor} ${config.color} px-2 py-1 rounded-full text-xs hover:opacity-80 transition-opacity`}
    >
      <Icon size={12} />
      <span className="capitalize">{priority}</span>
    </button>
  );
};

// Priority Filter Component
export const PriorityFilter = ({ selectedPriority, onFilterChange }) => {
  const priorities = ['all', 'urgent', 'high', 'normal', 'low'];

  return (
    <div className="flex gap-2">
      {priorities.map(priority => (
        <button
          key={priority}
          onClick={() => onFilterChange?.(priority)}
          className={`px-3 py-1 rounded-lg text-xs capitalize transition-all ${
            selectedPriority === priority
              ? 'bg-[#00a884] text-white'
              : 'bg-[#0b141a] text-gray-400 hover:text-white'
          }`}
        >
          {priority}
        </button>
      ))}
    </div>
  );
};

export default MessagePriority;
