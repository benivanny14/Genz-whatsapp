import React, { useState } from 'react';
import { Filter, X, Check, Image as ImageIcon, Video, FileText, Mic, Link, MapPin, Smile, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageFilterByType = ({ messages, onFilter, onClose }) => {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [isApplying, setIsApplying] = useState(false);

  const messageTypes = [
    { id: 'text', label: 'Text', icon: FileText, description: 'Text messages' },
    { id: 'image', label: 'Images', icon: ImageIcon, description: 'Photos and images' },
    { id: 'video', label: 'Videos', icon: Video, description: 'Video files' },
    { id: 'audio', label: 'Audio', icon: Mic, description: 'Voice messages and audio' },
    { id: 'document', label: 'Documents', icon: FileText, description: 'PDF, Word, etc.' },
    { id: 'link', label: 'Links', icon: Link, description: 'URL links' },
    { id: 'location', label: 'Locations', icon: MapPin, description: 'Shared locations' },
    { id: 'sticker', label: 'Stickers', icon: Smile, description: 'Animated stickers' },
  ];

  const toggleType = (typeId) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleApplyFilter = async () => {
    setIsApplying(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsApplying(false);

    if (onFilter) {
      onFilter({
        type: 'messageType',
        types: selectedTypes
      });
    }
    onClose();
  };

  const handleClearAll = () => {
    setSelectedTypes([]);
  };

  const handleSelectAll = () => {
    setSelectedTypes(messageTypes.map(t => t.id));
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
            <Filter className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Filter by Type</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleSelectAll}
            className="flex-1 bg-[#0b141a] text-gray-300 py-2 rounded-lg hover:bg-[#1a2e35] hover:text-white transition-colors text-sm"
          >
            Select All
          </button>
          <button
            onClick={handleClearAll}
            className="flex-1 bg-[#0b141a] text-gray-300 py-2 rounded-lg hover:bg-[#1a2e35] hover:text-white transition-colors text-sm"
          >
            Clear All
          </button>
        </div>

        {/* Message Types Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {messageTypes.map(type => {
            const Icon = type.icon;
            const isSelected = selectedTypes.includes(type.id);
            return (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-[#00a884] bg-[#00a884]/10'
                    : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={18} className={isSelected ? 'text-[#00a884]' : 'text-gray-400'} />
                  <span className="text-white font-medium text-sm">{type.label}</span>
                </div>
                <p className="text-gray-400 text-xs">{type.description}</p>
                {isSelected && <Check size={14} className="text-[#00a884] mt-2" />}
              </button>
            );
          })}
        </div>

        {/* Selected Count */}
        {selectedTypes.length > 0 && (
          <div className="bg-[#00a884]/10 border border-[#00a884]/30 rounded-lg p-3 mb-4">
            <p className="text-[#00a884] text-sm">
              {selectedTypes.length} type{selectedTypes.length > 1 ? 's' : ''} selected
            </p>
          </div>
        )}

        {/* Apply Button */}
        <button
          onClick={handleApplyFilter}
          disabled={isApplying || selectedTypes.length === 0}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isApplying ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
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

// Type Filter Badge Component
export const TypeFilterBadge = ({ filter, onRemove }) => {
  const typeLabels = {
    text: 'Text',
    image: 'Images',
    video: 'Videos',
    audio: 'Audio',
    document: 'Documents',
    link: 'Links',
    location: 'Locations',
    sticker: 'Stickers'
  };

  const labels = filter.types.map(t => typeLabels[t] || t).join(', ');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-3 py-1 rounded-full text-sm"
    >
      <Filter size={12} />
      <span>{labels}</span>
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

// Type Filter Button Component
export const TypeFilterButton = ({ onOpen, activeFilter }) => {
  return (
    <button
      onClick={onOpen}
      className={`p-2 rounded-full transition-colors ${
        activeFilter ? 'text-[#00a884] bg-[#00a884]/10' : 'text-gray-400 hover:text-white'
      }`}
      title="Filter by type"
    >
      <Filter size={18} />
    </button>
  );
};

// Type Filter Settings Component
export const TypeFilterSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Filter size={18} className="text-[#00a884]" />
            Type Filtering
          </p>
          <p className="text-gray-400 text-sm">Filter messages by type</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, typeFilterEnabled: !settings.typeFilterEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.typeFilterEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.typeFilterEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.typeFilterEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show type indicators</p>
              <p className="text-gray-400 text-xs">Display message type icons</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showTypeIndicators: !settings.showTypeIndicators })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showTypeIndicators ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showTypeIndicators ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageFilterByType;
