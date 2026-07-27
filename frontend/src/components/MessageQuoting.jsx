import React, { useState } from 'react';
import { Quote, X, MessageSquare, Reply, Check, Copy, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageQuoting = ({ message, onQuote, onCancel }) => {
  const [quoteText, setQuoteText] = useState('');
  const [isQuoting, setIsQuoting] = useState(false);

  const handleQuote = async () => {
    setIsQuoting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsQuoting(false);
    if (onQuote) {
      onQuote({
        originalMessage: message,
        quoteText: quoteText || message.content
      });
    }
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
            <Quote className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Quote Message</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Original Message */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border-l-4 border-[#00a884]">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={14} className="text-[#00a884]" />
            <span className="text-gray-400 text-xs">{message.sender}</span>
            <span className="text-gray-500 text-xs">•</span>
            <span className="text-gray-500 text-xs">{new Date(message.timestamp).toLocaleTimeString()}</span>
          </div>
          <p className="text-white text-sm line-clamp-3">{message.content}</p>
        </div>

        {/* Quote Text Input */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">Add a comment (optional)</label>
          <textarea
            value={quoteText}
            onChange={(e) => setQuoteText(e.target.value)}
            placeholder="Type your message..."
            rows={3}
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
          />
        </div>

        {/* Preview */}
        {quoteText && (
          <div className="bg-[#00a884]/10 rounded-lg p-3 mb-4 border border-[#00a884]/20">
            <p className="text-gray-400 text-xs mb-1">Preview:</p>
            <div className="border-l-2 border-[#00a884] pl-2">
              <p className="text-gray-400 text-xs italic line-clamp-2">{message.content}</p>
              <p className="text-white text-sm mt-1">{quoteText}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleQuote}
            disabled={isQuoting}
            className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isQuoting ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Quoting...
              </>
            ) : (
              <>
                <Reply size={18} />
                Quote
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Message Quote Button Component
export const MessageQuoteButton = ({ message, onQuote }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowModal(true)}
        className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
        title="Quote message"
      >
        <Quote size={16} />
      </button>

      <AnimatePresence>
        {showModal && (
          <MessageQuoting
            message={message}
            onQuote={(quoteData) => {
              onQuote(quoteData);
              setShowModal(false);
            }}
            onCancel={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Quoted Message Display Component
export const QuotedMessageDisplay = ({ quote, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="bg-[#0b141a] rounded-lg p-3 border-l-4 border-[#00a884] cursor-pointer hover:bg-[#1a2e35] transition-colors mb-2"
    >
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare size={12} className="text-[#00a884]" />
        <span className="text-gray-400 text-xs">{quote.sender}</span>
        {quote.edited && <span className="text-gray-500 text-xs">(edited)</span>}
      </div>
      <p className="text-gray-300 text-xs italic line-clamp-2">{quote.originalContent}</p>
    </motion.div>
  );
};

// Quick Quote Component
export const QuickQuote = ({ message, onQuote }) => {
  const handleQuickQuote = () => {
    onQuote?.({
      originalMessage: message,
      quoteText: ''
    });
  };

  return (
    <button
      onClick={handleQuickQuote}
      className="flex items-center gap-2 bg-[#0b141a] px-3 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors"
    >
      <Quote size={16} className="text-[#00a884]" />
      <span className="text-white text-sm">Quote</span>
    </button>
  );
};

// Reply with Quote Component
export const ReplyWithQuote = ({ quote, onSend }) => {
  const [replyText, setReplyText] = useState('');

  const handleSend = () => {
    if (!replyText.trim()) return;
    onSend?.({
      quote: quote,
      replyText: replyText
    });
    setReplyText('');
  };

  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <QuotedMessageDisplay quote={quote} />
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Reply to quote..."
          className="flex-1 bg-[#1a2e35] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={!replyText.trim()}
          className="bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/30 disabled:text-white/50 disabled:cursor-not-allowed"
        >
          <Reply size={16} />
        </button>
      </div>
    </div>
  );
};

// Message Quoting Settings Component
export const MessageQuotingSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Quote size={18} className="text-[#00a884]" />
            Message Quoting
          </p>
          <p className="text-gray-400 text-sm">Quote messages in replies</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, messageQuotingEnabled: !settings.messageQuotingEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.messageQuotingEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.messageQuotingEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.messageQuotingEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show quote preview</p>
              <p className="text-gray-400 text-xs">Display quote before sending</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showQuotePreview: !settings.showQuotePreview })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showQuotePreview ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showQuotePreview ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Allow quote editing</p>
              <p className="text-gray-400 text-xs">Modify quoted text</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, allowQuoteEditing: !settings.allowQuoteEditing })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.allowQuoteEditing ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.allowQuoteEditing ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show sender name</p>
              <p className="text-gray-400 text-xs">Display who sent original</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showQuoteSender: !settings.showQuoteSender })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showQuoteSender ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showQuoteSender ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Quote Context Menu Component
export const QuoteContextMenu = ({ message, onQuote, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#1a2e35] rounded-lg shadow-xl border border-[#00a884]/30 overflow-hidden"
    >
      <button
        onClick={() => {
          onQuote?.(message);
          onClose?.();
        }}
        className="w-full px-4 py-3 text-left hover:bg-[#00a884]/20 transition-colors flex items-center gap-3"
      >
        <Quote size={16} className="text-[#00a884]" />
        <span className="text-white text-sm">Quote message</span>
      </button>
      <button
        onClick={() => {
          onQuote?.({ ...message, quoteText: '' });
          onClose?.();
        }}
        className="w-full px-4 py-3 text-left hover:bg-[#00a884]/20 transition-colors flex items-center gap-3 border-t border-[#00a884]/20"
      >
        <Reply size={16} className="text-[#00a884]" />
        <span className="text-white text-sm">Reply with quote</span>
      </button>
    </motion.div>
  );
};

export default MessageQuoting;
