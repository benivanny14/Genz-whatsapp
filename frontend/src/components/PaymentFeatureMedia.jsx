import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Upload } from 'lucide-react';

/**
 * Normalizes old PaymentFeature documents (separate images/videos arrays) and
 * newer API responses (mediaGallery) into one ordered list for every client.
 */
export const getPaymentFeatureMedia = (feature = {}) => {
  const fromGallery = Array.isArray(feature.mediaGallery) ? feature.mediaGallery : [];
  const source = fromGallery.length
    ? fromGallery
    : [
        ...(Array.isArray(feature.images) ? feature.images : []).map((item) => ({ ...item, type: 'image' })),
        ...(Array.isArray(feature.videos) ? feature.videos : []).map((item) => ({ ...item, type: 'video' }))
      ];

  return source
    .map((item, index) => {
      const url = item?.url || item?.mediaUrl || item?.fileUrl || item?.src || '';
      if (!url) return null;
      const type = item.type === 'video' || item.mediaType === 'video' ? 'video' : 'image';
      return {
        ...item,
        url,
        type,
        key: `${item.publicId || url}-${index}`
      };
    })
    .filter(Boolean);
};

const PaymentFeatureMedia = ({ feature, className = '', compact = false }) => {
  const media = useMemo(() => getPaymentFeatureMedia(feature), [feature]);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = media.length ? Math.min(activeIndex, media.length - 1) : 0;
  const active = media[safeIndex];

  const previous = (event) => {
    event?.stopPropagation();
    setActiveIndex((index) => (index - 1 + media.length) % media.length);
  };
  const next = (event) => {
    event?.stopPropagation();
    setActiveIndex((index) => (index + 1) % media.length);
  };

  if (!active) {
    return (
      <div className={`flex h-48 items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <Upload className="h-12 w-12 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-black ${compact ? 'min-h-28' : 'min-h-48'} ${className}`}>
      {active.type === 'video' ? (
        <video
          key={active.key}
          src={active.url}
          className="h-full max-h-[32rem] min-h-28 w-full object-contain"
          controls
          playsInline
          preload="metadata"
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <img
          key={active.key}
          src={active.url}
          alt={active.alt || feature?.name || 'Feature media'}
          className="h-full max-h-[32rem] min-h-28 w-full object-contain"
          loading="lazy"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      )}

      {media.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous media"
            onClick={previous}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next media"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
            {active.type === 'video' && <Play size={11} fill="currentColor" />}
            {safeIndex + 1}/{media.length}
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentFeatureMedia;
