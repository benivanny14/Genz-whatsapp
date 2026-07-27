import React, { useState } from 'react';
import { Folder, X, Check, RefreshCw, Plus, Edit2, Trash2, MessageSquare, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatFolders = ({ folders, chats, onCreateFolder, onUpdateFolder, onDeleteFolder, onClose }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolder, setNewFolder] = useState({
    name: '',
    color: '#00a884',
    icon: 'folder'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const folderColors = ['#00a884', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8', '#00b894'];
  const folderIcons = ['folder', 'star', 'heart', 'briefcase', 'users', 'home', 'work', 'personal'];

  const filteredFolders = folders.filter(folder =>
    folder.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateFolder = async () => {
    if (!newFolder.name) return;

    setIsCreating(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsCreating(false);

    const folder = {
      id: Date.now(),
      ...newFolder,
      chatCount: 0,
      createdAt: new Date().toISOString()
    };

    onCreateFolder?.(folder);
    setNewFolder({ name: '', color: '#00a884', icon: 'folder' });
    setShowCreateModal(false);
  };

  const handleEditFolder = (folder) => {
    setEditingFolder(folder);
    setNewFolder({
      name: folder.name,
      color: folder.color,
      icon: folder.icon
    });
    setShowCreateModal(true);
  };

  const handleUpdateFolder = async () => {
    setIsCreating(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsCreating(false);

    const updatedFolder = {
      ...editingFolder,
      ...newFolder
    };

    onUpdateFolder?.(updatedFolder);
    setEditingFolder(null);
    setNewFolder({ name: '', color: '#00a884', icon: 'folder' });
    setShowCreateModal(false);
  };

  const handleDeleteFolder = (folderId) => {
    if (confirm('Are you sure you want to delete this folder?')) {
      onDeleteFolder?.(folderId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Folder size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Chat Folders</h2>
              <p className="text-gray-400 text-sm">{folders.length} folders</p>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Folders List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredFolders.map(folder => (
              <motion.div
                key={folder._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 hover:border-[#00a884]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${folder.color}20` }}
                  >
                    <Folder size={20} style={{ color: folder.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{folder.name}</h3>
                    <p className="text-gray-400 text-sm">{folder.chatCount || 0} chats</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditFolder(folder)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder._id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredFolders.length === 0 && (
            <div className="text-center py-12">
              <Folder className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No folders found</p>
            </div>
          )}
        </div>

        {/* Add Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={() => {
              setEditingFolder(null);
              setNewFolder({ name: '', color: '#00a884', icon: 'folder' });
              setShowCreateModal(true);
            }}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Create Folder
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">
                  {editingFolder ? 'Edit Folder' : 'Create Folder'}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Folder name</p>
                  <input
                    type="text"
                    placeholder="Work"
                    value={newFolder.name}
                    onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {folderColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewFolder({ ...newFolder, color })}
                        className={`w-8 h-8 rounded-full transition-all ${
                          newFolder.color === color ? 'ring-2 ring-white ring-offset-2' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={editingFolder ? handleUpdateFolder : handleCreateFolder}
                disabled={isCreating || !newFolder.name}
                className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    {editingFolder ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    {editingFolder ? 'Update Folder' : 'Create Folder'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Chat Folder Settings Component
export const ChatFolderSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Folder size={18} className="text-[#00a884]" />
            Chat Folders
          </p>
          <p className="text-gray-400 text-sm">Organize chats into folders</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, chatFoldersEnabled: !settings.chatFoldersEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.chatFoldersEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.chatFoldersEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.chatFoldersEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-sort chats</p>
              <p className="text-gray-400 text-xs">Sort by folder rules</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoSortChats: !settings.autoSortChats })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoSortChats ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoSortChats ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show folder badges</p>
              <p className="text-gray-400 text-xs">Display folder indicators</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showFolderBadges: !settings.showFolderBadges })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showFolderBadges ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showFolderBadges ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Folder Button Component
export const FolderButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Chat folders"
    >
      <Folder size={18} />
    </button>
  );
};

// Folder Badge Component
export const FolderBadge = ({ folder }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{ backgroundColor: `${folder.color}20`, color: folder.color }}
    >
      <Folder size={10} />
      <span>{folder.name}</span>
    </motion.div>
  );
};

// Folder Tab Component
export const FolderTab = ({ folder, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        isActive
          ? 'bg-[#00a884] text-white'
          : 'bg-[#0b141a] text-gray-400 hover:text-white'
      }`}
    >
      <Folder size={16} />
      <span>{folder.name}</span>
      <span className="text-xs opacity-70">({folder.chatCount || 0})</span>
    </button>
  );
};

export default ChatFolders;
