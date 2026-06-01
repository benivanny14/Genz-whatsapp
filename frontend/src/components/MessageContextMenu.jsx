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
  onToggleStar,
  currentUserId,
}) => {
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const senderId = message?.sender?._id || message?.senderId || message?.sender;
  const isOwnMessage = String(senderId || '') === String(currentUserId || '');

  const menuItems = [
    // Actions for all messages
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
        navigator.clipboard.writeText(message.content || message.messageType);
        onClose?.();
      },
      color: 'text-gray-400',
      show: message.messageType === 'text',
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
      onClick: () => onClose?.(),
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
          top: `${position?.y || 0}px`,
          left: `${position?.x || 0}px`,
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
          messageContent={message.content || message.messageType}
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
          messageContent={message.content || message.messageType}
          senderInfo={message.sender}
          onClose={() => {
            setShowReportDialog(false);
            onClose?.();
          }}
        />
      )}
    </>
  );
};

export default MessageContextMenu;
