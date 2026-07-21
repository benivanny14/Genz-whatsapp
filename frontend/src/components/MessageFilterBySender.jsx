import React, { useState } from 'react';
import { User, X, Check, Filter, Search, RefreshCw, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageFilterBySender = ({ messages, contacts, onFilter, onClose }) => {
  const [selectedSenders, setSelectedSenders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Get unique senders from messages
  const uniqueSenders = Array.from(
    new Set(messages.map(m => m.sender?._id || m.sender))
  ).map(senderId => {
    const sender = contacts.find(c => c._id === senderId) || messages.find(m => m.sender?._id === senderId)?.sender;
    return {
      id: senderId,
      name: sender?.name || sender?.username || 'Unknown',
      avatar: sender?.avatar || sender?.profilePicture,
      messageCount: messages.filter(m => (m.sender?._id || m.sender) === senderId).length
    };
  });

  const filteredSenders = uniqueSenders.filter(sender =>
    sender.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSender = (senderId) => {
    setSelectedSenders(prev =>
      prev.includes(senderId)
        ? prev.filter(id => id !== senderId)
        : [...prev, senderId]
    );
  };

  const handleApplyFilter = async () => {
    setIsApplying(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsApplying(false);

    if (onFilter) {
      onFilter({
        type: 'sender',
        senders: selectedSenders
      });
    }
    onClose();
  };

  const handleClearAll = () => {
    setSelectedSenders([]);
  };

  const handleSelectAll = () => {
    setSelectedSenders(filteredSenders.map(s => s.id));
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="text-[#00a884]" size={20} />
              <h3 className="text-white font-semibold">Filter by Sender</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search senders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 p-4 border-b border-[#00a884]/20">
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

        {/* Senders List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredSenders.map(sender => {
              const isSelected = selectedSenders.includes(sender.id);
              return (
                <button
                  key={sender.id}
                  onClick={() => toggleSender(sender.id)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                    isSelected
                      ? 'border-[#00a884] bg-[#00a884]/10'
                      : 'border=[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center flex-shrink-0">
                    {sender.avatar ? (
                      <img
                        src={sender.avatar}
                        alt={sender.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User size={20} className="text-[#00a884]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{sender.name}</p>
                    <p className="text-gray-400 text-xs">{sender.messageCount} messages</p>
                  </div>
                  {isSelected && <Check size={18} className="text-[#00a884]" />}
                </button>
              );
            })}
          </div>

          {filteredSenders.length === 0 && (
            <div className="text-center py-8">
              <User className="text-gray-600 mx-auto mb-4" size={32} />
              <p className="text-gray-400">No senders found</p>
            </div>
          )}
        </div>

        {/* Selected Count */}
        {selectedSenders.length > 0 && (
          <div className="p-4 border-t border-[#00a884]/20 bg-[#00a884]/10">
            <p className="text-[#00a884] text-sm">
              {selectedSenders.length} sender{selectedSenders.length > 1 ? 's' : ''} selected
            </p>
          </div>
        )}

        {/* Apply Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleApplyFilter}
            disabled={isApplying || selectedSenders.length === 0}
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
      </div>
    </motion.div>
  );
};

// Sender Filter Badge Component
export const SenderFilterBadge = ({ filter, contacts, onRemove }) => {
  const senderNames = filter.senders.map(senderId => {
    const sender = contacts.find(c => c._id === senderId);
    return sender?.name || senderId;
  }).join(', ');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-3 py-1 rounded-full text-sm"
    >
      <Users size={12} />
      <span>{senderNames}</span>
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

// Sender Filter Button Component
export const SenderFilterButton = ({ onOpen, activeFilter }) => {
  return (
    <button
      onClick={onOpen}
      className={`p-2 rounded-full transition-colors ${
        activeFilter ? 'text-[#00a884] bg-[#00a884]/10' : 'text-gray-400 hover:text-white'
      }`}
      title="Filter by sender"
    >
      <Users size={18} />
    </button>
  );
};

// Sender Filter Settings Component
export const SenderFilterSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Users size={18} className="text-[#00a884]" />
            Sender Filtering
          </p>
          <p className="text-gray-400 text-sm">Filter messages by sender</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, senderFilterEnabled: !settings.senderFilterEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.senderFilterEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.senderFilterEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.senderFilterEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show sender avatars</p>
              <p className="text-gray-400 text-xs">Display profile pictures</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showSenderAvatars: !settings.showSenderAvatars })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showSenderAvatars ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showSenderAvatars ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageFilterBySender;
