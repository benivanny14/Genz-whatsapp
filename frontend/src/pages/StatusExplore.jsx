import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Flame, Globe, MapPin, Hash, Users, Clock, Heart, MessageCircle, Share2, ArrowLeft, Filter, Sparkles } from 'lucide-react';
import StatusReel from '../components/StatusReel';

const StatusExplore = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [exploreStatuses, setExploreStatuses] = useState([]);
  const [trendingStatuses, setTrendingStatuses] = useState([]);
  const [nearbyStatuses, setNearbyStatuses] = useState([]);
  const [hashtagStatuses, setHashtagStatuses] = useState([]);
  const [selectedHashtag, setSelectedHashtag] = useState('');

  const categories = [
    { id: 'all', label: 'All', icon: Globe },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'nearby', label: 'Nearby', icon: MapPin },
    { id: 'hashtags', label: 'Hashtags', icon: Hash },
    { id: 'creators', label: 'Creators', icon: Sparkles }
  ];

  const trendingHashtags = [
    { id: 1, tag: '#viral', count: '1.2M' },
    { id: 2, tag: '#trending', count: '890K' },
    { id: 3, tag: '#fyp', count: '750K' },
    { id: 4, tag: '#explore', count: '620K' },
    { id: 5, tag: '#status', count: '580K' }
  ];

  const featuredCreators = [
    { id: 1, username: '@creator1', followers: '2.5M', avatar: '🎨' },
    { id: 2, username: '@influencer2', followers: '1.8M', avatar: '🎭' },
    { id: 3, username: '@artist3', followers: '1.2M', avatar: '🎵' },
    { id: 4, username: '@maker4', followers: '950K', avatar: '🎬' }
  ];

  useEffect(() => {
    // Load explore data
    loadExploreData();
  }, [activeTab, searchQuery, selectedCategory]);

  const loadExploreData = async () => {
    try {
      // Simulate API calls - in production, these would be real API calls
      if (activeTab === 'trending') {
        setTrendingStatuses(generateMockStatuses(20));
      } else if (activeTab === 'nearby') {
        setNearbyStatuses(generateMockStatuses(15));
      } else if (activeTab === 'hashtags' && selectedHashtag) {
        setHashtagStatuses(generateMockStatuses(10));
      }
    } catch (error) {
      console.error('Error loading explore data:', error);
    }
  };

  const generateMockStatuses = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      _id: `explore-${i}`,
      userId: `user-${i}`,
      username: `user${i}`,
      type: ['image', 'video'][Math.floor(Math.random() * 2)],
      mediaUrl: `https://picsum.photos/400/700?random=${i}`,
      caption: `Explore status #${i}`,
      likes: Math.floor(Math.random() * 10000),
      views: Math.floor(Math.random() * 100000),
      timestamp: new Date(Date.now() - Math.random() * 86400000)
    }));
  };

  const handleHashtagClick = (tag) => {
    setSelectedHashtag(tag);
    setActiveTab('hashtags');
  };

  return (
    <div className="min-h-screen bg-[#0b141a]">
      {/* Header */}
      <div className="bg-[#1a2e35] p-4 flex items-center gap-3 border-b border-[#00a884]/20 sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-white text-lg font-semibold">Explore Status</h1>
          <p className="text-white/60 text-xs">Discover trending and nearby status updates</p>
        </div>
        <button className="text-white">
          <Filter size={24} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search status, hashtags, or users..."
            className="w-full bg-white/10 text-white pl-10 pr-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => {
                  setActiveTab(category.id);
                  setSelectedCategory(category.id);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeTab === category.id
                    ? 'bg-[#00a884] text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <Icon size={16} />
                <span className="text-sm font-medium">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="px-4 pb-4">
        {activeTab === 'trending' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="text-[#00a884]" size={20} />
              <h2 className="text-white font-semibold">Trending Now</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {trendingStatuses.map((status) => (
                <div
                  key={status._id}
                  onClick={() => {/* Open status viewer */}}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group"
                >
                  <img
                    src={status.mediaUrl}
                    alt={status.caption}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs font-medium truncate">{status.caption}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-white/80 text-xs">
                        <Heart size={12} />
                        <span>{formatNumber(status.likes)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/80 text-xs">
                        <Users size={12} />
                        <span>{formatNumber(status.views)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-[#00a884] rounded-full px-2 py-1">
                    <span className="text-white text-xs font-bold">#{Math.floor(Math.random() * 10) + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'nearby' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="text-[#00a884]" size={20} />
              <h2 className="text-white font-semibold">Nearby Status</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {nearbyStatuses.map((status) => (
                <div
                  key={status._id}
                  onClick={() => {/* Open status viewer */}}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group"
                >
                  <img
                    src={status.mediaUrl}
                    alt={status.caption}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs font-medium truncate">{status.caption}</p>
                    <div className="flex items-center gap-1 text-white/60 text-xs mt-1">
                      <MapPin size={10} />
                      <span>{Math.floor(Math.random() * 50) + 1} km away</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'hashtags' && (
          <div>
            {!selectedHashtag ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Hash className="text-[#00a884]" size={20} />
                  <h2 className="text-white font-semibold">Trending Hashtags</h2>
                </div>
                <div className="space-y-3">
                  {trendingHashtags.map((hashtag) => (
                    <button
                      key={hashtag.id}
                      onClick={() => handleHashtagClick(hashtag.tag)}
                      className="w-full bg-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                          <Hash className="text-[#00a884]" size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-white font-medium">{hashtag.tag}</p>
                          <p className="text-white/60 text-xs">{hashtag.count} posts</p>
                        </div>
                      </div>
                      <Heart className="text-white/40" size={20} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setSelectedHashtag('')}
                    className="text-white/60 hover:text-white"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <Hash className="text-[#00a884]" size={20} />
                  <h2 className="text-white font-semibold">{selectedHashtag}</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {hashtagStatuses.map((status) => (
                    <div
                      key={status._id}
                      onClick={() => {/* Open status viewer */}}
                      className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer"
                    >
                      <img
                        src={status.mediaUrl}
                        alt={status.caption}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-xs font-medium truncate">{status.caption}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'creators' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-[#00a884]" size={20} />
              <h2 className="text-white font-semibold">Featured Creators</h2>
            </div>
            <div className="space-y-3">
              {featuredCreators.map((creator) => (
                <div
                  key={creator.id}
                  className="bg-white/5 rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="w-14 h-14 bg-[#00a884]/20 rounded-full flex items-center justify-center text-3xl">
                    {creator.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{creator.username}</p>
                    <p className="text-white/60 text-xs">{creator.followers} followers</p>
                  </div>
                  <button className="px-4 py-2 bg-[#00a884] rounded-lg text-white text-sm font-medium hover:bg-[#008f6f]">
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export default StatusExplore;
