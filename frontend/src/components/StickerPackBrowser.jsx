import React, { useState, useEffect } from 'react';
import { X, Search, Grid3x3, Heart, Plus, ChevronLeft, ChevronRight, Sparkles, Wand2 } from 'lucide-react';
import StickerCreator from './StickerCreator';

const STICKER_PACKS = [
  {
    id: 'genz-default',
    name: 'GENZ Stickers',
    author: 'GENZ WhatsApp',
    stickers: [
      { id: '1', url: 'https://media.giphy.com/media/3o6ozvv0zsJskzOCbu/giphy.gif', name: 'Wave' },
      { id: '2', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif', name: 'Thumbs Up' },
      { id: '3', url: 'https://media.giphy.com/media/l0ExayQDzrI2xOb8A/giphy.gif', name: 'Love' },
      { id: '4', url: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif', name: 'LOL' },
      { id: '5', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', name: 'Cool' },
      { id: '6', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', name: 'Thumbs' },
      { id: '7', url: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif', name: 'Party' },
      { id: '8', url: 'https://media.giphy.com/media/Is1O1TWV0LEla/giphy.gif', name: 'Clap' },
      { id: '9', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', name: 'Nice' },
      { id: '10', url: 'https://media.giphy.com/media/d2Z9QYzB2pQ5ieHQY/giphy.gif', name: 'Awesome' },
      { id: '11', url: 'https://media.giphy.com/media/l0MYd5y1pUqEZilGE/giphy.gif', name: 'Fire' },
      { id: '12', url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif', name: 'LOL2' },
    ]
  },
  {
    id: 'genz-reactions',
    name: 'GENZ Reactions',
    author: 'GENZ WhatsApp',
    stickers: [
      { id: 'r1', url: 'https://media.giphy.com/media/3o6ozvv0zsJskzOCbu/giphy.gif', name: 'Like' },
      { id: 'r2', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif', name: 'Love' },
      { id: 'r3', url: 'https://media.giphy.com/media/l0ExayQDzrI2xOb8A/giphy.gif', name: 'Haha' },
      { id: 'r4', url: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif', name: 'Wow' },
      { id: 'r5', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', name: 'Sad' },
      { id: 'r6', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', name: 'Angry' },
    ]
  },
  {
    id: 'genz-funny',
    name: 'GENZ Funny',
    author: 'GENZ WhatsApp',
    stickers: [
      { id: 'f1', url: 'https://media.giphy.com/media/l0MYd5y1pUqEZilGE/giphy.gif', name: 'Funny' },
      { id: 'f2', url: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif', name: 'Party' },
      { id: 'f3', url: 'https://media.giphy.com/media/Is1O1TWV0LEla/giphy.gif', name: 'Clap' },
      { id: 'f4', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', name: 'Nice' },
      { id: 'f5', url: 'https://media.giphy.com/media/d2Z9QYzB2pQ5ieHQY/giphy.gif', name: 'Cool' },
      { id: 'f6', url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif', name: 'LOL' },
    ]
  }
];

const StickerPackBrowser = ({ onStickerSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPack, setSelectedPack] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const [customStickers, setCustomStickers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('genz_custom_stickers') || '[]');
    } catch { return []; }
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('genz_sticker_favorites') || '[]');
    } catch { return []; }
  });

  const toggleFavorite = (stickerId) => {
    const newFavorites = favorites.includes(stickerId)
      ? favorites.filter(id => id !== stickerId)
      : [...favorites, stickerId];
    setFavorites(newFavorites);
    localStorage.setItem('genz_sticker_favorites', JSON.stringify(newFavorites));
  };

  const filteredPacks = STICKER_PACKS.filter(pack =>
    pack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pack.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allStickers = searchQuery
    ? STICKER_PACKS.flatMap(pack => pack.stickers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())))
    : null;

  if (selectedPack) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center">
        <div className="w-full max-w-lg bg-[#0d1f35] rounded-t-3xl shadow-2xl overflow-hidden border-t border-white/10">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <button onClick={() => setSelectedPack(null)} className="text-white/60 hover:text-white p-1" aria-label="Back">
              <ChevronLeft size={20} />
            </button>
            <span className="text-white font-bold">{selectedPack.name}</span>
            <span className="text-white/40 text-xs">{selectedPack.author}</span>
          </div>
          <div className="p-4 grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
            {selectedPack.stickers.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => onStickerSelect(sticker.url, { caption: sticker.name })}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <img src={sticker.url} alt={sticker.name} className="w-16 h-16 object-contain" loading="lazy" />
                <span className="text-[10px] text-white/50 truncate w-full text-center">{sticker.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-lg bg-[#0d1f35] rounded-t-3xl shadow-2xl overflow-hidden border-t border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-white font-bold flex items-center gap-2">
            <Grid3x3 size={18} className="text-pink-400" /> Sticker Packs
          </span>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="px-4 py-3 border-b border-white/10">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search stickers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl py-2 px-10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Quick actions: Create + My Stickers */}
        <div className="flex gap-2 px-4 pt-3">
          <button
            onClick={() => setShowCreator(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-xl py-2.5 text-sm font-medium hover:bg-pink-500/30 transition-colors"
          >
            <Wand2 size={16} /> Create Sticker
          </button>
          {customStickers.length > 0 && (
            <button
              onClick={() => setShowMine(!showMine)}
              className="flex-1 flex items-center justify-center gap-2 bg-white/5 text-white/80 border border-white/10 rounded-xl py-2.5 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <Grid3x3 size={16} /> My Stickers ({customStickers.length})
            </button>
          )}
        </div>

        {/* My custom stickers view */}
        {showMine && customStickers.length > 0 && (
          <div className="px-4 pt-4">
            <div className="grid grid-cols-4 gap-2 bg-dark-bg/50 rounded-xl p-3 border border-dark-border/50">
              {customStickers.map((sticker) => (
                <button
                  key={sticker.id}
                  onClick={() => onStickerSelect(sticker.url, { caption: sticker.name })}
                  className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <img src={sticker.url} alt={sticker.name} className="w-14 h-14 object-contain" loading="lazy" />
                  <span className="text-[10px] text-white/50 truncate w-full text-center">{sticker.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 max-h-[65vh] overflow-y-auto">
          {allStickers ? (
            <div className="grid grid-cols-4 gap-2">
              {allStickers.map((sticker) => (
                <button
                  key={sticker.id}
                  onClick={() => onStickerSelect(sticker.url, { caption: sticker.name })}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <img src={sticker.url} alt={sticker.name} className="w-16 h-16 object-contain" loading="lazy" />
                  <span className="text-[10px] text-white/50 truncate w-full text-center">{sticker.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPacks.map((pack) => (
                <div key={pack.id} className="bg-dark-bg/50 rounded-xl p-4 border border-dark-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold text-sm">{pack.name}</h3>
                      <p className="text-white/40 text-xs">{pack.stickers.length} stickers</p>
                    </div>
                    <button
                      onClick={() => setSelectedPack(pack)}
                      className="bg-primary-600/20 text-primary-400 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-primary-600/30 transition-colors"
                    >
                      View All
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {pack.stickers.slice(0, 6).map((sticker) => (
                      <button
                        key={sticker.id}
                        onClick={() => onStickerSelect(sticker.url, { caption: sticker.name })}
                        className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-dark-border/50 hover:border-primary-500/50 transition-colors"
                      >
                        <img src={sticker.url} alt={sticker.name} className="w-full h-full object-contain" loading="lazy" />
                      </button>
                    ))}
                    {pack.stickers.length > 6 && (
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-dark-surface border border-dark-border/50 flex items-center justify-center text-white/30 text-xs">
                        +{pack.stickers.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredPacks.length === 0 && (
                <div className="text-center py-8">
                  <Search size={32} className="mx-auto text-white/20 mb-3" />
                  <p className="text-white/40 text-sm">No sticker packs found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticker Creator Modal */}
      {showCreator && (
        <StickerCreator
          onClose={() => setShowCreator(false)}
          onStickerCreated={(sticker) => {
            setCustomStickers(prev => {
              const updated = [...prev, sticker];
              localStorage.setItem('genz_custom_stickers', JSON.stringify(updated));
              return updated;
            });
            setShowCreator(false);
            setShowMine(true);
          }}
        />
      )}
    </div>
  );
};

export default StickerPackBrowser;