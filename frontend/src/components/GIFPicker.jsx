import { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Grid3x3 } from 'lucide-react';
import { searchGIFs, getTrendingGIFs, getGIFsByCategory, getGIFCategories, cacheGIF } from '../services/gifAPI';

const GIFPicker = ({ onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showTrending, setShowTrending] = useState(true);
  const searchInputRef = useRef(null);

  const categories = getGIFCategories();

  // Load trending GIFs on mount
  useEffect(() => {
    loadTrendingGIFs();
    searchInputRef.current?.focus();
  }, []);

  // Search GIFs when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchGIFsHandler(searchQuery);
      } else {
        loadTrendingGIFs();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadTrendingGIFs = async () => {
    setLoading(true);
    setShowTrending(true);
    setSelectedCategory(null);
    const result = await getTrendingGIFs(24);
    setGifs(result.gifs || []);
    setLoading(false);
  };

  const searchGIFsHandler = async (query) => {
    setLoading(true);
    setShowTrending(false);
    const result = await searchGIFs(query, 24);
    setGifs(result.gifs || []);
    setLoading(false);
  };

  const selectCategory = async (category) => {
    setLoading(true);
    setShowTrending(false);
    setSelectedCategory(category.name);
    const result = await getGIFsByCategory(category.query, 24);
    setGifs(result.gifs || []);
    setLoading(false);
  };

  const handleGIFSelect = async (gif) => {
    // Cache the selected GIF
    await cacheGIF(gif);
    onSelect(gif);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <Grid3x3 size={24} />
            GIF Picker
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search GIFs..."
              className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={loadTrendingGIFs}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                showTrending && !selectedCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <TrendingUp size={16} className="inline mr-1" />
              Trending
            </button>
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => selectCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* GIF Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : gifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Grid3x3 size={48} className="mb-4" />
              <p className="text-lg">No GIFs found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gifs.filter((gif) => gif?.images?.fixed_height?.url).map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleGIFSelect(gif)}
                  className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <img
                    src={gif.images.fixed_height.url}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-center text-gray-400 text-sm">
          Powered by GIPHY
        </div>
      </div>
    </div>
  );
};

export default GIFPicker;
