import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { sanitizeMediaUrl, ensureSignedMediaUrl } from '../utils/sanitizeMediaUrl';
import { useChat } from '../context/ChatContext';

/**
 * Resolves protected /uploads URLs with HMAC signatures before rendering.
 *
 * FIX: `mods.autoDownloadMedia` was a dead toggle — the setting existed in
 * GENZSettings and defaulted to true in db.js, but nothing ever read it, so
 * images/videos always loaded immediately regardless of the setting. This
 * is the one place both message-media renders go through, so gating here
 * covers both without touching every render branch in ChatArea.jsx.
 */
export default function SignedMedia({
  src,
  alt = '',
  className = '',
  as = 'img',
  respectAutoDownload = true,
  ...rest
}) {
  const [resolvedSrc, setResolvedSrc] = useState(() => sanitizeMediaUrl(src));
  let mods;
  try {
    // useChat() throws outside a ChatProvider (e.g. isolated usage/tests);
    // fall back to "always download" rather than crashing the media render.
    ({ mods } = useChat());
  } catch (_) {
    mods = null;
  }
  const autoDownloadEnabled = mods?.autoDownloadMedia !== false;
  const isGateable = respectAutoDownload && (as === 'img' || as === 'video');
  const [revealed, setRevealed] = useState(!isGateable || autoDownloadEnabled);

  useEffect(() => {
    let cancelled = false;
    const clean = sanitizeMediaUrl(src);
    setResolvedSrc(clean);

    if (!clean || !clean.includes('/uploads/') || (clean.includes('sig=') && clean.includes('expires='))) {
      return undefined;
    }

    const token = localStorage.getItem('token');
    ensureSignedMediaUrl(clean, token).then((signed) => {
      if (!cancelled && signed) setResolvedSrc(signed);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!resolvedSrc) return null;

  if (isGateable && !revealed) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
        className={`${className} flex flex-col items-center justify-center gap-2 bg-dark-bg/40 border border-dashed border-dark-border/60 rounded-lg min-h-[140px] w-full text-dark-textSecondary`}
        aria-label={as === 'video' ? 'Tap to download video' : 'Tap to download image'}
      >
        <Download size={22} />
        <span className="text-xs font-medium">Tap to download {as === 'video' ? 'video' : 'image'}</span>
      </button>
    );
  }

  if (as === 'video') {
    return <video src={resolvedSrc} className={className} {...rest} />;
  }

  if (as === 'audio') {
    return <audio src={resolvedSrc} className={className} {...rest} />;
  }

  return <img src={resolvedSrc} alt={alt} className={className} {...rest} />;
}
