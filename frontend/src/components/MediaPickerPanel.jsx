import React, { useState, useEffect } from 'react';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { Smile, Square, FileImage, Search, Clock } from 'lucide-react';
import { searchGIFs, getTrendingGIFs, getGIFCategories, cacheGIF } from '../services/gifAPI';

const STICKER_PACKS = [
  {
    id: 'trending',
    name: '🔥 Trending',
    description: 'Stickers maarufu sasa hivi',
    stickers: [
      'https://cdn-icons-png.flaticon.com/512/3532/3532827.png',
      'https://cdn-icons-png.flaticon.com/512/742/742751.png',
      'https://cdn-icons-png.flaticon.com/512/3069/3069172.png',
      'https://cdn-icons-png.flaticon.com/512/4457/4457090.png',
      'https://cdn-icons-png.flaticon.com/512/5290/5290058.png',
      'https://cdn-icons-png.flaticon.com/512/1791/1791961.png',
    ]
  },
  {
    id: 'love',
    name: '💕 Love & Vibes',
    description: 'Romantic stickers',
    stickers: [
      'https://cdn-icons-png.flaticon.com/512/2589/2589175.png',
      'https://cdn-icons-png.flaticon.com/512/833/833472.png',
      'https://cdn-icons-png.flaticon.com/512/1791/1791330.png',
      'https://cdn-icons-png.flaticon.com/512/4213/4213958.png',
      'https://cdn-icons-png.flaticon.com/512/3003/3003935.png',
      'https://cdn-icons-png.flaticon.com/512/2248/2248718.png',
    ]
  },
  {
    id: 'reactions',
    name: '😂 Reactions',
    description: 'Express yako feeling',
    stickers: [
      'https://cdn-icons-png.flaticon.com/512/4379/4379460.png',
      'https://cdn-icons-png.flaticon.com/512/2584/2584606.png',
      'https://cdn-icons-png.flaticon.com/512/5220/5220249.png',
      'https://cdn-icons-png.flaticon.com/512/3079/3079233.png',
      'https://cdn-icons-png.flaticon.com/512/3079/3079230.png',
      'https://cdn-icons-png.flaticon.com/512/3079/3079246.png',
    ]
  }
];

const MediaPickerPanel = ({
  activeTab = 'emoji',
  onTabChange,
  onEmojiSelect,
  onStickerSelect,
  onGIFSelect,
  theme = 'dark'
}) => {
  return (
    <div className="flex flex-col h-[350px] w-full bg-[#1a2332] border-t border-gray-700 shadow-2xl z-40 transition-transform duration-300 ease-out origin-bottom transform translate-y-0">
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'emoji' && (
          <div className="absolute inset-0 w-full h-full animate-fadeIn">
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                onEmojiSelect(emojiData);
              }}
              theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
              emojiStyle={EmojiStyle.APPLE}
              lazyLoadEmojis={true}
              searchPlaceHolder="Search Emoji"
              width="100%"
              height="100%"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                '--epr-bg-color': 'transparent',
                '--epr-category-label-bg-color': '#1a2332',
                '--epr-text-color': '#e2e8f0',
                '--epr-search-border-color': '#334155'
              }}
            />
          </div>
        )}

        {activeTab === 'sticker' && (
          <StickerPanel onStickerSelect={onStickerSelect} />
        )}

        {activeTab === 'gif' && (
          <GIFPanel onGIFSelect={onGIFSelect} />
        )}
      </div>

      {/* Bottom Tabs */}
      <div className="flex bg-[#0d1b2a] border-t border-gray-700">
        <button
          onClick={(e) => { e.preventDefault(); onTabChange('emoji'); }}
          className={`flex-1 py-3 flex justify-center items-center gap-2 transition-colors ${
            activeTab === 'emoji' ? 'text-blue-500 bg-white/5' : 'text-gray-400 hover:bg-white/5'
          }`}
        >
          <Smile size={20} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); onTabChange('sticker'); }}
          className={`flex-1 py-3 flex justify-center items-center gap-2 transition-colors ${
            activeTab === 'sticker' ? 'text-green-500 bg-white/5' : 'text-gray-400 hover:bg-white/5'
          }`}
        >
          <Square size={20} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); onTabChange('gif'); }}
          className={`flex-1 py-3 flex justify-center items-center gap-2 transition-colors ${
            activeTab === 'gif' ? 'text-orange-500 bg-white/5' : 'text-gray-400 hover:bg-white/5'
          }`}
        >
          <FileImage size={20} />
        </button>
      </div>
    </div>
  );
};

