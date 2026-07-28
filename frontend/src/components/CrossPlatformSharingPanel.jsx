import React, { useState } from 'react';
import { X, Share2, Instagram, Facebook, Twitter, Camera, Youtube, CheckCircle, Link as LinkIcon, Copy, ExternalLink } from 'lucide-react';

const CrossPlatformSharingPanel = ({ onClose, content, onShare }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [shareLink, setShareLink] = useState('');

  const platforms = [
    { id: 'instagram', icon: Instagram, label: 'Instagram', color: '#E1306C' },
    { id: 'facebook', icon: Facebook, label: 'Facebook', color: '#1877F2' },
    { id: 'twitter', icon: Twitter, label: 'Twitter/X', color: '#1DA1F2' },
    { id: 'snapchat', icon: Camera, label: 'Snapchat', color: '#FFFC00' },
    { id: 'tiktok', icon: Camera, label: 'TikTok', color: '#000000' },
    { id: 'youtube', icon: Youtube, label: 'YouTube Shorts', color: '#FF0000' }
  ];

  const togglePlatform = (platformId) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare({
        platforms: selectedPlatforms,
        message: customMessage
      });
    }
  };

  const copyShareLink = () => {
    const link = `https://genz.app/status/${Date.now()}`;
    setShareLink(link);
    navigator.clipboard.writeText(link);
  };

  const openPlatform = (platformId) => {
    const platformUrls = {
      instagram: 'https://instagram.com',
      facebook: 'https://facebook.com',
      twitter: 'https://twitter.com',
      snapchat: 'https://snapchat.com',
      tiktok: 'https://tiktok.com',
      youtube: 'https://youtube.com'
    };
    window.open(platformUrls[platformId], '_blank');
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Share2 className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Share to Other Platforms</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Platform Selection */}
          <div>
            <p className="text-white/60 text-sm mb-4">Select Platforms</p>
            <div className="grid grid-cols-3 gap-3">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                const isSelected = selectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-[#00a884] text-white scale-105'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <div
                      className="p-2 rounded-full"
                      style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : platform.color }}
                    >
                      <Icon size={24} className={isSelected ? 'text-white' : 'text-white'} />
                    </div>
                    <span className="text-xs font-medium">{platform.label}</span>
                    {isSelected && <CheckCircle size={16} className="text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <p className="text-white/60 text-sm mb-2">Custom Message (Optional)</p>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a caption for your post..."
              className="w-full bg-white/10 text-white p-3 rounded-lg outline-none resize-none h-20 placeholder-white/40"
            />
          </div>

          {/* Share Link */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-medium flex items-center gap-2">
                <LinkIcon size={18} />
                Share Link
              </p>
              <button
                onClick={copyShareLink}
                className="text-[#00a884] hover:text-[#008f6f] text-sm flex items-center gap-1"
              >
                <Copy size={14} />
                Copy
              </button>
            </div>
            {shareLink ? (
              <div className="bg-white/10 rounded-lg p-3 flex items-center gap-2">
                <span className="text-white/70 text-sm flex-1 truncate">{shareLink}</span>
                <CheckCircle size={16} className="text-[#00a884]" />
              </div>
            ) : (
              <button
                onClick={copyShareLink}
                className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
              >
                Generate Share Link
              </button>
            )}
          </div>

          {/* Quick Share */}
          {selectedPlatforms.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white font-medium mb-3">Quick Share</p>
              <div className="flex flex-wrap gap-2">
                {selectedPlatforms.map((platformId) => {
                  const platform = platforms.find(p => p.id === platformId);
                  const Icon = platform.icon;
                  return (
                    <button
                      key={platformId}
                      onClick={() => openPlatform(platformId)}
                      className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
                    >
                      <Icon size={16} />
                      <span>Open {platform.label}</span>
                      <ExternalLink size={14} className="text-white/50" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/40 text-xs">
              Note: Direct sharing requires API integration with each platform. Quick share opens the platform in a new tab for manual sharing.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={handleShare}
            disabled={selectedPlatforms.length === 0}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            Share to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrossPlatformSharingPanel;
