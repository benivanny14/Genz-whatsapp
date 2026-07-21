import React, { useState } from 'react';
import { Sparkles, Copy, RefreshCw, Check, Wand2, X } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const CAPTION_STYLES = [
  { id: 'hype', label: '🔥 Hype', color: 'from-orange-500 to-red-500' },
  { id: 'funny', label: '😂 Funny', color: 'from-yellow-500 to-orange-500' },
  { id: 'romantic', label: '💕 Romantic', color: 'from-pink-500 to-purple-500' },
  { id: 'professional', label: '💼 Pro', color: 'from-blue-500 to-cyan-500' },
  { id: 'inspirational', label: '✨ Inspire', color: 'from-purple-500 to-pink-500' },
  { id: 'swahili', label: '🇹🇿 Kiswahili', color: 'from-green-500 to-teal-500' },
];

const CAPTIONS = {
  hype: [
    "🔥 Sijawahi kuwa na nguvu kama hii! GENZ tu!",
    "💪 Kila siku ni fursa mpya. Tumia vizuri!",
    "🚀 Level imepanda. Hakuna kurudi nyuma!",
    "⚡ Nguvu yangu haiwezi kuzuiwa. Watch me!",
    "🎯 Lengo ni moja — kushinda kila wakati!",
  ],
  funny: [
    "😂 Mimi hata sijui ninafanya nini lakini inaonekana vizuri!",
    "🤣 Maisha ni mchezo — na mimi ni champion!",
    "😅 Unajua unapenda hii lakini hutaki kukubali!",
    "🙈 Usijaribu kuiga. Hii ni edition moja tu!",
    "😜 Ukweli tu: naweza kukaa nyumbani lakini kwa nini?",
  ],
  romantic: [
    "💕 Maisha yangu yamebadilika tangu nilipokujua ❤️",
    "🌹 Kila wakati nadhani kwako... kila wakati.",
    "💫 Wewe ndiye siri ya furaha yangu",
    "🌙 Usiku na mchana, fikira zangu ni wewe tu",
    "💑 Pamoja ni nguvu. Mbali ni nguvu zaidi... kidogo 😅",
  ],
  professional: [
    "📈 Mafanikio hayaji kwa bahati. Yanakuja kwa kazi ngumu.",
    "💼 Lengo: kuwa bora kuliko jana.",
    "🎯 Vision clear. Mission active. Results incoming.",
    "📊 Hard work + Smart work = Unstoppable.",
    "🏆 Champions are made in the off-season.",
  ],
  inspirational: [
    "✨ Kila asubuhi ni upya. Tumia vizuri.",
    "🌟 Ndoto zako zinakusubiri — chukua hatua sasa.",
    "💫 Wewe una nguvu kuliko unavyodhani.",
    "🦋 Mabadiliko yanakua polepole — saburi.",
    "🌅 Jua linachomoza tena. Na wewe pia utachomoza.",
  ],
  swahili: [
    "Maisha ni safari — furahia kila hatua 🇹🇿",
    "Umoja ni nguvu, utengano ni udhaifu 💪🏾",
    "Haraka haraka haina baraka — fanya kwa makini",
    "Akili ni nywele, kila mtu ana zake ✨",
    "GENZ WhatsApp — mawasiliano ya kweli ya Kiafrika 🌍",
  ],
};

const AICaption = ({ onSelect, onClose, mediaType = 'image' }) => {
  const [selectedStyle, setSelectedStyle] = useState('hype');
  const [generated, setGenerated] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const generate = async () => {
    setLoading(true);
    const styleLabel = CAPTION_STYLES.find(s => s.id === selectedStyle)?.label || selectedStyle;
    const prompt = `Generate 3 short and very attractive captions for my WhatsApp ${mediaType === 'video' ? 'video' : 'photo'}.
The style of these captions should be: ${styleLabel}.
Please return them as only 3 lines separated by numbers 1, 2, and 3 without any introduction or conclusion. Each line should have its own caption. Ensure all are written in attractive English with emotion and modern GENZ vibes.`;

    try {
      const response = await authFetch('/api/advanced/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: prompt
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.response) {
          const lines = data.response
            .split('\n')
            .map(line => line.trim())
            .map(line => line.replace(/^\d+[\.\:\-\s]+/, '').replace(/^["']|["']$/g, '').trim())
            .filter(line => line.length > 0);

          if (lines.length >= 2) {
            setGenerated(lines.slice(0, 3));
            setLoading(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('AI Caption generation failed, falling back to presets:', err);
    }

    // Fallback: Pick 3 random non-repeating
    const pool = CAPTIONS[selectedStyle] || CAPTIONS.hype;
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    setGenerated(shuffled);
    setLoading(false);
  };

  const copyCaption = async (caption) => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(caption);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = caption;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(caption);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="bg-[#0d1f35] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-b border-white/10 flex items-center gap-2">
        <Wand2 size={18} className="text-purple-400" />
        <div>
          <p className="text-white font-bold text-sm">AI Caption Generator</p>
          <p className="text-purple-300 text-xs">Generate captions za{mediaType === 'video' ? ' video' : ' picha'} yako</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-white/60 hover:text-white transition-colors"
            aria-label="Close AI caption"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Style selector */}
        <div className="grid grid-cols-3 gap-2">
          {CAPTION_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                selectedStyle === style.id
                  ? `bg-gradient-to-r ${style.color} text-white scale-105 shadow-lg`
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          {loading ? (
            <><RefreshCw size={16} className="animate-spin" /> Inatengeneza...</>
          ) : (
            <><Sparkles size={16} /> Generate Captions</>
          )}
        </button>

        {/* Results */}
        {generated.length > 0 && (
          <div className="space-y-2">
            {generated.map((caption, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/10 transition-all group"
                onClick={() => onSelect?.(caption)}
              >
                <p className="text-white text-xs leading-relaxed">{caption}</p>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyCaption(caption); }}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    {copied === caption ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AICaption;
