import React, { useState, useEffect } from 'react';
import { Shield, X, Lock, Clock, Eye, EyeOff, RefreshCw, AlertTriangle, MessageSquare, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SecretChat = ({ contact, onCreateSecretChat, onSendMessage, onClose }) => {
  const [timer, setTimer] = useState('5s'); // 5s, 1m, 5m, 1h, 1d
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [secretChatCreated, setSecretChatCreated] = useState(false);

  const timerOptions = [
    { id: '5s', label: '5 seconds', value: 5 },
    { id: '1m', label: '1 minute', value: 60 },
    { id: '5m', label: '5 minutes', value: 300 },
    { id: '1h', label: '1 hour', value: 3600 },
    { id: '1d', label: '1 day', value: 86400 },
  ];

  const handleCreateSecretChat = async () => {
    setIsCreating(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsCreating(false);
    setSecretChatCreated(true);
    if (onCreateSecretChat) {
      onCreateSecretChat({
        contactId: contact._id,
        timer: timerOptions.find(t => t.id === timer)?.value
      });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSending(false);
    if (onSendMessage) {
      onSendMessage({
        text: message,
        timer: timerOptions.find(t => t.id === timer)?.value
      });
    }
    setMessage('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Shield size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Secret Chat</h2>
              <p className="text-gray-400 text-sm">{contact.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {!secretChatCreated ? (
          <div className="flex-1 p-6">
            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <Shield className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-blue-500 text-sm font-medium mb-1">End-to-end encrypted</p>
                  <p className="text-blue-400 text-xs">
                    Secret chats are end-to-end encrypted and can be set to self-destruct.
                  </p>
                </div>
              </div>
            </div>

            {/* Timer Selection */}
            <div className="mb-6">
              <p className="text-white font-medium mb-3">Self-destruct timer</p>
              <div className="grid grid-cols-5 gap-2">
                {timerOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setTimer(option.id)}
                    className={`p-3 rounded-lg text-center transition-all ${
                      timer === option.id
                        ? 'bg-[#00a884] text-white'
                        : 'bg-[#0b141a] text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="text-lg font-medium">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
                <p className="text-yellow-500 text-xs">
                  Once a secret chat is created, messages will automatically delete after the set timer.
                </p>
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateSecretChat}
              disabled={isCreating}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Creating...
                </>
              ) : (
                <>
                  <Shield size={18} />
                  Create Secret Chat
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex-1 p-4 flex flex-col">
            {/* Chat Area */}
            <div className="flex-1 bg-[#0b141a] rounded-lg p-4 mb-4 overflow-y-auto">
              <div className="text-center py-8">
                <Shield size={48} className="text-[#00a884] mx-auto mb-3" />
                <p className="text-white font-medium mb-1">Secret Chat Created</p>
                <p className="text-gray-400 text-sm">
                  Messages will self-destruct after {timerOptions.find(t => t.id === timer)?.label}
                </p>
              </div>
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                className="bg-[#00a884] text-white px-4 py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/30 disabled:text-white/50 disabled:cursor-not-allowed"
              >
                {isSending ? <RefreshCw className="animate-spin" size={18} /> : <MessageSquare size={18} />}
              </button>
            </div>

            {/* Timer Display */}
            <div className="flex items-center justify-center gap-2 mt-3 text-gray-400 text-sm">
              <Timer size={14} />
              <span>Self-destruct: {timerOptions.find(t => t.id === timer)?.label}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Secret Chat Settings Component
export const SecretChatSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Shield size={18} className="text-[#00a884]" />
            Secret Chats
          </p>
          <p className="text-gray-400 text-sm">Self-destructing messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, secretChatsEnabled: !settings.secretChatsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.secretChatsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.secretChatsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.secretChatsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Default timer</p>
            <select
              value={settings.defaultSecretTimer || '5s'}
              onChange={(e) => onUpdate({ ...settings, defaultSecretTimer: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="5s">5 seconds</option>
              <option value="1m">1 minute</option>
              <option value="5m">5 minutes</option>
              <option value="1h">1 hour</option>
              <option value="1d">1 day</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show timer in chat</p>
              <p className="text-gray-400 text-xs">Display countdown</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showSecretTimer: !settings.showSecretTimer })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showSecretTimer ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showSecretTimer ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Read receipts disabled</p>
              <p className="text-gray-400 text-xs">No blue ticks in secret chats</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, secretNoReadReceipts: !settings.secretNoReadReceipts })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.secretNoReadReceipts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.secretNoReadReceipts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Secret Chat Button Component
export const SecretChatButton = ({ onOpen, contact }) => {
  return (
    <button
      onClick={() => onOpen?.(contact)}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Start secret chat"
    >
      <Shield size={18} />
    </button>
  );
};

// Secret Chat Indicator Component
export const SecretChatIndicator = ({ timer }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 bg-[#00a884]/20 border border-[#00a884] rounded-full px-3 py-1"
    >
      <Shield size={14} className="text-[#00a884]" />
      <Timer size={14} className="text-[#00a884]" />
      <span className="text-white text-xs">Secret</span>
    </motion.div>
  );
};

// Secret Message Timer Component
export const SecretMessageTimer = ({ timer, onExpire }) => {
  const [timeRemaining, setTimeRemaining] = useState(timer);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, onExpire]);

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="flex items-center gap-1 text-xs text-[#00a884]">
      <Timer size={12} />
      <span>{formatTime(timeRemaining)}</span>
    </div>
  );
};

// Secret Chat Badge Component
export const SecretChatBadge = ({ isActive }) => {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute top-2 right-2 bg-[#00a884] rounded-full p-1"
        >
          <Shield size={12} className="text-white" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SecretChat;
