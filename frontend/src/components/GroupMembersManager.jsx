import React, { useState, useMemo } from 'react';
import { X, UserPlus, UserMinus, Shield, Search, Users, Crown, Ban, MessageCircle } from 'lucide-react';

const GroupMembersManager = ({ conversation, onAddMember, onRemoveMember, onToggleRestrict, onToggleAdmin, currentUserId, onClose }) => {
  const [search, setSearch] = useState('');
  const [restrictMode, setRestrictMode] = useState(conversation?.adminOnlyMessaging || false);
  const members = conversation?.participants || [];
  const admins = conversation?.admins || [];
  const isCurrentUserAdmin = admins.some(id => String(id) === String(currentUserId));

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const name = m.username || m.name || m.phoneNumber || '';
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [members, search]);

  const handleToggleRestrict = () => {
    const next = !restrictMode;
    setRestrictMode(next);
    onToggleRestrict?.(next);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#1f2c33] rounded-xl w-96 p-4 shadow-2xl border border-white/10 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Users size={18} className="text-[#00a884]" /> Group Members ({members.length})
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-[#0b141a] rounded-lg px-3 py-2 border border-white/10 mb-3">
          <Search size={14} className="text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-500"
          />
        </div>

        {/* Restrict Messaging Toggle (Admin only) */}
        {isCurrentUserAdmin && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 mb-3">
            <div className="flex items-center gap-3">
              <MessageCircle size={18} className="text-yellow-400" />
              <div>
                <p className="text-white text-sm font-semibold">Restrict Messaging</p>
                <p className="text-gray-400 text-xs">Only admins can send messages</p>
              </div>
            </div>
            <button
              onClick={handleToggleRestrict}
              className={`relative w-10 h-5 rounded-full transition-colors ${restrictMode ? 'bg-[#00a884]' : 'bg-white/20'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${restrictMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        )}

        {/* Add Member Button (Admin only) */}
        {isCurrentUserAdmin && (
          <button
            onClick={() => onAddMember?.()}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#00a884]/20 border border-[#00a884]/30 text-[#00a884] hover:bg-[#00a884]/30 transition-colors mb-3"
          >
            <UserPlus size={18} />
            <span className="text-sm font-semibold">Add Member</span>
          </button>
        )}

        {/* Members List */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {filteredMembers.map(member => {
            const memberId = member._id || member.id || member;
            const name = member.username || member.name || member.phoneNumber || 'Unknown';
            const isAdmin = admins.some(id => String(id) === String(memberId));
            const isCurrentUser = String(memberId) === String(currentUserId);

            return (
              <div key={memberId} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate flex items-center gap-1">
                      {name}
                      {isAdmin && <Crown size={12} className="text-yellow-400 flex-shrink-0" />}
                    </p>
                    {member.phoneNumber && <p className="text-gray-500 text-xs truncate">{member.phoneNumber}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Toggle Admin (Admin only, not on self) */}
                  {isCurrentUserAdmin && !isCurrentUser && (
                    <button
                      onClick={() => onToggleAdmin?.(memberId, !isAdmin)}
                      className={`p-1.5 rounded-lg transition-colors ${isAdmin ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-gray-400 hover:bg-white/10'}`}
                      title={isAdmin ? 'Remove admin' : 'Make admin'}
                    >
                      <Shield size={14} />
                    </button>
                  )}

                  {/* Remove Member (Admin only, not on self) */}
                  {isCurrentUserAdmin && !isCurrentUser && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove ${name} from group?`)) {
                          onRemoveMember?.(memberId);
                        }
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Remove from group"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            <Ban size={32} className="mx-auto mb-2 opacity-40" />
            No members found
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMembersManager;
