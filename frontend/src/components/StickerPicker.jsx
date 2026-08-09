import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Heart, Clock, Plus, ChevronLeft, Check, Download, Grid3x3, Wand2 } from 'lucide-react';
import StickerCreator from './StickerCreator';
import { useStickers } from '../context/StickerContext';

// Offline fallback catalog (GIPHY CDN) — used only when the backend catalog
// hasn't loaded yet. The live catalog comes from GET /api/stickers/packs.
const STATIC_STICKER_PACKS = [
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
      { id: '12', url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif', name: 'LOL2' }
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
      { id: 'r6', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', name: 'Angry' }
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
      { id: 'f6', url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif', name: 'LOL' }
    ]
  }
];

const CUSTOM_KEY = 'genz_custom_stickers';

const loadJSON = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(v) ? v : fallback;
  } catch { return fallback; }
};

// WhatsApp-style sticker picker. All sticker data and actions (packs,
// downloads, favorites, recents) come from StickerContext so the sticker
// feature is self-contained; only per-chat concerns are props.
const StickerPicker = ({
  onStickerSelect,
  onClose
}) => {
  const {
    stickerPacks,
    downloadedStickers,
    favoriteStickers,
    recents,
    downloadStickerPack,
    removeStickerPack,
    toggleFavoriteSticker,
    recordRecentSticker
  } = useStickers();

  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('store'); // 'favorites' | 'recents' | packId | 'store'
  const [showCreator, setShowCreator] = useState(false);
  const [customStickers, setCustomStickers] = useState(() => loadJSON(CUSTOM_KEY, []));
  const longPressRef = useRef(null);

  // Live catalog from the backend (Twemoji packs); static GIPHY packs are only
  // an offline fallback while the API hasn't responded yet.
  const packs = (Array.isArray(stickerPacks) && stickerPacks.length > 0)
    ? stickerPacks
    : STATIC_STICKER_PACKS;

  const isPackDownloaded = (pack) =>
    pack.isDownloaded === true ||
    ((pack.stickers || []).length > 0 && (pack.stickers || []).every((s) => downloadedStickers.includes(s.url)));

  const downloadedPacks = packs.filter(isPackDownloaded);

  const isFav = (sticker) => favoriteStickers.includes(sticker.id) || favoriteStickers.includes(sticker.url);

  const toggleFavorite = (sticker) => toggleFavoriteSticker(sticker.id, sticker.url);

  const pickSticker = (sticker) => {
    // Record as recent (most-recent first, deduped, capped at 30) — handled by
    // StickerContext, which persists to localStorage.
    recordRecentSticker(sticker);
    onStickerSelect(sticker.url, { caption: sticker.name || sticker.emoji || '' });
  };

  // Long-press → toggle favorite (WhatsApp behaviour)
  const startLongPress = (e, sticker) => {
    longPressRef.current = setTimeout(() => toggleFavorite(sticker), 450);
  };
  const cancelLongPress = () => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  };

  const allStickers = useMemo(() => packs.flatMap((p) => (p.stickers || [])), [packs]);

  // Favorites may include custom stickers (created via StickerCreator) — they
  // live in customStickers, not in the pack catalog, so include both.
  const favoriteStickerObjects = [...customStickers, ...allStickers].filter(isFav);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return [...customStickers, ...allStickers].filter((s) =>
      (s.emoji && s.emoji.includes(searchQuery.trim())) ||
      (s.name || '').toLowerCase().includes(q)
    );
  }, [allStickers, customStickers, searchQuery]);

  // Determine which stickers to show in the content grid
  const visibleStickers = useMemo(() => {
    if (searchActive) {
      // WhatsApp: empty search shows every sticker; typing filters by emoji/name
      return searchQuery.trim() ? searchResults : allStickers;
    }
    if (activeTab === 'favorites') return favoriteStickerObjects;
    if (activeTab === 'recents') return recents.map((r) => r);
    if (activeTab === 'store') return [];
    const pack = packs.find((p) => p.id === activeTab);
    return pack ? pack.stickers || [] : [];
  }, [searchActive, searchResults, searchQuery, activeTab, favoriteStickerObjects, recents, packs, allStickers]);

  const activePack = activeTab !== 'store' && activeTab !== 'favorites' && activeTab !== 'recents'
    ? packs.find((p) => p.id === activeTab)
    : null;

  const handlePackAction = (e, pack) => {
    e.stopPropagation();
    if (isPackDownloaded(pack)) {
      if (removeStickerPack) removeStickerPack(pack.id);
    } else if (downloadStickerPack) {
      downloadStickerPack(pack);
    }
  };

  return (
    <div className="flex flex-col bg-[#0c1317] border-t border-[#2a3942] shadow-2xl" style={{ maxHeight: '48vh' }}>
      {/* ── Tab bar (WhatsApp style: Favorites, Recents, packs, store) ── */}
      <div className="flex items-center gap-1 px-2 pt-2 pb-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => { setActiveTab('favorites'); setSearchActive(false); }}
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${activeTab === 'favorites' && !searchActive ? 'bg-[#374248] text-white' : 'text-[#8696a0] hover:bg-[#1f2c33]'}`}
          title="Favorites"
          aria-label="Favorite stickers"
        >
          <Heart size={20} fill={favoriteStickerObjects.length > 0 ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => { setActiveTab('recents'); setSearchActive(false); }}
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${activeTab === 'recents' && !searchActive ? 'bg-[#374248] text-white' : 'text-[#8696a0] hover:bg-[#1f2c33]'}`}
          title="Recent stickers"
          aria-label="Recent stickers"
        >
          <Clock size={20} />
        </button>

        {downloadedPacks.map((pack) => (
          <button
            key={pack.id}
            onClick={() => { setActiveTab(pack.id); setSearchActive(false); }}
            className={`flex-shrink-0 w-9 h-9 rounded-full overflow-hidden border-2 transition-colors ${activeTab === pack.id && !searchActive ? 'border-[#00a884]' : 'border-transparent hover:border-[#374248]'}`}
            title={pack.name}
            aria-label={pack.name}
          >
            <img src={pack.thumbnail || pack.stickers?.[0]?.url} alt={pack.name} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}

        <button
          onClick={() => { setActiveTab('store'); setSearchActive(false); }}
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${activeTab === 'store' && !searchActive ? 'bg-[#374248] text-white' : 'text-[#8696a0] hover:bg-[#1f2c33]'}`}
          title="Sticker store"
          aria-label="Sticker store"
        >
          <Plus size={22} />
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setSearchActive((v) => { if (!v) setSearchQuery(''); return !v; })}
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${searchActive ? 'bg-[#374248] text-white' : 'text-[#8696a0] hover:bg-[#1f2c33]'}`}
          title="Search stickers"
          aria-label="Search stickers"
        >
          <Search size={20} />
        </button>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[#8696a0] hover:bg-[#1f2c33] transition-colors"
          title="Close"
          aria-label="Close sticker picker"
        >
          <X size={20} />
        </button>
      </div>

      {/* ── Search bar ── */}
      {searchActive && (
        <div className="px-3 pt-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stickers by emoji or name..."
              className="w-full bg-[#1f2c33] border border-[#2a3942] rounded-lg py-2 pl-9 pr-4 text-white text-sm placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
            />
          </div>
        </div>
      )}

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-[180px]">
        {searchActive ? (
          visibleStickers.length > 0 ? (
            <StickerGrid stickers={visibleStickers} onPick={pickSticker} isFav={isFav} onFav={toggleFavorite} onLongPressStart={startLongPress} onLongPressEnd={cancelLongPress} />
          ) : (
            <div className="text-center py-8 text-[#8696a0] text-sm">
              <Search size={28} className="mx-auto mb-2 opacity-50" />
              No stickers found
            </div>
          )
        ) : activeTab === 'store' ? (
          <StoreView
            packs={packs}
            isPackDownloaded={isPackDownloaded}
            onPackAction={handlePackAction}
            onOpenPack={(pack) => setActiveTab(pack.id)}
            onStickerSelect={pickSticker}
            onOpenCreator={() => setShowCreator(true)}
            customCount={customStickers.length}
            onShowMine={() => setActiveTab('mine')}
          />
        ) : activeTab === 'mine' ? (
          customStickers.length > 0 ? (
            <StickerGrid stickers={customStickers} onPick={pickSticker} isFav={isFav} onFav={toggleFavorite} onLongPressStart={startLongPress} onLongPressEnd={cancelLongPress} />
          ) : (
            <div className="text-center py-8 text-[#8696a0] text-sm">No custom stickers yet — create one!</div>
          )
        ) : activeTab === 'favorites' ? (
          favoriteStickerObjects.length > 0 ? (
            <StickerGrid stickers={favoriteStickerObjects} onPick={pickSticker} isFav={isFav} onFav={toggleFavorite} onLongPressStart={startLongPress} onLongPressEnd={cancelLongPress} />
          ) : (
            <div className="text-center py-8 text-[#8696a0] text-sm">
              <Heart size={28} className="mx-auto mb-2 opacity-50" />
              Long-press a sticker to add it to favorites
            </div>
          )
        ) : activeTab === 'recents' ? (
          recents.length > 0 ? (
            <StickerGrid stickers={recents} onPick={pickSticker} isFav={isFav} onFav={toggleFavorite} onLongPressStart={startLongPress} onLongPressEnd={cancelLongPress} />
          ) : (
            <div className="text-center py-8 text-[#8696a0] text-sm">
              <Clock size={28} className="mx-auto mb-2 opacity-50" />
              Recently used stickers will appear here
            </div>
          )
        ) : activePack ? (
          <StickerGrid stickers={activePack.stickers || []} onPick={pickSticker} isFav={isFav} onFav={toggleFavorite} onLongPressStart={startLongPress} onLongPressEnd={cancelLongPress} />
        ) : null}
      </div>

      {/* ── Sticker Creator ── */}
      {showCreator && (
        <StickerCreator
          onClose={() => setShowCreator(false)}
          onStickerCreated={(sticker) => {
            setCustomStickers((prev) => {
              const updated = [...prev, sticker];
              localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
              return updated;
            });
            setShowCreator(false);
            setActiveTab('mine');
          }}
        />
      )}
    </div>
  );
};

