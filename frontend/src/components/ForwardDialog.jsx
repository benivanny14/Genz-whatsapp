import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { X as FiX, Check as FiCheck } from 'lucide-react';

const ForwardDialog = ({ messageId, messageContent, conversationId, onClose }) => {
  const [selectedChats, setSelectedChats] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { conversations, forwardMessage } = useChat();

  // Filter out current conversation and get available chats
  const availableChats = conversations.filter(conv => conv._id !== conversationId);

  const toggleChat = (chatId) => {
    setSelectedChats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };

  const handleForward = async () => {
    if (selectedChats.size === 0) {
      setError('Please select at least one conversation');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await forwardMessage(messageId, Array.from(selectedChats));
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose?.();
        }, 1500);
      } else {
        setError(response.message || 'Failed to forward message');
      }
    } catch (err) {
      console.error('Forward error:', err);
      setError('Failed to forward message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d1b2a] rounded-lg max-w-md w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Forward Message</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full"
            disabled={loading}
          >
            <FiX size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Message Preview */}
          <div className="p-4 border-b border-gray-700">
            <p className="text-gray-400 text-xs mb-2">Message to forward:</p>
            <div className="bg-gray-700 rounded p-3">
              <p className="text-white text-sm truncate">
                {messageContent || '[Media]'}
              </p>
            </div>
          </div>

          {/* Chat Selection */}
          {error && (
            <div className="px-4 pt-4 pb-0">
              <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded px-3 py-2 mb-2">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="px-4 pt-4 pb-0">
              <div className="bg-green-900 bg-opacity-20 border border-green-700 rounded px-3 py-2 mb-2 flex items-center gap-2">
                <FiCheck size={18} className="text-green-400" />
                <p className="text-green-400 text-sm">Message forwarded!</p>
              </div>
            </div>
          )}

          <div className="p-4 space-y-2">
            {availableChats.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No other conversations available</p>
            ) : (
              availableChats.map(chat => (
                <button
                  key={chat._id}
                  onClick={() => toggleChat(chat._id)}
                  disabled={loading}
                  className={`w-full text-left p-3 rounded-lg transition flex items-center gap-3 ${
                    selectedChats.has(chat._id)
                      ? 'bg-blue-600 bg-opacity-30 border border-blue-500'
                      : 'bg-gray-700 hover:bg-gray-600 border border-transparent'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedChats.has(chat._id)
                      ? 'bg-blue-600 border-blue-500'
                      : 'border-gray-500'
                  }`}>
                    {selectedChats.has(chat._id) && (
                      <FiCheck size={14} className="text-white" />
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <img
                      src={chat.groupPhoto || chat.participants?.[0]?.profilePicture || 'https://via.placeholder.com/32'}
                      alt={chat.groupName || chat.participants?.[0]?.username}
                      className="w-8 h-8 rounded-full object-cover inline mr-2"
                    />
                    <span className="text-white text-sm truncate">
                      {chat.groupName || chat.participants?.[0]?.username || 'Unknown'}
                    </span>
                  </div>

                  {/* Selection Count Badge */}
                  {selectedChats.has(chat._id) && (
                    <div className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                      ✓
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={loading || selectedChats.size === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Forwarding...
              </>
            ) : (
              <>
                <FiCheck size={16} />
                Forward ({selectedChats.size})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardDialog;
