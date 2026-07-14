import React, { useState } from 'react';
import { Crown, Shield, UserMinus, RefreshCw, X, Check, Users, Search, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GroupAdmin = ({ group, members, onPromoteAdmin, onDemoteAdmin, onRemoveMember, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredMembers = members.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const admins = filteredMembers.filter(m => m.role === 'admin');
  const regularMembers = filteredMembers.filter(m => m.role === 'member');

  const handleToggleMember = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handlePromoteAdmin = async (memberId) => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsProcessing(false);
    onPromoteAdmin?.(group._id, memberId);
  };

  const handleDemoteAdmin = async (memberId) => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsProcessing(false);
    onDemoteAdmin?.(group._id, memberId);
  };

  const handleBulkPromote = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);
    selectedMembers.forEach(memberId => onPromoteAdmin?.(group._id, memberId));
    setSelectedMembers([]);
  };

  const handleBulkDemote = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);
    selectedMembers.forEach(memberId => onDemoteAdmin?.(group._id, memberId));
    setSelectedMembers([]);
  };

  const handleRemoveMember = async (memberId) => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsProcessing(false);
    onRemoveMember?.(group._id, memberId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Crown size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Group Admins</h2>
              <p className="text-gray-400 text-sm">{group?.name || 'Group'}</p>
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

        {/* Bulk Actions */}
        {selectedMembers.length > 0 && (
          <div className="p-4 bg-[#00a884]/10 border-b border-[#00a884]/20">
            <div className="flex items-center justify-between">
              <p className="text-[#00a884] text-sm">
                {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkPromote}
                  disabled={isProcessing}
                  className="bg-[#00a884] text-white px-3 py-1 rounded-lg hover:bg-[#008f72] transition-colors text-sm disabled:opacity-50"
                >
                  Promote
                </button>
                <button
                  onClick={handleBulkDemote}
                  disabled={isProcessing}
                  className="bg-[#0b141a] text-white px-3 py-1 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm disabled:opacity-50"
                >
                  Demote
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Admins Section */}
          {admins.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Crown size={18} className="text-[#00a884]" />
                <p className="text-white font-medium">Admins ({admins.length})</p>
              </div>
              <div className="space-y-2">
                {admins.map(member => (
                  <div
                    key={member._id}
                    className="bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/20 flex items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member._id)}
                      onChange={() => handleToggleMember(member._id)}
                      className="w-4 h-4 rounded border-[#00a884]/30 bg-[#0b141a] text-[#00a884] focus:ring-[#00a884]"
                    />
                    <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center flex-shrink-0">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Users size={20} className="text-[#00a884]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium flex items-center gap-2">
                        {member.name}
                        <Crown size={12} className="text-[#00a884]" />
                      </p>
                      <p className="text-gray-400 text-xs">@{member.username}</p>
                    </div>
                    <button
                      onClick={() => handleDemoteAdmin(member._id)}
                      disabled={isProcessing}
                      className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Demote to member"
                    >
                      <Shield size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Members Section */}
          {regularMembers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users size={18} className="text-gray-400" />
                <p className="text-white font-medium">Members ({regularMembers.length})</p>
              </div>
              <div className="space-y-2">
                {regularMembers.map(member => (
                  <div
                    key={member._id}
                    className="bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/20 flex items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member._id)}
                      onChange={() => handleToggleMember(member._id)}
                      className="w-4 h-4 rounded border-[#00a884]/30 bg-[#0b141a] text-[#00a884] focus:ring-[#00a884]"
                    />
                    <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center flex-shrink-0">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Users size={20} className="text-[#00a884]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{member.name}</p>
                      <p className="text-gray-400 text-xs">@{member.username}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handlePromoteAdmin(member._id)}
                        disabled={isProcessing}
                        className="text-gray-400 hover:text-[#00a884] transition-colors disabled:opacity-50"
                        title="Promote to admin"
                      >
                        <Crown size={18} />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member._id)}
                        disabled={isProcessing}
                        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Remove from group"
                      >
                        <UserMinus size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredMembers.length === 0 && (
            <div className="text-center py-8">
              <Users className="text-gray-600 mx-auto mb-4" size={32} />
              <p className="text-gray-400">No members found</p>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="p-4 border-t border-[#00a884]/20 bg-yellow-500/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-yellow-500 text-xs">
              Admins can add/remove members, change group settings, and manage other admins.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Group Admin Button Component
export const GroupAdminButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Manage admins"
    >
      <Crown size={20} />
    </button>
  );
};

// Admin Badge Component
export const AdminBadge = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full text-xs"
    >
      <Crown size={10} />
      <span>Admin</span>
    </motion.div>
  );
};

export default GroupAdmin;
