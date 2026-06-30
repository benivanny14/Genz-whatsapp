import { useEffect, useState } from 'react';
import { sanitizeMediaUrl, ensureSignedMediaUrl } from '../utils/sanitizeMediaUrl';

/**
 * Resolves protected /uploads URLs with HMAC signatures before rendering.
 */
export default function SignedMedia({
  src,
  alt = '',
  className = '',
  as = 'img',
  ...rest
}) {
  const [resolvedSrc, setResolvedSrc] = useState(() => sanitizeMediaUrl(src));

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

  if (as === 'video') {
    return <video src={resolvedSrc} className={className} {...rest} />;
  }

  if (as === 'audio') {
    return <audio src={resolvedSrc} className={className} {...rest} />;
  }

  return <img src={resolvedSrc} alt={alt} className={className} {...rest} />;
}
