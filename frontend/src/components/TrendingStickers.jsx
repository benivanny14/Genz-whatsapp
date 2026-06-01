import React, { useState } from 'react';
import { Sparkles, Star, Download, X, TrendingUp } from 'lucide-react';

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
    id: 'nairobi_life',
    name: '🇰🇪🇹🇿 East Africa',
    description: 'Kenya na Tanzania special',
    stickers: [
      'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      'https://cdn-icons-png.flaticon.com/512/2107/2107845.png',
      'https://cdn-icons-png.flaticon.com/512/3208/3208755.png',
      'https://cdn-icons-png.flaticon.com/512/1946/1946429.png',
      'https://cdn-icons-png.flaticon.com/512/4337/4337388.png',
      'https://cdn-icons-png.flaticon.com/512/6015/6015685.png',
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
  },
  {
    id: 'genz',
    name: '⚡ GENZ Exclusive',
    description: 'GENZ WhatsApp originals',
    stickers: [
      'https://cdn-icons-png.flaticon.com/512/4257/4257487.png',
      'https://cdn-icons-png.flaticon.com/512/2165/2165249.png',
      'https://cdn-icons-png.flaticon.com/512/1946/1946436.png',
      'https://cdn-icons-png.flaticon.com/512/3665/3665909.png',
      'https://cdn-icons-png.flaticon.com/512/4727/4727266.png',
      'https://cdn-icons-png.flaticon.com/512/5110/5110969.png',
    ]
  },
  {
    id: 'food',
    name: '🍔 Food & Vibes',
    description: 'Chakula na maisha',
    stickers: [
      'https://cdn-icons-png.flaticon.com/512/3448/3448609.png',
      'https://cdn-icons-png.flaticon.com/512/1046/1046784.png',
      'https://cdn-icons-png.flaticon.com/512/2553/2553691.png',
      'https://cdn-icons-png.flaticon.com/512/1046/1046786.png',
      'https://cdn-icons-png.flaticon.com/512/1046/1046777.png',
      'https://cdn-icons-png.flaticon.com/512/3132/3132693.png',
    ]
  },
];

const TrendingStickers = ({ onStickerSelect, onClose }) => {
  const [activePack, setActivePack] = useState('trending');
  const [hovered, setHovered] = useState(null);
  const [recentlyUsed, setRecentlyUsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('genz_recent_stickers') || '[]');
    } catch { return []; }
  });

  const currentPack = STICKER_PACKS.find(p => p.id === activePack) || STICKER_PACKS[0];

  const handleSelect = (stickerUrl) => {
    // Add to recently used
    const updated = [stickerUrl, ...recentlyUsed.filter(s => s !== stickerUrl)].slice(0, 8);
    setRecentlyUsed(updated);
    localStorage.setItem('genz_recent_stickers', JSON.stringify(updated));
    onStickerSelect?.(stickerUrl);
    onClose?.();
  };

  return (
    <div className="bg-[#0d1f35] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-80">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-900/30 to-red-900/30 border-b border-white/10">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-orange-400" />
          <span className="text-white font-bold text-sm">Trending Stickers</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Pack tabs */}
      <div className="flex gap-1 p-2 overflow-x-auto border-b border-white/10">
        {STICKER_PACKS.map(pack => (
          <button
            key={pack.id}
            onClick={() => setActivePack(pack.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activePack === pack.id
                ? 'bg-orange-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {pack.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Recently Used */}
      {recentlyUsed.length > 0 && (
        <div className="p-3 border-b border-white/10">
          <p className="text-gray-500 text-xs mb-2 flex items-center gap-1">
            <Star size={10} /> Recently Used
          </p>
          <div className="grid grid-cols-4 gap-2">
            {recentlyUsed.slice(0, 8).map((url, i) => (
              <button
                key={i}
                onClick={() => handleSelect(url)}
                className="aspect-square bg-white/5 rounded-xl p-1 hover:bg-white/15 transition-all hover:scale-110"
              >
                <img src={url} alt="sticker" className="w-full h-full object-contain" loading="lazy"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pack description */}
      <div className="px-4 py-2 text-xs text-gray-500">{currentPack.description}</div>

      {/* Sticker Grid */}
      <div className="grid grid-cols-3 gap-2 p-3 max-h-60 overflow-y-auto">
        {currentPack.stickers.map((url, i) => (
          <button
            key={i}
            onClick={() => handleSelect(url)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={`aspect-square bg-white/5 rounded-xl p-2 transition-all sticker-card ${
              hovered === i ? 'bg-white/15 scale-110 shadow-lg' : 'hover:bg-white/10'
            }`}
          >
            <img
              src={url}
              alt={`sticker ${i}`}
              className="w-full h-full object-contain"
              loading="lazy"
              onError={(e) => { e.target.parentElement.style.display = 'none'; }}
            />
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 text-center text-gray-600 text-xs">
        {currentPack.stickers.length} stickers • Bonyeza kutuma
      </div>
    </div>
  );
};

export default TrendingStickers;
