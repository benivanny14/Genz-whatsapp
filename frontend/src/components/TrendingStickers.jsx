import React, { useState, useEffect } from 'react';
import { Sparkles, Star, Download, X, TrendingUp, Loader2 } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';

const TrendingStickers = ({ onStickerSelect, onClose, replyTo, messageInput }) => {
  const [activePack, setActivePack] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [recentlyUsed, setRecentlyUsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('genz_recent_stickers') || '[]');
    } catch { return []; }
  });
  const [stickerPacks, setStickerPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  // Fetch sticker packs from backend
  useEffect(() => {
    const fetchPacks = async () => {
      try {
        setLoading(true);
        const response = await authFetch(`${API_URL}/api/stickers/packs`);
        const data = await response.json();
        if (data?.success) {
          setStickerPacks(data.packs || []);
          if (data.packs?.length > 0) {
            setActivePack(data.packs[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch sticker packs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPacks();
  }, []);

  const currentPack = stickerPacks.find(p => p.id === activePack) || stickerPacks[0];

  const handleSelect = (stickerUrl) => {
    // Add to recently used
    const updated = [stickerUrl, ...recentlyUsed.filter(s => s !== stickerUrl)].slice(0, 8);
    setRecentlyUsed(updated);
    localStorage.setItem('genz_recent_stickers', JSON.stringify(updated));
    
    // TikTok-style: send sticker with caption and reply context
    onStickerSelect?.(stickerUrl, {
      replyTo: replyTo,
      caption: messageInput?.trim() || undefined
    });
    onClose?.();
  };

  const handleDownloadPack = async (packId) => {
    try {
      setDownloading(packId);
      const response = await authFetch(`${API_URL}/api/stickers/packs/${packId}/download`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data?.success) {
        setStickerPacks(prev => prev.map(p => 
          p.id === packId ? { ...p, isDownloaded: true } : p
        ));
      }
    } catch (error) {
      console.error('Failed to download pack:', error);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0d1f35] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-80 p-8 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-orange-400 mb-3" size={32} />
        <p className="text-gray-400 text-sm">Loading stickers...</p>
      </div>
    );
  }

  if (!stickerPacks.length) {
    return (
      <div className="bg-[#0d1f35] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-80 p-8">
        <p className="text-gray-400 text-sm text-center">No sticker packs available</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1f35] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-80">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-900/30 to-red-900/30 border-b border-white/10">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-orange-400" />
          <span className="text-white font-bold text-sm">Stickers</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400" aria-label="Close">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Pack tabs */}
      <div className="flex gap-1 p-2 overflow-x-auto border-b border-white/10">
        {stickerPacks.map(pack => (
          <button
            key={pack.id}
            onClick={() => setActivePack(pack.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
              activePack === pack.id
                ? 'bg-orange-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {pack.name.split(' ')[0]}
            {!pack.isDownloaded && <Download size={10} />}
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

      {/* Pack description and download button */}
      <div className="px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-gray-500">{currentPack?.author || 'GENZ'}</p>
        {!currentPack?.isDownloaded && (
          <button
            onClick={() => handleDownloadPack(currentPack.id)}
            disabled={downloading === currentPack.id}
            className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs hover:bg-orange-500/30 disabled:opacity-50"
          >
            {downloading === currentPack.id ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Download size={12} />
            )}
            Download
          </button>
        )}
      </div>

      {/* Sticker Grid */}
      <div className="grid grid-cols-3 gap-2 p-3 max-h-60 overflow-y-auto">
        {currentPack?.stickers?.map((sticker, i) => (
          <button
            key={sticker.id || i}
            onClick={() => handleSelect(sticker.url)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={`aspect-square bg-white/5 rounded-xl p-2 transition-all sticker-card ${
              hovered === i ? 'bg-white/15 scale-110 shadow-lg' : 'hover:bg-white/10'
            }`}
          >
            <img
              src={sticker.url}
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
        {currentPack?.stickers?.length || 0} stickers • Tap to send
      </div>
    </div>
  );
};

export default TrendingStickers;
