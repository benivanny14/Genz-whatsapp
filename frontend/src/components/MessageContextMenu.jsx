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
  Bookmark as FiBookmark,
  Shield as FiShield,
  Lock as FiLock,
} from 'lucide-react';
import MessageInfo from './MessageInfo';
import ForwardDialog from './ForwardDialog';
import ReportDialog from './ReportDialog';
import MessageShareToStatus from './MessageShareToStatus';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const EMOJI_GRID = [
  ['😊', '😂', '❤️', '🔥', '👍', '👏', '😍', '😭'],
  ['😮', '😢', '😡', '🤔', '💀', '🙏', '✨', '🎉'],
  ['🤮', '😈', '🤡', '👀', '💯', '⭐', '🥳', '🫡'],
  ['🫶', '💪', '🤝', '🙈', '😱', '🤯', '💜', '🤍'],
];

const MessageContextMenu = ({
  message,
  position,
  conversationId,
  onClose,
  onDelete,
  onEdit,
  onReply,
  onReplyPrivately,
  onToggleStar,
  onPin,
  onReaction,
  currentUserId,
  isGroupChat = false,
  conversation = {},
}) => {
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showShareToStatus, setShowShareToStatus] = useState(false);
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
      icon: <FiShare2 size={18} />,
      label: 'Share to Status',
      onClick: () => setShowShareToStatus(true),
      color: 'text-emerald-400',
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

    // Reply privately (group chats only, not own message)
    isGroupChat && !isOwnMessage && {
      icon: <FiShield size={18} />,
      label: 'Reply Privately',
      onClick: () => {
        onReplyPrivately?.(message);
        onClose?.();
      },
      color: 'text-indigo-400',
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

    // Admin delete for everyone (group chats)
    isGroupChat && !isOwnMessage && (conversation?.isGroup || isGroupChat) && {
      icon: <FiLock size={18} />,
      label: 'Delete for Everyone',
      onClick: async () => {
        const API_URL = resolveApiBase();
        try {
          await authFetch(`${API_URL}/chat/messages/${message._id || message.id}/admin-delete-for-everyone`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forEveryone: true })
          });
        } catch (error) {
          console.error('Admin delete failed:', error);
        }
        onClose?.();
      },
      color: 'text-red-400',
    },

    // Keep in chat for disappearing messages
    isOwnMessage && message.disappearAt && {
      icon: <FiBookmark size={18} />,
      label: message.keptBy && message.keptBy.length > 0 ? 'Unkeep' : 'Keep in chat',
      onClick: async () => {
        try {
          const API_URL = resolveApiBase();
          await authFetch(`${API_URL}/chat/messages/${message._id || message.id}/keep`, {
            method: 'PUT',
          });
          // Refresh will be handled by socket event
        } catch (error) {
          console.error('Keep/unkeep failed:', error);
        }
        onClose?.();
      },
      color: (message.keptBy && message.keptBy.length > 0) ? 'text-yellow-400' : 'text-green-400',
      show: true,
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

      {showShareToStatus && (
        <MessageShareToStatus
          message={message}
          onClose={() => {
            setShowShareToStatus(false);
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

      {/* ═══ WhatsApp-style Reaction Picker ═══ */}
      {showReactionPicker && (
        <>
          {/* Quick reactions row */}
          <div
            className="fixed z-[9999] animate-fadeIn"
            style={{
              bottom: Math.min((window.innerHeight - (position?.y || 0)), window.innerHeight - 60) > 80
                ? undefined
                : (position?.y || 0) + 'px',
              top: Math.min((position?.y || 0), window.innerHeight - 350) < 80
                ? (position?.y || 0) + 'px'
                : undefined,
              left: Math.min(Math.max(8, (position?.x || 0) - 140), window.innerWidth - 300) + 'px',
            }}
          >
            {/* Quick reaction bar */}
            <div className="bg-[#1f2c34] border border-white/10 rounded-2xl shadow-2xl px-2 py-1.5 flex items-center gap-0.5">
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReaction?.(message._id || message.id, emoji);
                    setShowReactionPicker(false);
                    onClose?.();
                  }}
                  className="text-2xl hover:scale-125 active:scale-90 transition-all duration-150 p-1.5 rounded-full hover:bg-white/10"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => setShowReactionPicker('full')}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors ml-0.5"
                title="More emojis"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              </button>
            </div>
            {/* Full emoji grid (expandable) */}
            {showReactionPicker === 'full' && (
              <div className="bg-[#1f2c34] border border-white/10 rounded-2xl shadow-2xl p-3 mt-1">
                {EMOJI_GRID.map((row, ri) => (
                  <div key={ri} className="flex justify-center gap-1 mb-1">
                    {row.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onReaction?.(message._id || message.id, emoji);
                          setShowReactionPicker(false);
                          onClose?.();
                        }}
                        className="text-xl w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 hover:scale-110 active:scale-90 transition-all duration-100"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            className="fixed inset-0 z-[9998]"
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
