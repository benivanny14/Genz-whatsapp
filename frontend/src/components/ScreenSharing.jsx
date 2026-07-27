import React, { useState } from 'react';
import { Monitor, X, Play, Pause, RefreshCw, Check, AlertCircle, Laptop, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ScreenSharing = ({ onShare, onStop, onClose }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState(null);
  const [shareQuality, setShareQuality] = useState('high');

  const screens = [
    { id: 'main', name: 'Main Display', icon: Monitor, type: 'desktop' },
    { id: 'window', name: 'Application Window', icon: Monitor, type: 'window' },
    { id: 'tab', name: 'Browser Tab', icon: Monitor, type: 'tab' },
  ];

  const qualities = [
    { value: 'low', label: 'Low (480p)' },
    { value: 'medium', label: 'Medium (720p)' },
    { value: 'high', label: 'High (1080p)' },
  ];

  const handleShare = async () => {
    if (!selectedScreen) return;

    setIsSharing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (onShare) {
      onShare(selectedScreen.id, shareQuality);
    }
  };

  const handleStop = async () => {
    setIsSharing(false);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (onStop) {
      onStop();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Monitor className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Screen Sharing</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!isSharing ? (
          <div className="space-y-4">
            {/* Screen Selection */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Select what to share</label>
              <div className="space-y-2">
                {screens.map(screen => (
                  <button
                    key={screen.id}
                    onClick={() => setSelectedScreen(screen.id)}
                    className={`w-full p-4 rounded-lg text-left transition-all flex items-center gap-3 ${
                      selectedScreen === screen.id
                        ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                        : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
                    }`}
                  >
                    <screen.icon size={24} className="text-gray-400" />
                    <div>
                      <p className="text-white font-medium">{screen.name}</p>
                      <p className="text-gray-400 text-xs capitalize">{screen.type}</p>
                    </div>
                    {selectedScreen === screen.id && <Check size={18} className="text-[#00a884]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Selection */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Share quality</label>
              <div className="space-y-2">
                {qualities.map(quality => (
                  <button
                    key={quality.value}
                    onClick={() => setShareQuality(quality.value)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      shareQuality === quality.value
                        ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                        : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">{quality.label}</span>
                      {shareQuality === quality.value && <Check size={16} className="text-[#00a884]" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-yellow-500 text-xs">
                  Make sure you don't share sensitive information. All participants will be able to see your screen.
                </p>
              </div>
            </div>

            {/* Share Button */}
            <button
              onClick={handleShare}
              disabled={!selectedScreen}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Play size={18} />
              Start Sharing
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto">
              <Monitor className="text-[#00a884] animate-pulse" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white">Sharing Screen</h3>
            <p className="text-gray-400 text-sm">
              Your screen is now being shared with the call participants
            </p>
            <button
              onClick={handleStop}
              className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <Pause size={18} />
              Stop Sharing
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Screen Share Button Component
export const ScreenShareButton = ({ onShare, onStop, isSharing }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`p-2 rounded-full transition-colors ${
          isSharing
            ? 'text-blue-500 hover:bg-blue-500/10'
            : 'text-gray-400 hover:text-white'
        }`}
        title={isSharing ? 'Stop sharing' : 'Share screen'}
      >
        <Monitor size={18} />
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <ScreenSharing
              onShare={(screenId, quality) => {
                onShare(screenId, quality);
                setShowModal(false);
              }}
              onStop={() => {
                onStop();
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

// Screen Share Indicator Component
export const ScreenShareIndicator = ({ isSharing, onStop }) => {
  return (
    <AnimatePresence>
      {isSharing && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-blue-500/20 border border-blue-500 rounded-lg px-4 py-2 flex items-center gap-2"
        >
          <Monitor size={16} className="text-blue-500 animate-pulse" />
          <span className="text-blue-500 text-sm">Screen Sharing</span>
          <button
            onClick={onStop}
            className="text-blue-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Screen Share Settings Component
export const ScreenShareSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Monitor size={18} className="text-[#00a884]" />
            Screen Sharing
          </p>
          <p className="text-gray-400 text-sm">Share your screen during calls</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, screenSharingEnabled: !settings.screenSharingEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.screenSharingEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.screenSharingEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.screenSharingEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Default quality</p>
            <select
              value={settings.defaultScreenQuality || 'high'}
              onChange={(e) => onUpdate({ ...settings, defaultScreenQuality: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="low">Low (480p)</option>
              <option value="medium">Medium (720p)</option>
              <option value="high">High (1080p)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show cursor</p>
              <p className="text-gray-400 text-xs">Display mouse pointer</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showCursor: !settings.showCursor })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showCursor ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showCursor ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Share audio</p>
              <p className="text-gray-400 text-xs">Include system audio</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, shareAudio: !settings.shareAudio })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.shareAudio ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.shareAudio ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Participant Screen View Component
export const ParticipantScreenView = ({ participant, isSharing }) => {
  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      {isSharing ? (
        <div className="aspect-video flex items-center justify-center">
          <div className="text-center">
            <Monitor size={48} className="text-blue-500 mx-auto mb-2" />
            <p className="text-white text-sm">{participant.name}'s screen</p>
          </div>
        </div>
      ) : (
        <div className="aspect-video flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <Monitor size={32} className="text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Not sharing</p>
          </div>
        </div>
      )}
      {isSharing && (
        <div className="absolute top-2 left-2 bg-blue-500/80 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
          <Monitor size={12} className="text-white" />
          <span className="text-white text-xs">Screen</span>
        </div>
      )}
    </div>
  );
};

export default ScreenSharing;
