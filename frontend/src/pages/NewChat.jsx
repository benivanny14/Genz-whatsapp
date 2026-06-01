import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatAPI } from '../services/api';
import { ArrowLeft, Search, UserPlus } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const NewChat = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const handleSelectUser = async (userId) => {
    try {
      const response = await chatAPI.getOrCreateConversation(userId);
      selectConversation(response.data.conversation);
      navigate('/chat');
    } catch (error) {
      console.error('Failed to create conversation:', error);
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
        <h1 className="text-xl font-semibold text-white">New Chat</h1>
      </header>

      <div className="p-4">
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

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : users.length > 0 ? (
          <div className="space-y-2">
            {(users || []).map((user) => (
              <button
                key={user._id}
                onClick={() => handleSelectUser(user._id)}
                className="w-full flex items-center gap-3 p-3 bg-dark-surface hover:bg-dark-hover rounded-lg transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center overflow-hidden">
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
                  <h3 className="text-dark-text font-medium">{user.username}</h3>
                  <p className="text-sm text-dark-textSecondary">{user.bio || 'Hey there! I am using GENZ WhatsApp'}</p>
                </div>
                <button className="p-2 hover:bg-dark-bg rounded-lg">
                  <UserPlus className="w-5 h-5 text-primary-500" />
                </button>
              </button>
            ))}
          </div>
        ) : searchQuery.trim().length >= 2 ? (
          <div className="text-center py-8">
            <p className="text-dark-textSecondary">No users found</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-dark-textSecondary">Search for users to start a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewChat;
