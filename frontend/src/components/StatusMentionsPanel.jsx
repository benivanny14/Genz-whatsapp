import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, AtSign, UserPlus, Search, CheckCircle, XCircle } from 'lucide-react';

const StatusMentionsPanel = ({ onClose, status, onMentionsAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const mockUsers = [
    { id: 1, username: 'john_doe', name: 'John Doe', avatar: 'JD' },
    { id: 2, username: 'jane_smith', name: 'Jane Smith', avatar: 'JS' },
    { id: 3, username: 'mike_wilson', name: 'Mike Wilson', avatar: 'MW' },
    { id: 4, username: 'sarah_jones', name: 'Sarah Jones', avatar: 'SJ' },
    { id: 5, username: 'alex_brown', name: 'Alex Brown', avatar: 'AB' },
    { id: 6, username: 'emily_davis', name: 'Emily Davis', avatar: 'ED' },
    { id: 7, username: 'chris_miller', name: 'Chris Miller', avatar: 'CM' },
    { id: 8, username: 'lisa_anderson', name: 'Lisa Anderson', avatar: 'LA' }
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAllUsers(data.users || mockUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      // Fallback to mock users
      setAllUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectUser = (user) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/mentions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mentions: selectedUsers.map(u => u.id)
        })
      });

      if (onMentionsAdd) {
        onMentionsAdd(selectedUsers);
      }
      onClose();
    } catch (error) {
      console.error('Error adding mentions:', error);
      alert('Failed to add mentions. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <AtSign className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Mentions</h2>
              <p className="text-white/60 text-xs">Tag users in this status</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-white/10 text-white pl-10 pr-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <p className="text-white/60 text-xs mb-2 uppercase">Selected ({selectedUsers.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-[#00a884]/20 border border-[#00a884] rounded-full px-3 py-1 flex items-center gap-2"
                  >
                    <span className="text-white text-sm">@{user.username}</span>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      className="text-white/60 hover:text-white"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User List */}
          <div>
            <p className="text-white/60 text-xs mb-2 uppercase">All Users</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.find(u => u.id === user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    disabled={isSelected}
                    className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                      isSelected
                        ? 'bg-[#00a884]/20 border border-[#00a884] opacity-50'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                      <span className="text-[#00a884] font-medium">{user.avatar}</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-white/60 text-sm">@{user.username}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="text-[#00a884]" size={18} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Suggested Users */}
          {!searchQuery && selectedUsers.length === 0 && (
            <div>
              <p className="text-white/60 text-xs mb-2 uppercase">Suggested</p>
              <div className="space-y-2">
                {allUsers.slice(0, 3).map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full p-3 rounded-lg flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                      <span className="text-[#00a884] font-medium">{user.avatar}</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-white/60 text-sm">@{user.username}</p>
                    </div>
                    <UserPlus size={16} className="text-[#00a884]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleConfirm}
            disabled={selectedUsers.length === 0}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Add Mentions ({selectedUsers.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusMentionsPanel;
