import React, { useState } from 'react';
import { X, Share2, Instagram, Facebook, Twitter, Linkedin, MessageCircle, Link, Copy, Check, Download, QrCode } from 'lucide-react';

const CrossPlatformSharing = ({ onClose, content, mediaUrl }) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const platforms = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      color: '#E1306C',
      action: 'shareToInstagram'
    },
    {
      id: 'instagram-story',
      name: 'Instagram Story',
      icon: Instagram,
      color: '#E1306C',
      action: 'shareToInstagramStory'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: '#1877F2',
      action: 'shareToFacebook'
    },
    {
      id: 'facebook-story',
      name: 'Facebook Story',
      icon: Facebook,
      color: '#1877F2',
      action: 'shareToFacebookStory'
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: Twitter,
      color: '#1DA1F2',
      action: 'shareToTwitter'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      color: '#0A66C2',
      action: 'shareToLinkedin'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      action: 'shareToWhatsApp'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: MessageCircle,
      color: '#0088cc',
      action: 'shareToTelegram'
    }
  ];

  const handleShare = async (platform) => {
    try {
      const shareUrl = mediaUrl || content;
      const shareText = content || 'Check out this status!';

      switch (platform.action) {
        case 'shareToInstagram':
          // Instagram doesn't have direct web sharing API
          // Open Instagram app with intent
          window.open(`https://www.instagram.com/`, '_blank');
          break;
        case 'shareToInstagramStory':
          // Instagram Story sharing
          if (navigator.share && mediaUrl) {
            await navigator.share({
              title: 'Share to Instagram Story',
              url: mediaUrl
            });
          }
          break;
        case 'shareToFacebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
          break;
        case 'shareToFacebookStory':
          // Facebook Story sharing
          if (navigator.share && mediaUrl) {
            await navigator.share({
              title: 'Share to Facebook Story',
              url: mediaUrl
            });
          }
          break;
        case 'shareToTwitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
          break;
        case 'shareToLinkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
          break;
        case 'shareToWhatsApp':
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
          break;
        case 'shareToTelegram':
          window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      const link = mediaUrl || content;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const handleDownload = () => {
    if (mediaUrl) {
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.download = `status-${Date.now()}.jpg`;
      link.click();
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Share Status',
          text: content || 'Check out this status!',
          url: mediaUrl
        });
      }
    } catch (error) {
      console.error('Error using native share:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Share2 className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Share to Platform</h2>
              <p className="text-white/60 text-xs">Share your status across platforms</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Native Share */}
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full bg-[#00a884] hover:bg-[#008f6f] rounded-xl p-4 flex items-center gap-3 text-white"
            >
              <Share2 size={24} />
              <div className="text-left">
                <p className="font-medium">Share via...</p>
                <p className="text-xs text-white/70">Use system share sheet</p>
              </div>
            </button>
          )}

          {/* Platform Grid */}
          <div>
            <p className="text-white/60 text-xs mb-3 uppercase tracking-wide">Social Platforms</p>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    onClick={() => handleShare(platform)}
                    className="bg-white/5 hover:bg-white/10 rounded-xl p-4 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: platform.color }}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <span className="text-white text-sm font-medium">{platform.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <p className="text-white/60 text-xs mb-3 uppercase tracking-wide">Quick Actions</p>
            <div className="space-y-2">
              <button
                onClick={handleCopyLink}
                className="w-full bg-white/5 hover:bg-white/10 rounded-xl p-4 flex items-center gap-3 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center">
                  {copied ? <Check className="text-[#00a884]" size={20} /> : <Copy className="text-[#00a884]" size={20} />}
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-medium">{copied ? 'Link Copied!' : 'Copy Link'}</p>
                  <p className="text-white/60 text-xs">{copied ? 'Ready to paste' : mediaUrl || content}</p>
                </div>
              </button>

              {mediaUrl && (
                <button
                  onClick={handleDownload}
                  className="w-full bg-white/5 hover:bg-white/10 rounded-xl p-4 flex items-center gap-3 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Download className="text-blue-500" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Download</p>
                    <p className="text-white/60 text-xs">Save to device</p>
                  </div>
                </button>
              )}

              <button
                onClick={() => setShowQR(!showQR)}
                className="w-full bg-white/5 hover:bg-white/10 rounded-xl p-4 flex items-center gap-3 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <QrCode className="text-purple-500" size={20} />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">QR Code</p>
                  <p className="text-white/60 text-xs">Generate QR code</p>
                </div>
              </button>
            </div>
          </div>

          {/* QR Code Display */}
          {showQR && (
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center justify-center">
                <div className="bg-white p-4 rounded-lg">
                  {/* In production, this would generate a real QR code */}
                  <div className="w-32 h-32 bg-gray-200 flex items-center justify-center">
                    <QrCode size={64} className="text-gray-400" />
                  </div>
                </div>
              </div>
              <p className="text-center text-white/60 text-xs mt-3">Scan to view status</p>
            </div>
          )}

          {/* Preview */}
          {mediaUrl && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-2">Preview</p>
              <img
                src={mediaUrl}
                alt="Status preview"
                className="w-full rounded-lg"
              />
            </div>
          )}

          {content && !mediaUrl && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-2">Content</p>
              <p className="text-white text-sm">{content}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrossPlatformSharing;
