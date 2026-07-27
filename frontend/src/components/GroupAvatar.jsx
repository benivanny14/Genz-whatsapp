import React, { useState, useRef } from 'react';
import { Image as ImageIcon, X, Check, RefreshCw, Camera, Upload, Trash2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GroupAvatar = ({ group, onUpdate, onClose }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(group?.avatar || null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleUpload = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setUploadProgress(i);
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    setIsUploading(false);

    if (onUpdate) {
      onUpdate({
        ...group,
        avatar: preview
      });
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (onUpdate) {
      onUpdate({
        ...group,
        avatar: null
      });
    }
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...group,
        avatar: preview
      });
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
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Group Avatar</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Avatar Preview */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-[#0b141a] border-4 border-[#00a884]/30 flex items-center justify-center overflow-hidden">
              {preview ? (
                <img
                  src={preview}
                  alt="Group avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users size={48} className="text-gray-400" />
              )}
            </div>

            {/* Upload Button Overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center hover:bg-[#008f72] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload avatar"
            >
              {isUploading ? (
                <RefreshCw className="animate-spin text-white" size={18} />
              ) : (
                <Camera size={18} className="text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm">Uploading...</span>
              <span className="text-gray-400 text-xs">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-[#0b141a] rounded-full h-2">
              <motion.div
                className="bg-[#00a884] h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Upload size={18} />
            Upload New Avatar
          </button>

          {preview && (
            <button
              onClick={handleRemove}
              disabled={isUploading}
              className="w-full bg-red-500/20 text-red-500 py-3 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Remove Avatar
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isUploading}
            className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Save Changes
          </button>
        </div>

        {/* Tips */}
        <div className="mt-4 bg-[#00a884]/10 border border-[#00a884]/20 rounded-lg p-3">
          <p className="text-[#00a884] text-xs text-center">
            Recommended: Square image, at least 200x200px
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// Avatar Display Component
export const GroupAvatarDisplay = ({ avatar, name, size = 40, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`rounded-full bg-[#00a884]/20 flex items-center justify-center overflow-hidden transition-colors hover:bg-[#00a884]/30`}
      style={{ width: size, height: size }}
      title="Change avatar"
    >
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        <Users size={size * 0.5} className="text-[#00a884]" />
      )}
    </button>
  );
};

// Avatar Edit Button Component
export const AvatarEditButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Change avatar"
    >
      <Camera size={18} />
    </button>
  );
};

export default GroupAvatar;