const StickerGrid = ({ stickers, onPick, isFav, onFav, onLongPressStart, onLongPressEnd }) => (
  <div className="grid grid-cols-4 gap-1">
    {stickers.map((sticker) => {
      const fav = isFav(sticker);
      return (
        <div
          key={sticker.id || sticker.url}
          className="relative aspect-square"
          onContextMenu={(e) => { e.preventDefault(); onFav(sticker); }}
        >
          <button
            type="button"
            onClick={() => onPick(sticker)}
            onMouseDown={() => onLongPressStart(null, sticker)}
            onMouseUp={onLongPressEnd}
            onMouseLeave={onLongPressEnd}
            onTouchStart={() => onLongPressStart(null, sticker)}
            onTouchEnd={onLongPressEnd}
            className="w-full h-full p-1 rounded-lg hover:bg-[#1f2c33] transition-colors"
            title={sticker.name || sticker.emoji || 'Sticker'}
            aria-label={sticker.name || sticker.emoji || 'Sticker'}
          >
            {sticker.isVideo ? (
              <video src={sticker.url} muted autoPlay loop playsInline className="w-full h-full object-contain pointer-events-none rounded" />
            ) : (
              <img src={sticker.url} alt={sticker.name || sticker.emoji || 'sticker'} className="w-full h-full object-contain pointer-events-none" loading="lazy" />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFav(sticker); }}
            className={`absolute top-0.5 right-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${fav ? 'text-[#ff5b7f] bg-black/30' : 'text-white/30 opacity-0 group-hover:opacity-100 hover:opacity-100'}`}
            aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart size={12} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>
      );
    })}
  </div>
);

