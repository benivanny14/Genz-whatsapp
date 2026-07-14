import React, { useState } from 'react';
import { Smile, X, Check, RefreshCw, Plus, Trash2, Upload, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomEmojis = ({ emojis, onCreateEmoji, onDeleteEmoji, onClose }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmoji, setNewEmoji] = useState({
    name: '',
    emoji: '',
    category: 'custom'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const filteredEmojis = emojis.filter(emoji =>
    emoji.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emoji.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateEmoji = async () => {
    if (!newEmoji.name || !newEmoji.emoji) return;

    setIsCreating(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsCreating(false);

    const emoji = {
      id: Date.now(),
      ...newEmoji,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    onCreateEmoji?.(emoji);
    setNewEmoji({ name: '', emoji: '', category: 'custom' });
    setShowCreateModal(false);
  };

  const handleDeleteEmoji = (emojiId) => {
    onDeleteEmoji?.(emojiId);
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
              <Smile size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Custom Emojis</h2>
              <p className="text-gray-400 text-sm">{emojis.length} emojis</p>
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
              placeholder="Search emojis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Emojis Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-4 gap-3">
            {filteredEmojis.map(emoji => (
              <motion.div
                key={emoji._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/20 hover:border-[#00a884]/50 transition-colors relative group"
              >
                <div className="text-3xl mb-1">{emoji.emoji}</div>
                <p className="text-white text-xs truncate">{emoji.name}</p>
                <button
                  onClick={() => handleDeleteEmoji(emoji._id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X size={12} />
                </button>
                <div className="text-gray-500 text-xs mt-1">{emoji.usageCount || 0} uses</div>
              </motion.div>
            ))}
          </div>

          {filteredEmojis.length === 0 && (
            <div className="text-center py-12">
              <Smile className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No custom emojis found</p>
            </div>
          )}
        </div>

        {/* Add Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Add Custom Emoji
          </button>
        </div>
      </div>

      {/* Create Modal */}
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
                <h3 className="text-white font-semibold">Add Custom Emoji</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Emoji</p>
                  <input
                    type="text"
                    placeholder="🎉"
                    value={newEmoji.emoji}
                    onChange={(e) => setNewEmoji({ ...newEmoji, emoji: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-2xl text-center"
                  />
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Name</p>
                  <input
                    type="text"
                    placeholder="Party"
                    value={newEmoji.name}
                    onChange={(e) => setNewEmoji({ ...newEmoji, name: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Category</p>
                  <select
                    value={newEmoji.category}
                    onChange={(e) => setNewEmoji({ ...newEmoji, category: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  >
                    <option value="custom">Custom</option>
                    <option value="reactions">Reactions</option>
                    <option value="fun">Fun</option>
                    <option value="work">Work</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleCreateEmoji}
                disabled={isCreating || !newEmoji.name || !newEmoji.emoji}
                className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Adding...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Add Emoji
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

// Custom Emoji Picker Component
export const CustomEmojiPicker = ({ emojis, onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmojis = emojis.filter(emoji =>
    emoji.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#1a2e35] rounded-2xl w-80 max-h-96 overflow-hidden shadow-xl"
    >
      <div className="p-3 border-b border-[#00a884]/20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0b141a] text-white pl-9 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
          />
        </div>
      </div>

      <div className="p-3 grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
        {filteredEmojis.map(emoji => (
          <button
            key={emoji._id}
            onClick={() => onSelect?.(emoji)}
            className="text-2xl hover:bg-[#00a884]/20 rounded-lg p-2 transition-colors"
            title={emoji.name}
          >
            {emoji.emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

// Custom Emoji Button Component
export const CustomEmojiButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Custom emojis"
    >
      <Smile size={18} />
    </button>
  );
};

export default CustomEmojis;
