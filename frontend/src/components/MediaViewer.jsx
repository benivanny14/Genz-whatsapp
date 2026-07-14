import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const MediaViewer = ({ src, type, onClose, alt = '' }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const safeSrc = String(src || '');

  useEffect(() => {
    // Push state so Android back button can be intercepted
    window.history.pushState({ mediaViewerOpen: true }, '');

    const handlePopState = (e) => {
      onClose();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 3));
      if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.5));
      if (e.key === 'r') setRotation(r => (r + 90) % 360);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      if (window.history.state?.mediaViewerOpen) {
        window.history.back();
      }
    };
  }, [onClose]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation(r => (r + 90) % 360);
  const handleReset = () => { setZoom(1); setRotation(0); };
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.min(3, Math.max(0.5, z + (e.deltaY < 0 ? 0.1 : -0.1))));
  };

  if (!safeSrc) return null;

  return (
    <div className="media-fullscreen" onClick={onClose} onWheel={handleWheel}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
          title="Zoom Out (-)" aria-label="Zoom Out (-)"
        >
          <ZoomOut size={20} />
        </button>
        <span className="px-3 py-2 bg-black/50 text-white rounded-lg text-sm">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
          title="Zoom In (+)" aria-label="Zoom In (+)"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleRotate}
          className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
          title="Rotate (R)" aria-label="Rotate (R)"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
          title="Reset" aria-label="Reset"
        >
          <span className="text-xs font-bold">1:1</span>
        </button>
        <button
          onClick={onClose}
          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          title="Close (ESC)" aria-label="Close (ESC)"
        >
          <X size={20} />
        </button>
      </div>

      {/* Media */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex items-center justify-center"
      >
        {type === 'video' || safeSrc.endsWith('.mp4') || safeSrc.endsWith('.webm') ? (
          <video
            src={safeSrc}
            controls
            autoPlay
            className="max-w-[90%] max-h-[90%] object-contain rounded-lg"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease'
            }}
          />
        ) : (
          <img
            src={safeSrc}
            alt={alt}
            className="max-w-[90%] max-h-[90%] object-contain rounded-lg"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease'
            }}
          />
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg text-sm">
        Scroll to zoom • R to rotate • ESC to close
      </div>
    </div>
  );
};

export default MediaViewer;
