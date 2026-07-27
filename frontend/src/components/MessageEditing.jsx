import React, { useState } from 'react';
import { Edit3, X, Save, Clock, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageEditor = ({ message, onEdit, onCancel }) => {
  const [editedContent, setEditedContent] = useState(message.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editedContent.trim() || editedContent === message.content) return;

    setIsSaving(true);
    
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (onEdit) {
      onEdit(message._id, editedContent);
    }
    
    setIsSaving(false);
    onCancel();
  };

  const timeSinceSent = () => {
    const now = Date.now();
    const diff = now - message.timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 15) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return 'Over a day ago';
  };

  const canEdit = () => {
    const now = Date.now();
    const diff = now - message.timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes < 15; // WhatsApp allows editing within 15 minutes
  };

  if (!canEdit()) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#1a2e35] rounded-2xl p-6 shadow-xl border border-red-500/30 max-w-md"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="text-white font-semibold mb-2">Cannot Edit Message</h3>
            <p className="text-gray-400 text-sm">
              Messages can only be edited within 15 minutes of sending.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Sent: {timeSinceSent()}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="mt-4 w-full bg-[#0b141a] text-white py-2 rounded-lg hover:bg-[#1a2e35] transition-colors"
        >
          Close
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#1a2e35] rounded-2xl p-6 shadow-xl border border-[#00a884]/30 max-w-md"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Edit3 className="text-[#00a884]" size={20} />
          <h3 className="text-white font-semibold">Edit Message</h3>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Original Message</label>
          <div className="bg-[#0b141a] rounded-lg p-3 text-gray-400 text-sm">
            {message.content}
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm mb-2 block">Edited Message</label>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="Edit your message..."
            rows={4}
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock size={14} />
          <span>Time remaining: {15 - Math.floor((Date.now() - message.timestamp) / (1000 * 60))} minutes</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#0b141a] text-gray-400 py-2 rounded-lg hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!editedContent.trim() || editedContent === message.content || isSaving}
            className="flex-1 bg-[#00a884] text-white py-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Clock className="animate-spin" size={16} />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Edit Button Component
export const EditButton = ({ message, onEdit }) => {
  const [showEditor, setShowEditor] = useState(false);

  const canEdit = () => {
    const now = Date.now();
    const diff = now - message.timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes < 15;
  };

  if (!canEdit()) return null;

  return (
    <>
      <button
        onClick={() => setShowEditor(true)}
        className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
        title="Edit message"
      >
        <Edit3 size={16} />
      </button>

      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <MessageEditor
              message={message}
              onEdit={(messageId, content) => {
                onEdit(messageId, content);
                setShowEditor(false);
              }}
              onCancel={() => setShowEditor(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Edited Message Indicator Component
export const EditedIndicator = ({ editedAt }) => {
  return (
    <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
      <Edit3 size={10} />
      <span>Edited {new Date(editedAt).toLocaleTimeString()}</span>
    </div>
  );
};

// Message Editing Settings Component
export const MessageEditingSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Edit3 size={18} className="text-[#00a884]" />
            Message Editing
          </p>
          <p className="text-gray-400 text-sm">Allow editing sent messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, messageEditingEnabled: !settings.messageEditingEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.messageEditingEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.messageEditingEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.messageEditingEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show edit indicator</p>
              <p className="text-gray-400 text-xs">Display "Edited" label</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showEditIndicator: !settings.showEditIndicator })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showEditIndicator ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showEditIndicator ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Edit time limit</p>
            <select
              value={settings.editTimeLimit || '15min'}
              onChange={(e) => onUpdate({ ...settings, editTimeLimit: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="5min">5 minutes</option>
              <option value="15min">15 minutes</option>
              <option value="1hour">1 hour</option>
              <option value="24hours">24 hours</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show edit history</p>
              <p className="text-gray-400 text-xs">Allow viewing previous versions</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showEditHistory: !settings.showEditHistory })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showEditHistory ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showEditHistory ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Edit History Component
export const EditHistory = ({ message, onClose }) => {
  const [selectedVersion, setSelectedVersion] = useState(null);

  if (!message.editHistory || message.editHistory.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#1a2e35] rounded-2xl p-6 shadow-xl border border-[#00a884]/30 max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Edit History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-400 text-sm">No edit history available</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#1a2e35] rounded-2xl p-6 shadow-xl border border-[#00a884]/30 max-w-md"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Edit History</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {message.editHistory.map((version, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedVersion === index
                ? 'border-[#00a884] bg-[#00a884]/20'
                : 'border-[#00a884]/30 hover:border-[#00a884]'
            }`}
            onClick={() => setSelectedVersion(index)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs">
                {index === 0 ? 'Original' : `Version ${index}`}
              </span>
              <span className="text-gray-500 text-xs">
                {new Date(version.timestamp).toLocaleString()}
              </span>
            </div>
            <p className="text-white text-sm">{version.content}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[#00a884]/20">
        <button
          onClick={onClose}
          className="w-full bg-[#0b141a] text-white py-2 rounded-lg hover:bg-[#1a2e35] transition-colors"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
};

export default MessageEditor;
