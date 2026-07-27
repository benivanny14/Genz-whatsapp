import React, { useState, useEffect } from 'react';
import { Mic, Keyboard } from 'lucide-react';

/**
 * TypingStatus Component
 * Shows typing or recording indicator with green color as requested
 * Can be used in chat list or inside chat
 */
const TypingStatus = ({ 
  isTyping = false, 
  isRecording = false, 
  userName = '', 
  showInChat = false,
  className = ''
}) => {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (isTyping || isRecording) {
      setVisible(true);
      setFadeOut(false);
    } else {
      setFadeOut(true);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isTyping, isRecording]);

  if (!visible) return null;

  const statusText = isRecording ? 'recording voice...' : 'typing...';
  const displayName = userName || 'Someone';

  return (
    <div 
      className={`typing-status ${showInChat ? 'in-chat' : 'in-list'} ${className} ${fadeOut ? 'fade-out' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: showInChat ? '4px 12px' : '2px 0',
        color: '#00a884',
        fontSize: showInChat ? '12px' : '13px',
        fontWeight: '500',
        transition: 'opacity 0.3s ease',
        opacity: fadeOut ? 0 : 1
      }}
    >
      {/* Typing dots animation */}
      <div style={{
        display: 'flex',
        gap: '3px',
        alignItems: 'center'
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#00a884',
              animation: `typingBounce 1.4s infinite ease-in-out`,
              animationDelay: `${i * 0.16}s`,
              opacity: 0.6
            }}
          />
        ))}
      </div>

      {/* Status text */}
      <span>{displayName} {statusText}</span>

      {/* Icon */}
      {isRecording && <Mic size={12} />}
      {isTyping && <Keyboard size={12} />}
    </div>
  );
};

export default TypingStatus;