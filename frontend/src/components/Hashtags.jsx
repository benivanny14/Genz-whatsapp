import React, { useState } from 'react';
import { Hash, X, Search, TrendingUp, Clock, Check, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Hashtags = ({ hashtags, onSearch, onFilter, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, trending, recent, popular
  const [selectedHashtags, setSelectedHashtags] = useState([]);

  const filteredHashtags = hashtags.filter(hashtag => {
    const matchesSearch = hashtag.tag.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || hashtag.category === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleHashtagSelect = (hashtag) => {
    if (!selectedHashtags.find(h => h.id === hashtag.id)) {
      setSelectedHashtags([...selectedHashtags, hashtag]);
    }
  };

  const handleRemoveHashtag = (hashtagId) => {
    setSelectedHashtags(selectedHashtags.filter(h => h.id !== hashtagId));
  };

  const handleSearch = () => {
    if (onSearch) {
      onSearch(selectedHashtags);
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
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Hash size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Hashtags</h2>
              <p className="text-gray-400 text-sm">{hashtags.length} hashtags</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hashtags..."
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            {['all', 'trending', 'recent', 'popular'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg text-sm capitalize transition-all ${
                  filterType === type
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#0b141a] text-gray-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Hashtags */}
        {selectedHashtags.length > 0 && (
          <div className="p-4 border-b border-[#00a884]/20 bg-[#00a884]/10">
            <div className="flex flex-wrap gap-2">
              {selectedHashtags.map(hashtag => (
                <div
                  key={hashtag.id}
                  className="flex items-center gap-2 bg-[#0b141a] px-3 py-1 rounded-full"
                >
                  <span className="text-white text-sm">{hashtag.tag}</span>
                  <button
                    onClick={() => handleRemoveHashtag(hashtag.id)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hashtags List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredHashtags.map(hashtag => (
              <motion.button
                key={hashtag.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleHashtagSelect(hashtag)}
                className={`w-full p-4 rounded-lg text-left transition-all flex items-center justify-between ${
                  selectedHashtags.find(h => h.id === hashtag.id)
                    ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                    : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                    <Hash size={18} className="text-[#00a884]" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{hashtag.tag}</p>
                    <p className="text-gray-400 text-sm">{hashtag.count} messages</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hashtag.category === 'trending' && <TrendingUp size={16} className="text-[#00a884]" />}
                  {hashtag.category === 'recent' && <Clock size={16} className="text-gray-400" />}
                  {selectedHashtags.find(h => h.id === hashtag.id) && <Check size={18} className="text-[#00a884]" />}
                </div>
              </motion.button>
            ))}
          </div>

          {filteredHashtags.length === 0 && (
            <div className="text-center py-12">
              <Hash className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">
                {searchQuery ? 'No hashtags found' : 'No hashtags available'}
              </p>
            </div>
          )}
        </div>

        {/* Search Button */}
        {selectedHashtags.length > 0 && (
          <div className="p-4 border-t border-[#00a884]/20">
            <button
              onClick={handleSearch}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors"
            >
              Search with {selectedHashtags.length} hashtag{selectedHashtags.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Hashtag Display Component
export const HashtagDisplay = ({ hashtag, onClick }) => {
  return (
    <button
      onClick={() => onClick?.(hashtag)}
      className="text-[#00a884] hover:underline cursor-pointer"
    >
      #{hashtag}
    </button>
  );
};

// Hashtag Highlight Component
export const HashtagHighlight = ({ text }) => {
  const hashtagRegex = /#(\w+)/g;
  const parts = text.split(hashtagRegex);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('#')) {
          return <HashtagDisplay key={index} hashtag={part.substring(1)} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

// Hashtag Settings Component
export const HashtagSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Hash size={18} className="text-[#00a884]" />
            Hashtags
          </p>
          <p className="text-gray-400 text-sm">Enable hashtag support</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, hashtagsEnabled: !settings.hashtagsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.hashtagsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.hashtagsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.hashtagsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Highlight hashtags</p>
              <p className="text-gray-400 text-xs">Make hashtags clickable</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, highlightHashtags: !settings.highlightHashtags })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.highlightHashtags ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.highlightHashtags ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show trending hashtags</p>
              <p className="text-gray-400 text-xs">Display popular hashtags</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showTrending: !settings.showTrending })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showTrending ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showTrending ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-suggest hashtags</p>
              <p className="text-gray-400 text-xs">Suggest while typing</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoSuggestHashtags: !settings.autoSuggestHashtags })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoSuggestHashtags ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoSuggestHashtags ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Trending Hashtags Component
export const TrendingHashtags = ({ hashtags, onSelect }) => {
  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={18} className="text-[#00a884]" />
        <span className="text-white font-medium">Trending Hashtags</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {hashtags.slice(0, 5).map((hashtag, index) => (
          <button
            key={hashtag.id}
            onClick={() => onSelect?.(hashtag)}
            className="flex items-center gap-2 bg-[#1a2e35] px-3 py-2 rounded-full hover:bg-[#00a884]/20 transition-colors"
          >
            <span className="text-gray-400 text-xs">#{index + 1}</span>
            <span className="text-white text-sm">#{hashtag.tag}</span>
            <span className="text-gray-500 text-xs">{hashtag.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Hashtag Input Component
export const HashtagInput = ({ value, onChange, suggestions, onSuggestionSelect }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleChange = (e) => {
    onChange(e.target.value);
    setShowSuggestions(e.target.value.includes('#'));
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Type # for hashtags..."
        className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
      />
      
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#1a2e35] rounded-lg border border-[#00a884]/30 overflow-hidden z-50"
          >
            {suggestions.map(suggestion => (
              <button
                key={suggestion.id}
                onClick={() => {
                  onSuggestionSelect(suggestion);
                  setShowSuggestions(false);
                }}
                className="w-full p-3 text-left hover:bg-[#00a884]/20 transition-colors flex items-center justify-between"
              >
                <span className="text-white">#{suggestion.tag}</span>
                <span className="text-gray-400 text-xs">{suggestion.count} messages</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Hashtags;
