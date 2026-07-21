import React, { useState } from 'react';
import { MessageSquare, Plus, X, Edit, Trash2, Send, Zap, Clock, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QuickReplies = ({ replies, onCreateReply, onUpdateReply, onDeleteReply, onUseReply, onClose }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReply, setEditingReply] = useState(null);
  const [newReply, setNewReply] = useState({
    title: '',
    message: '',
    shortcut: ''
  });
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReplies = replies.filter(reply =>
    reply.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reply.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reply.shortcut?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateReply = () => {
    if (!newReply.title || !newReply.message) return;

    const reply = {
      id: Date.now(),
      ...newReply,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    onCreateReply(reply);
    setNewReply({ title: '', message: '', shortcut: '' });
    setShowCreateModal(false);
  };

  const handleEditReply = (reply) => {
    setEditingReply(reply);
    setNewReply({
      title: reply.title,
      message: reply.message,
      shortcut: reply.shortcut
    });
    setShowCreateModal(true);
  };

  const handleUpdateReply = () => {
    const updatedReply = {
      ...editingReply,
      ...newReply
    };

    onUpdateReply(updatedReply);
    setEditingReply(null);
    setNewReply({ title: '', message: '', shortcut: '' });
    setShowCreateModal(false);
  };

  const handleUseReply = (reply) => {
    if (onUseReply) {
      onUseReply(reply);
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
              <Zap size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Quick Replies</h2>
              <p className="text-gray-400 text-sm">{replies.length} saved replies</p>
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
              placeholder="Search replies..."
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Replies List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {filteredReplies.map(reply => (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{reply.title}</h3>
                      {reply.shortcut && (
                        <span className="bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded text-xs">
                          /{reply.shortcut}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm line-clamp-2">{reply.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{reply.usageCount} uses</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleUseReply(reply)}
                      className="bg-[#00a884] text-white p-2 rounded-lg hover:bg-[#008f72] transition-colors"
                      title="Use reply"
                    >
                      <Send size={16} />
                    </button>
                    <button
                      onClick={() => handleEditReply(reply)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteReply(reply.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredReplies.length === 0 && (
            <div className="text-center py-12">
              <Zap className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">
                {searchQuery ? 'No replies found' : 'No quick replies yet'}
              </p>
            </div>
          )}
        </div>

        {/* Add Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={() => {
              setEditingReply(null);
              setNewReply({ title: '', message: '', shortcut: '' });
              setShowCreateModal(true);
            }}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Reply
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-semibold">
                  {editingReply ? 'Edit Reply' : 'Add Reply'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingReply(null);
                    setNewReply({ title: '', message: '', shortcut: '' });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Title</label>
                  <input
                    type="text"
                    value={newReply.title}
                    onChange={(e) => setNewReply({ ...newReply, title: e.target.value })}
                    placeholder="e.g., Greeting, Thanks, Busy"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Message</label>
                  <textarea
                    value={newReply.message}
                    onChange={(e) => setNewReply({ ...newReply, message: e.target.value })}
                    placeholder="The message to send..."
                    rows={3}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Shortcut (optional)</label>
                  <div className="flex items-center">
                    <span className="bg-[#00a884]/20 text-[#00a884] px-3 py-2 rounded-l-lg">/</span>
                    <input
                      type="text"
                      value={newReply.shortcut}
                      onChange={(e) => setNewReply({ ...newReply, shortcut: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                      placeholder="e.g., hi, thanks"
                      className="flex-1 bg-[#0b141a] text-white px-4 py-2 rounded-r-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Type / followed by your shortcut to use this reply</p>
                </div>

                <button
                  onClick={editingReply ? handleUpdateReply : handleCreateReply}
                  disabled={!newReply.title || !newReply.message}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {editingReply ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Quick Reply Suggestion Component
export const QuickReplySuggestion = ({ replies, onSelect, input }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  useEffect(() => {
    if (!input.startsWith('/')) {
      setShowSuggestions(false);
      return;
    }

    const shortcut = input.substring(1).toLowerCase();
    const matches = replies.filter(reply => 
      reply.shortcut?.toLowerCase().startsWith(shortcut)
    );

    setFilteredSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [input, replies]);

  if (!showSuggestions || filteredSuggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a2e35] rounded-lg shadow-xl border border-[#00a884]/30 max-h-48 overflow-y-auto">
      {filteredSuggestions.map(reply => (
        <button
          key={reply.id}
          onClick={() => onSelect(reply)}
          className="w-full text-left p-3 hover:bg-[#00a884]/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[#00a884]">/{reply.shortcut}</span>
            <span className="text-white text-sm">{reply.title}</span>
          </div>
          <p className="text-gray-400 text-xs line-clamp-1">{reply.message}</p>
        </button>
      ))}
    </div>
  );
};

// Quick Replies Settings Component
export const QuickRepliesSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Zap size={18} className="text-[#00a884]" />
            Quick Replies
          </p>
          <p className="text-gray-400 text-sm">Save and reuse messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, quickRepliesEnabled: !settings.quickRepliesEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.quickRepliesEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.quickRepliesEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.quickRepliesEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-suggest</p>
              <p className="text-gray-400 text-xs">Show suggestions while typing</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoSuggestReplies: !settings.autoSuggestReplies })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoSuggestReplies ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoSuggestReplies ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Track usage</p>
              <p className="text-gray-400 text-xs">Count reply usage</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, trackReplyUsage: !settings.trackReplyUsage })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.trackReplyUsage ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.trackReplyUsage ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Max replies</p>
            <select
              value={settings.maxQuickReplies || '20'}
              onChange={(e) => onUpdate({ ...settings, maxQuickReplies: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="10">10 replies</option>
              <option value="20">20 replies</option>
              <option value="50">50 replies</option>
              <option value="100">100 replies</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Quick Reply Button Component
export const QuickReplyButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Quick replies"
    >
      <Zap size={18} />
    </button>
  );
};

export default QuickReplies;
