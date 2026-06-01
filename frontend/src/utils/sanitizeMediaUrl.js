/**
 * Sanitize media URLs that contain invalid hosts like 0.0.0.0
 * and ensure local uploads can be signed for protected /uploads serving.
 */

const signedUrlCache = new Map();

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

  return url;
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
