/**
 * Sanitize media URLs that contain invalid hosts like 0.0.0.0
 * and ensure local uploads can be signed for protected /uploads serving.
 */

const signedUrlCache = new Map();

const STALE_MEDIA_HOSTS = [
  'genz-whatsapp-backend.onrender.com',
  '0.0.0.0',
];

const getApiOrigin = () => {
  const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (api) return api.replace(/\/api$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
};

export function sanitizeMediaUrl(url) {
  if (!url || typeof url !== 'string') return url;

  const [pathPart, queryPart] = url.split('?');
  const querySuffix = queryPart ? `?${queryPart}` : '';

  const zeroHostMatch = pathPart.match(/^https?:\/\/0\.0\.0\.0(?::\d+)?(\/.*)$/);
  if (zeroHostMatch) {
    return `${zeroHostMatch[1]}${querySuffix}`;
  }

  const localhostMatch = pathPart.match(/^https?:\/\/(?:localhost|127\.0\.0\.1):5000(\/.*)$/);
  if (localhostMatch) {
    return `${localhostMatch[1]}${querySuffix}`;
  }

  try {
    const parsed = new URL(pathPart);
    if (STALE_MEDIA_HOSTS.includes(parsed.hostname)) {
      const origin = getApiOrigin();
      if (origin) {
        return `${origin}${parsed.pathname}${querySuffix}`;
      }
    }
  } catch {
    // relative URL — leave as-is
  }

  if (pathPart.startsWith('/uploads/')) {
    const origin = getApiOrigin();
    if (origin) return `${origin}${pathPart}${querySuffix}`;
  }

  return url;
}

/** Resolve a URL for HTML audio/video playback (absolute, correct API host). */
export function resolveMediaPlaybackUrl(url) {
  const clean = sanitizeMediaUrl(url);
  if (!clean || typeof clean !== 'string') return clean;
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('blob:')) {
    return clean;
  }
  const origin = getApiOrigin();
  return origin ? `${origin}${clean.startsWith('/') ? clean : `/${clean}`}` : clean;
}

/**
 * Request a signed URL for legacy /uploads paths missing sig/expires.
 */
export async function ensureSignedMediaUrl(url, token) {
  const clean = sanitizeMediaUrl(url);
  if (!clean || typeof clean !== 'string') return clean;
  if (!clean.includes('/uploads/')) return clean;
  if (clean.includes('sig=') && clean.includes('expires=')) return clean;

  const cached = signedUrlCache.get(clean);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  if (!token) return clean;

  try {
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const pathOnly = clean.startsWith('http') ? clean : clean;
    const response = await fetch(
      `${apiBase}/api/media/sign-local?path=${encodeURIComponent(pathOnly)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (data?.success && data.url) {
      signedUrlCache.set(clean, { url: data.url, expiresAt: Date.now() + 55 * 60 * 1000 });
      return data.url;
    }
  } catch (error) {
    console.warn('Failed to sign media URL:', error);
  }

  return clean;
}
