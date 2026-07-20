import { authFetch } from '../utils/authFetch';

const API_BASE = import.meta.env.VITE_API_URL || '';

const fetchGifs = async (params) => {
  const qs = new URLSearchParams(params);
  const response = await authFetch(`${API_BASE}/api/advanced/gifs?${qs.toString()}`);
  if (!response.ok) {
    return { success: false, gifs: [], fallback: true };
  }
  const data = await response.json();
  return {
    success: data.success !== false,
    gifs: data.gifs || [],
    pagination: data.pagination,
    fallback: !!data.fallback
  };
};

// ── Search GIFs (via backend Giphy proxy) ──
export const searchGIFs = async (query, limit = 20, offset = 0) => {
  try {
    return await fetchGifs({
      type: 'search',
      q: query,
      limit: String(limit),
      offset: String(offset)
    });
  } catch (error) {
    console.error('GIF search error:', error);
    return { success: false, gifs: [], fallback: true };
  }
};

// ── Get trending GIFs ──
export const getTrendingGIFs = async (limit = 20, offset = 0) => {
  try {
    return await fetchGifs({
      type: 'trending',
      limit: String(limit),
      offset: String(offset)
    });
  } catch (error) {
    console.error('Trending GIFs error:', error);
    return { success: false, gifs: [], fallback: true };
  }
};

// ── Get GIFs by category (search alias) ──
export const getGIFsByCategory = async (category, limit = 20, offset = 0) => {
  try {
    return await fetchGifs({
      type: 'search',
      q: category,
      limit: String(limit),
      offset: String(offset)
    });
  } catch (error) {
    console.error('Category GIFs error:', error);
    return { success: false, gifs: [], fallback: true };
  }
};

// ── Get GIF categories ──
export const getGIFCategories = () => {
  return [
    { name: 'Reaction', query: 'reaction' },
    { name: 'Happy', query: 'happy' },
    { name: 'Sad', query: 'sad' },
    { name: 'Funny', query: 'funny' },
    { name: 'Love', query: 'love' },
    { name: 'Angry', query: 'angry' },
    { name: 'Surprised', query: 'surprised' },
    { name: 'Thank you', query: 'thank you' },
    { name: 'Congratulations', query: 'congratulations' },
    { name: 'Goodbye', query: 'goodbye' }
  ];
};

// ── Cache GIFs in localStorage ──
export const cacheGIF = async (gif) => {
  try {
    const cachedGIFs = JSON.parse(localStorage.getItem('cachedGIFs') || '[]');
    if (cachedGIFs.length >= 50) {
      cachedGIFs.shift();
    }
    const url = gif.images?.fixed_height?.url || gif.url;
    cachedGIFs.push({
      id: gif.id,
      url,
      originalUrl: gif.url,
      title: gif.title,
      cachedAt: Date.now()
    });
    localStorage.setItem('cachedGIFs', JSON.stringify(cachedGIFs));
  } catch (error) {
    console.error('Cache GIF error:', error);
  }
};

// ── Get cached GIFs ──
export const getCachedGIFs = () => {
  try {
    return JSON.parse(localStorage.getItem('cachedGIFs') || '[]');
  } catch (error) {
    console.error('Get cached GIFs error:', error);
    return [];
  }
};

// ── Clear GIF cache ──
export const clearGIFCache = () => {
  try {
    localStorage.removeItem('cachedGIFs');
  } catch (error) {
    console.error('Clear GIF cache error:', error);
  }
};
