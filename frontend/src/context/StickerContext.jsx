import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiService from '../services/apiService';
import { mediaAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useChat } from './ChatContext';

export const StickerContext = createContext();

export const useStickers = () => {
  const ctx = useContext(StickerContext);
  if (!ctx) throw new Error('useStickers must be used within a StickerProvider');
  return ctx;
};

const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH !== 'false';

const FAV_KEY = 'genz_sticker_favorites';
const RECENT_KEY = 'genz_sticker_recents';

const loadJSON = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(v) ? v : fallback;
  } catch { return fallback; }
};

// Self-contained sticker feature: pack catalog, downloads, favorites, recents,
// and sending. Lives inside ChatProvider because sending a sticker reuses the
// core message pipeline (sendMessage).
export const StickerProvider = ({ children }) => {
  const { sendMessage } = useChat();
  const { isAuthenticated, loading: authLoading, user: authUser, isAuthReady } = useAuth();

  const [stickerPacks, setStickerPacks] = useState([]);
  const [downloadedStickers, setDownloadedStickers] = useState([]);
  const [favoriteStickers, setFavoriteStickers] = useState(() => loadJSON(FAV_KEY, []));
  const [recents, setRecents] = useState(() => loadJSON(RECENT_KEY, []));

  const fetchStickerPacks = useCallback(async () => {
    try {
      const res = await apiService.getStickerPacks();
      if (res?.success) {
        setStickerPacks(res.packs || []);
        const downloadedUrls = (res.packs || [])
          .filter(p => p.isDownloaded)
          .flatMap(p => (p.stickers || []).map(s => s.url));
        setDownloadedStickers(downloadedUrls);
      }
    } catch (err) {
      console.warn('[StickerContext] fetchStickerPacks failed:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady || (REQUIRE_AUTH && (authLoading || !isAuthenticated))) return;
    fetchStickerPacks();
  }, [isAuthReady, authLoading, isAuthenticated, fetchStickerPacks]);

  const downloadStickerPack = useCallback(async (pack) => {
    const packId = pack?.id || pack;
    if (!packId) return;
    try {
      const res = await apiService.downloadStickerPack(packId);
      if (res?.success) {
        setStickerPacks(prev => prev.map(p => p.id === packId ? { ...p, isDownloaded: true } : p));
        const downloadedPack = stickerPacks.find(p => p.id === packId) || res.pack;
        const newUrls = (downloadedPack?.stickers || []).map(s => s.url).filter(Boolean);
        setDownloadedStickers(prev => Array.from(new Set([...prev, ...newUrls])));
      }
    } catch (err) {
      console.warn('[StickerContext] downloadStickerPack failed:', err?.message || err);
    }
  }, [stickerPacks]);

  const removeStickerPack = useCallback(async (packId) => {
    if (!packId) return;
    try {
      const res = await apiService.removeStickerPack(packId);
      if (res?.success) {
        const pack = stickerPacks.find(p => p.id === packId);
        setStickerPacks(prev => prev.map(p => p.id === packId ? { ...p, isDownloaded: false } : p));
        const removedUrls = new Set((pack?.stickers || []).map(s => s.url));
        setDownloadedStickers(prev => prev.filter(url => !removedUrls.has(url)));
      }
    } catch (err) {
      console.warn('[StickerContext] removeStickerPack failed:', err?.message || err);
    }
  }, [stickerPacks]);

  // Favorites: localStorage is the display source of truth; the backend is
  // kept in sync so favorites survive re-login on another device.
  const toggleFavoriteSticker = useCallback((stickerId, url) => {
    const key = stickerId || url;
    if (!key) return;
    setFavoriteStickers(prev => {
      const next = prev.includes(key) ? prev.filter(id => id !== key) : [key, ...prev];
      try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch (e) { /* ignore quota */ }
      return next;
    });
    apiService.toggleFavoriteSticker(stickerId, url)
      .catch(err => console.warn('[StickerContext] toggleFavoriteSticker failed:', err?.message || err));
  }, []);

  // Recents: most-recent first, deduped, capped at 30, persisted locally.
  // Computed OUTSIDE the state updater: the picker closes on select and React
  // discards pending updater side-effects on unmount.
  const recordRecentSticker = useCallback((sticker) => {
    if (!sticker) return;
    const key = sticker.id || sticker.url;
    const next = [sticker, ...recents.filter((s) => (s.id || s.url) !== key)].slice(0, 30);
    setRecents(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch (e) { /* ignore quota */ }
  }, [recents]);

  // Custom stickers are data:/blob: URLs that only exist on this device — they
  // must be uploaded to the server first so the receiver can actually load them.
  const uploadLocalSticker = useCallback(async (stickerUrl) => {
    if (!/^(data:|blob:)/i.test(stickerUrl)) return stickerUrl;
    try {
      const blob = await fetch(stickerUrl).then((r) => r.blob());
      if (!blob) return stickerUrl;
      const file = new File([blob], `sticker_${Date.now()}.png`, { type: 'image/png' });
      const { data } = await mediaAPI.uploadFile(file);
      if (data?.success && data.fileUrl) return data.fileUrl;
      return stickerUrl;
    } catch (err) {
      console.warn('[StickerContext] Sticker upload failed, sending local URL:', err?.message || err);
      return stickerUrl;
    }
  }, []);

  const sendSticker = useCallback(async (stickerUrl, options = {}) => {
    if (!stickerUrl) return;
    const finalUrl = await uploadLocalSticker(stickerUrl);
    sendMessage(finalUrl, authUser?.username || 'Me', { messageType: 'sticker', ...options });
  }, [sendMessage, authUser?.username, uploadLocalSticker]);

  const value = useMemo(() => ({
    stickerPacks,
    downloadedStickers,
    favoriteStickers,
    recents,
    fetchStickerPacks,
    downloadStickerPack,
    removeStickerPack,
    toggleFavoriteSticker,
    recordRecentSticker,
    sendSticker
  }), [
    stickerPacks, downloadedStickers, favoriteStickers, recents,
    fetchStickerPacks, downloadStickerPack, removeStickerPack,
    toggleFavoriteSticker, recordRecentSticker, sendSticker
  ]);

  return (
    <StickerContext.Provider value={value}>
      {children}
    </StickerContext.Provider>
  );
};
