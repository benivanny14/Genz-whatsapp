import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, Check, RefreshCw, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatDelete = ({ chat, chats, onDelete, onClose }) => {
  const [selectedChats, setSelectedChats] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteOption, setDeleteOption] = useState('chat'); // 'chat', 'messages', 'both'

  const deleteOptions = [
    { id: 'chat', label: 'Delete chat', description: 'Remove chat from list' },
    { id: 'messages', label: 'Delete messages', description: 'Clear all messages' },
    { id: 'both', label: 'Delete both', description: 'Remove chat and messages' },
  ];

  const handleToggleChat = (chatId) => {
    setSelectedChats(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsDeleting(false);

    const chatsToDelete = chat ? [chat._id] : selectedChats;
    chatsToDelete.forEach(chatId => {
      onDelete?.(chatId, deleteOption);
    });

    setSelectedChats([]);
    setShowConfirm(false);
    onClose();
  };

  const handleConfirm = () => {
    setShowConfirm(true);
  };

  const chatsToDelete = chat ? [chat] : chats.filter(c => selectedChats.includes(c._id));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
        {!showConfirm ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Trash2 className="text-red-500" size={20} />
                <h3 className="text-white font-semibold">Delete Chats</h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {!chat && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">Select chats to delete</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {chats.map(chatItem => (
                    <button
                      key={chatItem._id}
                      onClick={() => handleToggleChat(chatItem._id)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                        selectedChats.includes(chatItem._id)
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center flex-shrink-0">
                        {chatItem.avatar ? (
                          <img
                            src={chatItem.avatar}
                            alt={chatItem.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Archive size={20} className="text-[#00a884]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{chatItem.name}</p>
                        <p className="text-gray-400 text-xs">{chatItem.lastMessage}</p>
                      </div>
                      {selectedChats.includes(chatItem._id) && <Check size={18} className="text-red-500" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chat && (
              <div className="mb-4 p-4 bg-[#0b141a] rounded-lg border border-[#00a884]/20">
                <p className="text-white font-medium">{chat.name}</p>
                <p className="text-gray-400 text-sm mt-1">{chat.lastMessage}</p>
              </div>
            )}

            {/* Delete Options */}
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Delete option</p>
              <div className="space-y-2">
                {deleteOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setDeleteOption(option.id)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      deleteOption === option.id
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                    }`}
                  >
                    <p className="text-white font-medium">{option.label}</p>
                    <p className="text-gray-400 text-xs">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Warning */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-red-500 text-xs">
                  This action cannot be undone. {deleteOption === 'both' ? 'Chat and messages will be permanently deleted.' : deleteOption === 'messages' ? 'All messages will be permanently deleted.' : 'Chat will be removed from your list.'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isDeleting || (!chat && selectedChats.length === 0)}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors disabled:bg-red-500/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                <h3 className="text-white font-semibold">Confirm Delete</h3>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-white mb-2">
                Are you sure you want to delete {chat ? 'this chat' : `${selectedChats.length} chat(s)`}?
              </p>
              <p className="text-gray-400 text-sm">
                {deleteOption === 'both' ? 'This will permanently delete the chat and all messages.' : deleteOption === 'messages' ? 'This will permanently delete all messages in the chat.' : 'This will remove the chat from your list.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors disabled:bg-red-500/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

// Delete Button Component
export const DeleteButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
      title="Delete"
    >
      <Trash2 size={18} />
    </button>
  );
};

// Delete Settings Component
export const DeleteSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Trash2 size={18} className="text-red-500" />
            Chat Deletion
          </p>
          <p className="text-gray-400 text-sm">Delete chats and messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, chatDeletionEnabled: !settings.chatDeletionEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.chatDeletionEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.chatDeletionEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.chatDeletionEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-red-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Require confirmation</p>
              <p className="text-gray-400 text-xs">Ask before deleting</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, deleteConfirmation: !settings.deleteConfirmation })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.deleteConfirmation ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.deleteConfirmation ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-delete old chats</p>
              <p className="text-gray-400 text-xs">Remove inactive chats</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoDeleteOldChats: !settings.autoDeleteOldChats })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoDeleteOldChats ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoDeleteOldChats ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatDelete;
