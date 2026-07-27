import React, { useState } from 'react';
import { Bookmark, X, Check, RefreshCw, Search, Folder, Trash2, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageBookmark = ({ message, bookmarks, onAddBookmark, onRemoveBookmark, onClose }) => {
  const [selectedFolder, setSelectedFolder] = useState('default');
  const [newFolder, setNewFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const folders = [
    { id: 'default', label: 'General', icon: Bookmark },
    { id: 'important', label: 'Important', icon: Bookmark },
    { id: 'work', label: 'Work', icon: Bookmark },
    { id: 'personal', label: 'Personal', icon: Bookmark },
  ];

  const handleAddBookmark = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);

    if (onAddBookmark) {
      onAddBookmark({
        messageId: message._id,
        folder: selectedFolder,
        timestamp: new Date().toISOString()
      });
    }
    onClose();
  };

  const handleCreateFolder = () => {
    if (!newFolder.trim()) return;
    // In a real app, this would create a new folder
    setNewFolder('');
    setShowNewFolder(false);
  };

  const isBookmarked = bookmarks?.some(b => b.messageId === message._id);

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
            <Bookmark className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Bookmark Message</h3>
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
          <p className="text-gray-400 text-xs mb-2">Message to bookmark:</p>
          <p className="text-white text-sm line-clamp-3">{message.content}</p>
        </div>

        {/* Already Bookmarked */}
        {isBookmarked && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <Bookmark className="text-yellow-500" size={16} />
              <p className="text-yellow-500 text-sm">This message is already bookmarked</p>
            </div>
          </div>
        )}

        {/* Folder Selection */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Save to folder</p>
          <div className="space-y-2">
            {folders.map(folder => {
              const Icon = folder.icon;
              return (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                    selectedFolder === folder.id
                      ? 'border-[#00a884] bg-[#00a884]/10'
                      : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                  }`}
                >
                  <Icon size={18} className={selectedFolder === folder.id ? 'text-[#00a884]' : 'text-gray-400'} />
                  <span className="text-white">{folder.label}</span>
                  {selectedFolder === folder.id && <Check size={18} className="text-[#00a884] ml-auto" />}
                </button>
              );
            })}
          </div>

          {/* New Folder */}
          {!showNewFolder ? (
            <button
              onClick={() => setShowNewFolder(true)}
              className="w-full mt-2 p-3 rounded-lg border border-dashed border-gray-500 text-gray-400 hover:text-white hover:border-gray-400 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Folder size={16} />
              Create new folder
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="Folder name"
                className="flex-1 bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
              />
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#008f72] transition-colors text-sm"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isBookmarked ? (
            <button
              onClick={() => {
                onRemoveBookmark?.(message._id);
                onClose();
              }}
              className="flex-1 bg-red-500/20 text-red-500 py-3 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Remove Bookmark
            </button>
          ) : (
            <button
              onClick={handleAddBookmark}
              disabled={isSaving}
              className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Saving...
                </>
              ) : (
                <>
                  <Bookmark size={18} />
                  Save Bookmark
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Bookmarks List Component
export const BookmarksList = ({ bookmarks, messages, onRemove, onJumpToMessage }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all');

  const filteredBookmarks = bookmarks.filter(bookmark => {
    const message = messages.find(m => m._id === bookmark.messageId);
    const matchesSearch = message?.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === 'all' || bookmark.folder === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search bookmarks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
        />
      </div>

      {/* Bookmarks */}
      {filteredBookmarks.map(bookmark => {
        const message = messages.find(m => m._id === bookmark.messageId);
        if (!message) return null;

        return (
          <motion.div
            key={bookmark._id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Bookmark size={16} className="text-[#00a884]" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm line-clamp-2 mb-1">{message.content}</p>
                <p className="text-gray-400 text-xs">
                  {new Date(bookmark.timestamp).toLocaleDateString()} • {bookmark.folder}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onJumpToMessage?.(message._id)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Jump to message"
                >
                  <Search size={14} />
                </button>
                <button
                  onClick={() => onRemove?.(bookmark._id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove bookmark"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}

      {filteredBookmarks.length === 0 && (
        <div className="text-center py-8">
          <Bookmark className="text-gray-600 mx-auto mb-4" size={32} />
          <p className="text-gray-400">No bookmarks found</p>
        </div>
      )}
    </div>
  );
};

// Bookmark Button Component
export const BookmarkButton = ({ isBookmarked, onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className={`p-2 rounded-full transition-colors ${
        isBookmarked ? 'text-[#00a884]' : 'text-gray-400 hover:text-[#00a884]'
      }`}
      title={isBookmarked ? 'Bookmarked' : 'Bookmark message'}
    >
      <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
    </button>
  );
};

// Bookmark Badge Component
export const BookmarkBadge = ({ folder }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full text-xs"
    >
      <Bookmark size={10} fill="currentColor" />
      <span>{folder}</span>
    </motion.div>
  );
};

// Bookmark Settings Component
export const BookmarkSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Bookmark size={18} className="text-[#00a884]" />
            Bookmarks
          </p>
          <p className="text-gray-400 text-sm">Save important messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, bookmarksEnabled: !settings.bookmarksEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.bookmarksEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.bookmarksEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.bookmarksEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show bookmark indicators</p>
              <p className="text-gray-400 text-xs">Display bookmark icons</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showBookmarkIndicators: !settings.showBookmarkIndicators })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showBookmarkIndicators ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showBookmarkIndicators ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBookmark;
