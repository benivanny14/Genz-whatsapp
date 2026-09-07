import React, { useEffect, useState } from 'react'
import { sanitizeMediaUrl, ensureSignedMediaUrl } from '../utils/sanitizeMediaUrl'
import { getAuthToken } from '../utils/tokenStore'

/**
 * Renders status media (image/video/audio) from a URL that may be a relative
 * /uploads/status path or an absolute API URL.
 *
 * Two problems are solved here:
 * 1. Production requires HMAC-signed URLs for /uploads (and /api/uploads/status),
 *    so protected URLs are signed via /api/media/sign-local before rendering.
 * 2. On Capacitor/emulator builds the page origin (https://localhost) differs
 *    from the API origin (e.g. http://10.0.2.2:5000) and the WebView blocks
 *    http:// media elements as mixed content — fetch() is allowed but
 *    <img>/<video> are not. When that happens the media is fetched and
 *    displayed through a blob: URL so statuses actually render instead of
 *    showing a broken image.
 */
const mediaNeedsBlob = (url) => {
  if (!url) return false
  if (url.startsWith('blob:') || url.startsWith('data:')) return false
  if (!url.startsWith('http:')) return false
  try {
    return typeof window !== 'undefined' && window.location?.protocol === 'https:'
  } catch {
    return false
  }
}

export function useStatusMediaUrl(src) {
  const clean = sanitizeMediaUrl(src || '')
  const [resolvedUrl, setResolvedUrl] = useState(clean)

  // Sign protected /uploads URLs (production) before rendering
  useEffect(() => {
    let cancelled = false
    setResolvedUrl(clean)
    if (!clean || !clean.includes('/uploads/') || (clean.includes('sig=') && clean.includes('expires='))) {
      return undefined
    }
    ensureSignedMediaUrl(clean, getAuthToken()).then((signed) => {
      if (!cancelled && signed) setResolvedUrl(signed)
    })
    return () => {
      cancelled = true
    }
  }, [clean])

  // Blob fallback for http media on https pages (Capacitor/emulator WebView)
  const [blobUrl, setBlobUrl] = useState(null)
  useEffect(() => {
    setBlobUrl(null)
    if (!mediaNeedsBlob(resolvedUrl)) return undefined
    let cancelled = false
    fetch(resolvedUrl)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('media fetch failed'))))
      .then((blob) => {
        if (!cancelled) setBlobUrl(URL.createObjectURL(blob))
      })
      .catch(() => {
        // Fall back to the raw URL — it may still work in some environments
      })
    return () => {
      cancelled = true
    }
  }, [resolvedUrl])

  return blobUrl || resolvedUrl
}

export default function StatusMedia({
  src,
  type = 'image',
  alt = '',
  className = '',
  style,
  autoPlay = false,
  controls = false,
  muted = false,
  loading = 'lazy'
}) {
  const url = useStatusMediaUrl(src)
  if (!url) return null

  if (type === 'video') {
    return (
      <video
        src={url}
        className={className}
        style={style}
        autoPlay={autoPlay}
        controls={controls}
        muted={muted}
        playsInline
      />
    )
  }
  if (type === 'audio') {
    return <audio src={url} className={className} style={style} autoPlay={autoPlay} controls={controls} />
  }
  return <img src={url} alt={alt} className={className} style={style} loading={loading} />
}