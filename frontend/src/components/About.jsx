import React, { useState } from 'react';
import { Info, X, Check, RefreshCw, Edit2, User, Briefcase, MapPin, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const About = ({ user, onUpdate, onClose }) => {
  const [about, setAbout] = useState(user?.about || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const aboutSuggestions = [
    "Available",
    "Busy",
    "At work",
    "At the movies",
    "At the gym",
    "Sleeping",
    "In a meeting",
    "Battery about to die",
    "Can't talk, WhatsApp only",
    "In a call"
  ];

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);

    if (onUpdate) {
      onUpdate({ about });
    }
    setIsEditing(false);
  };

  const handleSelectSuggestion = (suggestion) => {
    setAbout(suggestion);
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
            <Info className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">About</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current About */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Current status</p>
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            {isEditing ? (
              <input
                type="text"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Write about yourself..."
                className="w-full bg-transparent text-white focus:outline-none"
                maxLength={139}
              />
            ) : (
              <p className="text-white">{about || 'No status set'}</p>
            )}
          </div>
        </div>

        {/* Suggestions */}
        {!isEditing && (
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-2">Quick suggestions</p>
            <div className="flex flex-wrap gap-2">
              {aboutSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setAbout(suggestion);
                    setIsEditing(true);
                  }}
                  className="px-3 py-1.5 bg-[#0b141a] text-gray-300 rounded-full text-sm hover:bg-[#1a2e35] hover:text-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Character Count */}
        {isEditing && (
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-400 text-xs">Character limit</p>
            <p className="text-gray-400 text-xs">{about.length}/139</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setAbout(user?.about || '');
                  setIsEditing(false);
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
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
            >
              <Edit2 size={18} />
              Edit About
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// About Display Component
export const AboutDisplay = ({ about, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
    >
      <Info size={14} />
      <span className="text-sm truncate">{about || 'Tap to add about info'}</span>
    </button>
  );
};

// About Badge Component
export const AboutBadge = ({ about }) => {
  if (!about) return null;

  const getIcon = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('work') || lower.includes('meeting')) return Briefcase;
    if (lower.includes('home') || lower.includes('gym')) return MapPin;
    if (lower.includes('love') || lower.includes('heart')) return Heart;
    return User;
  };

  const Icon = getIcon(about);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1 text-gray-400 text-sm"
    >
      <Icon size={12} />
      <span className="truncate">{about}</span>
    </motion.div>
  );
};

// About Settings Component
export const AboutSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Info size={18} className="text-[#00a884]" />
            About
          </p>
          <p className="text-gray-400 text-sm">Your status message</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, aboutEnabled: !settings.aboutEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.aboutEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.aboutEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.aboutEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show about to contacts</p>
              <p className="text-gray-400 text-xs">Display in profile</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showAboutToContacts: !settings.showAboutToContacts })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showAboutToContacts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showAboutToContacts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default About;
