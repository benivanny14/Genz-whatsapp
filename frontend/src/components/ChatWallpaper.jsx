import React, { useState } from 'react';
import { Image as ImageIcon, X, Upload, Palette, Check, RefreshCw, Trash2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatWallpaper = ({ currentWallpaper, wallpapers, onSelect, onUpload, onRemove, onReset, onClose }) => {
  const [selectedWallpaper, setSelectedWallpaper] = useState(currentWallpaper?.id || null);
  const [isUploading, setIsUploading] = useState(false);
  const [customWallpapers, setCustomWallpapers] = useState(wallpapers?.custom || []);

  const defaultWallpapers = [
    { id: 'default', name: 'Default', color: '#1a2e35', gradient: null },
    { id: 'gradient1', name: 'Ocean', color: null, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'gradient2', name: 'Sunset', color: null, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'gradient3', name: 'Forest', color: null, gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { id: 'gradient4', name: 'Night', color: null, gradient: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)' },
    { id: 'gradient5', name: 'Aurora', color: null, gradient: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' },
    { id: 'solid1', name: 'Deep Blue', color: '#0f172a', gradient: null },
    { id: 'solid2', name: 'Dark Green', color: '#14532d', gradient: null },
    { id: 'solid3', name: 'Purple', color: '#581c87', gradient: null },
  ];

  const handleSelect = (wallpaperId) => {
    setSelectedWallpaper(wallpaperId);
    if (onSelect) {
      onSelect(wallpaperId);
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsUploading(false);
    if (onUpload) {
      onUpload();
    }
  };

  const handleRemove = (wallpaperId) => {
    setCustomWallpapers(prev => prev.filter(w => w.id !== wallpaperId));
    if (onRemove) {
      onRemove(wallpaperId);
    }
  };

  const handleReset = () => {
    setSelectedWallpaper('default');
    if (onReset) {
      onReset();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <ImageIcon size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Chat Wallpaper</h2>
              <p className="text-gray-400 text-sm">Customize your chat background</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Default Wallpapers */}
          <div>
            <p className="text-white font-medium mb-3 flex items-center gap-2">
              <Palette size={18} className="text-[#00a884]" />
              Default Wallpapers
            </p>
            <div className="grid grid-cols-3 gap-3">
              {defaultWallpapers.map(wallpaper => (
                <button
                  key={wallpaper.id}
                  onClick={() => handleSelect(wallpaper.id)}
                  className={`relative rounded-lg overflow-hidden aspect-square transition-all ${
                    selectedWallpaper === wallpaper.id
                      ? 'ring-2 ring-[#00a884] ring-offset-2 ring-offset-[#1a2e35]'
                      : 'hover:ring-2 hover:ring-[#00a884]/50'
                  }`}
                  style={{
                    background: wallpaper.gradient || wallpaper.color,
                    backgroundColor: wallpaper.color
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-xs font-medium bg-black/30 px-2 py-1 rounded">
                      {wallpaper.name}
                    </span>
                  </div>
                  {selectedWallpaper === wallpaper.id && (
                    <div className="absolute top-2 right-2 bg-[#00a884] rounded-full p-1">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Wallpapers */}
          {customWallpapers.length > 0 && (
            <div>
              <p className="text-white font-medium mb-3 flex items-center gap-2">
                <ImageIcon size={18} className="text-[#00a884]" />
                Custom Wallpapers
              </p>
              <div className="grid grid-cols-3 gap-3">
                {customWallpapers.map(wallpaper => (
                  <div
                    key={wallpaper.id}
                    className="relative rounded-lg overflow-hidden aspect-square group"
                  >
                    <img
                      src={wallpaper.url}
                      alt={wallpaper.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleSelect(wallpaper.id)}
                        className="text-white hover:text-[#00a884] transition-colors"
                        title="Select"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleRemove(wallpaper.id)}
                        className="text-white hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {selectedWallpaper === wallpaper.id && (
                      <div className="absolute top-2 right-2 bg-[#00a884] rounded-full p-1">
                        <Check size={14} className="text-white" />
                      </div>
                )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-[#00a884]/30"
          >
            {isUploading ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload Wallpaper
              </>
            )}
          </button>

          {/* Reset Button */}
          {selectedWallpaper !== 'default' && (
            <button
              onClick={handleReset}
              className="w-full bg-red-500/20 text-red-500 py-3 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Reset to Default
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Wallpaper Settings Component
export const WallpaperSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <ImageIcon size={18} className="text-[#00a884]" />
            Chat Wallpaper
          </p>
          <p className="text-gray-400 text-sm">Customize chat background</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, wallpaperEnabled: !settings.wallpaperEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.wallpaperEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.wallpaperEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.wallpaperEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Wallpaper type</p>
            <select
              value={settings.wallpaperType || 'default'}
              onChange={(e) => onUpdate({ ...settings, wallpaperType: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="default">Default</option>
              <option value="gradient">Gradient</option>
              <option value="solid">Solid Color</option>
              <option value="custom">Custom Image</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Dim wallpaper</p>
              <p className="text-gray-400 text-xs">Reduce brightness</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, dimWallpaper: !settings.dimWallpaper })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.dimWallpaper ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.dimWallpaper ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Apply to all chats</p>
              <p className="text-gray-400 text-xs">Use same wallpaper everywhere</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, applyToAll: !settings.applyToAll })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.applyToAll ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.applyToAll ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Wallpaper Preview Component
export const WallpaperPreview = ({ wallpaper }) => {
  const defaultWallpapers = {
    default: { color: '#1a2e35', gradient: null },
    gradient1: { color: null, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    gradient2: { color: null, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  };

  const wallpaperConfig = defaultWallpapers[wallpaper] || defaultWallpapers.default;

  return (
    <div
      className="w-full h-32 rounded-lg overflow-hidden"
      style={{
        background: wallpaperConfig.gradient || wallpaperConfig.color,
        backgroundColor: wallpaperConfig.color
      }}
    >
      <div className="w-full h-full flex items-center justify-center">
        <Sparkles size={24} className="text-white/50" />
      </div>
    </div>
  );
};

// Wallpaper Button Component
export const WallpaperButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Change wallpaper"
    >
      <ImageIcon size={18} />
    </button>
  );
};

export default ChatWallpaper;
