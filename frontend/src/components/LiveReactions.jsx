import React, { useState, useEffect, useRef, useCallback } from 'react';

const EMOJIS = ['❤️', '😂', '😮', '😢', '👏', '🔥', '💯', '🙏', '😍', '🤩', '💪', '🎉'];

const LiveReactions = ({ chatId, socket, disabled = false }) => {
  const [reactions, setReactions] = useState([]);
  const [counter, setCounter] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  // Listen for incoming reactions from socket
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.chatId !== chatId) return;
      spawnReaction(data.emoji, false);
    };
    // backend emits 'live_reaction_signal' to others in the chat room
    socket.on('live_reaction_signal', handler);
    return () => socket.off('live_reaction_signal', handler);
  }, [socket, chatId]);

  const spawnReaction = useCallback((emoji, isOwn = true) => {
    const id = Date.now() + Math.random();
    const left = 10 + Math.random() * 60;
    const size = isOwn ? '2rem' : '1.5rem';
    setReactions(prev => [...prev, { id, emoji, left, size }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2200);
  }, []);

  const sendReaction = useCallback((emoji) => {
    if (cooldown || disabled) return;
    setCooldown(true);
    setTimeout(() => setCooldown(false), 800);
    spawnReaction(emoji, true);
    if (socket && chatId) {
      socket.emit('live_reaction', { chatId, emoji });
    }
    setShowPicker(false);
  }, [cooldown, disabled, socket, chatId, spawnReaction]);

  return (
    <div className="relative">
      {/* Floating reactions display */}
      {reactions.map(r => (
        <div
          key={r.id}
          className="fixed pointer-events-none z-[150] select-none"
          style={{
            bottom: '120px',
            right: `${r.left}px`,
            fontSize: r.size,
            animation: 'floatUp 2s ease-out forwards'
          }}
        >
          {r.emoji}
        </div>
      ))}

      {/* Reaction trigger button */}
      <div className="relative">
        <button
          onClick={() => !disabled && setShowPicker(p => !p)}
          disabled={disabled}
          className={`text-xl hover:scale-125 transition-transform active:scale-90 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          title="Send Live Reaction" aria-label="Send Live Reaction"
        >
          🎭
        </button>

        {/* Emoji picker popup */}
        {showPicker && (
          <div className="absolute bottom-10 right-0 bg-[#0d1f35] border border-white/15 rounded-2xl p-3 shadow-2xl z-[200] grid grid-cols-4 gap-2 w-48">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="text-2xl hover:scale-125 transition-transform active:scale-90 text-center p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveReactions;

// Inject floatUp animation once
if (typeof document !== 'undefined' && !document.getElementById('live-reaction-style')) {
  const s = document.createElement('style');
  s.id = 'live-reaction-style';
  s.textContent = `
    @keyframes floatUp {
      0%   { opacity: 1; transform: translateY(0) scale(1); }
      80%  { opacity: 0.8; transform: translateY(-120px) scale(1.3); }
      100% { opacity: 0; transform: translateY(-180px) scale(0.8); }
    }
  `;
  document.head.appendChild(s);
}