const StickerPanel = ({ onStickerSelect }) => {
  const [activePack, setActivePack] = useState('trending');
  const [recentlyUsed, setRecentlyUsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('genz_recent_stickers') || '[]');
    } catch { return []; }
  });

  const currentPack = STICKER_PACKS.find(p => p.id === activePack) || STICKER_PACKS[0];

  const handleSelect = (stickerUrl) => {
    const updated = [stickerUrl, ...recentlyUsed.filter(s => s !== stickerUrl)].slice(0, 12);
    setRecentlyUsed(updated);
    localStorage.setItem('genz_recent_stickers', JSON.stringify(updated));
    onStickerSelect(stickerUrl);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1a2332] animate-fadeIn">
      {/* Pack tabs */}
      <div className="flex gap-2 p-2 overflow-x-auto border-b border-gray-700 scrollbar-thin">
        {recentlyUsed.length > 0 && (
          <button
            onClick={(e) => { e.preventDefault(); setActivePack('recent'); }}
            className={`flex-shrink-0 p-2 rounded-lg transition-all ${
              activePack === 'recent' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <Clock size={20} />
          </button>
        )}
        {STICKER_PACKS.map(pack => (
          <button
            key={pack.id}
            onClick={(e) => { e.preventDefault(); setActivePack(pack.id); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              activePack === pack.id
                ? 'bg-green-600/20 text-green-400'
                : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            {pack.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {activePack === 'recent' && recentlyUsed.length === 0 && (
          <div className="flex justify-center items-center h-full text-gray-500 text-sm">
            No recently used stickers
          </div>
        )}
        
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 p-2">
          {activePack === 'recent' ? recentlyUsed.map((url, i) => (
            <button
              key={`recent-${i}`}
              onClick={(e) => { e.preventDefault(); handleSelect(url); }}
              className="aspect-square rounded-lg p-2 hover:bg-gray-700 transition-all active:scale-95"
            >
              <img src={url} alt="sticker" className="w-full h-full object-contain" loading="lazy" />
            </button>
          )) : currentPack.stickers.map((url, i) => (
            <button
              key={`${currentPack.id}-${i}`}
              onClick={(e) => { e.preventDefault(); handleSelect(url); }}
              className="aspect-square rounded-lg p-2 hover:bg-gray-700 transition-all active:scale-95"
            >
              <img src={url} alt="sticker" className="w-full h-full object-contain" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const GIFPanel = ({ onGIFSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const categories = getGIFCategories();

  useEffect(() => {
    loadTrending();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchGIFsHandler(searchQuery);
      } else {
        loadTrending();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadTrending = async () => {
    setLoading(true);
    const result = await getTrendingGIFs(20);
    setGifs(result.gifs || []);
    setLoading(false);
  };

  const searchGIFsHandler = async (query) => {
    setLoading(true);
    const result = await searchGIFs(query, 20);
    setGifs(result.gifs || []);
    setLoading(false);
  };

  const handleSelect = async (gif) => {
    await cacheGIF(gif);
    onGIFSelect(gif);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1a2332] animate-fadeIn">
      {/* Search */}
      <div className="p-2 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Tenor"
            className="w-full bg-gray-800 text-white pl-9 pr-4 py-1.5 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-1 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
            No GIFs found
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 p-1">
            {gifs.filter(g => g?.images?.fixed_height?.url).map((gif) => (
              <button
                key={gif.id}
                onClick={(e) => { e.preventDefault(); handleSelect(gif); }}
                className="rounded overflow-hidden hover:opacity-80 transition-opacity bg-gray-800 h-24"
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
    </div>
  );
};

export default MediaPickerPanel;
