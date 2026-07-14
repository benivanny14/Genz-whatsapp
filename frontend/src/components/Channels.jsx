import React, { useState } from 'react';
import { Radio, Plus, X, Edit, Trash2, Users, Search, Check, Bell, Lock, Globe, TrendingUp, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Channels = ({ channels, onCreateChannel, onUpdateChannel, onDeleteChannel, onJoinChannel, onLeaveChannel, onClose }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [newChannel, setNewChannel] = useState({
    name: '',
    description: '',
    category: '',
    isPrivate: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = ['all', 'news', 'entertainment', 'sports', 'technology', 'education', 'business'];

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         channel.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || channel.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateChannel = () => {
    if (!newChannel.name) return;

    const channel = {
      id: Date.now(),
      ...newChannel,
      createdAt: new Date().toISOString(),
      subscribers: 0,
      isJoined: false
    };

    onCreateChannel(channel);
    setNewChannel({ name: '', description: '', category: '', isPrivate: false });
    setShowCreateModal(false);
  };

  const handleEditChannel = (channel) => {
    setEditingChannel(channel);
    setNewChannel({
      name: channel.name,
      description: channel.description,
      category: channel.category,
      isPrivate: channel.isPrivate
    });
    setShowCreateModal(true);
  };

  const handleUpdateChannel = () => {
    const updatedChannel = {
      ...editingChannel,
      ...newChannel
    };

    onUpdateChannel(updatedChannel);
    setEditingChannel(null);
    setNewChannel({ name: '', description: '', category: '', isPrivate: false });
    setShowCreateModal(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Radio size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Channels</h2>
              <p className="text-gray-400 text-sm">{channels.length} channels</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#008f72] transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Create
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels..."
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`px-3 py-1 rounded-lg text-sm capitalize transition-all ${
                  filterCategory === category
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#0b141a] text-gray-400 hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {filteredChannels.map(channel => (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-[#00a884]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Radio size={32} className="text-[#00a884]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{channel.name}</h3>
                      {channel.isPrivate && <Lock size={14} className="text-gray-400" />}
                      {channel.isTrending && <TrendingUp size={14} className="text-[#00a884]" />}
                      {channel.isFeatured && <Star size={14} className="text-yellow-500" />}
                    </div>
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">{channel.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        <span>{channel.subscribers} subscribers</span>
                      </div>
                      <span className="capitalize">{channel.category}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {channel.isJoined ? (
                      <button
                        onClick={() => onLeaveChannel?.(channel.id)}
                        className="text-red-500 hover:text-red-400 transition-colors text-sm"
                      >
                        Leave
                      </button>
                    ) : (
                      <button
                        onClick={() => onJoinChannel?.(channel.id)}
                        className="bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#008f72] transition-colors text-sm"
                      >
                        Join
                      </button>
                    )}
                    {channel.isOwner && (
                      <button
                        onClick={() => handleEditChannel(channel)}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredChannels.length === 0 && (
            <div className="text-center py-12">
              <Radio className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">
                {searchQuery ? 'No channels found' : 'No channels available'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-xl font-semibold">
                  {editingChannel ? 'Edit Channel' : 'Create Channel'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingChannel(null);
                    setNewChannel({ name: '', description: '', category: '', isPrivate: false });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Channel Name</label>
                  <input
                    type="text"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                    placeholder="Enter channel name"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Description</label>
                  <textarea
                    value={newChannel.description}
                    onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                    placeholder="Describe your channel"
                    rows={3}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Category</label>
                  <select
                    value={newChannel.category}
                    onChange={(e) => setNewChannel({ ...newChannel, category: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  >
                    <option value="">Select category</option>
                    <option value="news">News</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="sports">Sports</option>
                    <option value="technology">Technology</option>
                    <option value="education">Education</option>
                    <option value="business">Business</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-gray-400" />
                    <span className="text-white text-sm">Private Channel</span>
                  </div>
                  <button
                    onClick={() => setNewChannel({ ...newChannel, isPrivate: !newChannel.isPrivate })}
                    className={`w-12 h-6 rounded-full transition-all ${
                      newChannel.isPrivate ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-all ${
                        newChannel.isPrivate ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={editingChannel ? handleUpdateChannel : handleCreateChannel}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors"
                >
                  {editingChannel ? 'Update Channel' : 'Create Channel'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Channel Settings Component
export const ChannelSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Radio size={18} className="text-[#00a884]" />
            Channels
          </p>
          <p className="text-gray-400 text-sm">Follow channels</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, channelsEnabled: !settings.channelsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.channelsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.channelsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.channelsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Channel notifications</p>
              <p className="text-gray-400 text-xs">Get notified of updates</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, channelNotifications: !settings.channelNotifications })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.channelNotifications ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.channelNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show suggested channels</p>
              <p className="text-gray-400 text-xs">Discover new channels</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showSuggestedChannels: !settings.showSuggestedChannels })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showSuggestedChannels ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showSuggestedChannels ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Channel Button Component
export const ChannelButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Channels"
    >
      <Radio size={18} />
    </button>
  );
};

// Channel Card Component
export const ChannelCard = ({ channel, onJoin, onLeave, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 cursor-pointer hover:border-[#00a884] transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-[#00a884]/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Radio size={28} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold">{channel.name}</h3>
            {channel.isPrivate && <Lock size={12} className="text-gray-400" />}
          </div>
          <p className="text-gray-400 text-sm line-clamp-1">{channel.description}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            <Users size={12} />
            <span>{channel.subscribers}</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            channel.isJoined ? onLeave?.(channel.id) : onJoin?.(channel.id);
          }}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            channel.isJoined
              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
              : 'bg-[#00a884] text-white hover:bg-[#008f72]'
          }`}
        >
          {channel.isJoined ? 'Leave' : 'Join'}
        </button>
      </div>
    </motion.div>
  );
};

// Suggested Channels Component
export const SuggestedChannels = ({ channels, onJoin }) => {
  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={18} className="text-[#00a884]" />
        <span className="text-white font-medium">Suggested Channels</span>
      </div>
      <div className="space-y-2">
        {channels.slice(0, 3).map(channel => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onJoin={onJoin}
          />
        ))}
      </div>
    </div>
  );
};

export default Channels;
