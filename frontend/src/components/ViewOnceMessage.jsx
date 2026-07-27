import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Clock, AlertCircle, Play, Image as ImageIcon, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';

const ViewOnceMessage = ({ message, onViewed, onClose }) => {
  const [hasViewed, setHasViewed] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(10); // 10 seconds to view
  const timerRef = useRef(null);

  // Prevent screenshots & screen recording while viewing
  useEffect(() => {
    const enablePrivacy = async () => {
      try { await PrivacyScreen.enable(); } catch (e) { console.warn('PrivacyScreen not available', e); }
    };
    enablePrivacy();
    
    // Web-level anti-screenshot: block PrintScreen, blur on tab switch
    const blockKeys = (e) => {
      if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === '3' || e.key === '4'))) {
        e.preventDefault();
        navigator.clipboard?.writeText('').catch(() => {});
      }
    };
    const handleVisibility = () => {
      const overlay = document.getElementById('viewonce-msg-blur-overlay');
      if (overlay) overlay.style.display = document.hidden ? 'none' : 'none';
    };
    window.addEventListener('keyup', blockKeys);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      const disablePrivacy = async () => {
        try { await PrivacyScreen.disable(); } catch (e) { console.warn('PrivacyScreen not available', e); }
      };
      disablePrivacy();
      window.removeEventListener('keyup', blockKeys);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (hasViewed && !message.viewed) {
      // Start countdown timer
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            onViewed(message._id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [hasViewed, message._id, onViewed]);

  const handleView = () => {
    setHasViewed(true);
    setShowWarning(false);
    if (onViewed && !message.viewed) {
      onViewed(message._id);
    }
  };

  const getMediaIcon = () => {
    if (message.type === 'image') return <ImageIcon size={48} />;
    if (message.type === 'video') return <Play size={48} />;
    return <FileText size={48} />;
  };

  const getMediaType = () => {
    if (message.type === 'image') return 'Image';
    if (message.type === 'video') return 'Video';
    return 'File';
  };

  if (message.viewed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-[#1a2e35] rounded-lg p-4 max-w-xs"
      >
        <div className="flex items-center gap-3 text-gray-400">
          <EyeOff size={20} />
          <div>
            <p className="text-sm font-medium">View Once Message</p>
            <p className="text-xs">This message has been viewed</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#1a2e35] rounded-lg overflow-hidden max-w-sm relative"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Warning Banner */}
      {showWarning && (
        <div className="bg-[#ff6b6b]/20 border-b border-[#ff6b6b]/30 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-[#ff6b6b] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">View Once Message</p>
              <p className="text-gray-300 text-xs mt-1">
                This media can only be viewed once. After viewing, it will be permanently deleted.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="relative">
        {hasViewed ? (
          // Media Content
          <div className="relative">
            {message.type === 'image' && message.mediaUrl && (
              <img
                src={message.mediaUrl}
                alt="View once image"
                className="w-full h-64 object-cover"
                onLoad={() => setMediaLoaded(true)}
              />
            )}
            {message.type === 'video' && message.mediaUrl && (
              <video
                src={message.mediaUrl}
                className="w-full h-64 object-cover"
                controls
                onLoadedData={() => setMediaLoaded(true)}
              />
            )}

            {/* Timer Overlay */}
            {hasViewed && timeRemaining > 0 && (
              <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Clock size={14} />
                {timeRemaining}s
              </div>
            )}

            {/* Viewed Indicator */}
            {timeRemaining === 0 && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <div className="text-center text-white">
                  <EyeOff size={32} className="mx-auto mb-2" />
                  <p className="text-sm">Message viewed and deleted</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Placeholder
          <div className="p-8 flex flex-col items-center justify-center bg-[#0b141a]">
            {getMediaIcon()}
            <p className="text-white font-medium mt-4">{getMediaType()}</p>
            <p className="text-gray-400 text-sm mt-2 text-center">
              Tap to view this {getMediaType().toLowerCase()}
            </p>
          </div>
        )}
      </div>

      {/* Action Button */}
      {!hasViewed && (
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleView}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <Eye size={20} />
            View {getMediaType()}
          </button>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="px-4 pb-4">
        <p className="text-gray-500 text-xs text-center">
          🔒 End-to-end encrypted • View once media is not saved
        </p>
      </div>
    </motion.div>
  );
};

// View Once Message Settings Component
export const ViewOnceSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">View Once Messages</p>
          <p className="text-gray-400 text-sm">Enable view once message feature</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, viewOnceEnabled: !settings.viewOnceEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.viewOnceEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.viewOnceEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.viewOnceEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-delete timer</p>
              <p className="text-gray-400 text-xs">Time before auto-deletion</p>
            </div>
            <select
              value={settings.viewOnceTimer || 10}
              onChange={(e) => onUpdate({ ...settings, viewOnceTimer: parseInt(e.target.value) })}
              className="bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Screenshot warning</p>
              <p className="text-gray-400 text-xs">Warn when screenshot is taken</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, screenshotWarning: !settings.screenshotWarning })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.screenshotWarning ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.screenshotWarning ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewOnceMessage;

