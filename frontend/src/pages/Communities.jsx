import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, MoreVertical, ChevronRight, Shield, Globe, Lock, Settings, ArrowLeft } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const Communities = () => {
  const navigate = useNavigate();
  const { user } = useChat();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    description: '',
    icon: '',
    isPublic: true
  });

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/communities', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCommunities(data.communities || []);
      }
    } catch (error) {
      console.error('Failed to fetch communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommunity = async () => {
    try {
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newCommunity)
      });
      const data = await response.json();
      if (data.success) {
        setCommunities([...communities, data.community]);
        setShowCreateModal(false);
        setNewCommunity({ name: '', description: '', icon: '', isPublic: true });
      }
    } catch (error) {
      console.error('Failed to create community:', error);
    }
  };

  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-[#111b21] flex flex-col">
      {/* Header */}
      <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-[#2a3942] rounded-lg transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-[#aebac1]" />
          </button>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00a884]" />
            <h1 className="text-xl font-semibold text-white">Communities</h1>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-2 hover:bg-[#2a3942] rounded-lg transition-colors"
          title="Create Community"
          aria-label="Create Community"
        >
          <Plus className="w-5 h-5 text-[#00a884]" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 bg-[#202c33] border-b border-[#2a3942]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#2a3942] border border-[#374045] rounded-lg text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
          />
        </div>
      </div>

      {/* Communities List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a884]"></div>
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#8696a0]">
            <Users className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">No communities yet</p>
            <p className="text-sm mt-2">Create a community to connect multiple groups</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a3942]">
            {filteredCommunities.map((community) => (
              <div
                key={community._id}
                onClick={() => navigate(`/communities/${community._id}`)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#2a3942] cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 bg-[#00a884] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {community.icon || community.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#e9edef] font-medium truncate">{community.name}</h3>
                  <p className="text-[#8696a0] text-sm truncate">{community.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {community.isPublic ? (
                      <Globe className="w-3 h-3 text-[#00a884]" />
                    ) : (
                      <Lock className="w-3 h-3 text-[#8696a0]" />
                    )}
                    <span className="text-[#8696a0] text-xs">
                      {community.groups?.length || 0} groups · {community.members?.length || 0} members
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#8696a0]" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#202c33] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Create Community</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-[#2a3942] rounded-lg transition-colors"
                aria-label="Close"
              >
                <MoreVertical className="w-5 h-5 text-[#aebac1]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#aebac1] mb-2">Community Name</label>
                <input
                  type="text"
                  value={newCommunity.name}
                  onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                  placeholder="e.g., Family, Work, School"
                  className="w-full px-4 py-2 bg-[#2a3942] border border-[#374045] rounded-lg text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#aebac1] mb-2">Description</label>
                <textarea
                  value={newCommunity.description}
                  onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                  placeholder="What is this community about?"
                  rows={3}
                  className="w-full px-4 py-2 bg-[#2a3942] border border-[#374045] rounded-lg text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#aebac1] mb-2">Icon (Optional)</label>
                <input
                  type="text"
                  value={newCommunity.icon}
                  onChange={(e) => setNewCommunity({ ...newCommunity, icon: e.target.value })}
                  placeholder="Emoji or icon"
                  className="w-full px-4 py-2 bg-[#2a3942] border border-[#374045] rounded-lg text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {newCommunity.isPublic ? (
                    <Globe className="w-4 h-4 text-[#00a884]" />
                  ) : (
                    <Lock className="w-4 h-4 text-[#8696a0]" />
                  )}
                  <span className="text-[#e9edef] text-sm">
                    {newCommunity.isPublic ? 'Public Community' : 'Private Community'}
                  </span>
                </div>
                <button
                  onClick={() => setNewCommunity({ ...newCommunity, isPublic: !newCommunity.isPublic })}
                  className="px-3 py-1 bg-[#00a884] text-white text-sm rounded-lg hover:bg-[#029b7a] transition-colors"
                >
                  {newCommunity.isPublic ? 'Make Private' : 'Make Public'}
                </button>
              </div>

              <button
                onClick={handleCreateCommunity}
                disabled={!newCommunity.name}
                className="w-full py-3 bg-[#00a884] text-white font-medium rounded-lg hover:bg-[#029b7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Community
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Communities;
