import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Hash, TrendingUp, Plus, XCircle, Search, CheckCircle } from 'lucide-react';

const StatusHashtagsPanel = ({ onClose, status, onHashtagsAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const [customHashtag, setCustomHashtag] = useState('');
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [loading, setLoading] = useState(false);

  const mockTrendingHashtags = [
    { id: 1, tag: '#viral', count: 50000 },
    { id: 2, tag: '#trending', count: 45000 },
    { id: 3, tag: '#fyp', count: 40000 },
    { id: 4, tag: '#status', count: 30000 },
    { id: 6, tag: '#genz', count: 25000 },
    { id: 7, tag: '#whatsapp', count: 20000 },
    { id: 8, tag: '#mood', count: 15000 },
    { id: 9, tag: '#lifestyle', count: 12000 },
    { id: 10, tag: '#funny', count: 10000 }
  ];

  useEffect(() => {
    loadTrendingHashtags();
  }, []);

  const loadTrendingHashtags = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${resolveApiBase()}/status-advanced/hashtags/trending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setTrendingHashtags(data.hashtags || mockTrendingHashtags);
      }
    } catch (error) {
      console.error('Error loading trending hashtags:', error);
      // Fallback to mock hashtags
      setTrendingHashtags(mockTrendingHashtags);
    } finally {
      setLoading(false);
    }
  };

  const filteredHashtags = trendingHashtags.filter(ht =>
    ht.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddHashtag = (tag) => {
    const hashtag = tag.startsWith('#') ? tag : `#${tag}`;
    if (!selectedHashtags.includes(hashtag)) {
      setSelectedHashtags([...selectedHashtags, hashtag]);
    }
  };

  const handleRemoveHashtag = (hashtag) => {
    setSelectedHashtags(selectedHashtags.filter(h => h !== hashtag));
  };

  const handleAddCustomHashtag = () => {
    if (!customHashtag.trim()) return;
    handleAddHashtag(customHashtag);
    setCustomHashtag('');
  };

  const handleConfirm = async () => {
    try {
      const token = getAuthToken();
      await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/hashtags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          hashtags: selectedHashtags
        })
      });

      if (onHashtagsAdd) {
        onHashtagsAdd(selectedHashtags);
      }
      onClose();
    } catch (error) {
      console.error('Error adding hashtags:', error);
      alert('Failed to add hashtags. Please try again.');
    }
  };

  const formatCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Hash className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Hashtags</h2>
              <p className="text-white/60 text-xs">Add hashtags to your status</p>
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
              placeholder="Search hashtags..."
              className="w-full bg-white/10 text-white pl-10 pr-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Custom Hashtag */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customHashtag}
              onChange={(e) => setCustomHashtag(e.target.value)}
              placeholder="Add custom hashtag..."
              className="flex-1 bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
            <button
              onClick={handleAddCustomHashtag}
              disabled={!customHashtag.trim()}
              className="px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-xl text-white disabled:opacity-50"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Selected Hashtags */}
          {selectedHashtags.length > 0 && (
            <div>
              <p className="text-white/60 text-xs mb-2 uppercase">Selected ({selectedHashtags.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedHashtags.map((hashtag) => (
                  <div
                    key={hashtag}
                    className="bg-[#00a884]/20 border border-[#00a884] rounded-full px-3 py-1 flex items-center gap-2"
                  >
                    <span className="text-white text-sm">{hashtag}</span>
                    <button
                      onClick={() => handleRemoveHashtag(hashtag)}
                      className="text-white/60 hover:text-white"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Hashtags */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-[#00a884]" size={16} />
              <p className="text-white/60 text-xs uppercase">Trending</p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredHashtags.map((hashtag) => {
                const isSelected = selectedHashtags.includes(hashtag.tag);
                return (
                  <button
                    key={hashtag.id}
                    onClick={() => handleAddHashtag(hashtag.tag)}
                    disabled={isSelected}
                    className={`w-full p-3 rounded-lg flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#00a884]/20 border border-[#00a884] opacity-50'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Hash size={16} className={isSelected ? 'text-[#00a884]' : 'text-white/60'} />
                      <span className="text-white font-medium">{hashtag.tag}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 text-sm">{formatCount(hashtag.count)}</span>
                      {isSelected && <CheckCircle className="text-[#00a884]" size={16} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Suggested Hashtags */}
          {!searchQuery && selectedHashtags.length === 0 && (
            <div>
              <p className="text-white/60 text-xs mb-2 uppercase">Suggested</p>
              <div className="flex flex-wrap gap-2">
                {['#fyp', '#viral', '#trending', '#status'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleAddHashtag(tag)}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm transition-colors"
                  >
                    {tag}
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
            disabled={selectedHashtags.length === 0}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Add Hashtags ({selectedHashtags.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusHashtagsPanel;
