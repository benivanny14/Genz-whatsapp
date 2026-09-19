import React from 'react';
import { X, ArrowUp } from 'lucide-react';
import FormattedText from './FormattedText';

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
    return (msg.content || msg.text || '').substring(0, 100);
  };

  const preview = getPreview(replyTo);

  return (
    <div className="reply-preview flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="reply-author text-xs truncate">
          {replyTo?.sender
            ? `Replying to ${replyTo.sender.username || replyTo.sender.name}`
            : 'Replying to message'}
        </div>
        {/* `preview` is already a plain string from getPreview() — reading
            `preview.content` rendered an empty line in the reply bar. */}
        <div className="reply-text text-sm truncate mt-1">
          <FormattedText text={preview} />
        </div>
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="p-1.5 hover:bg-dark-hover rounded-full flex-shrink-0 transition-colors text-dark-textSecondary hover:text-dark-text"
         aria-label="Close">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default ReplyMessage;