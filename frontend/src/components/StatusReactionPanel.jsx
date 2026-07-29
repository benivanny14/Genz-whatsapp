import React, { useState, useEffect } from 'react';
import { X, Heart, ThumbsUp, Laugh, Flame, Star, Smile, Angry, Sad, Zap, TrendingUp } from 'lucide-react';

const StatusReactionPanel = ({ onClose, status, onReactionAdd }) => {
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [customEmoji, setCustomEmoji] = useState('');
  const [reactionCount, setReactionCount] = useState({});
  const [loading, setLoading] = useState(false);

  const reactions = [
    { id: 'love', icon: Heart, color: '#ef4444', label: 'Love' },
    { id: 'like', icon: ThumbsUp, color: '#3b82f6', label: 'Like' },
    { id: 'laugh', icon: Laugh, color: '#f59e0b', label: 'Laugh' },
    { id: 'fire', icon: Flame, color: '#f97316', label: 'Fire' },
    { id: 'star', icon: Star, color: '#eab308', label: 'Star' },
    { id: 'smile', icon: Smile, color: '#22c55e', label: 'Smile' },
    { id: 'angry', icon: Angry, color: '#dc2626', label: 'Angry' },
    { id: 'sad', icon: Sad, color: '#6366f1', label: 'Sad' },
    { id: 'wow', icon: Zap, color: '#8b5cf6', label: 'Wow' },
    { id: 'trending', icon: TrendingUp, color: '#ec4899', label: 'Trending' }
  ];

  useEffect(() => {
    loadReactionCount();
  }, [status]);

  const loadReactionCount = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/${status?._id || status?.id}/reactions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setReactionCount(data.reactions || {});
      }
    } catch (error) {
      console.error('Error loading reactions:', error);
      // Fallback to localStorage
      try {
        const allReactions = JSON.parse(localStorage.getItem('genz_status_reactions') || '{}');
        const statusId = status?._id || status?.id;
        if (statusId && allReactions[statusId]) {
          setReactionCount(allReactions[statusId]);
        }
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddReaction = async (reactionId) => {
    const statusId = status?._id || status?.id;
    if (!statusId) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/${statusId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reactionId })
      });
      await loadReactionCount();
    } catch (error) {
      console.error('Error adding reaction:', error);
      // Fallback to localStorage
      const updatedCount = {
        ...reactionCount,
        [reactionId]: (reactionCount[reactionId] || 0) + 1
      };
      setReactionCount(updatedCount);
      saveReactionCount(updatedCount);
    }

    if (onReactionAdd) {
      onReactionAdd({ reactionId, statusId });
    }
  };

  const saveReactionCount = (count) => {
    try {
      const allReactions = JSON.parse(localStorage.getItem('genz_status_reactions') || '{}');
      const statusId = status?._id || status?.id;
      if (statusId) {
        allReactions[statusId] = count;
        localStorage.setItem('genz_status_reactions', JSON.stringify(allReactions));
      }
    } catch (error) {
      console.error('Error saving reactions:', error);
    }
  };

  const handleAddCustomEmoji = () => {
    if (!customEmoji.trim()) return;
    handleAddReaction(customEmoji);
    setCustomEmoji('');
  };

  const totalReactions = Object.values(reactionCount).reduce((sum, count) => sum + count, 0);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Heart className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">React to Status</h2>
              <p className="text-white/60 text-xs">{totalReactions} reactions</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Reaction Grid */}
          <div>
            <p className="text-white/60 text-xs mb-3 uppercase">Quick Reactions</p>
            <div className="grid grid-cols-5 gap-3">
              {reactions.map((reaction) => {
                const Icon = reaction.icon;
                const count = reactionCount[reaction.id] || 0;
                return (
                  <button
                    key={reaction.id}
                    onClick={() => handleAddReaction(reaction.id)}
                    className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <div className="relative">
                      <Icon size={28} style={{ color: reaction.color }} />
                      {count > 0 && (
                        <span className="absolute -top-1 -right-1 bg-[#00a884] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {count}
                        </span>
                      )}
                    </div>
                    <span className="text-white text-xs">{reaction.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Emoji */}
          <div>
            <p className="text-white/60 text-xs mb-3 uppercase">Custom Emoji</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="Add emoji..."
                maxLength={2}
                className="flex-1 bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none text-center text-2xl"
              />
              <button
                onClick={handleAddCustomEmoji}
                disabled={!customEmoji.trim()}
                className="px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-xl text-white font-medium disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Popular Emojis */}
          <div>
            <p className="text-white/60 text-xs mb-3 uppercase">Popular Emojis</p>
            <div className="flex flex-wrap gap-2">
              {['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👎', '🔥', '⭐', '💯', '❤️', '💔', '🎉', '🙏', '👏', '💪', '🤝'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAddReaction(emoji)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg text-xl flex items-center justify-center transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Reaction Stats */}
          {totalReactions > 0 && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white font-medium mb-3">Reaction Stats</p>
              <div className="space-y-2">
                {Object.entries(reactionCount)
                  .filter(([_, count]) => count > 0)
                  .sort(([_, a], [__, b]) => b - a)
                  .map(([reactionId, count]) => {
                    const reaction = reactions.find(r => r.id === reactionId);
                    const Icon = reaction?.icon;
                    const percentage = (count / totalReactions) * 100;
                    return (
                      <div key={reactionId} className="flex items-center gap-3">
                        {Icon ? (
                          <Icon size={16} style={{ color: reaction.color }} />
                        ) : (
                          <span className="text-lg">{reactionId}</span>
                        )}
                        <div className="flex-1 bg-white/10 rounded-full h-2">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: reaction?.color || '#00a884'
                            }}
                          />
                        </div>
                        <span className="text-white text-sm w-8">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusReactionPanel;
