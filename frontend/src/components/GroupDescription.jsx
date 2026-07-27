import React, { useState } from 'react';
import { FileText, X, Check, RefreshCw, Edit, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GroupDescription = ({ group, onUpdate, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(group?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);

    if (onUpdate) {
      onUpdate({
        ...group,
        description
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDescription(group?.description || '');
    setIsEditing(false);
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
            <FileText className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Group Description</h3>
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
            <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 mb-4">
              {description ? (
                <p className="text-white whitespace-pre-wrap">{description}</p>
              ) : (
                <p className="text-gray-400 italic">No description set</p>
              )}
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
            >
              <Edit size={18} />
              Edit Description
            </button>
          </>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Description</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a description for this group..."
                className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                rows={6}
                maxLength={500}
              />
              <p className="text-gray-400 text-xs mt-1 text-right">
                {description.length}/500
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCancel}
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

        {/* Tips */}
        <div className="mt-4 bg-[#00a884]/10 border border-[#00a884]/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-[#00a884] flex-shrink-0 mt-0.5" size={14} />
            <p className="text-[#00a884] text-xs">
              A good description helps members understand the group's purpose and guidelines.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Description Display Component
export const GroupDescriptionDisplay = ({ description, onEdit }) => {
  return (
    <div className="bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/20">
      <div className="flex items-start justify-between gap-2">
        <p className="text-gray-300 text-sm flex-1 whitespace-pre-wrap">
          {description || 'No description'}
        </p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-gray-400 hover:text-[#00a884] transition-colors flex-shrink-0"
            title="Edit description"
          >
            <Edit size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// Description Edit Button Component
export const DescriptionEditButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Edit description"
    >
      <FileText size={18} />
    </button>
  );
};

export default GroupDescription;
