import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const MediaViewer = ({ src, type, onClose, alt = '' }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPinchDist, setLastPinchDist] = useState(0);
  const containerRef = useRef(null);
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
    setZoom(z => Math.min(4, Math.max(0.5, z + (e.deltaY < 0 ? 0.1 : -0.1))));
  };

  // Touch pinch-to-zoom support
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastPinchDist(dist);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  }, [position]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastPinchDist > 0) {
        const scale = dist / lastPinchDist;
        setZoom(z => Math.min(4, Math.max(0.5, z * scale)));
      }
      setLastPinchDist(dist);
    } else if (isDragging && zoom > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  }, [lastPinchDist, isDragging, zoom, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setLastPinchDist(0);
    setIsDragging(false);
  }, []);

  // Double-tap to zoom
  const lastTapRef = useRef(0);
  const handleDoubleTap = useCallback((e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (zoom > 1) {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      } else {
        setZoom(2);
      }
    }
    lastTapRef.current = now;
  }, [zoom]);

  if (!safeSrc) return null;

  return (
    <div className="media-fullscreen" onClick={onClose} onWheel={handleWheel}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleZoomOut}
          className="p-2.5 min-w-[44px] min-h-[44px] bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors flex items-center justify-center"
          title="Zoom Out (-)" aria-label="Zoom Out (-)"
        >
          <ZoomOut size={20} />
        </button>
        <span className="px-3 py-2 bg-black/50 text-white rounded-lg text-sm">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2.5 min-w-[44px] min-h-[44px] bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors flex items-center justify-center"
          title="Zoom In (+)" aria-label="Zoom In (+)"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleRotate}
          className="p-2.5 min-w-[44px] min-h-[44px] bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors flex items-center justify-center"
          title="Rotate (R)" aria-label="Rotate (R)"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={handleReset}
          className="p-2.5 min-w-[44px] min-h-[44px] bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors flex items-center justify-center"
          title="Reset" aria-label="Reset"
        >
          <span className="text-xs font-bold">1:1</span>
        </button>
        <button
          onClick={onClose}
          className="p-2.5 min-w-[44px] min-h-[44px] bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center"
          title="Close (ESC)" aria-label="Close (ESC)"
        >
          <X size={20} />
        </button>
      </div>

      {/* Media */}
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className="relative flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleTap}
      >
        {type === 'video' || safeSrc.endsWith('.mp4') || safeSrc.endsWith('.webm') ? (
          <video
            src={safeSrc}
            controls
            autoPlay
            className="max-w-[90%] max-h-[90%] object-contain rounded-lg"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease',
              touchAction: 'none'
            }}
          />
        ) : (
          <img
            src={safeSrc}
            alt={alt}
            loading="lazy"
            className="max-w-[90%] max-h-[90%] object-contain rounded-lg"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease',
              touchAction: 'none'
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
