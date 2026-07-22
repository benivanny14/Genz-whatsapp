import React, { useState, useRef, useEffect, useCallback } from 'react';

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍', '🔥'];

const QuickEmojiReactions = ({ messageId, onReact, position = 'top' }) => {
  const [show, setShow] = useState(false);
  const lastTapRef = useRef(0);
  const reactionSentRef = useRef(false);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 500 && !reactionSentRef.current) {
      // Double tap detected - send ❤️ immediately
      reactionSentRef.current = true;
      onReact?.(messageId, '❤️');
      setTimeout(() => { reactionSentRef.current = false; }, 1000);
      return;
    }
    lastTapRef.current = now;
    
    // Toggle picker on long-press instead
    if (!show) {
      setShow(true);
      setTimeout(() => setShow(false), 3000);
    }
  }, [messageId, onReact, show]);

  const handleReaction = (emoji) => {
    onReact?.(messageId, emoji);
    setShow(false);
  };

  // Show picker on right-click / context menu
  useEffect(() => {
    const handler = () => setShow(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="relative inline-flex">
      {/* Double-tap area */}
      <div className="absolute inset-0" onClick={handleDoubleTap} style={{ zIndex: 1 }} />

      {/* Reaction Picker */}
      {show && (
        <div
          className={`absolute z-50 flex gap-1 p-1.5 bg-[#1f2c33] rounded-full shadow-2xl border border-white/10 ${
            position === 'top' ? '-top-10 right-0' : '-bottom-10 right-0'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="w-8 h-8 flex items-center justify-center text-lg rounded-full hover:bg-white/10 transition-colors hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { QUICK_REACTIONS };
export default QuickEmojiReactions;
