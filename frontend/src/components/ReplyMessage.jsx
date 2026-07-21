import React from 'react';
import { X, ArrowUp } from 'lucide-react';

const ReplyMessage = ({ replyTo, onCancel, isReplying }) => {
  if (!replyTo && !isReplying) return null;

  const getPreview = (msg) => {
    if (!msg) return 'Replying to message...';
    if (msg.messageType === 'image') return '📷 Photo';
    if (msg.messageType === 'video') return '🎥 Video';
    if (msg.messageType === 'audio' || msg.messageType === 'voice') return '🎤 Voice message';
    if (msg.messageType === 'file') return '📎 File';
    if (msg.messageType === 'location') return '📍 Location';
    if (msg.messageType === 'contact') return '👤 Contact';
    if (msg.messageType === 'gif') return 'GIF';
    return msg.content?.substring(0, 50) || msg.text?.substring(0, 50) || '';
  };

  return (
    <div className="reply-preview flex items-center gap-3">
      <div className="flex-1 min-w-0">
        {replyTo?.sender && (
          <div className="reply-author text-xs truncate">
            Replying to {replyTo.sender.username || replyTo.sender.name}
          </div>
        )}
        <div className="reply-text text-sm truncate mt-1">
          {getPreview(replyTo)}
        </div>
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
         aria-label="Close">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default ReplyMessage;