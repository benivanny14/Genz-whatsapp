import React, { useState, useEffect } from 'react';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { Smile, Square } from 'lucide-react';
import StickerPicker from './StickerPicker';

const MediaPickerPanel = ({
    activeTab = 'emoji',
    onTabChange,
    onEmojiSelect,
    onStickerSelect,
    theme = 'dark'
  }) => {
  return (
    <div className="flex flex-col h-[45vh] max-h-[380px] min-h-[280px] w-full bg-[#1a2332] border-t border-gray-700 shadow-2xl z-40 transition-transform duration-300 ease-out origin-bottom transform translate-y-0">
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'emoji' && (
          <div className="absolute inset-0 w-full h-full animate-fadeIn">
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                onEmojiSelect(emojiData);
              }}
              theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
              emojiStyle={EmojiStyle.APPLE}
              lazyLoadEmojis={true}
              searchPlaceHolder="Search Emoji"
              width="100%"
              height="100%"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                '--epr-bg-color': 'transparent',
                '--epr-category-label-bg-color': '#1a2332',
                '--epr-text-color': '#e2e8f0',
                '--epr-search-border-color': '#334155'
              }}
            />
          </div>
        )}

        {activeTab === 'sticker' && (
          <div className="absolute inset-0 w-full h-full overflow-y-auto animate-fadeIn">
            {/* Full WhatsApp-style sticker picker: Favorites, Recents, Store,
                downloadable packs, and custom sticker creator — same
                component used from the Attachments menu, now also reachable
                from the main emoji/media button on every screen size. */}
            <StickerPicker onStickerSelect={onStickerSelect} />
          </div>
        )}
      </div>

      {/* Bottom Tabs */}
      <div className="flex bg-[#0d1b2a] border-t border-gray-700">
        <button
          onClick={(e) => { e.preventDefault(); onTabChange('emoji'); }}
          className={`flex-1 py-3 flex justify-center items-center gap-2 transition-colors ${
            activeTab === 'emoji' ? 'text-blue-500 bg-white/5' : 'text-gray-400 hover:bg-white/5'
          }`}
        >
          <Smile size={20} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); onTabChange('sticker'); }}
          className={`flex-1 py-3 flex justify-center items-center gap-2 transition-colors ${
            activeTab === 'sticker' ? 'text-green-500 bg-white/5' : 'text-gray-400 hover:bg-white/5'
          }`}
        >
          <Square size={20} />
        </button>
      </div>
</div>
  );
};

export default MediaPickerPanel;
