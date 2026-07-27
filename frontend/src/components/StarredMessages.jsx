import React, { useState, useEffect } from 'react';
import { Star, StarOff, Search, Filter, X, Trash2, Share2, Download, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StarredMessages = ({ messages, onStar, onUnstar, onShare, onDelete, onClose }) => {
  const [starredMessages, setStarredMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, text, image, video, audio
  const [selectedMessages, setSelectedMessages] = useState([]);

  useEffect(() => {
    const starred = messages.filter(msg => msg.isStarred);
    setStarredMessages(starred);
  }, [messages]);

  const filteredMessages = starredMessages.filter(msg => {
    const matchesSearch = msg.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         msg.type?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || msg.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const handleToggleStar = (messageId) => {
    const message = messages.find(m => m._id === messageId);
    if (message.isStarred) {
      onUnstar(messageId);
    } else {
      onStar(messageId);
    }
  };

  const handleSelectMessage = (messageId) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleBulkDelete = () => {
    selectedMessages.forEach(id => onDelete(id));
    setSelectedMessages([]);
  };

  const handleBulkShare = () => {
    selectedMessages.forEach(id => {
      const msg = messages.find(m => m._id === id);
      if (msg) onShare(msg);
    });
    setSelectedMessages([]);
  };

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'image': return '📷';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'voice': return '🎤';
      case 'document': return '📄';
      case 'location': return '📍';
      default: return '💬';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Star size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Starred Messages</h2>
              <p className="text-gray-400 text-sm">{starredMessages.length} starred messages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="flex gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search starred messages..."
                className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              />
            </div>
            <button
              onClick={() => setFilterType(filterType === 'all' ? 'text' : 'all')}
              className={`p-2 rounded-lg transition-all ${
                filterType === 'all' ? 'bg-[#00a884]/20 text-[#00a884]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Filter size={20} />
            </button>
          </div>

          {/* Filter Options */}
          <div className="flex gap-2">
            {['all', 'text', 'image', 'video', 'audio'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg text-sm capitalize transition-all ${
                  filterType === type
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#0b141a] text-gray-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedMessages.length > 0 && (
          <div className="bg-[#00a884]/10 border-b border-[#00a884]/30 p-3 flex items-center justify-between">
            <span className="text-white text-sm">{selectedMessages.length} selected</span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkShare}
                className="bg-[#00a884] text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
              >
                <Share2 size={14} />
                Share
              </button>
              <button
                onClick={handleBulkDelete}
                className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {filteredMessages.map(message => (
              <motion.div
                key={message._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#0b141a] rounded-lg p-4 border-2 transition-all cursor-pointer ${
                  selectedMessages.includes(message._id)
                    ? 'border-[#00a884]'
                    : 'border-transparent hover:border-[#00a884]/30'
                }`}
                onClick={() => handleSelectMessage(message._id)}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-1 ${
                    selectedMessages.includes(message._id)
                      ? 'bg-[#00a884] border-[#00a884]'
                      : 'border-gray-500'
                  }`}>
                    {selectedMessages.includes(message._id) && (
                      <div className="w-3 h-3 bg-white rounded-sm" />
                    )}
                  </div>

                  {/* Message Type Icon */}
                  <div className="text-2xl">{getMessageTypeIcon(message.type)}</div>

                  {/* Message Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{message.sender?.name}</span>
                      <span className="text-gray-500 text-xs">{new Date(message.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-300 text-sm line-clamp-2">{message.content}</p>
                    {message.type !== 'text' && (
                      <p className="text-gray-500 text-xs mt-1 capitalize">{message.type}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(message._id);
                      }}
                      className="text-[#00a884] hover:text-yellow-400 transition-colors"
                    >
                      <Star size={18} fill="currentColor" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(message);
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredMessages.length === 0 && (
            <div className="text-center py-12">
              <Star className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No starred messages found</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Star Button Component
export const StarButton = ({ message, onStar, onUnstar }) => {
  return (
    <button
      onClick={() => message.isStarred ? onUnstar(message._id) : onStar(message._id)}
      className={`transition-colors ${
        message.isStarred ? 'text-[#00a884] hover:text-yellow-400' : 'text-gray-400 hover:text-[#00a884]'
      }`}
      title={message.isStarred ? 'Unstar' : 'Star'}
    >
      <Star size={18} fill={message.isStarred ? 'currentColor' : 'none'} />
    </button>
  );
};

// Starred Messages Settings Component
export const StarredMessagesSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Star size={18} className="text-[#00a884]" />
            Starred Messages
          </p>
          <p className="text-gray-400 text-sm">Save important messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, starredMessagesEnabled: !settings.starredMessagesEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.starredMessagesEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.starredMessagesEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.starredMessagesEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-backup starred</p>
              <p className="text-gray-400 text-xs">Backup starred messages</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoBackupStarred: !settings.autoBackupStarred })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoBackupStarred ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoBackupStarred ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show in chat</p>
              <p className="text-gray-400 text-xs">Display star indicator</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showStarIndicator: !settings.showStarIndicator })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showStarIndicator ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showStarIndicator ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Starred Messages Stats Component
export const StarredMessagesStats = ({ starredMessages }) => {
  const stats = {
    total: starredMessages.length,
    text: starredMessages.filter(m => m.type === 'text').length,
    image: starredMessages.filter(m => m.type === 'image').length,
    video: starredMessages.filter(m => m.type === 'video').length,
    audio: starredMessages.filter(m => m.type === 'audio' || m.type === 'voice').length,
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-[#0b141a] rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-[#00a884]" />
          <span className="text-gray-400 text-xs">Total</span>
        </div>
        <p className="text-white text-xl font-bold">{stats.total}</p>
      </div>
      <div className="bg-[#0b141a] rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span>💬</span>
          <span className="text-gray-400 text-xs">Text</span>
        </div>
        <p className="text-white text-xl font-bold">{stats.text}</p>
      </div>
      <div className="bg-[#0b141a] rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span>📷</span>
          <span className="text-gray-400 text-xs">Images</span>
        </div>
        <p className="text-white text-xl font-bold">{stats.image}</p>
      </div>
      <div className="bg-[#0b141a] rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span>🎬</span>
          <span className="text-gray-400 text-xs">Videos</span>
        </div>
        <p className="text-white text-xl font-bold">{stats.video}</p>
      </div>
    </div>
  );
};

export default StarredMessages;
