import React, { useState } from 'react';
import { Share2, X, Check, RefreshCw, Clock, Eye, Smile, Image as ImageIcon, Video, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageShareToStatus = ({ message, onShareToStatus, onClose }) => {
  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState('all'); // all, contacts, except
  const [isSharing, setIsSharing] = useState(false);

  const audiences = [
    { id: 'all', label: 'My contacts', description: 'Share with all contacts' },
    { id: 'contacts', label: 'Selected contacts', description: 'Choose specific contacts' },
    { id: 'except', label: 'My contacts except...', description: 'Exclude some contacts' },
  ];

  const handleShare = async () => {
    setIsSharing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSharing(false);

    if (onShareToStatus) {
      onShareToStatus({
        messageId: message._id,
        caption,
        audience
      });
    }
    onClose();
  };

  const getMessagePreview = () => {
    if (message.type === 'image') return <ImageIcon size={24} className="text-[#00a884]" />;
    if (message.type === 'video') return <Video size={24} className="text-[#00a884]" />;
    if (message.type === 'document') return <FileText size={24} className="text-[#00a884]" />;
    return <FileText size={24} className="text-gray-400" />;
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
            <Share2 className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Share to Status</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Preview */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#00a884]/20 rounded-lg flex items-center justify-center">
              {getMessagePreview()}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm line-clamp-2">{message.content}</p>
              <p className="text-gray-400 text-xs mt-1">
                {message.type ? message.type.charAt(0).toUpperCase() + message.type.slice(1) : 'Text'}
              </p>
            </div>
          </div>
        </div>

        {/* Caption */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Add a caption (optional)</p>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write something..."
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
            rows={3}
            maxLength={139}
          />
          <p className="text-gray-500 text-xs mt-1 text-right">{caption.length}/139</p>
        </div>

        {/* Audience Selection */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Share with</p>
          <div className="space-y-2">
            {audiences.map(aud => (
              <button
                key={aud.id}
                onClick={() => setAudience(aud.id)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  audience === aud.id
                    ? 'border-[#00a884] bg-[#00a884]/10'
                    : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{aud.label}</p>
                    <p className="text-gray-400 text-xs">{aud.description}</p>
                  </div>
                  {audience === aud.id && <Check size={18} className="text-[#00a884]" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Eye size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-blue-500 text-xs">
              Your status will be visible for 24 hours. Contacts can view it and react to it.
            </p>
          </div>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSharing ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Sharing...
            </>
          ) : (
            <>
              <Share2 size={18} />
              Share to Status
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Share to Status Button Component
export const ShareToStatusButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Share to status"
    >
      <Share2 size={18} />
    </button>
  );
};

// Share to Status Settings Component
export const ShareToStatusSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Share2 size={18} className="text-[#00a884]" />
            Share to Status
          </p>
          <p className="text-gray-400 text-sm">Share messages to your status</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, shareToStatusEnabled: !settings.shareToStatusEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.shareToStatusEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.shareToStatusEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.shareToStatusEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Default audience</p>
              <p className="text-gray-400 text-xs">Who sees your status</p>
            </div>
            <select
              value={settings.defaultStatusAudience || 'all'}
              onChange={(e) => onUpdate({ ...settings, defaultStatusAudience: e.target.value })}
              className="bg-[#0b141a] text-white px-3 py-1 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            >
              <option value="all">All contacts</option>
              <option value="contacts">Selected contacts</option>
              <option value="except">My contacts except...</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Status Share Badge Component
export const StatusShareBadge = ({ status, onRemove }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full text-xs"
    >
      <Share2 size={10} />
      <span>Shared to status</span>
      {onRemove && (
        <button
          onClick={() => onRemove()}
          className="hover:opacity-70"
        >
          <X size={10} />
        </button>
      )}
    </motion.div>
  );
};

export default MessageShareToStatus;
