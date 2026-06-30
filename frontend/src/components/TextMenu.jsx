import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Mic, Camera, Image, FileText, MapPin, Contact } from 'lucide-react';

const QUICK_REACTIONS = [
  { emoji: '❤️', name: 'love' },
  { emoji: '👍', name: 'like' },
  { emoji: '😂', name: 'laugh' },
  { emoji: '😮', name: 'surprised' },
  { emoji: '😢', name: 'sad' },
  { emoji: '😡', name: 'angry' },
];

const TextMenu = ({ onEmojiSelect, onAttachmentSelect, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('emoji');
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleReactionClick = (emoji) => {
    onEmojiSelect?.(emoji);
    onClose();
  };

  const handleAttachmentClick = (type) => {
    onAttachmentSelect?.(type);
    onClose();
  };

  return (
    <div 
      ref={menuRef}
      className="text-menu-content absolute bottom-full left-0 mb-2"
      style={{ minWidth: '320px' }}
    >
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('emoji')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'emoji'
              ? 'text-[#00a884] border-b-2 border-[#00a884]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Smile size={16} className="inline mr-1" />
          Emoji
        </button>
        <button
          onClick={() => setActiveTab('attachments')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'attachments'
              ? 'text-[#00a884] border-b-2 border-[#00a884]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Paperclip size={16} className="inline mr-1" />
          Attach
        </button>
      </div>

      {/* Content */}
      <div className="p-2">
        {activeTab === 'emoji' && (
          <div>
            <p className="text-xs text-gray-400 mb-2 px-1">Quick Reactions</p>
            <div className="flex gap-2 flex-wrap">
              {QUICK_REACTIONS.map((reaction) => (
                <button
                  key={reaction.name}
                  onClick={() => handleReactionClick(reaction.emoji)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-xl"
                  title={reaction.name}
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleAttachmentClick('image')}
              className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Image size={20} className="text-gray-400" />
              <span className="text-xs text-gray-400">Photo</span>
            </button>
            <button
              onClick={() => handleAttachmentClick('camera')}
              className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Camera size={20} className="text-gray-400" />
              <span className="text-xs text-gray-400">Camera</span>
            </button>
            <button
              onClick={() => handleAttachmentClick('document')}
              className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FileText size={20} className="text-gray-400" />
              <span className="text-xs text-gray-400">Document</span>
            </button>
            <button
              onClick={() => handleAttachmentClick('audio')}
              className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Mic size={20} className="text-gray-400" />
              <span className="text-xs text-gray-400">Audio</span>
            </button>
            <button
              onClick={() => handleAttachmentClick('location')}
              className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <MapPin size={20} className="text-gray-400" />
              <span className="text-xs text-gray-400">Location</span>
            </button>
            <button
              onClick={() => handleAttachmentClick('contact')}
              className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Contact size={20} className="text-gray-400" />
              <span className="text-xs text-gray-400">Contact</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextMenu;
