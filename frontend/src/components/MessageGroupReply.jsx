import React, { useState } from 'react';
import { Users, X, Check, RefreshCw, Send, User, Search, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageGroupReply = ({ message, groupMembers, onGroupReply, onClose }) => {
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  const filteredMembers = groupMembers.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMember = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSendGroupReply = async () => {
    if (!replyText.trim() || selectedMembers.length === 0) return;

    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSending(false);

    if (onGroupReply) {
      onGroupReply({
        messageId: message._id,
        content: replyText,
        recipients: selectedMembers,
        timestamp: new Date().toISOString()
      });
    }
    setReplyText('');
    setSelectedMembers([]);
    onClose();
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
              <Users size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Group Reply</h2>
              <p className="text-gray-400 text-sm">Reply to specific members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/20">
            <p className="text-gray-400 text-xs mb-1">Replying to:</p>
            <p className="text-white text-sm line-clamp-2">{message.content}</p>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredMembers.map(member => (
              <button
                key={member._id}
                onClick={() => toggleMember(member._id)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                  selectedMembers.includes(member._id)
                    ? 'border-[#00a884] bg-[#00a884]/10'
                    : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center flex-shrink-0">
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User size={20} className="text-[#00a884]" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{member.name}</p>
                  <p className="text-gray-400 text-xs">@{member.username}</p>
                </div>
                {selectedMembers.includes(member._id) && <Check size={18} className="text-[#00a884]" />}
              </button>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-8">
              <Users className="text-gray-600 mx-auto mb-4" size={32} />
              <p className="text-gray-400">No members found</p>
            </div>
          )}
        </div>

        {/* Selected Count */}
        {selectedMembers.length > 0 && (
          <div className="p-4 border-t border-[#00a884]/20 bg-[#00a884]/10">
            <p className="text-[#00a884] text-sm">
              {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected
            </p>
          </div>
        )}

        {/* Reply Input */}
        <div className="p-4 border-t border-[#00a884]/20">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
            rows={3}
          />
        </div>

        {/* Warning */}
        {selectedMembers.length === 0 && replyText && (
          <div className="px-4 pb-2">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
                <p className="text-yellow-500 text-xs">
                  Please select at least one member to send the reply to
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Send Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleSendGroupReply}
            disabled={isSending || !replyText.trim() || selectedMembers.length === 0}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Sending...
              </>
            ) : (
              <>
                <Send size={18} />
                Send Group Reply
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Group Reply Button Component
export const GroupReplyButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Group reply"
    >
      <Users size={18} />
    </button>
  );
};

// Group Reply Indicator Component
export const GroupReplyIndicator = ({ recipients }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full text-xs"
    >
      <Users size={10} />
      <span>Group reply ({recipients.length})</span>
    </motion.div>
  );
};

// Group Reply Settings Component
export const GroupReplySettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Users size={18} className="text-[#00a884]" />
            Group Replies
          </p>
          <p className="text-gray-400 text-sm">Reply to specific group members</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, groupReplyEnabled: !settings.groupReplyEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.groupReplyEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.groupReplyEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.groupReplyEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show group reply indicators</p>
              <p className="text-gray-400 text-xs">Display reply badges</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showGroupReplyIndicators: !settings.showGroupReplyIndicators })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showGroupReplyIndicators ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showGroupReplyIndicators ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageGroupReply;
