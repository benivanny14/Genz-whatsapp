import React, { useState, useEffect } from 'react';
import { X, Heart, Star, Clock, Trash2, Share2, Filter } from 'lucide-react';

const StatusFavoritesPanel = ({ onClose, status, onFavoriteAction }) => {
  const [favorites, setFavorites] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setFavorites(data.statuses || []);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      // Fallback to localStorage
      try {
        const saved = JSON.parse(localStorage.getItem('genz_status_favorites') || '[]');
        setFavorites(saved);
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/${favId}/favorite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await loadFavorites();
    } catch (error) {
      console.error('Error removing favorite:', error);
      // Fallback to localStorage
      const updated = favorites.filter(f => f._id !== favId);
      setFavorites(updated);
      localStorage.setItem('genz_status_favorites', JSON.stringify(updated));
    }

    if (onFavoriteAction) {
      onFavoriteAction({ action: 'remove', id: favId });
    }
  };

  const handleShareFavorite = (fav) => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this status',
        text: fav.content || fav.caption
      }).catch(console.error);
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to remove all favorites?')) {
      setFavorites([]);
      localStorage.setItem('genz_status_favorites', JSON.stringify([]));
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredFavorites = filterCategory === 'all' 
    ? favorites 
    : favorites.filter(f => f.category === filterCategory);

  const categories = ['all', 'inspiration', 'funny', 'memories', 'quotes', 'art', 'music', 'travel'];

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Heart className="text-red-500 fill-red-500" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Favorite Statuses</h2>
              <p className="text-white/60 text-xs">{favorites.length} saved favorites</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {favorites.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Clear All
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Filter */}
          {favorites.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Filter size={16} className="text-white/60" />
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs capitalize transition-colors ${
                      filterCategory === cat
                        ? 'bg-[#00a884] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Favorites List */}
          {filteredFavorites.length > 0 ? (
            <div className="space-y-2">
              {filteredFavorites.map((fav) => (
                <div
                  key={fav.id}
                  className="bg-white/5 rounded-xl p-4 border border-transparent hover:border-[#00a884]/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-white/60 text-xs capitalize">{fav.category || 'general'}</span>
                      </div>
                      <p className="text-white text-sm mb-2">{fav.content || fav.caption}</p>
                      <div className="flex items-center gap-2 text-white/40 text-xs">
                        <Clock size={12} />
                        <span>{formatTime(fav.favoritedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleShareFavorite(fav)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                        title="Share"
                      >
                        <Share2 size={14} />
                      </button>
                      <button
                        onClick={() => handleRemoveFavorite(fav.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-white/60 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/60">
              <Heart size={48} className="mx-auto mb-2 opacity-50" />
              <p>No favorites yet</p>
              <p className="text-sm">Heart a status to add it to favorites</p>
            </div>
          )}
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusFavoritesPanel;
