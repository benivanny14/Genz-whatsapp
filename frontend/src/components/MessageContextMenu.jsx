import React, { useState } from 'react';
import {
  Star as FiStar,
  MessageCircle as FiMessageCircle,
  Share2 as FiShare2,
  Trash2 as FiTrash2,
  Copy as FiCopy,
  Info as FiInfo,
  AlertTriangle as FiAlertTriangle,
  Edit2 as FiEdit2,
  Pin as FiPin,
  Smile as FiSmile,
} from 'lucide-react';
import MessageInfo from './MessageInfo';
import ForwardDialog from './ForwardDialog';
import ReportDialog from './ReportDialog';

const MessageContextMenu = ({
  message,
  position,
  conversationId,
  onClose,
  onDelete,
  onEdit,
  onReply,
  onToggleStar,
  onPin,
  onReaction,
  currentUserId,
}) => {
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const quickReactions = ['❤️', '😂', '😮', '😢', '😡', '👍'];

  const senderId = message?.sender?._id || message?.senderId || message?.sender;
  const isOwnMessage = String(senderId || '') === String(currentUserId || '');

  const menuItems = [
    // Actions for all messages
    {
      icon: <FiSmile size={18} />,
      label: 'React',
      onClick: () => setShowReactionPicker(true),
      color: 'text-pink-400',
    },
    {
      icon: <FiInfo size={18} />,
      label: 'Message Info',
      onClick: () => setShowMessageInfo(true),
      color: 'text-blue-400',
    },
    {
      icon: <FiStar size={18} />,
      label: message.isStarred ? 'Unstar' : 'Star',
      onClick: onToggleStar,
      color: message.isStarred ? 'text-yellow-400' : 'text-gray-400',
    },
    {
      icon: <FiCopy size={18} />,
      label: 'Copy',
      onClick: () => {
        let textToCopy = message.content || message.messageType;
        if (message.messageType === 'structured' && Array.isArray(message.structuredContent)) {
          const textPart = message.structuredContent.find(c => c.type === 'text');
          if (textPart && textPart.value) {
            textToCopy = textPart.value;
          }
        }
        navigator.clipboard.writeText(textToCopy);
        onClose?.();
      },
      color: 'text-gray-400',
      show: message.messageType === 'text' || message.messageType === 'structured',
    },
    {
      icon: <FiShare2 size={18} />,
      label: 'Forward',
      onClick: () => setShowForwardDialog(true),
      color: 'text-green-400',
    },
    {
      icon: <FiMessageCircle size={18} />,
      label: 'Reply',
      onClick: () => {
        onReply?.(message);
        onClose?.();
      },
      color: 'text-cyan-400',
    },

    // Owner actions
    isOwnMessage && {
      icon: <FiEdit2 size={18} />,
      label: 'Edit',
      onClick: onEdit,
      color: 'text-purple-400',
      show: message.messageType === 'text',
    },
    isOwnMessage && {
      icon: <FiTrash2 size={18} />,
      label: 'Delete',
      onClick: onDelete,
      color: 'text-red-400',
    },

    // Pin message (for admins or own messages)
    {
      icon: <FiPin size={18} />,
      label: message.isPinned ? 'Unpin' : 'Pin',
      onClick: () => { onPin?.(message); onClose?.(); },
      color: 'text-orange-400',
    },

    // Report (for other's messages)
    !isOwnMessage && {
      icon: <FiAlertTriangle size={18} />,
      label: 'Report',
      onClick: () => setShowReportDialog(true),
      color: 'text-yellow-600',
    },
  ].filter(item => item && (item.show !== false));

  return (
    <>
      {/* Context Menu */}
      <div
        className="fixed bg-[#1a2332] border border-gray-600 rounded-lg shadow-xl z-50 py-2 min-w-max"
        style={{
          top: Math.min(position?.y || 0, window.innerHeight - 350) + 'px',
          left: Math.min(position?.x || 0, window.innerWidth - 200) + 'px',
        }}
      >
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              item.onClick?.();
              if (item.label !== 'Message Info' && item.label !== 'Forward' && item.label !== 'Report') {
                onClose?.();
              }
            }}
            className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-700 transition text-left text-sm"
          >
            <span className={item.color}>{item.icon}</span>
            <span className="text-gray-200">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Overlay to close menu */}
      {position && (
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
        />
      )}

      {/* Modals */}
      {showMessageInfo && (
        <MessageInfo
          messageId={message._id || message.id}
          onClose={() => {
            setShowMessageInfo(false);
            onClose?.();
          }}
        />
      )}

      {showForwardDialog && (
        <ForwardDialog
          messageId={message._id || message.id}
          messageContent={
            message.messageType === 'structured' && Array.isArray(message.structuredContent)
              ? (message.structuredContent.find(c => c.type === 'text')?.value || '[Media]')
              : (message.content || message.messageType)
          }
          conversationId={message.conversationId || conversationId}
          onClose={() => {
            setShowForwardDialog(false);
            onClose?.();
          }}
        />
      )}

      {showReportDialog && !isOwnMessage && (
        <ReportDialog
          messageId={message._id || message.id}
          messageContent={
            message.messageType === 'structured' && Array.isArray(message.structuredContent)
              ? (message.structuredContent.find(c => c.type === 'text')?.value || '[Media]')
              : (message.content || message.messageType)
          }
          senderInfo={message.sender}
          onClose={() => {
            setShowReportDialog(false);
            onClose?.();
          }}
        />
      )}

      {/* Reaction Picker */}
      {showReactionPicker && (
        <>
          <div
            className="fixed bg-[#1a2332] border border-gray-600 rounded-lg shadow-xl z-50 py-2 px-3"
            style={{
              top: Math.min(position?.y || 0, window.innerHeight - 200) + 'px',
              left: Math.min(position?.x || 0, window.innerWidth - 300) + 'px',
            }}
          >
            <div className="flex gap-2">
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReaction?.(message._id || message.id, emoji);
                    setShowReactionPicker(false);
                    onClose?.();
                  }}
                  className="text-2xl hover:scale-125 transition-transform p-1"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setShowReactionPicker(false);
              onClose?.();
            }}
          />
        </>
      )}
    </>
  );
};

export default MessageContextMenu;
