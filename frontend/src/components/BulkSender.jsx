import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Users, 
  X, 
  Clock, 
  Check, 
  AlertTriangle, 
  RefreshCw,
  Calendar,
  Zap
} from 'lucide-react';

const BulkSender = ({ onClose, conversations, user }) => {
  const [recipients, setRecipients] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [delay, setDelay] = useState(1000);
  const [scheduleTime, setScheduleTime] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    bulkSendingEnabled: true,
    maxRecipientsPerBatch: 100,
    delayBetweenMessages: 1000
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = getAuthToken();
      const response = await authFetch(`${resolveApiBase()}/bulk-sender/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching settings:', error);
    }
  };

  const handleRecipientToggle = (conversationId) => {
    setRecipients(prev => {
      if (prev.includes(conversationId)) {
        return prev.filter(id => id !== conversationId);
      } else {
        if (prev.length >= settings.maxRecipientsPerBatch) {
          setError(`Maximum ${settings.maxRecipientsPerBatch} recipients allowed`);
          return prev;
        }
        return [...prev, conversationId];
      }
    });
  };

  const handleSelectAll = () => {
    const allIds = conversations
      .filter(c => !c.isGroup)
      .map(c => c._id)
      .slice(0, settings.maxRecipientsPerBatch);
    setRecipients(allIds);
  };

  const handleClearAll = () => {
    setRecipients([]);
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    if (!message && !mediaUrl) {
      setError('Please enter a message or add media');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const token = getAuthToken();
      const response = await authFetch(`${resolveApiBase()}/bulk-sender/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipients,
          content: message,
          messageType,
          mediaUrl,
          delay,
          scheduleTime: scheduleTime || null
        })
      });

      const data = await response.json();
      if (data.success) {
        setResults(data);
        if (!scheduleTime) {
          setMessage('');
          setMediaUrl('');
          setRecipients([]);
        }
      } else {
        setError(data.message || 'Failed to send bulk message');
      }
    } catch (error) {
      setError('Error sending bulk message: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Bulk Message Sender</h2>
              <p className="text-sm text-gray-500">Send message to multiple contacts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {results && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-green-800">
                  {scheduleTime ? 'Message Scheduled' : 'Messages Sent'}
                </h3>
              </div>
              <div className="text-sm text-green-700">
                {scheduleTime ? (
                  <p>Scheduled for: {new Date(scheduleTime).toLocaleString()}</p>
                ) : (
                  <p>Sent: {results.sent} | Failed: {results.failed}</p>
                )}
              </div>
            </div>
          )}

          {/* Recipients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">
                Recipients ({recipients.length}/{settings.maxRecipientsPerBatch})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {conversations
                .filter(c => !c.isGroup)
                .map(conversation => (
                  <div
                    key={conversation._id}
                    className="flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={recipients.includes(conversation._id)}
                      onChange={() => handleRecipientToggle(conversation._id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      {conversation.name?.[0] || '?'}
                    </div>
                    <span className="text-sm text-gray-700">{conversation.name || 'Unknown'}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">Message</h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
            />
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">Schedule (Optional)</h3>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm text-gray-700">Advanced Settings</span>
            <Zap className={`w-4 h-4 text-gray-500 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
          </button>

          {/* Settings */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Delay between messages (ms)</label>
                  <input
                    type="number"
                    value={delay}
                    onChange={(e) => setDelay(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSend}
            disabled={isSending || recipients.length === 0}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {scheduleTime ? 'Scheduling...' : 'Sending...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {scheduleTime ? 'Schedule Message' : 'Send Bulk Message'}
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BulkSender;
