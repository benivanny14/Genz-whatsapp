import React, { useState, useEffect } from 'react';
import { Archive, ArchiveRestore, X, Search, Filter, MoreVertical, Trash2, Pin, Unpin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ArchiveChats = ({ chats, onArchive, onUnarchive, onPin, onUnpin, onDelete, onClose }) => {
  const [archivedChats, setArchivedChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChats, setSelectedChats] = useState([]);
  const [showOptions, setShowOptions] = useState(null);

  useEffect(() => {
    const archived = chats.filter(chat => chat.isArchived);
    setArchivedChats(archived);
  }, [chats]);

  const filteredChats = archivedChats.filter(chat =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleArchive = (chatId) => {
    const chat = chats.find(c => c._id === chatId);
    if (chat.isArchived) {
      onUnarchive(chatId);
    } else {
      onArchive(chatId);
    }
  };

  const handleSelectChat = (chatId) => {
    setSelectedChats(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleBulkUnarchive = () => {
    selectedChats.forEach(id => onUnarchive(id));
    setSelectedChats([]);
  };

  const handleBulkDelete = () => {
    selectedChats.forEach(id => onDelete(id));
    setSelectedChats([]);
  };

  const handleTogglePin = (chatId) => {
    const chat = chats.find(c => c._id === chatId);
    if (chat.isPinned) {
      onUnpin(chatId);
    } else {
      onPin(chatId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Archive size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Archived Chats</h2>
              <p className="text-gray-400 text-sm">{archivedChats.length} archived chats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search archived chats..."
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedChats.length > 0 && (
          <div className="bg-[#00a884]/10 border-b border-[#00a884]/30 p-3 flex items-center justify-between">
            <span className="text-white text-sm">{selectedChats.length} selected</span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkUnarchive}
                className="bg-[#00a884] text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
              >
                <ArchiveRestore size={14} />
                Unarchive
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

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredChats.map(chat => (
              <motion.div
                key={chat._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#0b141a] rounded-lg p-4 border-2 transition-all cursor-pointer ${
                  selectedChats.includes(chat._id)
                    ? 'border-[#00a884]'
                    : 'border-transparent hover:border-[#00a884]/30'
                }`}
                onClick={() => handleSelectChat(chat._id)}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-1 ${
                    selectedChats.includes(chat._id)
                      ? 'bg-[#00a884] border-[#00a884]'
                      : 'border-gray-500'
                  }`}>
                    {selectedChats.includes(chat._id) && (
                      <div className="w-3 h-3 bg-white rounded-sm" />
                    )}
                  </div>

                  {/* Chat Avatar */}
                  <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-lg">
                      {chat.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium truncate">{chat.name}</span>
                      {chat.isPinned && <Pin size={14} className="text-[#00a884]" />}
                    </div>
                    <p className="text-gray-400 text-sm truncate">{chat.lastMessage}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Archived {new Date(chat.archivedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(chat._id);
                      }}
                      className="text-gray-400 hover:text-[#00a884] transition-colors"
                    >
                      {chat.isPinned ? <Unpin size={18} /> : <Pin size={18} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleArchive(chat._id);
                      }}
                      className="text-[#00a884] hover:text-white transition-colors"
                    >
                      <ArchiveRestore size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOptions(showOptions === chat._id ? null : chat._id);
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>

                {/* Options Menu */}
                <AnimatePresence>
                  {showOptions === chat._id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-[#00a884]/20"
                    >
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            handleTogglePin(chat._id);
                            setShowOptions(null);
                          }}
                          className="flex-1 bg-[#0b141a] text-white py-2 rounded-lg text-sm hover:bg-[#1a2e35] transition-colors"
                        >
                          {chat.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          onClick={() => {
                            onDelete(chat._id);
                            setShowOptions(null);
                          }}
                          className="flex-1 bg-red-500/20 text-red-400 py-2 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {filteredChats.length === 0 && (
            <div className="text-center py-12">
              <Archive className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">
                {searchQuery ? 'No archived chats found' : 'No archived chats'}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Archive Button Component
export const ArchiveButton = ({ chat, onArchive, onUnarchive }) => {
  return (
    <button
      onClick={() => chat.isArchived ? onUnarchive(chat._id) : onArchive(chat._id)}
      className={`p-2 rounded-lg transition-all ${
        chat.isArchived
          ? 'bg-[#00a884]/20 text-[#00a884]'
          : 'text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10'
      }`}
      title={chat.isArchived ? 'Unarchive' : 'Archive'}
    >
      {chat.isArchived ? <ArchiveRestore size={20} /> : <Archive size={20} />}
    </button>
  );
};

// Archive Settings Component
export const ArchiveSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Archive size={18} className="text-[#00a884]" />
            Archive Chats
          </p>
          <p className="text-gray-400 text-sm">Keep chats organized</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, archiveEnabled: !settings.archiveEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.archiveEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.archiveEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.archiveEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-archive</p>
              <p className="text-gray-400 text-xs">Archive inactive chats</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoArchive: !settings.autoArchive })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoArchive ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoArchive ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {settings.autoArchive && (
            <div>
              <p className="text-white text-sm mb-2">Archive after</p>
              <select
                value={settings.autoArchiveAfter || '30days'}
                onChange={(e) => onUpdate({ ...settings, autoArchiveAfter: e.target.value })}
                className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              >
                <option value="7days">7 days</option>
                <option value="30days">30 days</option>
                <option value="90days">90 days</option>
                <option value="180days">180 days</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Keep archived chats in list</p>
              <p className="text-gray-400 text-xs">Show archived in main list</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showArchivedInList: !settings.showArchivedInList })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showArchivedInList ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showArchivedInList ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Archive muted chats</p>
              <p className="text-gray-400 text-xs">Auto-archive muted chats</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, archiveMutedChats: !settings.archiveMutedChats })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.archiveMutedChats ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.archiveMutedChats ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Archived Chats Stats Component
export const ArchivedChatsStats = ({ archivedChats }) => {
  const stats = {
    total: archivedChats.length,
    pinned: archivedChats.filter(c => c.isPinned).length,
    groups: archivedChats.filter(c => c.isGroup).length,
    individual: archivedChats.filter(c => !c.isGroup).length,
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-[#0b141a] rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Archive size={16} className="text-[#00a884]" />
          <span className="text-gray-400 text-xs">Total</span>
        </div>
        <p className="text-white text-xl font-bold">{stats.total}</p>
      </div>
      <div className="bg-[#0b141a] rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Pin size={16} className="text-[#00a884]" />
          <span className="text-gray-400 text-xs">Pinned</span>
        </div>
        <p className="text-white text-xl font-bold">{stats.pinned}</p>
      </div>
      <div className="bg-[#0b141a] rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span>👥</span>
          <span className="text-gray-400 text-xs">Groups</span>
        </div>
        <p className="text-white text-xl font-bold">{stats.groups}</p>
      </div>
      <div className="bg-[#0b141a] rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span>👤</span>
          <span className="text-gray-400 text-xs">Individual</span>
        </div>
        <p className="text-white text-xl font-bold">{stats.individual}</p>
      </div>
    </div>
  );
};

export default ArchiveChats;
