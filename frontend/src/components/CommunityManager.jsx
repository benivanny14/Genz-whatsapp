import React, { useState, useEffect } from 'react';
import { Users, Plus, Settings, Lock, Globe, Search, Bell, ChevronRight, X, Info, Shield, UserPlus, Hash, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CommunityManager = ({ onClose, onCreateCommunity, onJoinCommunity }) => {
  const [activeTab, setActiveTab] = useState('my-communities');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [communities, setCommunities] = useState([
    {
      id: 1,
      name: 'Tech Enthusiasts',
      description: 'Discuss technology trends and innovations',
      icon: '💻',
      memberCount: 1250,
      groupCount: 15,
      isPublic: true,
      isJoined: true
    },
    {
      id: 2,
      name: 'Fitness Goals',
      description: 'Share fitness tips and motivation',
      icon: '💪',
      memberCount: 890,
      groupCount: 8,
      isPublic: true,
      isJoined: false
    }
  ]);

  const [newCommunity, setNewCommunity] = useState({
    name: '',
    description: '',
    icon: '🎯',
    isPublic: true
  });

  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCommunity = () => {
    if (!newCommunity.name.trim()) return;

    const community = {
      id: Date.now(),
      ...newCommunity,
      memberCount: 1,
      groupCount: 0,
      isJoined: true
    };

    setCommunities([...communities, community]);
    onCreateCommunity(community);
    setShowCreateModal(false);
    setNewCommunity({ name: '', description: '', icon: '🎯', isPublic: true });
  };

  const handleJoinCommunity = (communityId) => {
    setCommunities(communities.map(c =>
      c.id === communityId ? { ...c, isJoined: true, memberCount: c.memberCount + 1 } : c
    ));
    onJoinCommunity(communityId);
  };

  const handleLeaveCommunity = (communityId) => {
    setCommunities(communities.map(c =>
      c.id === communityId ? { ...c, isJoined: false, memberCount: c.memberCount - 1 } : c
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Users className="text-[#00a884]" size={24} />
            <h2 className="text-white text-xl font-semibold">Communities</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#00a884]/20">
          <button
            onClick={() => setActiveTab('my-communities')}
            className={`flex-1 py-3 px-4 font-medium transition-all ${
              activeTab === 'my-communities'
                ? 'text-[#00a884] border-b-2 border-[#00a884]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Communities
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-3 px-4 font-medium transition-all ${
              activeTab === 'discover'
                ? 'text-[#00a884] border-b-2 border-[#00a884]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 px-4 font-medium transition-all ${
              activeTab === 'create'
                ? 'text-[#00a884] border-b-2 border-[#00a884]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Create
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* My Communities Tab */}
          {activeTab === 'my-communities' && (
            <div className="space-y-3">
              {filteredCommunities.filter(c => c.isJoined).map(community => (
                <motion.div
                  key={community.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0b141a] rounded-lg p-4 hover:bg-[#1a2e35] transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-[#00a884]/20 rounded-lg flex items-center justify-center text-3xl">
                      {community.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{community.name}</h3>
                        {community.isPublic ? (
                          <Globe size={16} className="text-gray-400" />
                        ) : (
                          <Lock size={16} className="text-gray-400" />
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{community.description}</p>
                      <div className="flex items-center gap-4 text-gray-500 text-xs">
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {community.memberCount} members
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash size={14} />
                          {community.groupCount} groups
                        </span>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <Settings size={20} />
                    </button>
                  </div>
                </motion.div>
              ))}

              {filteredCommunities.filter(c => c.isJoined).length === 0 && (
                <div className="text-center py-12">
                  <Users className="text-gray-600 mx-auto mb-4" size={48} />
                  <p className="text-gray-400">No communities yet</p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="mt-4 text-[#00a884] hover:underline"
                  >
                    Discover communities
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Discover Tab */}
          {activeTab === 'discover' && (
            <div className="space-y-3">
              {filteredCommunities.filter(c => !c.isJoined).map(community => (
                <motion.div
                  key={community.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0b141a] rounded-lg p-4 hover:bg-[#1a2e35] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-[#00a884]/20 rounded-lg flex items-center justify-center text-3xl">
                      {community.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{community.name}</h3>
                        {community.isPublic ? (
                          <Globe size={16} className="text-gray-400" />
                        ) : (
                          <Lock size={16} className="text-gray-400" />
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{community.description}</p>
                      <div className="flex items-center gap-4 text-gray-500 text-xs mb-3">
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {community.memberCount} members
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash size={14} />
                          {community.groupCount} groups
                        </span>
                      </div>
                      <button
                        onClick={() => handleJoinCommunity(community.id)}
                        className="bg-[#00a884] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#008f72] transition-colors flex items-center gap-2"
                      >
                        <UserPlus size={16} />
                        Join Community
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}

              {filteredCommunities.filter(c => !c.isJoined).length === 0 && (
                <div className="text-center py-12">
                  <Search className="text-gray-600 mx-auto mb-4" size={48} />
                  <p className="text-gray-400">No communities found</p>
                </div>
              )}
            </div>
          )}

          {/* Create Tab */}
          {activeTab === 'create' && (
            <div className="max-w-md mx-auto">
              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Community Name</label>
                  <input
                    type="text"
                    value={newCommunity.name}
                    onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                    placeholder="Enter community name"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Description</label>
                  <textarea
                    value={newCommunity.description}
                    onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                    placeholder="Describe your community"
                    rows={3}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Icon</label>
                  <div className="flex gap-2 flex-wrap">
                    {['🎯', '💻', '💪', '🎮', '📚', '🎵', '🎨', '🔬'].map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setNewCommunity({ ...newCommunity, icon })}
                        className={`w-12 h-12 rounded-lg text-2xl transition-all ${
                          newCommunity.icon === icon
                            ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                            : 'bg-[#0b141a] border-2 border-transparent hover:border-[#00a884]/50'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Public Community</p>
                    <p className="text-gray-400 text-sm">Anyone can find and join</p>
                  </div>
                  <button
                    onClick={() => setNewCommunity({ ...newCommunity, isPublic: !newCommunity.isPublic })}
                    className={`w-12 h-6 rounded-full transition-all ${
                      newCommunity.isPublic ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-all ${
                        newCommunity.isPublic ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={handleCreateCommunity}
                  disabled={!newCommunity.name.trim()}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Create Community
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Community Group Component
export const CommunityGroup = ({ community, onGroupClick }) => {
  const [groups, setGroups] = useState([
    { id: 1, name: 'General Discussion', memberCount: 850, unreadCount: 5 },
    { id: 2, name: 'Announcements', memberCount: 1250, unreadCount: 2 },
    { id: 3, name: 'Resources', memberCount: 420, unreadCount: 0 },
  ]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-12 h-12 bg-[#00a884]/20 rounded-lg flex items-center justify-center text-2xl">
          {community.icon}
        </div>
        <div>
          <h3 className="text-white font-semibold">{community.name}</h3>
          <p className="text-gray-400 text-xs">{community.memberCount} members</p>
        </div>
      </div>

      {groups.map(group => (
        <button
          key={group.id}
          onClick={() => onGroupClick(group)}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#00a884]/10 transition-colors text-left"
        >
          <Hash size={18} className="text-gray-400" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">{group.name}</p>
            <p className="text-gray-500 text-xs">{group.memberCount} members</p>
          </div>
          {group.unreadCount > 0 && (
            <div className="bg-[#00a884] text-white text-xs px-2 py-1 rounded-full">
              {group.unreadCount}
            </div>
          )}
          <ChevronRight size={16} className="text-gray-400" />
        </button>
      ))}

      <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#00a884]/10 transition-colors text-left text-[#00a884]">
        <Plus size={18} />
        <span className="text-sm font-medium">Create Group</span>
      </button>
    </div>
  );
};

export default CommunityManager;
