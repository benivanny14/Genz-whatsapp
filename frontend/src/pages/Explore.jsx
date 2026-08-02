import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Hash, TrendingUp, Flame, Star, CheckCircle, X, Filter, Grid, List as ListIcon, RefreshCw, Users } from 'lucide-react';
import exploreService from '../services/exploreService';

const Explore = () => {
  const [activeTab, setActiveTab] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [trending, setTrending] = useState([]);
  const [forYou, setForYou] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await exploreService.getExplore();
        if (!active) return;
        setTrending(data.trending || []);
        setForYou(data.forYou || []);
        setNearby(data.nearby || []);
        setCreators(data.creators || []);
      } catch (err) {
        if (active) setError('Failed to load explore data. Pull to refresh.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          setLocationError('Location access denied. Using default location.');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      setLocationError('Geolocation not supported by this browser.');
    }
  }, []);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const searchable = useMemo(() => {
    return { trending, forYou, nearby, creators };
  }, [trending, forYou, nearby, creators]);

  const filteredTrending = useMemo(() => {
    let items = activeTab === 'foryou' ? forYou : trending;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) =>
        (item.username || '').toLowerCase().includes(query) ||
        (item.caption || '').toLowerCase().includes(query) ||
        (item.hashtags || []).some((t) => t.toLowerCase().includes(query))
      );
    }
    if (selectedFilter !== 'all') {
      items = items.filter((item) => item.type === selectedFilter);
    }
    return items;
  }, [activeTab, forYou, trending, searchQuery, selectedFilter]);

  const filteredNearby = useMemo(() => {
    let items = nearby;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) =>
        (item.user?.username || '').toLowerCase().includes(query) ||
        (item.location || '').toLowerCase().includes(query)
      );
    }
    if (selectedFilter !== 'all') {
      items = items.filter((item) => item.type === selectedFilter);
    }
    if (userLocation) {
      items = items.map((item) => ({
        ...item,
        calculatedDistance: calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng)
      })).sort((a, b) => a.calculatedDistance - b.calculatedDistance);
    }
    return items;
  }, [nearby, searchQuery, selectedFilter, userLocation]);

  const filteredCreators = useMemo(() => {
    if (!searchQuery.trim()) return creators;
    const query = searchQuery.toLowerCase();
    return creators.filter((creator) =>
      creator.username.toLowerCase().includes(query) ||
      creator.name.toLowerCase().includes(query)
    );
  }, [searchQuery, creators]);

  const formatCount = (n) => {
    const num = Number(n) || 0;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
  };

  const contentIcon = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'video' || t === 'livePhoto' || t === 'boomerang') return '🎬';
    if (t === 'image' || t === 'collage') return '📷';
    if (t === 'music' || t === 'audio' || t === 'voice') return '🎵';
    return '📱';
  };

  const renderContent = () => {
    if (activeTab === 'creators') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCreators.length === 0 ? (
            <div className="col-span-full text-center py-12 text-white/40">
              <Star size={48} className="mx-auto mb-4" />
              <p>No creators found matching your search</p>
            </div>
          ) : (
            filteredCreators.map((creator) => (
              <div key={creator.id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00a884] to-[#075E54] rounded-full flex items-center justify-center overflow-hidden">
                    {creator.avatar ? (
                      <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold">{creator.name[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">@{creator.username}</span>
                      {creator.verified && <CheckCircle size={14} className="text-[#00a884] flex-shrink-0" />}
                    </div>
                    <span className="text-white/60 text-sm block truncate">{creator.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-white/60 text-sm mb-3">
                  <Users size={14} />
                  <span>{formatCount(creator.followers)} followers</span>
                </div>
                {creator.description && <p className="text-white/50 text-sm mb-3 line-clamp-2">{creator.description}</p>}
                <button className="w-full px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white text-sm font-medium">
                  Follow
                </button>
              </div>
            ))
          )}
        </div>
      );
    }

    if (activeTab === 'nearby') {
      return (
        <div className="space-y-4">
          {locationError && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-400 text-sm">
              {locationError}
            </div>
          )}
          {filteredNearby.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <MapPin size={48} className="mx-auto mb-4" />
              <p>No nearby content found</p>
            </div>
          ) : (
            filteredNearby.map((item) => (
              <div key={item.id} className="bg-white/5 rounded-xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors">
                <div className="w-20 h-20 bg-gradient-to-br from-[#00a884]/20 to-[#075E54]/20 rounded-lg flex items-center justify-center">
                  <span className="text-white/40 text-2xl">{contentIcon(item.type)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">@{item.user?.username}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <MapPin size={14} />
                    <span>{item.location}</span>
                    {item.calculatedDistance != null && (
                      <>
                        <span>•</span>
                        <span>{item.calculatedDistance.toFixed(1)} km</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      );
    }

    // trending / foryou
    return (
      <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
        {filteredTrending.length === 0 ? (
          <div className="col-span-full text-center py-12 text-white/40">
            <Search size={48} className="mx-auto mb-4" />
            <p>No content found matching your search</p>
          </div>
        ) : (
          filteredTrending.map((item) => (
            <div key={item.id} className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-colors">
              {item.mediaUrl ? (
                <div className="aspect-square bg-black flex items-center justify-center overflow-hidden">
                  {item.type === 'video' ? (
                    <video src={item.mediaUrl} className="w-full h-full object-cover" muted loop preload="metadata" />
                  ) : (
                    <img src={item.mediaUrl} alt={item.caption} className="w-full h-full object-cover" />
                  )}
                </div>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-[#00a884]/20 to-[#075E54]/20 flex items-center justify-center">
                  <span className="text-white/40 text-4xl">{contentIcon(item.type)}</span>
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-medium text-sm truncate">@{item.username}</span>
                  {item.verified && <CheckCircle size={14} className="text-[#00a884] flex-shrink-0" />}
                </div>
                {item.caption && <p className="text-white/60 text-xs mb-2 line-clamp-2">{item.caption}</p>}
                <div className="flex items-center gap-4 text-white/60 text-xs">
                  <span>{formatCount(item.views)} views</span>
                  <span>{formatCount(item.likes)} likes</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0b141a]">
      {/* Header */}
      <div className="bg-[#1a2e35] p-4 sticky top-0 z-10 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-2xl font-bold">Explore</h1>
          {loading ? (
            <RefreshCw size={20} className="animate-spin text-[#00a884]" />
          ) : (
            <button
              onClick={() => {
                setLoading(true);
                exploreService.getExplore().then((data) => {
                  setTrending(data.trending || []);
                  setForYou(data.forYou || []);
                  setNearby(data.nearby || []);
                  setCreators(data.creators || []);
                }).catch(() => setError('Failed to refresh.')).finally(() => setLoading(false));
              }}
              className="text-[#00a884] hover:text-white transition-colors"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw size={20} />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

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
