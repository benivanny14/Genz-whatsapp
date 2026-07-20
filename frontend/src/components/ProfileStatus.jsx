import React, { useState } from 'react';
import { Edit, X, Check, RefreshCw, Smile, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProfileStatus = ({ user, onUpdateStatus, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState(user?.status || '');
  const [isSaving, setIsSaving] = useState(false);

  const quickStatuses = [
    'Available',
    'Busy',
    'At work',
    'At the movies',
    'At school',
    'At the gym',
    'Sleeping',
    'In a meeting'
  ];

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);

    if (onUpdateStatus) {
      onUpdateStatus({
        ...user,
        status
      });
    }
    setIsEditing(false);
  };

  const handleQuickStatus = (quickStatus) => {
    setStatus(quickStatus);
    setIsEditing(true);
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
            <Smile className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Profile Status</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!isEditing ? (
          <>
            {/* Current Status */}
            <div className="mb-4 p-4 bg-[#0b141a] rounded-lg border border-[#00a884]/20">
              <p className="text-gray-400 text-sm mb-1">Current status</p>
              <p className="text-white">{status || 'No status set'}</p>
            </div>

            {/* Quick Statuses */}
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Quick status</p>
              <div className="grid grid-cols-2 gap-2">
                {quickStatuses.map(quickStatus => (
                  <button
                    key={quickStatus}
                    onClick={() => handleQuickStatus(quickStatus)}
                    className="p-3 rounded-lg bg-[#0b141a] border border-[#00a884]/20 hover:border-[#00a884] transition-colors text-left"
                  >
                    <p className="text-white text-sm">{quickStatus}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
            >
              <Edit size={18} />
              Edit Status
            </button>
          </>
        ) : (
          <>
            {/* Status Input */}
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Your status</p>
              <textarea
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                rows={3}
                maxLength={139}
              />
              <p className="text-gray-400 text-xs mt-1 text-right">
                {status.length}/139
              </p>
            </div>

            {/* Quick Statuses */}
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Quick status</p>
              <div className="grid grid-cols-2 gap-2">
                {quickStatuses.map(quickStatus => (
                  <button
                    key={quickStatus}
                    onClick={() => setStatus(quickStatus)}
                    className={`p-2 rounded-lg border transition-colors text-left ${
                      status === quickStatus
                        ? 'border-[#00a884] bg-[#00a884]/10'
                        : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                    }`}
                  >
                    <p className="text-white text-xs">{quickStatus}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="mb-4 bg-[#00a884]/10 border border-[#00a884]/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-[#00a884] flex-shrink-0 mt-0.5" size={14} />
                <p className="text-[#00a884] text-xs">
                  Your status is visible to your contacts and helps them know when you're available.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setStatus(user?.status || '');
                }}
                className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
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
          </>
        )}
      </div>
    </motion.div>
  );
};

// Status Display Component
export const StatusDisplay = ({ status, onEdit }) => {
  return (
    <div className="flex items-center gap-2">
      <Smile size={16} className="text-gray-400" />
      <p className="text-gray-300 text-sm">{status || 'Tap to add status'}</p>
      {onEdit && (
        <button
          onClick={onEdit}
          className="text-gray-400 hover:text-[#00a884] transition-colors"
          title="Edit status"
        >
          <Edit size={14} />
        </button>
      )}
    </div>
  );
};

// Status Button Component
export const StatusButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Edit status"
    >
      <Smile size={18} />
    </button>
  );
};

export default ProfileStatus;
