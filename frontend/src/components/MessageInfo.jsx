import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import {
  X as FiX,
  CheckCircle as FiCheckCircle,
  Check as FiCheck,
  Clock as FiClock,
} from 'lucide-react';

const MessageInfo = ({ messageId, onClose }) => {
  const [messageInfo, setMessageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { getMessageInfo } = useChat();

  useEffect(() => {
    const fetchMessageInfo = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getMessageInfo(messageId);
        if (response.success) {
          setMessageInfo(response.data);
        } else {
          setError(response.message || 'Failed to fetch message info');
        }
      } catch (err) {
        console.error('Fetch message info error:', err);
        setError('Failed to load message info');
      } finally {
        setLoading(false);
      }
    };

    fetchMessageInfo();
  }, [messageId, getMessageInfo]);

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <FiCheck size={16} className="text-gray-400" />;
      case 'delivered':
        return <FiCheck size={16} className="text-blue-400" />;
      case 'read':
        return <FiCheckCircle size={16} className="text-blue-500" />;
      default:
        return <FiClock size={16} className="text-gray-400" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return 'Read';
      default:
        return 'Sending';
    }
  };

  const forwardCount = messageInfo?.forwardCount || messageInfo?.forwards || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d1b2a] rounded-lg max-w-md w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Message Info</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full"
          >
            <FiX size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-4 text-red-400">
              {error}
            </div>
          )}

          {!loading && messageInfo && (
            <>
              {/* Message Content Preview */}
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Message</p>
                <p className="text-white truncate">
                  {messageInfo.content || `[${messageInfo.messageType}]`}
                </p>
              </div>

              {/* Sent Time */}
              <div className="border-b border-gray-700 pb-3">
                <p className="text-gray-400 text-xs mb-1">Sent</p>
                <p className="text-white">
                  {formatDate(messageInfo.createdAt)} at {formatTime(messageInfo.createdAt)}
                </p>
              </div>

              {/* Edited Status */}
              {messageInfo.isEdited && (
                <div className="border-b border-gray-700 pb-3">
                  <p className="text-gray-400 text-xs mb-1">Edited</p>
                  <p className="text-white">
                    {formatDate(messageInfo.editedAt)} at {formatTime(messageInfo.editedAt)}
                  </p>
                </div>
              )}

              {/* Delivery Status */}
              <div className="border-b border-gray-700 pb-3">
                <p className="text-gray-400 text-xs mb-2">Delivery Status</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(messageInfo.status)}
                  <span className="text-white text-sm capitalize">
                    {getStatusLabel(messageInfo.status)}
                  </span>
                </div>
              </div>

              {/* Read By (if exists) */}
              {messageInfo.readBy && messageInfo.readBy.length > 0 && (
                <div className="border-b border-gray-700 pb-3">
                  <p className="text-gray-400 text-xs mb-2">Read By ({messageInfo.readBy.length})</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {messageInfo.readBy.map((reader) => (
                      <div key={reader.user?._id || reader.user} className="flex items-center justify-between text-sm">
                        <span className="text-white truncate">
                          {reader.username || reader.user?.username || reader.user}
                        </span>
                        <span className="text-gray-400 text-xs whitespace-nowrap ml-2">
                          {formatTime(reader.readAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reactions */}
              {messageInfo.reactions && messageInfo.reactions.length > 0 && (
                <div className="border-b border-gray-700 pb-3">
                  <p className="text-gray-400 text-xs mb-2">Reactions ({messageInfo.reactions.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {messageInfo.reactions.map((reaction) => (
                      <div key={`${reaction.user}-${reaction.emoji}`} className="bg-gray-700 rounded px-2 py-1">
                        <span className="text-lg">{reaction.emoji}</span>
                        <span className="text-gray-400 text-xs ml-1">
                          {reaction.user === messageInfo.senderId ? 'You' : reaction.username}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Forward Count */}
              {forwardCount > 0 && (
                <div className="border-b border-gray-700 pb-3">
                  <p className="text-gray-400 text-xs">Forwarded {forwardCount} time{forwardCount !== 1 ? 's' : ''}</p>
                </div>
              )}

              {/* View-Once Info */}
              {messageInfo.isViewOnce && (
                <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded px-3 py-2">
                  <p className="text-blue-400 text-sm">👁️ This is a view-once message</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageInfo;
