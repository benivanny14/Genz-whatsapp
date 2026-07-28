import React, { useState } from 'react';
import { X, Smile, Clock, MapPin, Hash, At, Link as LinkIcon, Music, HelpCircle, Sliders, Timer, Heart, Search } from 'lucide-react';

const SpecialStickersPanel = ({ onClose, onStickerSelect }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', icon: Smile, label: 'All' },
    { id: 'custom', icon: Smile, label: 'Custom' },
    { id: 'time', icon: Clock, label: 'Time' },
    { id: 'weather', icon: Smile, label: 'Weather' },
    { id: 'location', icon: MapPin, label: 'Location' },
    { id: 'hashtag', icon: Hash, label: 'Hashtag' },
    { id: 'mention', icon: At, label: 'Mention' },
    { id: 'link', icon: LinkIcon, label: 'Link' },
    { id: 'music', icon: Music, label: 'Music' },
    { id: 'poll', icon: Sliders, label: 'Poll' },
    { id: 'quiz', icon: HelpCircle, label: 'Quiz' },
    { id: 'question', icon: HelpCircle, label: 'Question' },
    { id: 'slider', icon: Sliders, label: 'Slider' },
    { id: 'countdown', icon: Timer, label: 'Countdown' },
    { id: 'donation', icon: Heart, label: 'Donation' }
  ];

  const stickers = [
    // Custom stickers
    { id: 'custom-1', category: 'custom', emoji: '🎨', label: 'Custom 1' },
    { id: 'custom-2', category: 'custom', emoji: '✏️', label: 'Custom 2' },
    { id: 'custom-3', category: 'custom', emoji: '🖼️', label: 'Custom 3' },
    
    // Time stickers
    { id: 'time-1', category: 'time', emoji: '⏰', label: 'Clock' },
    { id: 'time-2', category: 'time', emoji: '🕐', label: '1:00' },
    { id: 'time-3', category: 'time', emoji: '🕑', label: '2:00' },
    { id: 'time-4', category: 'time', emoji: '🕒', label: '3:00' },
    { id: 'time-5', category: 'time', emoji: '🕓', label: '4:00' },
    { id: 'time-6', category: 'time', emoji: '🕔', label: '5:00' },
    { id: 'time-7', category: 'time', emoji: '🕕', label: '6:00' },
    { id: 'time-8', category: 'time', emoji: '🕖', label: '7:00' },
    { id: 'time-9', category: 'time', emoji: '🕗', label: '8:00' },
    { id: 'time-10', category: 'time', emoji: '🕘', label: '9:00' },
    { id: 'time-11', category: 'time', emoji: '🕙', label: '10:00' },
    { id: 'time-12', category: 'time', emoji: '🕚', label: '11:00' },
    { id: 'time-13', category: 'time', emoji: '🕛', label: '12:00' },
    
    // Weather stickers
    { id: 'weather-1', category: 'weather', emoji: '☀️', label: 'Sunny' },
    { id: 'weather-2', category: 'weather', emoji: '🌤️', label: 'Partly Cloudy' },
    { id: 'weather-3', category: 'weather', emoji: '☁️', label: 'Cloudy' },
    { id: 'weather-4', category: 'weather', emoji: '🌧️', label: 'Rainy' },
    { id: 'weather-5', category: 'weather', emoji: '⛈️', label: 'Thunderstorm' },
    { id: 'weather-6', category: 'weather', emoji: '❄️', label: 'Snowy' },
    { id: 'weather-7', category: 'weather', emoji: '🌫️', label: 'Foggy' },
    { id: 'weather-8', category: 'weather', emoji: '🌈', label: 'Rainbow' },
    
    // Location stickers
    { id: 'location-1', category: 'location', emoji: '📍', label: 'Pin' },
    { id: 'location-2', category: 'location', emoji: '🗺️', label: 'Map' },
    { id: 'location-3', category: 'location', emoji: '🏠', label: 'Home' },
    { id: 'location-4', category: 'location', emoji: '🏢', label: 'Office' },
    { id: 'location-5', category: 'location', emoji: '🏫', label: 'School' },
    { id: 'location-6', category: 'location', emoji: '🏥', label: 'Hospital' },
    { id: 'location-7', category: 'location', emoji: '✈️', label: 'Airport' },
    { id: 'location-8', category: 'location', emoji: '🚗', label: 'Car' },
    
    // Hashtag stickers
    { id: 'hashtag-1', category: 'hashtag', emoji: '#️⃣', label: 'Hashtag' },
    { id: 'hashtag-2', category: 'hashtag', emoji: '🔥', label: 'Trending' },
    { id: 'hashtag-3', category: 'hashtag', emoji: '💯', label: '100' },
    { id: 'hashtag-4', category: 'hashtag', emoji: '⭐', label: 'Star' },
    
    // Mention stickers
    { id: 'mention-1', category: 'mention', emoji: '👤', label: 'User' },
    { id: 'mention-2', category: 'mention', emoji: '👥', label: 'Group' },
    { id: 'mention-3', category: 'mention', emoji: '👑', label: 'Admin' },
    { id: 'mention-4', category: 'mention', emoji: '🔔', label: 'Notify' },
    
    // Link stickers
    { id: 'link-1', category: 'link', emoji: '🔗', label: 'Link' },
    { id: 'link-2', category: 'link', emoji: '🌐', label: 'Website' },
    { id: 'link-3', category: 'link', emoji: '📱', label: 'App' },
    { id: 'link-4', category: 'link', emoji: '📧', label: 'Email' },
    
    // Music stickers
    { id: 'music-1', category: 'music', emoji: '🎵', label: 'Music' },
    { id: 'music-2', category: 'music', emoji: '🎶', label: 'Notes' },
    { id: 'music-3', category: 'music', emoji: '🎧', label: 'Headphones' },
    { id: 'music-4', category: 'music', emoji: '🎤', label: 'Microphone' },
    { id: 'music-5', category: 'music', emoji: '🎸', label: 'Guitar' },
    { id: 'music-6', category: 'music', emoji: '🎹', label: 'Piano' },
    { id: 'music-7', category: 'music', emoji: '🥁', label: 'Drums' },
    { id: 'music-8', category: 'music', emoji: '🎷', label: 'Saxophone' },
    
    // Poll stickers
    { id: 'poll-1', category: 'poll', emoji: '📊', label: 'Poll' },
    { id: 'poll-2', category: 'poll', emoji: '📈', label: 'Chart' },
    { id: 'poll-3', category: 'poll', emoji: '📉', label: 'Down' },
    { id: 'poll-4', category: 'poll', emoji: '✅', label: 'Yes' },
    { id: 'poll-5', category: 'poll', emoji: '❌', label: 'No' },
    
    // Quiz stickers
    { id: 'quiz-1', category: 'quiz', emoji: '❓', label: 'Question' },
    { id: 'quiz-2', category: 'quiz', emoji: '🧠', label: 'Brain' },
    { id: 'quiz-3', category: 'quiz', emoji: '💡', label: 'Idea' },
    { id: 'quiz-4', category: 'quiz', emoji: '🎯', label: 'Target' },
    
    // Question stickers
    { id: 'question-1', category: 'question', emoji: '🙋', label: 'Raise Hand' },
    { id: 'question-2', category: 'question', emoji: '🤔', label: 'Thinking' },
    { id: 'question-3', category: 'question', emoji: '💭', label: 'Thought' },
    { id: 'question-4', category: 'question', emoji: '❔', label: 'White Q' },
    
    // Slider stickers
    { id: 'slider-1', category: 'slider', emoji: '🎚️', label: 'Slider' },
    { id: 'slider-2', category: 'slider', emoji: '📏', label: 'Ruler' },
    { id: 'slider-3', category: 'slider', emoji: '⚖️', label: 'Balance' },
    { id: 'slider-4', category: 'slider', emoji: '🔀', label: 'Shuffle' },
    
    // Countdown stickers
    { id: 'countdown-1', category: 'countdown', emoji: '⏳', label: 'Hourglass' },
    { id: 'countdown-2', category: 'countdown', emoji: '🗓️', label: 'Calendar' },
    { id: 'countdown-3', category: 'countdown', emoji: '📅', label: 'Date' },
    { id: 'countdown-4', category: 'countdown', emoji: '⏱️', label: 'Stopwatch' },
    
    // Donation stickers
    { id: 'donation-1', category: 'donation', emoji: '💰', label: 'Money' },
    { id: 'donation-2', category: 'donation', emoji: '💎', label: 'Diamond' },
    { id: 'donation-3', category: 'donation', emoji: '💳', label: 'Card' },
    { id: 'donation-4', category: 'donation', emoji: '🎁', label: 'Gift' },
    { id: 'donation-5', category: 'donation', emoji: '❤️', label: 'Love' }
  ];

  const filteredStickers = stickers.filter(sticker => {
    const matchesCategory = activeCategory === 'all' || sticker.category === activeCategory;
    const matchesSearch = sticker.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sticker.emoji.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const handleStickerSelect = (sticker) => {
    if (onStickerSelect) {
      onStickerSelect(sticker);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Smile className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Special Stickers</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
            <Search size={16} className="text-white/40" />
            <input
              type="text"
              placeholder="Search stickers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/40"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 border-b border-white/10">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    activeCategory === category.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-sm">{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stickers Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-6 gap-3">
            {filteredStickers.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => handleStickerSelect(sticker)}
                className="aspect-square bg-white/5 hover:bg-white/10 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors group"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{sticker.emoji}</span>
                <span className="text-xs text-white/60">{sticker.label}</span>
              </button>
            ))}
          </div>
          
          {filteredStickers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <Smile size={48} />
              <p className="mt-4">No stickers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecialStickersPanel;
