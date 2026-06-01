import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatAPI } from '../services/api';
import { ArrowLeft, Search, Users, Check } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const NewGroup = () => {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const { selectConversation } = useChat();

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length >= 2) {
        setLoading(true);
        try {
          const response = await chatAPI.searchUsers(searchQuery);
          setUsers(response.data.users);
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setUsers([]);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const toggleUser = (user) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u._id === user._id);
      if (exists) {
        return prev.filter((u) => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length < 2) {
      alert('Please select at least 2 participants');
      return;
    }

    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    setCreating(true);
    try {
      const participantIds = (selectedUsers || []).map((u) => u._id);
      const response = await chatAPI.createGroup({
        name: groupName,
        description: groupDescription,
        participants: participantIds,
      });
      selectConversation(response.data.conversation);
      navigate('/chat');
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-screen bg-dark-bg flex flex-col">
      <header className="bg-dark-surface border-b border-dark-border px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-dark-text" />
        </button>
        <h1 className="text-xl font-semibold text-white">New Group</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-3 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary-500"
              placeholder="Enter group name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              Group Description (optional)
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              className="w-full px-4 py-3 bg-dark-surface border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary-500 h-24 resize-none"
              placeholder="Enter group description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-textSecondary mb-2">
              Add Participants ({selectedUsers.length})
            </label>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-textSecondary" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-dark-surface border border-dark-border rounded-lg text-dark-text placeholder-dark-textSecondary focus:outline-none focus:border-primary-500"
              />
            </div>

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {(selectedUsers || []).map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-2 bg-primary-600 text-white px-3 py-1 rounded-full"
                  >
                    <span className="text-sm">{user.username}</span>
                    <button
                      onClick={() => toggleUser(user)}
                      className="hover:bg-primary-700 rounded-full p-0.5"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : users.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(users || []).map((user) => {
                  const isSelected = selectedUsers.find((u) => u._id === user._id);
                  return (
                    <button
                      key={user._id}
                      onClick={() => toggleUser(user)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isSelected ? 'bg-primary-600' : 'bg-dark-surface hover:bg-dark-hover'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-600/50 flex items-center justify-center overflow-hidden">
                        {user.profilePicture ? (
                          <img
                            src={user.profilePicture}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <h3
                          className={`font-medium ${
                            isSelected ? 'text-white' : 'text-dark-text'
                          }`}
                        >
                          {user.username}
                        </h3>
                        <p
                          className={`text-sm ${
                            isSelected ? 'text-white/70' : 'text-dark-textSecondary'
                          }`}
                        >
                          {user.bio || 'Hey there!'}
                        </p>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-white" />}
                    </button>
                  );
                })}
              </div>
            ) : searchQuery.trim().length >= 2 ? (
              <div className="text-center py-8">
                <p className="text-dark-textSecondary">No users found</p>
              </div>
            ) : null}
          </div>

          <button
            onClick={handleCreateGroup}
            disabled={creating || selectedUsers.length < 2 || !groupName.trim()}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Users className="w-5 h-5" />
            {creating ? 'Creating Group...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewGroup;
