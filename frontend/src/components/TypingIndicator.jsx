import React from 'react';

const TypingIndicator = ({ isTyping, isRecording = false, userName = 'Someone' }) => {
  if (!isTyping && !isRecording) return null;

  const text = isRecording ? `${userName} is recording voice...` : `${userName} is typing`;

  return (
    <div className="typing-indicator-green">
      <div className="typing-indicator">
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
      <span className="text-sm">{text}</span>
    </div>
  );
};

export default TypingIndicator;