/**
 * PullToRefresh.jsx — Pull-to-refresh gesture for mobile lists.
 *
 * Touch-based: pulls down from the top to trigger a refresh callback.
 * No-ops on desktop (mouse events ignored).
 */
import { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

const PullToRefresh = ({ onRefresh, children, threshold = 80 }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!pulling.current || refreshing) return;
    const distance = Math.max(0, e.touches[0].clientY - startY.current);
    if (distance > 0) setPullDistance(Math.min(distance, threshold * 2));
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh?.();
      } catch (err) {
        console.error('Refresh error:', err);
      }
      setRefreshing(false);
    }
    setPullDistance(0);
    pulling.current = false;
  };

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-center py-3 transition-opacity"
        style={{
          transform: `translateY(${pullDistance - 60}px)`,
          opacity: pullDistance > 0 ? 1 : 0,
        }}
      >
        <RefreshCw
          size={24}
          className={`text-green-500 ${refreshing ? 'animate-spin' : ''}`}
          style={{
            transform: pullDistance >= threshold ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance * 0.5}px)`,
          transition: pulling.current ? 'none' : 'transform 0.3s',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
