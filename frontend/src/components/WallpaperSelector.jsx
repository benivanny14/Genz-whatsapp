import React, { useState, useRef } from 'react';
import { X, Image, Video, Trash2, Upload } from 'lucide-react';

const DEFAULT_WALLPAPERS = [
  '/wallpapers/wp1.jpg',
  '/wallpapers/wp2.jpg',
  '/wallpapers/wp3.jpg',
  '/wallpapers/wp4.jpg',
  '/wallpapers/wp5.jpg',
];

const WallpaperSelector = ({ isOpen, onClose, onSelect, currentWallpaper, onRemove }) => {
  const [selectedTab, setSelectedTab] = useState('default');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onSelect(e.target.result);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div 
        className="bg-[#233138] rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Chat Wallpaper</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
          <button
            onClick={() => setSelectedTab('default')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTab === 'default'
                ? 'bg-[#00a884] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Default
          </button>
          <button
            onClick={() => setSelectedTab('upload')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTab === 'upload'
                ? 'bg-[#00a884] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Upload
          </button>
        </div>

        {/* Default Wallpapers */}
        {selectedTab === 'default' && (
          <div className="grid grid-cols-3 gap-3">
            {DEFAULT_WALLPAPERS.map((wp, idx) => (
              <button
                key={idx}
                onClick={() => { onSelect(wp); onClose(); }}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  currentWallpaper === wp ? 'border-[#00a884]' : 'border-transparent hover:border-white/30'
                }`}
              >
                <img src={wp} alt={`Wallpaper ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
            <button
              onClick={() => { onRemove(); onClose(); }}
              className="aspect-square rounded-lg bg-red-500/20 border-2 border-transparent hover:border-red-500/50 flex flex-col items-center justify-center gap-2 text-red-400"
            >
              <Trash2 size={24} />
              <span className="text-xs">Remove</span>
            </button>
          </div>
        )}

        {/* Upload Tab */}
        {selectedTab === 'upload' && (
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-lg p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-[#00a884] transition-colors"
            >
              <Upload size={40} className="text-gray-400" />
              <div className="text-center">
                <p className="text-white font-medium">Click to upload image</p>
                <p className="text-gray-400 text-sm mt-1">Supports JPG, PNG, GIF</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-center">
              <p className="text-gray-400 text-sm">Or drag and drop an image here</p>
            </div>
          </div>
        )}

        {/* Preview */}
        {currentWallpaper && (
          <div className="mt-6">
            <p className="text-gray-400 text-sm mb-2">Current wallpaper:</p>
            <div className="rounded-lg overflow-hidden h-32">
              <img src={currentWallpaper} alt="Current" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WallpaperSelector;