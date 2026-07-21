import React, { useState } from 'react';
import { Users, X, Plus, Search, UserMinus, Crown, Shield, RefreshCw, Check, MoreVertical, UserPlus, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GroupMemberManagement = ({ group, members, contacts, onAddMember, onRemoveMember, onPromoteAdmin, onDemoteAdmin, onClose }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredMembers = members.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery)
  ).filter(contact => !members.some(m => m._id === contact._id));

  const handleToggleMember = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleToggleContact = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleAddMembers = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);

    selectedContacts.forEach(contactId => {
      onAddMember?.(group._id, contactId);
    });
    setSelectedContacts([]);
    setShowAddModal(false);
  };

  const handleRemoveMembers = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);

    selectedMembers.forEach(memberId => {
      onRemoveMember?.(group._id, memberId);
    });
    setSelectedMembers([]);
  };

  const admins = filteredMembers.filter(m => m.role === 'admin');
  const regularMembers = filteredMembers.filter(m => m.role === 'member');

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
              <h2 className="text-white text-xl font-semibold">Manage Members</h2>
              <p className="text-gray-400 text-sm">{members.length} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2 rounded-full text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
              title="Add members"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
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

        {/* Bulk Actions */}
        {selectedMembers.length > 0 && (
          <div className="p-4 bg-[#00a884]/10 border-b border-[#00a884]/20">
            <div className="flex items-center justify-between">
              <p className="text-[#00a884] text-sm">
                {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected
              </p>
              <button
                onClick={handleRemoveMembers}
                disabled={isProcessing}
                className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50 flex items-center gap-1"
              >
                <UserMinus size={14} />
                Remove
              </button>
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
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <MoreVertical size={18} />
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
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <MoreVertical size={18} />
                    </button>
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
      </div>

      {/* Add Members Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                    <UserPlus size={20} className="text-[#00a884]" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Add Members</h3>
                    <p className="text-gray-400 text-sm">{contacts.length} contacts available</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 border-b border-[#00a884]/20">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {filteredContacts.map(contact => (
                    <button
                      key={contact._id}
                      onClick={() => handleToggleContact(contact._id)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                        selectedContacts.includes(contact._id)
                          ? 'border-[#00a884] bg-[#00a884]/10'
                          : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center flex-shrink-0">
                        {contact.avatar ? (
                          <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Users size={20} className="text-[#00a884]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{contact.name}</p>
                        <p className="text-gray-400 text-xs">{contact.phone}</p>
                      </div>
                      {selectedContacts.includes(contact._id) && <Check size={18} className="text-[#00a884]" />}
                    </button>
                  ))}
                </div>

                {filteredContacts.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="text-gray-600 mx-auto mb-4" size={32} />
                    <p className="text-gray-400">No contacts found</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[#00a884]/20">
                <button
                  onClick={handleAddMembers}
                  disabled={isProcessing || selectedContacts.length === 0}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Add {selectedContacts.length} member{selectedContacts.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Member Management Button Component
export const MemberManagementButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Manage members"
    >
      <Users size={20} />
    </button>
  );
};

// Member Count Badge Component
export const MemberCountBadge = ({ count }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full text-xs"
    >
      <Users size={10} />
      <span>{count}</span>
    </motion.div>
  );
};

export default GroupMemberManagement;
