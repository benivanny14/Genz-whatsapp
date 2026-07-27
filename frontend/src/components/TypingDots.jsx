import React from 'react';

// WhatsApp-style animated typing dots
const TypingDots = ({ size = 'sm', color = '#00a884' }) => {
  const dotSize = size === 'sm' ? 6 : 8;
  return (
    <span className="typing-dots-wrapper inline-flex items-end gap-[3px]" aria-label="typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            backgroundColor: color,
            display: 'inline-block',
            animation: `typingBounce 1.2s infinite ease-in-out`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </span>
  );
};

export default TypingDots;
