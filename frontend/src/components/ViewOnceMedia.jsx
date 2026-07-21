import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, X, AlertCircle, Check, Image as ImageIcon, Video, FileText, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';

const ViewOnceMedia = ({ media, onViewed, onClose }) => {
  const [hasViewed, setHasViewed] = useState(false);
  const [viewCountdown, setViewCountdown] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Enable screenshot prevention
    const enablePrivacy = async () => {
      try {
        await PrivacyScreen.enable();
      } catch (e) {
        console.warn("PrivacyScreen not available", e);
      }
    };
    enablePrivacy();

    return () => {
      const disablePrivacy = async () => {
        try {
          await PrivacyScreen.disable();
        } catch (e) {
          console.warn("PrivacyScreen not available", e);
        }
      };
      disablePrivacy();
    };
  }, []);

  useEffect(() => {
    let countdown;
    if (!hasViewed) {
      countdown = setInterval(() => {
        setViewCountdown(prev => {
          if (prev <= 1) {
            setHasViewed(true);
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdown);
  }, [hasViewed]);

  const handleView = () => {
    setHasViewed(true);
    setTimeout(() => {
      onViewed?.(media._id);
      onClose();
    }, 5000); // Media disappears after 5 seconds of viewing
  };

  const getMediaIcon = (type) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={32} className="text-[#00a884]" />;
      case 'video':
        return <Video size={32} className="text-[#00a884]" />;
      case 'file':
        return <FileText size={32} className="text-[#00a884]" />;
      default:
        return <ImageIcon size={32} className="text-[#00a884]" />;
    }
  };

  // Web-level anti-screenshot: block PrintScreen, blur on tab switch
  useEffect(() => {
    const blockKeys = (e) => {
      if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === '3' || e.key === '4'))) {
        e.preventDefault();
        navigator.clipboard?.writeText('').catch(() => {});
      }
    };
    const handleVisibility = () => {
      const overlay = document.getElementById('viewonce-blur-overlay');
      if (overlay) overlay.style.display = document.hidden ? 'none' : 'none';
    };
    window.addEventListener('keyup', blockKeys);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('keyup', blockKeys);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            <EyeOff size={16} className="text-[#00a884]" />
            <span className="text-white text-sm">View Once</span>
          </div>
          <button
            onClick={onClose}
            className="bg-black/50 backdrop-blur-sm rounded-full p-2 text-white hover:bg-black/70 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Warning Overlay */}
        {!hasViewed && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <EyeOff size={40} className="text-[#00a884]" />
              </div>
              <h2 className="text-white text-2xl font-semibold mb-2">View Once Media</h2>
              <p className="text-gray-400 text-sm mb-4">This media will disappear after viewing</p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <RefreshCw className="animate-spin text-[#00a884]" size={20} />
                <span className="text-[#00a884] text-xl font-bold">{viewCountdown}s</span>
              </div>
              <button
                onClick={handleView}
                className="bg-[#00a884] text-white px-6 py-2 rounded-lg hover:bg-[#008f72] transition-colors"
              >
                View Media
              </button>
            </div>
          </div>
        )}

        {/* Media Content */}
        <AnimatePresence>
          {hasViewed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-[#1a2e35] rounded-2xl overflow-hidden"
            >
              {media.type === 'image' && (
                <div className="aspect-video bg-black flex items-center justify-center">
                  <img
                    src={media.url}
                    alt="View once media"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              {media.type === 'video' && (
                <div className="aspect-video bg-black flex items-center justify-center">
                  <video
                    src={media.url}
                    controls
                    autoPlay
                    className="max-w-full max-h-full"
                  />
                </div>
              )}
              {media.type === 'file' && (
                <div className="aspect-video bg-black flex items-center justify-center">
                  <div className="text-center">
                    {getMediaIcon('file')}
                    <p className="text-white mt-2">{media.fileName}</p>
                  </div>
                </div>
              )}

              {/* Viewing Timer */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-[#00a884]" />
                  <span className="text-white text-sm">Disappearing soon...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// View Once Media Button Component
export const ViewOnceMediaButton = ({ media, onView }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
        title="View once media"
      >
        <EyeOff size={16} />
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <ViewOnceMedia
              media={media}
              onViewed={(mediaId) => {
                onView(mediaId);
                setShowModal(false);
              }}
              onClose={() => setShowModal(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// View Once Media Indicator Component
export const ViewOnceMediaIndicator = () => {
  return (
    <div className="flex items-center gap-1 text-yellow-500 text-xs">
      <EyeOff size={10} />
      <span>View once</span>
    </div>
  );
};

// View Once Media Settings Component
export const ViewOnceMediaSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <EyeOff size={18} className="text-[#00a884]" />
            View Once Media
          </p>
          <p className="text-gray-400 text-sm">Send self-destructing media</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, viewOnceMediaEnabled: !settings.viewOnceMediaEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.viewOnceMediaEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.viewOnceMediaEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.viewOnceMediaEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">View duration</p>
            <select
              value={settings.viewOnceDuration || '5'}
              onChange={(e) => onUpdate({ ...settings, viewOnceDuration: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Allow screenshot</p>
              <p className="text-gray-400 text-xs">Permit taking screenshots</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, allowScreenshot: !settings.allowScreenshot })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.allowScreenshot ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.allowScreenshot ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show warning</p>
              <p className="text-gray-400 text-xs">Display warning before viewing</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showViewOnceWarning: !settings.showViewOnceWarning })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showViewOnceWarning ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showViewOnceWarning ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// View Once Media Warning Component
export const ViewOnceMediaWarning = ({ onConfirm, onCancel }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <p className="text-yellow-500 font-medium mb-2">View Once Media</p>
          <p className="text-yellow-400 text-sm mb-3">
            This media can only be viewed once. After viewing, it will disappear permanently and cannot be recovered.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors text-sm"
            >
              View Anyway
            </button>
            <button
              onClick={onCancel}
              className="bg-[#0b141a] text-white px-4 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// View Once Media Status Component
export const ViewOnceMediaStatus = ({ status }) => {
  const statusConfig = {
    pending: { icon: EyeOff, color: 'text-yellow-500', label: 'Not viewed' },
    viewed: { icon: Eye, color: 'text-red-500', label: 'Viewed' },
    expired: { icon: X, color: 'text-gray-500', label: 'Expired' }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1 ${config.color} text-xs`}>
      <Icon size={10} />
      <span>{config.label}</span>
    </div>
  );
};

export default ViewOnceMedia;
