import React, { useState, useEffect } from 'react';
import { Search, MapPin, Hash, TrendingUp, Flame, Star, CheckCircle, X, Filter, Grid, List as ListIcon } from 'lucide-react';

const Explore = () => {
  const [activeTab, setActiveTab] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const tabs = [
    { id: 'trending', icon: TrendingUp, label: 'Trending' },
    { id: 'foryou', icon: Flame, label: 'For You' },
    { id: 'nearby', icon: MapPin, label: 'Nearby' },
    { id: 'creators', icon: Star, label: 'Creators' }
  ];

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'status', label: 'Status' },
    { id: 'image', label: 'Images' },
    { id: 'video', label: 'Videos' },
    { id: 'music', label: 'Music' }
  ];

  // Mock data for trending content
  const trendingContent = [
    { id: 1, type: 'video', thumbnail: '', user: { username: 'creator1', verified: true }, views: '1.2M', likes: '45K' },
    { id: 2, type: 'image', thumbnail: '', user: { username: 'creator2', verified: false }, views: '890K', likes: '32K' },
    { id: 3, type: 'status', thumbnail: '', user: { username: 'creator3', verified: true }, views: '750K', likes: '28K' },
    { id: 4, type: 'video', thumbnail: '', user: { username: 'creator4', verified: false }, views: '620K', likes: '25K' },
    { id: 5, type: 'image', thumbnail: '', user: { username: 'creator5', verified: true }, views: '580K', likes: '22K' },
    { id: 6, type: 'video', thumbnail: '', user: { username: 'creator6', verified: false }, views: '510K', likes: '19K' }
  ];

  // Mock data for creators
  const creators = [
    { id: 1, username: 'top_creator', name: 'Top Creator', verified: true, followers: '2.5M', avatar: '' },
    { id: 2, username: 'influencer_x', name: 'Influencer X', verified: true, followers: '1.8M', avatar: '' },
    { id: 3, username: 'artist_pro', name: 'Artist Pro', verified: false, followers: '950K', avatar: '' },
    { id: 4, username: 'music_star', name: 'Music Star', verified: true, followers: '1.2M', avatar: '' },
    { id: 5, username: 'comedy_king', name: 'Comedy King', verified: false, followers: '890K', avatar: '' }
  ];

  // Mock data for nearby content
  const nearbyContent = [
    { id: 1, type: 'status', location: 'Dar es Salaam', distance: '2.5 km', user: { username: 'local_user1' } },
    { id: 2, type: 'image', location: 'Dar es Salaam', distance: '3.1 km', user: { username: 'local_user2' } },
    { id: 3, type: 'video', location: 'Dar es Salaam', distance: '4.2 km', user: { username: 'local_user3' } }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'trending':
      case 'foryou':
        return (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
            {trendingContent.map((item) => (
              <div key={item.id} className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-colors">
                <div className="aspect-square bg-gradient-to-br from-[#00a884]/20 to-[#075E54]/20 flex items-center justify-center">
                  <span className="text-white/40 text-4xl">{item.type === 'video' ? '🎬' : item.type === 'image' ? '📷' : '📱'}</span>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-medium text-sm">@{item.user.username}</span>
                    {item.user.verified && <CheckCircle size={14} className="text-[#00a884]" />}
                  </div>
                  <div className="flex items-center gap-4 text-white/60 text-xs">
                    <span>{item.views} views</span>
                    <span>{item.likes} likes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'nearby':
        return (
          <div className="space-y-4">
            {nearbyContent.map((item) => (
              <div key={item.id} className="bg-white/5 rounded-xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors">
                <div className="w-20 h-20 bg-gradient-to-br from-[#00a884]/20 to-[#075E54]/20 rounded-lg flex items-center justify-center">
                  <span className="text-white/40 text-2xl">{item.type === 'video' ? '🎬' : item.type === 'image' ? '📷' : '📱'}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">@{item.user.username}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <MapPin size={14} />
                    <span>{item.location}</span>
                    <span>•</span>
                    <span>{item.distance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'creators':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators.map((creator) => (
              <div key={creator.id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00a884] to-[#075E54] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{creator.name[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">@{creator.username}</span>
                      {creator.verified && <CheckCircle size={14} className="text-[#00a884]" />}
                    </div>
                    <span className="text-white/60 text-sm">{creator.name}</span>
                  </div>
                </div>
                <div className="text-white/60 text-sm mb-3">
                  {creator.followers} followers
                </div>
                <button className="w-full px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white text-sm font-medium">
                  Follow
                </button>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b141a]">
      {/* Header */}
      <div className="bg-[#1a2e35] p-4 sticky top-0 z-10 border-b border-white/10">
        <h1 className="text-white text-2xl font-bold mb-4">Explore</h1>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
          <input
            type="text"
            placeholder="Search by hashtag, location, or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 text-white pl-10 pr-4 py-3 rounded-xl outline-none placeholder-white/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#00a884] text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filters & View Mode */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedFilter === filter.id
                    ? 'bg-[#00a884] text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#00a884] text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#00a884] text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <ListIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default Explore;
