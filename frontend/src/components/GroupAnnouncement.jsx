import React, { useState } from 'react';
import { Megaphone, X, Check, RefreshCw, Edit, Send, Clock, Users, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GroupAnnouncement = ({ group, onCreateAnnouncement, onUpdateAnnouncement, onDeleteAnnouncement, onClose }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [announcement, setAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal', // normal, important, urgent
    expiresAt: null
  });
  const [isSaving, setIsSaving] = useState(false);

  const priorities = [
    { id: 'normal', label: 'Normal', color: 'text-gray-400' },
    { id: 'important', label: 'Important', color: 'text-yellow-500' },
    { id: 'urgent', label: 'Urgent', color: 'text-red-500' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);

    if (isEditing) {
      onUpdateAnnouncement?.(group._id, announcement);
    } else {
      onCreateAnnouncement?.(group._id, announcement);
    }

    setAnnouncement({ title: '', content: '', priority: 'normal', expiresAt: null });
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleDelete = async (announcementId) => {
    onDeleteAnnouncement?.(group._id, announcementId);
  };

  const currentAnnouncement = group?.announcement;

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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Megaphone size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Group Announcement</h2>
              <p className="text-gray-400 text-sm">{group?.name || 'Group'}</p>
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
        <div className="flex-1 overflow-y-auto p-4">
          {!isCreating && !isEditing ? (
            <>
              {/* Current Announcement */}
              {currentAnnouncement ? (
                <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Megaphone size={18} className="text-[#00a884]" />
                      <span className={`text-sm font-medium ${priorities.find(p => p.id === currentAnnouncement.priority)?.color}`}>
                        {currentAnnouncement.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setAnnouncement(currentAnnouncement);
                          setIsEditing(true);
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(currentAnnouncement._id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-white font-medium mb-2">{currentAnnouncement.title}</h4>
                  <p className="text-gray-300 text-sm mb-3">{currentAnnouncement.content}</p>
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <Clock size={12} />
                    <span>Posted {new Date(currentAnnouncement.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Megaphone className="text-gray-600 mx-auto mb-4" size={32} />
                  <p className="text-gray-400 mb-4">No active announcement</p>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#008f72] transition-colors"
                  >
                    Create Announcement
                  </button>
                </div>
              )}

              {/* Create Button */}
              {currentAnnouncement && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
                >
                  <Megaphone size={18} />
                  Update Announcement
                </button>
              )}
            </>
          ) : (
            <>
              {/* Create/Edit Form */}
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Title</p>
                  <input
                    type="text"
                    value={announcement.title}
                    onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                    placeholder="Announcement title..."
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Content</p>
                  <textarea
                    value={announcement.content}
                    onChange={(e) => setAnnouncement({ ...announcement, content: e.target.value })}
                    placeholder="Announcement content..."
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                    rows={4}
                  />
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Priority</p>
                  <div className="grid grid-cols-3 gap-2">
                    {priorities.map(priority => (
                      <button
                        key={priority.id}
                        onClick={() => setAnnouncement({ ...announcement, priority: priority.id })}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                          announcement.priority === priority.id
                            ? 'border-[#00a884] bg-[#00a884]/10'
                            : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                        }`}
                      >
                        <span className={`text-sm ${priority.color}`}>{priority.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      setAnnouncement({ title: '', content: '', priority: 'normal', expiresAt: null });
                    }}
                    className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !announcement.title || !announcement.content}
                    className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        {isEditing ? 'Update' : 'Post'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tips */}
        <div className="p-4 border-t border-[#00a884]/20 bg-[#00a884]/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-[#00a884] flex-shrink-0 mt-0.5" size={14} />
            <p className="text-[#00a884] text-xs">
              Announcements are pinned at the top of the group chat and visible to all members.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Announcement Display Component
export const AnnouncementDisplay = ({ announcement, onEdit }) => {
  const priorities = {
    normal: 'text-gray-400',
    important: 'text-yellow-500',
    urgent: 'text-red-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 mb-4"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-[#00a884]" />
          <span className={`text-xs font-medium ${priorities[announcement.priority]}`}>
            {announcement.priority.toUpperCase()}
          </span>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-gray-400 hover:text-white transition-colors"
            title="Edit announcement"
          >
            <Edit size={14} />
          </button>
        )}
      </div>
      <h4 className="text-white font-medium text-sm mb-1">{announcement.title}</h4>
      <p className="text-gray-300 text-xs">{announcement.content}</p>
    </motion.div>
  );
};

// Announcement Button Component
export const AnnouncementButton = ({ onClick, hasAnnouncement }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full transition-colors ${
        hasAnnouncement ? 'text-[#00a884]' : 'text-gray-400 hover:text-white'
      }`}
      title="Group announcement"
    >
      <Megaphone size={18} />
    </button>
  );
};

export default GroupAnnouncement;
