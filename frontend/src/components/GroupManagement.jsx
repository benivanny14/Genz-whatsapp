import React, { useState } from 'react';
import { Users, Plus, X, Edit, Trash2, Crown, Shield, UserMinus, Search, Settings, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GroupManagement = ({ group, members, onUpdateGroup, onAddMember, onRemoveMember, onPromoteAdmin, onDemoteAdmin, onClose }) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const filteredMembers = members.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.phone?.includes(searchQuery)
  );

  const handleAddMembers = () => {
    selectedMembers.forEach(memberId => {
      onAddMember(group._id, memberId);
    });
    setSelectedMembers([]);
    setShowAddMember(false);
  };

  const handleToggleMember = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const admins = members.filter(m => m.role === 'admin');
  const regularMembers = members.filter(m => m.role === 'member');

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
              <Users size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Group Info</h2>
              <p className="text-gray-400 text-sm">{group.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Group Details */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {group.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg">{group.name}</h3>
              <p className="text-gray-400 text-sm">{members.length} members</p>
              <p className="text-gray-500 text-xs">Created {new Date(group.createdAt).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-[#00a884]/10 transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Admins */}
            {admins.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs font-medium mb-2">GROUP ADMINS</p>
                <div className="space-y-2">
                  {admins.map(member => (
                    <motion.div
                      key={member._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-[#0b141a] rounded-lg p-3 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {member.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{member.name}</p>
                          <Crown size={14} className="text-yellow-500" />
                        </div>
                        <p className="text-gray-400 text-xs">{member.phone}</p>
                      </div>
                      <button
                        onClick={() => onDemoteAdmin(group._id, member._id)}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Remove admin"
                      >
                        <Shield size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Members */}
            <div>
              <p className="text-gray-400 text-xs font-medium mb-2">MEMBERS</p>
              <div className="space-y-2">
                {regularMembers.map(member => (
                  <motion.div
                    key={member._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#0b141a] rounded-lg p-3 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {member.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{member.name}</p>
                      <p className="text-gray-400 text-xs">{member.phone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onPromoteAdmin(group._id, member._id)}
                        className="text-gray-400 hover:text-yellow-500 transition-colors"
                        title="Make admin"
                      >
                        <Shield size={16} />
                      </button>
                      <button
                        onClick={() => onRemoveMember(group._id, member._id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove member"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-8">
              <Users className="text-gray-600 mx-auto mb-2" size={32} />
              <p className="text-gray-400 text-sm">No members found</p>
            </div>
          )}
        </div>

        {/* Add Member Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={() => setShowAddMember(true)}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Members
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-semibold">Add Members</h3>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setSelectedMembers([]);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-3">
                {filteredMembers.map(member => (
                  <button
                    key={member._id}
                    onClick={() => handleToggleMember(member._id)}
                    className={`w-full p-3 rounded-lg text-left transition-all flex items-center gap-3 ${
                      selectedMembers.includes(member._id)
                        ? 'bg-[#00a884]/20 border border-[#00a884]'
                        : 'bg-[#0b141a] border border-[#00a884]/30 hover:border-[#00a884]'
                    }`}
                  >
                    <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {member.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{member.name}</p>
                      <p className="text-gray-400 text-xs">{member.phone}</p>
                    </div>
                    {selectedMembers.includes(member._id) && (
                      <Check size={18} className="text-[#00a884]" />
                    )}
                  </button>
                ))}

                {selectedMembers.length > 0 && (
                  <button
                    onClick={handleAddMembers}
                    className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors"
                  >
                    Add {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-semibold">Group Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Group Name</label>
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) => onUpdateGroup(group._id, { name: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Description</label>
                  <textarea
                    value={group.description || ''}
                    onChange={(e) => onUpdateGroup(group._id, { description: e.target.value })}
                    placeholder="Group description..."
                    rows={3}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                  />
                </div>

                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Group Settings Component
export const GroupSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Users size={18} className="text-[#00a884]" />
            Group Management
          </p>
          <p className="text-gray-400 text-sm">Manage group settings</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, groupManagementEnabled: !settings.groupManagementEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.groupManagementEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.groupManagementEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.groupManagementEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Admin approval</p>
              <p className="text-gray-400 text-xs">Require admin to add members</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, adminApproval: !settings.adminApproval })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.adminApproval ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.adminApproval ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Only admins can send</p>
              <p className="text-gray-400 text-xs">Restrict messaging to admins</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, onlyAdminsSend: !settings.onlyAdminsSend })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.onlyAdminsSend ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.onlyAdminsSend ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Max group size</p>
            <select
              value={settings.maxGroupSize || '256'}
              onChange={(e) => onUpdate({ ...settings, maxGroupSize: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="50">50 members</option>
              <option value="100">100 members</option>
              <option value="256">256 members</option>
              <option value="512">512 members</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Group Info Card Component
export const GroupInfoCard = ({ group, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 cursor-pointer hover:border-[#00a884] transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center">
          <span className="text-white text-xl font-bold">
            {group.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold">{group.name}</h3>
          <p className="text-gray-400 text-sm">{group.memberCount || 0} members</p>
        </div>
        <ChevronRight className="text-gray-400" size={20} />
      </div>
    </motion.div>
  );
};

export default GroupManagement;
