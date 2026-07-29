import React, { useState, useEffect } from 'react';
import { X, Sparkles, Wand2, Magic, Zap, RefreshCw, Copy, Check, Download, Image as ImageIcon, Video } from 'lucide-react';

const AICaptionGenerator = ({ onClose, media, onCaptionGenerated }) => {
  const [generating, setGenerating] = useState(false);
  const [captions, setCaptions] = useState([]);
  const [selectedCaption, setSelectedCaption] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [style, setStyle] = useState('engaging');
  const [tone, setTone] = useState('friendly');
  const [language, setLanguage] = useState('en');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [copied, setCopied] = useState(false);

  const styles = [
    { id: 'engaging', label: 'Engaging', icon: Sparkles },
    { id: 'professional', label: 'Professional', icon: Wand2 },
    { id: 'funny', label: 'Funny', icon: Magic },
    { id: 'minimal', label: 'Minimal', icon: Zap },
    { id: 'story', label: 'Story', icon: ImageIcon }
  ];

  const tones = [
    { id: 'friendly', label: 'Friendly' },
    { id: 'formal', label: 'Formal' },
    { id: 'casual', label: 'Casual' },
    { id: 'excited', label: 'Excited' },
    { id: 'emotional', label: 'Emotional' }
  ];

  const languages = [
    { id: 'en', label: 'English' },
    { id: 'sw', label: 'Swahili' },
    { id: 'es', label: 'Spanish' },
    { id: 'fr', label: 'French' },
    { id: 'de', label: 'German' },
    { id: 'ar', label: 'Arabic' }
  ];

  const generateCaptions = async () => {
    setGenerating(true);
    setCaptions([]);

    try {
      // Simulate AI generation - in production, this would call an AI API
      await new Promise(resolve => setTimeout(resolve, 2000));

      const generatedCaptions = [
        {
          id: 1,
          text: generateMockCaption(style, tone, language),
          hashtags: includeHashtags ? generateHashtags() : [],
          emojis: includeEmojis ? generateEmojis() : '',
          score: Math.floor(Math.random() * 20) + 80
        },
        {
          id: 2,
          text: generateMockCaption(style, tone, language, true),
          hashtags: includeHashtags ? generateHashtags(true) : [],
          emojis: includeEmojis ? generateEmojis(true) : '',
          score: Math.floor(Math.random() * 20) + 70
        },
        {
          id: 3,
          text: generateMockCaption(style, tone, language, false, true),
          hashtags: includeHashtags ? generateHashtags(false, true) : [],
          emojis: includeEmojis ? generateEmojis(false, true) : '',
          score: Math.floor(Math.random() * 20) + 75
        }
      ];

      setCaptions(generatedCaptions);
      setSelectedCaption(generatedCaptions[0]);
    } catch (error) {
      console.error('Error generating captions:', error);
    } finally {
      setGenerating(false);
    }
  };

  const generateMockCaption = (style, tone, lang, variant = false, short = false) => {
    const baseCaptions = {
      engaging: [
        "✨ Living my best life! This moment deserves to be shared with the world 🌟",
        "Capturing memories that will last forever 💫",
        "Life is beautiful when you embrace every moment 🌈",
        "Making memories one snapshot at a time 📸"
      ],
      professional: [
        "Sharing insights and experiences from today's journey 📊",
        "Professional growth and continuous learning 🎯",
        "Building meaningful connections and opportunities 🤝",
        "Excellence in every aspect of life 💼"
      ],
      funny: [
        "When life gives you lemons, make a status update 🍋😂",
        "POV: You're living your best life but also procrastinating 🎭",
        "Me: *takes one photo* Also me: *takes 100 more photos* 📱",
        "Living that chaotic but fabulous life ✨"
      ],
      minimal: [
        "Moments like this.",
        "Simply beautiful.",
        "Captured.",
        "Pure joy."
      ],
      story: [
        "Chapter 1: The beginning of something amazing 📖",
        "Writing my own story, one day at a time ✍️",
        "Every status tells a story, this is mine 📚",
        "The plot thickens... stay tuned for more 🎬"
      ]
    };

    const toneModifiers = {
      friendly: ["Hey friends!", "What's up everyone!", "Good vibes only!"],
      formal: ["Greetings,", "Dear connections,", "Professional update:"],
      casual: ["Just vibing", "Chill mode on", "Keeping it real"],
      excited: ["OMG!", "Can't believe this!", "So excited!"],
      emotional: ["Feeling blessed", "Heart full", "Grateful moments"]
    };

    let caption = baseCaptions[style]?.[Math.floor(Math.random() * baseCaptions[style].length)] || baseCaptions.engaging[0];
    
    if (variant) {
      caption = baseCaptions[style]?.[(Math.floor(Math.random() * baseCaptions[style].length) + 1) % baseCaptions[style].length] || caption;
    }

    if (short) {
      caption = caption.split('.')[0] + '.';
    }

    const modifier = toneModifiers[tone]?.[Math.floor(Math.random() * toneModifiers[tone].length)] || '';
    if (modifier && style !== 'minimal') {
      caption = `${modifier} ${caption}`;
    }

    return caption;
  };

  const generateHashtags = (variant = false, trending = false) => {
    const baseHashtags = ['#viral', '#trending', '#fyp', '#status', '#moments', '#life', '#memories'];
    const trendingHashtags = ['#viral2024', '#trendingnow', '#fypシ', '#explore', '#statusupdate'];
    
    let hashtags = trending ? trendingHashtags : baseHashtags;
    if (variant) {
      hashtags = hashtags.reverse();
    }
    
    return hashtags.slice(0, 5);
  };

  const generateEmojis = (variant = false, extra = false) => {
    const baseEmojis = ['✨', '💫', '🌟', '⭐', '🌈', '💖'];
    const extraEmojis = ['🎉', '🎊', '🔥', '💯', '🙌', '💪'];
    
    let emojis = extra ? [...baseEmojis, ...extraEmojis] : baseEmojis;
    if (variant) {
      emojis = emojis.reverse();
    }
    
    return emojis.slice(0, 3).join(' ');
  };

  const handleCopyCaption = (caption) => {
    const fullCaption = `${caption.text} ${caption.emojis} ${caption.hashtags.join(' ')}`;
    navigator.clipboard.writeText(fullCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseCaption = () => {
    if (selectedCaption && onCaptionGenerated) {
      const fullCaption = `${selectedCaption.text} ${selectedCaption.emojis} ${selectedCaption.hashtags.join(' ')}`;
      onCaptionGenerated(fullCaption);
      onClose();
    }
  };

  const handleRegenerate = () => {
    generateCaptions();
  };

  useEffect(() => {
    if (media) {
      generateCaptions();
    }
  }, [media]);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Sparkles className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">AI Caption Generator</h2>
              <p className="text-white/60 text-xs">Generate engaging captions with AI</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Media Preview */}
          {media && (
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                {media.type?.startsWith('image') ? (
                  <ImageIcon className="text-[#00a884]" size={24} />
                ) : (
                  <Video className="text-[#00a884]" size={24} />
                )}
                <div>
                  <p className="text-white font-medium">Media Selected</p>
                  <p className="text-white/60 text-xs">{media.type || 'Unknown type'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Custom Prompt */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Custom Prompt (Optional)</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe what you want the caption to focus on..."
              rows={2}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
            />
          </div>

          {/* Style Selection */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Caption Style</label>
            <div className="grid grid-cols-5 gap-2">
              {styles.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                      style === s.id
                        ? 'bg-[#00a884] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-xs">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone Selection */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Tone</label>
            <div className="grid grid-cols-5 gap-2">
              {tones.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    tone === t.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            >
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id} className="bg-[#1a2e35]">
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeHashtags}
                onChange={(e) => setIncludeHashtags(e.target.checked)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Include Hashtags</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeEmojis}
                onChange={(e) => setIncludeEmojis(e.target.checked)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Include Emojis</span>
            </label>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateCaptions}
            disabled={generating}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <RefreshCw className="animate-spin" size={20} />
                Generating...
              </>
            ) : (
              <>
                <Wand2 size={20} />
                Generate Captions
              </>
            )}
          </button>

          {/* Generated Captions */}
          {captions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">Generated Captions</p>
                <button
                  onClick={handleRegenerate}
                  className="text-[#00a884] text-sm flex items-center gap-1 hover:text-[#008f6f]"
                >
                  <RefreshCw size={14} />
                  Regenerate
                </button>
              </div>

              {captions.map((caption) => (
                <div
                  key={caption.id}
                  onClick={() => setSelectedCaption(caption)}
                  className={`bg-white/5 rounded-xl p-4 cursor-pointer border-2 transition-colors ${
                    selectedCaption?.id === caption.id
                      ? 'border-[#00a884] bg-[#00a884]/10'
                      : 'border-transparent hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-white text-sm flex-1">{caption.text}</p>
                    <div className="flex items-center gap-1 text-green-400 text-xs ml-2">
                      <Sparkles size={12} />
                      <span>{caption.score}%</span>
                    </div>
                  </div>
                  {caption.emojis && (
                    <p className="text-white/70 text-xs mb-1">{caption.emojis}</p>
                  )}
                  {caption.hashtags.length > 0 && (
                    <p className="text-[#00a884] text-xs">{caption.hashtags.join(' ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedCaption && (
          <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
            <div className="flex gap-3">
              <button
                onClick={() => handleCopyCaption(selectedCaption)}
                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium flex items-center justify-center gap-2"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleUseCaption}
                className="flex-1 px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
              >
                <Magic size={20} />
                Use Caption
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICaptionGenerator;
