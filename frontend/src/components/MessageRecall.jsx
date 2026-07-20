import React, { useState } from 'react';
import { RotateCcw, X, Clock, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageRecall = ({ message, onRecall, onCancel }) => {
  const [isRecalling, setIsRecalling] = useState(false);

  const timeLimit = 10 * 60 * 1000; // 10 minutes in milliseconds
  const timeElapsed = new Date() - new Date(message.timestamp);
  const canRecall = timeElapsed < timeLimit;

  const handleRecall = async () => {
    setIsRecalling(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRecalling(false);
    if (onRecall) {
      onRecall(message._id);
    }
  };

  const formatTimeRemaining = () => {
    const remaining = timeLimit - timeElapsed;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <RotateCcw className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Recall Message</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Preview */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-[#00a884]/20">
          <p className="text-gray-400 text-xs mb-2">Message to recall:</p>
          <p className="text-white text-sm line-clamp-3">{message.content}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
            <Clock size={12} />
            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Time Limit Warning */}
        {canRecall ? (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="text-blue-500" size={16} />
              <div>
                <p className="text-blue-500 text-sm font-medium">Time remaining</p>
                <p className="text-blue-400 text-xs">{formatTimeRemaining()}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-red-500 text-xs">
                This message cannot be recalled. Messages can only be recalled within 10 minutes of sending.
              </p>
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
            <p className="text-yellow-500 text-xs">
              Recalling a message will remove it for everyone in the chat. This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRecall}
            disabled={!canRecall || isRecalling}
            className="flex-1 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors disabled:bg-red-500/30 disabled:text-red-500/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRecalling ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Recalling...
              </>
            ) : (
              'Recall'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Message Recall Button Component
export const MessageRecallButton = ({ message, onRecall }) => {
  const [showModal, setShowModal] = useState(false);
  const timeLimit = 10 * 60 * 1000;
  const timeElapsed = new Date() - new Date(message.timestamp);
  const canRecall = timeElapsed < timeLimit;

  return (
    <div className="relative">
      <button
        onClick={() => canRecall && setShowModal(true)}
        disabled={!canRecall}
        className={`p-2 rounded-full transition-colors ${
          canRecall
            ? 'text-gray-400 hover:text-red-500 hover:bg-red-500/10'
            : 'text-gray-600 cursor-not-allowed'
        }`}
        title={canRecall ? 'Recall message' : 'Time limit exceeded'}
      >
        <RotateCcw size={16} />
      </button>

      <AnimatePresence>
        {showModal && (
          <MessageRecall
            message={message}
            onRecall={(messageId) => {
              onRecall(messageId);
              setShowModal(false);
            }}
            onCancel={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Recalled Message Indicator Component
export const RecalledMessageIndicator = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 text-gray-500 text-xs italic"
    >
      <RotateCcw size={12} />
      <span>This message was recalled</span>
    </motion.div>
  );
};

// Message Recall Settings Component
export const MessageRecallSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <RotateCcw size={18} className="text-[#00a884]" />
            Message Recall
          </p>
          <p className="text-gray-400 text-sm">Recall sent messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, messageRecallEnabled: !settings.messageRecallEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.messageRecallEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.messageRecallEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.messageRecallEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Recall time limit</p>
            <select
              value={settings.recallTimeLimit || '10'}
              onChange={(e) => onUpdate({ ...settings, recallTimeLimit: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show recall indicator</p>
              <p className="text-gray-400 text-xs">Display when message is recalled</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showRecallIndicator: !settings.showRecallIndicator })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showRecallIndicator ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showRecallIndicator ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Confirm before recall</p>
              <p className="text-gray-400 text-xs">Show confirmation dialog</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, confirmRecall: !settings.confirmRecall })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.confirmRecall ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.confirmRecall ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Recall Timer Component
export const RecallTimer = ({ messageTimestamp, onExpire }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    const timeLimit = 10 * 60 * 1000;
    const updateTimer = () => {
      const elapsed = new Date() - new Date(messageTimestamp);
      const remaining = timeLimit - elapsed;
      setTimeRemaining(remaining > 0 ? remaining : 0);
      
      if (remaining <= 0) {
        onExpire?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [messageTimestamp, onExpire]);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (timeRemaining === null || timeRemaining <= 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-gray-400">
      <Clock size={12} />
      <span>{formatTime(timeRemaining)}</span>
    </div>
  );
};

export default MessageRecall;
