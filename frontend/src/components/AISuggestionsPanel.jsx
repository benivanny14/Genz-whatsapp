import React, { useState, useEffect } from 'react';
import { X, Hash, MapPin, AtSign, Music, Sparkles, Copy, Plus } from 'lucide-react';

const AISuggestionsPanel = ({ onClose, content, onApply }) => {
  const [suggestions, setSuggestions] = useState({
    hashtags: [],
    locations: [],
    mentions: [],
    music: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedMentions, setSelectedMentions] = useState([]);
  const [selectedMusic, setSelectedMusic] = useState(null);

  useEffect(() => {
    if (content) {
      generateSuggestions();
    }
  }, [content]);

  const generateSuggestions = async () => {
    setLoading(true);
    
    // Simulate AI suggestions (in production, this would call an AI API)
    setTimeout(() => {
      const hashtagSuggestions = generateHashtagSuggestions(content);
      const locationSuggestions = generateLocationSuggestions();
      const mentionSuggestions = generateMentionSuggestions();
      const musicSuggestions = generateMusicSuggestions();

      setSuggestions({
        hashtags: hashtagSuggestions,
        locations: locationSuggestions,
        mentions: mentionSuggestions,
        music: musicSuggestions
      });
      setLoading(false);
    }, 1000);
  };

  const generateHashtagSuggestions = (text) => {
    const keywords = text.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const commonHashtags = [
      '#trending', '#viral', '#fyp', '#explore', '#status',
      '#mood', '#life', '#love', '#happy', '#funny',
      '#photography', '#art', '#music', '#dance', '#food',
      '#travel', '#nature', '#sunset', '#beach', '#city'
    ];
    
    const relevantHashtags = keywords.map(keyword => {
      const matches = commonHashtags.filter(tag => 
        tag.includes(keyword) || keyword.includes(tag.replace('#', ''))
      );
      return matches[0] || `#${keyword}`;
    });

    return [...new Set([...relevantHashtags, ...commonHashtags.slice(0, 5)])];
  };

  const generateLocationSuggestions = () => {
    return [
      { id: 1, name: 'Dar es Salaam, Tanzania', country: 'Tanzania' },
      { id: 2, name: 'Nairobi, Kenya', country: 'Kenya' },
      { id: 3, name: 'Kampala, Uganda', country: 'Uganda' },
      { id: 4, name: 'Lagos, Nigeria', country: 'Nigeria' },
      { id: 5, name: 'Johannesburg, South Africa', country: 'South Africa' },
      { id: 6, name: 'Cairo, Egypt', country: 'Egypt' },
      { id: 7, name: 'New York, USA', country: 'USA' },
      { id: 8, name: 'London, UK', country: 'UK' },
      { id: 9, name: 'Paris, France', country: 'France' },
      { id: 10, name: 'Dubai, UAE', country: 'UAE' }
    ];
  };

  const generateMentionSuggestions = () => {
    return [
      { id: 1, username: 'john_doe', name: 'John Doe' },
      { id: 2, username: 'jane_smith', name: 'Jane Smith' },
      { id: 3, username: 'mike_wilson', name: 'Mike Wilson' },
      { id: 4, username: 'sarah_jones', name: 'Sarah Jones' },
      { id: 5, username: 'alex_brown', name: 'Alex Brown' }
    ];
  };

  const generateMusicSuggestions = () => {
    return [
      { id: 1, title: 'Blinding Lights', artist: 'The Weeknd' },
      { id: 2, title: 'Levitating', artist: 'Dua Lipa' },
      { id: 3, title: 'Stay', artist: 'The Kid LAROI, Justin Bieber' },
      { id: 4, title: 'Good 4 U', artist: 'Olivia Rodrigo' },
      { id: 5, title: 'Montero', artist: 'Lil Nas X' },
      { id: 6, title: 'Peaches', artist: 'Justin Bieber' },
      { id: 7, title: 'Kiss Me More', artist: 'Doja Cat' },
      { id: 8, title: 'Save Your Tears', artist: 'The Weeknd' }
    ];
  };

  const toggleHashtag = (hashtag) => {
    if (selectedHashtags.includes(hashtag)) {
      setSelectedHashtags(selectedHashtags.filter(h => h !== hashtag));
    } else {
      setSelectedHashtags([...selectedHashtags, hashtag]);
    }
  };

  const handleApply = () => {
    if (onApply) {
      onApply({
        hashtags: selectedHashtags,
        location: selectedLocation,
        mentions: selectedMentions,
        music: selectedMusic
      });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Sparkles className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">AI-Powered Suggestions</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-white/60">Analyzing content...</div>
            </div>
          ) : (
            <>
              {/* Hashtags */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Hash size={18} className="text-[#00a884]" />
                  <h3 className="text-white font-medium">Suggested Hashtags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.hashtags.map((hashtag) => (
                    <button
                      key={hashtag}
                      onClick={() => toggleHashtag(hashtag)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedHashtags.includes(hashtag)
                          ? 'bg-[#00a884] text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {hashtag}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(selectedHashtags.join(' '))}
                    className="text-white/60 hover:text-white text-sm flex items-center gap-1"
                  >
                    <Copy size={14} />
                    Copy selected
                  </button>
                </div>
              </div>

              {/* Location */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={18} className="text-[#00a884]" />
                  <h3 className="text-white font-medium">Suggested Locations</h3>
                </div>
                <div className="space-y-2">
                  {suggestions.locations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => setSelectedLocation(location)}
                      className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                        selectedLocation?.id === location.id
                          ? 'bg-[#00a884] text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <div className="font-medium">{location.name}</div>
                      <div className="text-sm opacity-70">{location.country}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mentions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <At size={18} className="text-[#00a884]" />
                  <h3 className="text-white font-medium">Suggested Mentions</h3>
                </div>
                <div className="space-y-2">
                  {suggestions.mentions.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        if (selectedMentions.includes(user.username)) {
                          setSelectedMentions(selectedMentions.filter(u => u !== user.username));
                        } else {
                          setSelectedMentions([...selectedMentions, user.username]);
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                        selectedMentions.includes(user.username)
                          ? 'bg-[#00a884] text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <div className="font-medium">@{user.username}</div>
                      <div className="text-sm opacity-70">{user.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Music */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Music size={18} className="text-[#00a884]" />
                  <h3 className="text-white font-medium">Suggested Music</h3>
                </div>
                <div className="space-y-2">
                  {suggestions.music.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => setSelectedMusic(track)}
                      className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                        selectedMusic?.id === track.id
                          ? 'bg-[#00a884] text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <div className="font-medium">{track.title}</div>
                      <div className="text-sm opacity-70">{track.artist}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/60 text-xs">
                  <Sparkles size={14} className="inline mr-1" />
                  AI suggestions are based on content analysis. In production, this would use ML models like GPT-4, Claude, or custom NLP models for more accurate suggestions.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={handleApply}
            disabled={loading}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Suggestions
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISuggestionsPanel;
