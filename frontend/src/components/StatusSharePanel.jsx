import React, { useState, useEffect } from 'react';
import { X, Share2, Link, MessageCircle, Mail, Copy, CheckCircle, Download, Instagram, Facebook, Twitter, Send } from 'lucide-react';

const StatusSharePanel = ({ onClose, status, onShare }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const sharePlatforms = [
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
    { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'bg-sky-500' },
    { id: 'telegram', name: 'Telegram', icon: Send, color: 'bg-blue-500' },
    { id: 'email', name: 'Email', icon: Mail, color: 'bg-gray-600' }
  ];

  useEffect(() => {
    const statusUrl = `${window.location.origin}/status/${status?._id || status?.id}`;
    setShareUrl(statusUrl);
  }, [status]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSharePlatform = async (platform) => {
    const shareData = {
      platform,
      url: shareUrl,
      message: customMessage,
      statusId: status?._id || status?.id
    };

    setIsSharing(true);
    try {
      // Call backend API to record share
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/${status?._id || status?.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform,
          message: customMessage
        })
      });

      if (onShare) {
        onShare(shareData);
      }

      // Open share dialog
      if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(customMessage + ' ' + shareUrl)}`, '_blank');
      } else if (platform === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
      } else if (platform === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(customMessage)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
      } else if (platform === 'email') {
        window.location.href = `mailto:?subject=Check out this status&body=${encodeURIComponent(customMessage + '\n\n' + shareUrl)}`;
      }
    } catch (error) {
      console.error('Share error:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = () => {
    if (status?.mediaUrl) {
      const link = document.createElement('a');
      link.href = status.mediaUrl;
      link.download = `status-${Date.now()}`;
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Share2 className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Share Status</h2>
              <p className="text-white/60 text-xs">Share to other platforms</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Preview */}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/60 text-xs mb-2 uppercase">Status</p>
            <p className="text-white text-sm">{status?.content || status?.caption || 'No content'}</p>
          </div>

          {/* Custom Message */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Custom Message (Optional)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a message..."
              rows={2}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
            />
          </div>

          {/* Share Platforms */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Share to</label>
            <div className="grid grid-cols-3 gap-3">
              {sharePlatforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    onClick={() => handleSharePlatform(platform.id)}
                    className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-colors hover:opacity-80 ${platform.color}`}
                  >
                    <Icon size={24} className="text-white" />
                    <span className="text-white text-xs">{platform.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-2">
            <button
              onClick={handleCopyLink}
              className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-white">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={20} className="text-white/60" />
                  <span className="text-white">Copy Link</span>
                </>
              )}
            </button>

            {status?.mediaUrl && (
              <button
                onClick={handleDownload}
                className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={20} className="text-white/60" />
                <span className="text-white">Download Media</span>
              </button>
            )}
          </div>

          {/* Share URL Display */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Share URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-xl text-white"
              >
                <Copy size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusSharePanel;