const StoreView = ({ packs, isPackDownloaded, onPackAction, onOpenPack, onStickerSelect, onOpenCreator, customCount, onShowMine }) => (
  <div className="space-y-3">
    <div className="flex gap-2">
      <button
        onClick={onOpenCreator}
        className="flex-1 flex items-center justify-center gap-2 bg-[#1f2c33] border border-[#2a3942] rounded-xl py-2.5 text-sm font-medium text-[#d1d7db] hover:bg-[#2a3942] transition-colors"
      >
        <Wand2 size={16} className="text-[#ff5b7f]" /> Create Sticker
      </button>
      {customCount > 0 && (
        <button
          onClick={onShowMine}
          className="flex-1 flex items-center justify-center gap-2 bg-[#1f2c33] border border-[#2a3942] rounded-xl py-2.5 text-sm font-medium text-[#d1d7db] hover:bg-[#2a3942] transition-colors"
        >
          <Grid3x3 size={16} className="text-[#00a884]" /> My Stickers ({customCount})
        </button>
      )}
    </div>

    <p className="text-xs text-[#8696a0] px-1">STICKER STORE</p>
    {packs.map((pack) => {
      const downloaded = isPackDownloaded(pack);
      return (
        <div key={pack.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#1f2c33] transition-colors">
          <button onClick={() => onOpenPack(pack)} className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-[#2a3942]">
            <img src={pack.thumbnail || pack.stickers?.[0]?.url} alt={pack.name} className="w-full h-full object-cover" loading="lazy" />
          </button>
          <button onClick={() => onOpenPack(pack)} className="flex-1 text-left min-w-0">
            <p className="text-white text-sm font-medium truncate">{pack.name}</p>
            <p className="text-[#8696a0] text-xs">{pack.stickers?.length || 0} stickers</p>
          </button>
          <button
            onClick={(e) => onPackAction(e, pack)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              downloaded
                ? 'bg-[#00a884]/15 text-[#00a884] border-[#00a884]/30'
                : 'bg-[#00a884] text-white border-transparent hover:bg-[#008f72]'
            }`}
          >
            {downloaded ? <><Check size={13} /> Added</> : <><Download size={13} /> Download</>}
          </button>
          <button
            onClick={() => onOpenPack(pack)}
            className="flex-shrink-0 text-[#8696a0] hover:text-white transition-colors p-1"
            aria-label={`View ${pack.name}`}
          >
            <ChevronLeft size={18} className="rotate-180" />
          </button>
        </div>
      );
    })}
  </div>
);

export default StickerPicker;
