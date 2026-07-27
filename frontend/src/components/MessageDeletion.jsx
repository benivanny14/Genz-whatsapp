import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, Clock, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageDeletion = ({ message, onDelete, onUnsend, onClose }) => {
  const [deleteType, setDeleteType] = useState('for-me'); // 'for-me' or 'for-everyone'
  const [isDeleting, setIsDeleting] = useState(false);

  const canUnsend = () => {
    const now = Date.now();
    const diff = now - message.timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes < 10; // WhatsApp allows unsending within 10 minutes
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    // Simulate delete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (deleteType === 'for-everyone' && canUnsend()) {
      if (onUnsend) {
        onUnsend(message._id);
      }
    } else {
      if (onDelete) {
        onDelete(message._id);
      }
    }
    
    setIsDeleting(false);
    onClose();
  };

  const timeSinceSent = () => {
    const now = Date.now();
    const diff = now - message.timestamp;
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    return 'Over an hour ago';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#1a2e35] rounded-2xl p-6 shadow-xl border border-[#00a884]/30 max-w-md"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trash2 className="text-red-500" size={20} />
          <h3 className="text-white font-semibold">Delete Message</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Message Preview */}
        <div className="bg-[#0b141a] rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Message:</p>
          <p className="text-white text-sm line-clamp-2">{message.content}</p>
        </div>

        {/* Time Info */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock size={14} />
          <span>Sent {timeSinceSent()}</span>
        </div>

        {/* Warning for unsend */}
        {canUnsend() && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-yellow-500 text-xs">
                You can still unsend this message. This will remove it for everyone in the chat.
              </p>
            </div>
          </div>
        )}

        {/* Delete Options */}
        <div className="space-y-2">
          <button
            onClick={() => setDeleteType('for-me')}
            className={`w-full p-3 rounded-lg text-left transition-all ${
              deleteType === 'for-me'
                ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Delete for me</p>
                <p className="text-gray-400 text-xs">Remove message from your chat only</p>
              </div>
              {deleteType === 'for-me' && <Check size={18} className="text-[#00a884]" />}
            </div>
          </button>

          {canUnsend() && (
            <button
              onClick={() => setDeleteType('for-everyone')}
              className={`w-full p-3 rounded-lg text-left transition-all ${
                deleteType === 'for-everyone'
                  ? 'bg-red-500/20 border-2 border-red-500'
                  : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-red-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Delete for everyone</p>
                  <p className="text-gray-400 text-xs">Remove message for all participants</p>
                </div>
                {deleteType === 'for-everyone' && <Check size={18} className="text-red-500" />}
              </div>
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-[#0b141a] text-gray-400 py-2 rounded-lg hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              deleteType === 'for-everyone'
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-[#00a884] text-white hover:bg-[#008f72]'
            }`}
          >
            {isDeleting ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Delete Button Component
export const DeleteButton = ({ message, onDelete, onUnsend }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowDeleteModal(true)}
        className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
        title="Delete message"
      >
        <Trash2 size={16} />
      </button>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <MessageDeletion
              message={message}
              onDelete={(messageId) => {
                onDelete(messageId);
                setShowDeleteModal(false);
              }}
              onUnsend={(messageId) => {
                onUnsend(messageId);
                setShowDeleteModal(false);
              }}
              onClose={() => setShowDeleteModal(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Deleted Message Indicator Component
export const DeletedMessageIndicator = ({ deletedBy, deletedAt }) => {
  return (
    <div className="bg-[#0b141a] rounded-lg p-3 text-center">
      <p className="text-gray-500 text-sm italic">
        {deletedBy === 'me' ? 'You deleted this message' : 'This message was deleted'}
      </p>
      {deletedAt && (
        <p className="text-gray-600 text-xs mt-1">
          {new Date(deletedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
};

// Message Deletion Settings Component
export const MessageDeletionSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Trash2 size={18} className="text-[#00a884]" />
            Message Deletion
          </p>
          <p className="text-gray-400 text-sm">Delete sent messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, messageDeletionEnabled: !settings.messageDeletionEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.messageDeletionEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.messageDeletionEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.messageDeletionEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Allow unsend</p>
              <p className="text-gray-400 text-xs">Delete for everyone</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, allowUnsend: !settings.allowUnsend })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.allowUnsend ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.allowUnsend ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Unsend time limit</p>
            <select
              value={settings.unsendTimeLimit || '10min'}
              onChange={(e) => onUpdate({ ...settings, unsendTimeLimit: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="5min">5 minutes</option>
              <option value="10min">10 minutes</option>
              <option value="1hour">1 hour</option>
              <option value="24hours">24 hours</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show deleted indicator</p>
              <p className="text-gray-400 text-xs">Display "This message was deleted"</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showDeletedIndicator: !settings.showDeletedIndicator })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showDeletedIndicator ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showDeletedIndicator ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-delete old messages</p>
              <p className="text-gray-400 text-xs">Automatically delete messages after time</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoDeleteMessages: !settings.autoDeleteMessages })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoDeleteMessages ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoDeleteMessages ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {settings.autoDeleteMessages && (
            <div>
              <p className="text-white text-sm mb-2">Auto-delete after</p>
              <select
                value={settings.autoDeleteAfter || '30days'}
                onChange={(e) => onUpdate({ ...settings, autoDeleteAfter: e.target.value })}
                className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              >
                <option value="7days">7 days</option>
                <option value="30days">30 days</option>
                <option value="90days">90 days</option>
                <option value="1year">1 year</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageDeletion;
