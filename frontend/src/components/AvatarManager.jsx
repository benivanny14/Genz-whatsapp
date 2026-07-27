import React, { useState, useRef } from 'react';
import { User, Camera, X, Save, RotateCw, Palette, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AvatarManager = ({ user, onUpdateAvatar, onClose }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [customAvatar, setCustomAvatar] = useState(null);
  const [avatarStyle, setAvatarStyle] = useState('circle');
  const [avatarColor, setAvatarColor] = useState('#00a884');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const avatarStyles = ['circle', 'square', 'rounded'];
  const avatarColors = [
    '#00a884', '#00d4ff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff8c42', '#9b59b6'
  ];

  const presetAvatars = [
    { id: 1, emoji: '😊', name: 'Happy' },
    { id: 2, emoji: '🎉', name: 'Party' },
    { id: 3, emoji: '🌟', name: 'Star' },
    { id: 4, emoji: '🔥', name: 'Fire' },
    { id: 5, emoji: '💎', name: 'Diamond' },
    { id: 6, emoji: '🎨', name: 'Art' },
    { id: 7, emoji: '🎵', name: 'Music' },
    { id: 8, emoji: '📚', name: 'Book' },
    { id: 9, emoji: '🏆', name: 'Trophy' },
    { id: 10, emoji: '🌈', name: 'Rainbow' },
    { id: 11, emoji: '⚡', name: 'Lightning' },
    { id: 12, emoji: '🎯', name: 'Target' },
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCustomAvatar(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsUploading(true);
    
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const avatarData = {
      type: customAvatar ? 'custom' : 'preset',
      data: customAvatar || selectedAvatar?.emoji,
      style: avatarStyle,
      color: avatarColor
    };

    if (onUpdateAvatar) {
      onUpdateAvatar(avatarData);
    }
    
    setIsUploading(false);
    onClose();
  };

  const getAvatarStyleClass = () => {
    switch (avatarStyle) {
      case 'square': return 'rounded-lg';
      case 'rounded': return 'rounded-2xl';
      default: return 'rounded-full';
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
          <h3 className="text-white text-xl font-semibold flex items-center gap-2">
            <User className="text-[#00a884]" />
            Avatar
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Avatar Preview */}
        <div className="flex justify-center mb-6">
          <div
            className={`w-32 h-32 flex items-center justify-center text-6xl ${getAvatarStyleClass()}`}
            style={{ backgroundColor: avatarColor }}
          >
            {customAvatar ? (
              <img src={customAvatar} alt="Custom avatar" className="w-full h-full object-cover" />
            ) : selectedAvatar ? (
              selectedAvatar.emoji
            ) : (
              user?.name?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
        </div>

        {/* Avatar Style Selection */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">Shape</label>
          <div className="flex gap-2">
            {avatarStyles.map(style => (
              <button
                key={style}
                onClick={() => setAvatarStyle(style)}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  avatarStyle === style
                    ? 'border-[#00a884] bg-[#00a884]/20'
                    : 'border-[#00a884]/30 hover:border-[#00a884]'
                }`}
              >
                <div
                  className={`w-8 h-8 mx-auto ${
                    style === 'circle' ? 'rounded-full' : 
                    style === 'square' ? 'rounded' : 'rounded-2xl'
                  }`}
                  style={{ backgroundColor: avatarColor }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Color Selection */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">Background Color</label>
          <div className="flex gap-2 flex-wrap">
            {avatarColors.map(color => (
              <button
                key={color}
                onClick={() => setAvatarColor(color)}
                className={`w-10 h-10 rounded-lg transition-all ${
                  avatarColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a2e35]' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Custom Avatar Upload */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">Custom Avatar</label>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-[#0b141a] border-2 border-dashed border-[#00a884]/30 hover:border-[#00a884] rounded-lg p-4 text-center transition-colors"
          >
            <Camera className="mx-auto mb-2 text-gray-400" size={24} />
            <p className="text-gray-400 text-sm">Click to upload image</p>
            <p className="text-gray-500 text-xs mt-1">PNG, JPG up to 5MB</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Preset Avatars */}
        {!customAvatar && (
          <div className="mb-6">
            <label className="text-gray-400 text-sm mb-2 block">Or choose a preset</label>
            <div className="grid grid-cols-4 gap-2">
              {presetAvatars.map(avatar => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`p-3 rounded-lg border-2 transition-all text-2xl ${
                    selectedAvatar?.id === avatar.id
                      ? 'border-[#00a884] bg-[#00a884]/20'
                      : 'border-[#00a884]/30 hover:border-[#00a884]'
                  }`}
                >
                  {avatar.emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-[#0b141a] text-gray-400 py-3 rounded-lg font-medium hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isUploading || (!selectedAvatar && !customAvatar)}
            className="flex-1 bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <RotateCw className="animate-spin" size={18} />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Avatar Display Component
export const AvatarDisplay = ({ user, size = 'md', onClick }) => {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };

  const avatarData = user?.avatar;

  return (
    <div
      onClick={onClick}
      className={`${sizes[size]} rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105`}
      style={{ 
        backgroundColor: avatarData?.color || '#00a884',
        borderRadius: avatarData?.style === 'square' ? '8px' : 
                     avatarData?.style === 'rounded' ? '16px' : '50%'
      }}
    >
      {avatarData?.type === 'custom' && avatarData?.data ? (
        <img src={avatarData.data} alt="Avatar" className="w-full h-full object-cover rounded-full" />
      ) : avatarData?.type === 'preset' && avatarData?.data ? (
        <span className="text-2xl">{avatarData.data}</span>
      ) : (
        <span className="text-white font-semibold">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </span>
      )}
    </div>
  );
};

// Avatar Settings Component
export const AvatarSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <User size={18} className="text-[#00a884]" />
            Custom Avatar
          </p>
          <p className="text-gray-400 text-sm">Use custom avatars</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, customAvatarEnabled: !settings.customAvatarEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.customAvatarEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.customAvatarEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.customAvatarEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show in groups</p>
              <p className="text-gray-400 text-xs">Display custom avatar in groups</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showAvatarInGroups: !settings.showAvatarInGroups })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showAvatarInGroups ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showAvatarInGroups ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Animated avatars</p>
              <p className="text-gray-400 text-xs">Use animated emoji avatars</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, animatedAvatars: !settings.animatedAvatars })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.animatedAvatars ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.animatedAvatars ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Default avatar style</p>
            <select
              value={settings.defaultAvatarStyle || 'circle'}
              onChange={(e) => onUpdate({ ...settings, defaultAvatarStyle: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="circle">Circle</option>
              <option value="square">Square</option>
              <option value="rounded">Rounded</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Avatar Creator Component
export const AvatarCreator = ({ onCreateAvatar, onClose }) => {
  const [selectedEmoji, setSelectedEmoji] = useState('😊');
  const [backgroundColor, setBackgroundColor] = useState('#00a884');
  const [avatarStyle, setAvatarStyle] = useState('circle');

  const emojis = ['😀', '😂', '😎', '🥳', '🤩', '😇', '🤠', '🥸', '🦸', '🦹', '🧙', '🧛', '🧜', '🧝', '🧞', '🧟'];
  const colors = ['#00a884', '#00d4ff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff8c42', '#9b59b6'];

  const handleCreate = () => {
    onCreateAvatar({
      emoji: selectedEmoji,
      color: backgroundColor,
      style: avatarStyle
    });
    onClose();
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
          <h3 className="text-white text-xl font-semibold flex items-center gap-2">
            <Sparkles className="text-[#00a884]" />
            Create Avatar
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center mb-6">
          <div
            className={`w-24 h-24 flex items-center justify-center text-5xl ${
              avatarStyle === 'circle' ? 'rounded-full' : 
              avatarStyle === 'square' ? 'rounded-lg' : 'rounded-2xl'
            }`}
            style={{ backgroundColor }}
          >
            {selectedEmoji}
          </div>
        </div>

        {/* Emoji Selection */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">Choose Emoji</label>
          <div className="grid grid-cols-8 gap-2">
            {emojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                className={`p-2 rounded-lg text-2xl transition-all ${
                  selectedEmoji === emoji ? 'bg-[#00a884]/20' : 'hover:bg-[#00a884]/10'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Color Selection */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">Background Color</label>
          <div className="flex gap-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setBackgroundColor(color)}
                className={`w-10 h-10 rounded-lg transition-all ${
                  backgroundColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a2e35]' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Style Selection */}
        <div className="mb-6">
          <label className="text-gray-400 text-sm mb-2 block">Shape</label>
          <div className="flex gap-2">
            {['circle', 'square', 'rounded'].map(style => (
              <button
                key={style}
                onClick={() => setAvatarStyle(style)}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  avatarStyle === style
                    ? 'border-[#00a884] bg-[#00a884]/20'
                    : 'border-[#00a884]/30 hover:border-[#00a884]'
                }`}
              >
                <div
                  className={`w-8 h-8 mx-auto ${
                    style === 'circle' ? 'rounded-full' : 
                    style === 'square' ? 'rounded' : 'rounded-2xl'
                  }`}
                  style={{ backgroundColor }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={handleCreate}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles size={18} />
          Create Avatar
        </button>
      </div>
    </motion.div>
  );
};

export default AvatarManager;
