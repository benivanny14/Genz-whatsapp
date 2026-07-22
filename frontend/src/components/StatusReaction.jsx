import React, { useState } from 'react';
import { X, Heart, Laugh, Eye, Frown, Angry, ThumbsUp, Sparkles } from 'lucide-react';

const REACTIONS = [
  { emoji: '❤️', icon: Heart, color: 'text-red-400', bg: 'bg-red-500/20' },
  { emoji: '😂', icon: Laugh, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  { emoji: '😮', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { emoji: '😢', icon: Frown, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  { emoji: '😡', icon: Angry, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  { emoji: '👍', icon: ThumbsUp, color: 'text-green-400', bg: 'bg-green-500/20' },
  { emoji: '🔥', icon: Sparkles, color: 'text-rose-400', bg: 'bg-rose-500/20' },
];

const StatusReaction = ({ statusId, onReact, onClose }) => {
  const [sending, setSending] = useState(null);

  const handleReact = async (emoji) => {
    setSending(emoji);
    try {
      await onReact?.(statusId, emoji);
    } catch (e) {
      console.error('Reaction failed:', e);
    }
    setSending(null);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#1f2c33] rounded-2xl p-4 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-sm">React to Status</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-3">
          {REACTIONS.map(({ emoji, icon: Icon, color, bg }) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              disabled={sending === emoji}
              className={`w-12 h-12 rounded-full ${bg} ${color} flex items-center justify-center text-xl hover:scale-125 transition-transform disabled:opacity-40 disabled:scale-100`}
            >
              {sending === emoji ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                emoji
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusReaction;
