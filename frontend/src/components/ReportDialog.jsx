import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { X as FiX, Check as FiCheck, AlertTriangle as FiAlertTriangle } from 'lucide-react';

const ReportDialog = ({ messageId, messageContent, senderInfo, onClose }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { reportMessage } = useChat();

  const reasons = [
    { value: 'spam', label: '🚫 Spam', description: 'Repetitive unwanted messages' },
    { value: 'harassment', label: '😤 Harassment', description: 'Threatening or abusive content' },
    { value: 'inappropriate', label: '🔞 Inappropriate', description: 'Explicit or inappropriate content' },
    { value: 'misinformation', label: '🤥 Misinformation', description: 'False or misleading information' },
    { value: 'copyright', label: '©️ Copyright', description: 'Copyrighted content' },
    { value: 'other', label: '❓ Other', description: 'Something else' },
  ];

  const handleReport = async () => {
    if (!reason) {
      setError('Please select a reason');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await reportMessage(messageId, reason, details);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose?.();
        }, 2000);
      } else {
        setError(response.message || 'Failed to report message');
      }
    } catch (err) {
      console.error('Report error:', err);
      setError('Failed to report message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d1b2a] rounded-lg max-w-md w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-700">
          <FiAlertTriangle size={20} className="text-yellow-500" />
          <div>
            <h2 className="text-lg font-bold text-white">Report Message</h2>
            <p className="text-gray-400 text-xs">
              from {senderInfo?.username || 'Unknown'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-2 hover:bg-gray-700 rounded-full"
            disabled={loading}
          >
            <FiX size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Message Preview */}
          <div className="p-4 border-b border-gray-700 bg-gray-900">
            <p className="text-gray-400 text-xs mb-2">Message:</p>
            <p className="text-white text-sm truncate">
              {messageContent || '[Media]'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="m-4 p-3 bg-red-900 bg-opacity-20 border border-red-700 rounded">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="m-4 p-3 bg-green-900 bg-opacity-20 border border-green-700 rounded flex items-center gap-2">
              <FiCheck size={18} className="text-green-400" />
              <p className="text-green-400 text-sm">Thank you! We'll review this report.</p>
            </div>
          )}

          {/* Reason Selection */}
          <div className="p-4">
            <label className="block text-gray-400 text-xs font-semibold mb-3">
              Why are you reporting this message?
            </label>
            <div className="space-y-2">
              {reasons.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setReason(opt.value)}
                  disabled={loading}
                  className={`w-full text-left p-3 rounded-lg transition border-2 ${
                    reason === opt.value
                      ? 'bg-blue-600 bg-opacity-30 border-blue-500'
                      : 'bg-gray-700 border-gray-700 hover:border-gray-600'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={reason === opt.value}
                      onChange={() => setReason(opt.value)}
                      disabled={loading}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{opt.label}</p>
                      <p className="text-gray-400 text-xs">{opt.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Additional Details */}
            {reason && (
              <div className="mt-4">
                <label className="block text-gray-400 text-xs font-semibold mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  disabled={loading}
                  placeholder="Tell us more about why you're reporting this..."
                  className="w-full px-3 py-2 bg-gray-700 text-white text-sm rounded-lg placeholder-gray-500 outline-none border border-gray-600 focus:border-blue-500 transition resize-none max-h-24"
                  rows="3"
                />
                <p className="text-gray-500 text-xs mt-1">
                  {details.length}/500 characters
                </p>
              </div>
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
            onClick={handleReport}
            disabled={loading || !reason}
            className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Reporting...
              </>
            ) : (
              <>
                <FiAlertTriangle size={16} />
                Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportDialog;
