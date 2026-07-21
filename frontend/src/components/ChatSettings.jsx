import React, { useState } from 'react';
import { MessageSquare, X, Check, RefreshCw, Palette, Type, Image as ImageIcon, Download, Upload, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatSettings = ({ chatSettings, onUpdateSettings, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState({
    theme: chatSettings?.theme || 'default',
    fontSize: chatSettings?.fontSize || 'medium',
    wallpaper: chatSettings?.wallpaper || null,
    enterToSend: chatSettings?.enterToSend || true,
    mediaVisibility: chatSettings?.mediaVisibility || true,
    downloadMedia: chatSettings?.downloadMedia || true
  });

  const themeOptions = [
    { id: 'default', name: 'Default', color: '#00a884' },
    { id: 'dark', name: 'Dark', color: '#0b141a' },
    { id: 'light', name: 'Light', color: '#ffffff' },
    { id: 'ocean', name: 'Ocean', color: '#3b82f6' },
    { id: 'forest', name: 'Forest', color: '#22c55e' },
  ];

  const fontSizeOptions = [
    { id: 'small', name: 'Small', size: '12px' },
    { id: 'medium', name: 'Medium', size: '14px' },
    { id: 'large', name: 'Large', size: '16px' },
    { id: 'extra', name: 'Extra Large', size: '18px' },
  ];

  const handleSave = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsProcessing(false);

    if (onUpdateSettings) {
      onUpdateSettings(settings);
    }
    onClose();
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
          <div className="flex items-center gap-2">
            <MessageSquare className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Chat Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Theme */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette size={18} className="text-[#00a884]" />
              <p className="text-white font-medium">Chat Theme</p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {themeOptions.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setSettings({ ...settings, theme: theme.id })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    settings.theme === theme.id
                      ? 'border-[#00a884] bg-[#00a884]/10'
                      : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                  }`}
                  style={{ backgroundColor: theme.color === '#ffffff' ? '#ffffff' : undefined }}
                >
                  <div
                    className="w-6 h-6 rounded-full mx-auto"
                    style={{ backgroundColor: theme.color }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Type size={18} className="text-[#00a884]" />
              <p className="text-white font-medium">Font Size</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {fontSizeOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setSettings({ ...settings, fontSize: option.id })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    settings.fontSize === option.id
                      ? 'border-[#00a884] bg-[#00a884]/10'
                      : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                  }`}
                >
                  <span className="text-white" style={{ fontSize: option.size }}>{option.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Wallpaper */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon size={18} className="text-[#00a884]" />
              <p className="text-white font-medium">Wallpaper</p>
            </div>
            <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
              {settings.wallpaper ? (
                <div className="relative">
                  <img
                    src={settings.wallpaper}
                    alt="Wallpaper"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => setSettings({ ...settings, wallpaper: null })}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Sparkles size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No wallpaper set</p>
                  <button className="mt-2 text-[#00a884] text-sm hover:text-[#008f72]">
                    Choose Wallpaper
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Chat Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#0b141a] rounded-lg border border-[#00a884]/20">
              <div>
                <p className="text-white text-sm">Enter to send</p>
                <p className="text-gray-400 text-xs">Press Enter to send message</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, enterToSend: !settings.enterToSend })}
                className={`w-12 h-6 rounded-full transition-all ${
                  settings.enterToSend ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-all ${
                    settings.enterToSend ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#0b141a] rounded-lg border border-[#00a884]/20">
              <div>
                <p className="text-white text-sm">Media visibility</p>
                <p className="text-gray-400 text-xs">Show media in chat</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, mediaVisibility: !settings.mediaVisibility })}
                className={`w-12 h-6 rounded-full transition-all ${
                  settings.mediaVisibility ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-all ${
                    settings.mediaVisibility ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#0b141a] rounded-lg border border-[#00a884]/20">
              <div>
                <p className="text-white text-sm">Auto download media</p>
                <p className="text-gray-400 text-xs">Download media automatically</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, downloadMedia: !settings.downloadMedia })}
                className={`w-12 h-6 rounded-full transition-all ${
                  settings.downloadMedia ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-all ${
                    settings.downloadMedia ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-[#00a884]/20 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Saving...
              </>
            ) : (
              <>
                <Check size={18} />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Chat Settings Button Component
export const ChatSettingsButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Chat settings"
    >
      <MessageSquare size={18} />
    </button>
  );
};

export default ChatSettings;
