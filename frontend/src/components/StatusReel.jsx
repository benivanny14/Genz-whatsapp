import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Heart, MessageCircle, Share2, Download, Bookmark,
  MoreVertical, Trash2, Volume2, VolumeX, Play, Pause,
  ChevronUp, ChevronDown, Music, Sparkles, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = resolveApiBase();

const StatusReel = ({ onClose, initialStatuses = [] }) => {
  const [reelGroups, setReelGroups] = useState([]);
  const [flatStatuses, setFlatStatuses] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [muted, setMuted] = useState(false);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [reactions, setReactions] = useState([]);
  const [reactionCounter, setReactionCounter] = useState(0);
  const progressTimer = useRef(null);
  const touchStart = useRef(null);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const REACTION_EMOJIS = ['❤️', '😂', '😮', '👏', '🔥', '💯', '🙏', '😍'];

  // Fetch all statuses from reel endpoint
  useEffect(() => {
    const fetchReel = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/advanced/status/reel`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          const all = data.reel?.flatMap(group => 
            (group.statuses || []).map(s => ({ ...s, username: group.username }))
          ) || [];
          setReelGroups(data.reel || []);
          setFlatStatuses(all.length > 0 ? all : initialStatuses);
        } else {
          setFlatStatuses(initialStatuses);
        }
      } catch {
        setFlatStatuses(initialStatuses);
      } finally {
        setLoading(false);
      }
    };
    fetchReel();
  }, []);

  const current = flatStatuses[currentIndex];
  const currentId = current?._id || current?.id || String(currentIndex);

  // Auto-progress timer
  useEffect(() => {
    if (!current || showComment) return;
    setProgress(0);
    clearInterval(progressTimer.current);
    const duration = current.type === 'video' ? 15000 : current.type === 'audio' ? 12000 : 7000;
    const step = 50;
    const increment = (step / duration) * 100;
    let acc = 0;
    progressTimer.current = setInterval(() => {
      acc += increment;
      setProgress(Math.min(acc, 100));
      if (acc >= 100) {
        clearInterval(progressTimer.current);
        if (currentIndex < flatStatuses.length - 1) {
          setCurrentIndex(i => i + 1);
        } else {
          onClose();
        }
      }
    }, step);
    return () => clearInterval(progressTimer.current);
  }, [currentIndex, current, showComment, flatStatuses.length]);

  const goNext = useCallback(() => {
    if (currentIndex < flatStatuses.length - 1) setCurrentIndex(i => i + 1);
    else onClose();
  }, [currentIndex, flatStatuses.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext, onClose]);

  // Touch / swipe
  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev(); }
    touchStart.current = null;
  };

  // Double tap to like
  const lastTap = useRef(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleLike();
      setShowBigHeart(true);
      setTimeout(() => setShowBigHeart(false), 1000);
    }
    lastTap.current = now;
  };

  const handleLike = async () => {
    const newLiked = !liked[currentId];
    setLiked(prev => ({ ...prev, [currentId]: newLiked }));
    try {
      const token = localStorage.getItem('token');
      const statusId = currentId.replace('status-', '');
      await fetch(`${API_URL}/advanced/status/${statusId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
    } catch { /* silent fail */ }
  };

  const handleSave = async () => {
    const newSaved = !saved[currentId];
    setSaved(prev => ({ ...prev, [currentId]: newSaved }));
    try {
      const token = localStorage.getItem('token');
      const statusId = currentId.replace('status-', '');
      await fetch(`${API_URL}/advanced/status/${statusId}/save`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch { /* silent fail */ }
    // Also download media
    if (newSaved && current?.mediaUrl) {
      try {
        const response = await fetch(current.mediaUrl, { mode: 'cors' });
        const blob = await response.blob();
        const ext = current.type === 'video' ? 'mp4' : current.type === 'audio' ? 'mp3' : 'jpg';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `GENZ_Status_${Date.now()}.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch { /* silent fail */ }
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const statusId = currentId.replace('status-', '');
      await fetch(`${API_URL}/advanced/status/${statusId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content: comment.trim() })
      });
    } catch { /* silent fail */ }
    setComment('');
    setShowComment(false);
  };

  const handleShare = async () => {
    const text = [current?.caption, current?.content, current?.mediaUrl].filter(Boolean).join('\n');
    try {
      if (navigator.share) await navigator.share({ title: `${current?.username}'s Status`, text });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
      }
    } catch { /* silent fail */ }
  };

  const addReaction = (emoji) => {
    const id = reactionCounter;
    setReactionCounter(c => c + 1);
    const left = 20 + Math.random() * 60;
    setReactions(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2200);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[400] bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-sm">Inapakia Status Reel...</p>
        </div>
      </div>
    );
  }

  if (!flatStatuses.length) {
    return (
      <div className="fixed inset-0 z-[400] bg-black flex flex-col items-center justify-center gap-4">
        <Sparkles size={48} className="text-gray-600" />
        <p className="text-gray-400 text-lg font-semibold">Hakuna statuses kwa sasa</p>
        <button onClick={onClose} className="px-6 py-3 bg-white/10 text-white rounded-xl">Rudi</button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[400] bg-black overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleDoubleTap}
    >
      {/* Floating reactions */}
      {reactions.map(r => (
        <div
          key={r.id}
          className="live-reaction"
          style={{ left: `${r.left}%`, bottom: '200px' }}
        >
          {r.emoji}
        </div>
      ))}

      {/* Big heart on double tap */}
      <AnimatePresence>
        {showBigHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <span className="text-8xl">❤️</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2 pt-safe">
        {flatStatuses.map((_, idx) => (
          <div key={idx} className="flex-1 h-0.5 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full reel-progress-bar transition-none"
              style={{
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header info */}
      <div className="absolute top-4 left-0 right-0 z-50 flex items-center justify-between px-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white/30">
            {current?.username?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-white font-bold text-sm drop-shadow-lg">{current?.username || 'GENZ User'}</p>
            <p className="text-white/60 text-xs">
              {current?.createdAt ? new Date(current.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(current?.type === 'video' || current?.type === 'audio') && (
            <button
              onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
              className="p-2 bg-black/40 rounded-full text-white"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 bg-black/40 rounded-full text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
        disabled={currentIndex === 0}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-40 p-2 bg-white/10 rounded-full disabled:opacity-20"
       aria-label="Collapse">
        <ChevronUp size={24} className="text-white" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        disabled={currentIndex === flatStatuses.length - 1}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-40 p-2 bg-white/10 rounded-full disabled:opacity-20"
       aria-label="Expand">
        <ChevronDown size={24} className="text-white" />
      </button>

      {/* Main content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full flex items-center justify-center"
        >
          {current?.type === 'image' && current?.mediaUrl && (
            <img
              src={current.mediaUrl}
              alt="Status"
              className="w-full h-full object-cover reel-media"
              loading="lazy"
            />
          )}
          {current?.type === 'video' && current?.mediaUrl && (
            <video
              ref={videoRef}
              src={current.mediaUrl}
              autoPlay
              loop
              muted={muted}
              playsInline
              className="w-full h-full object-cover reel-media"
            />
          )}
          {current?.type === 'audio' && current?.mediaUrl && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
              <div className="w-40 h-40 rounded-full bg-white/10 flex items-center justify-center mb-8">
                <Music size={64} className="text-white/80" />
              </div>
              <div className="flex items-end gap-1 h-12 mb-4">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="wave-bar h-full text-white" style={{ animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
              <audio src={current.mediaUrl} autoPlay loop muted={muted} className="hidden" />
            </div>
          )}
          {current?.type === 'text' && (
            <div
              className="w-full h-full flex items-center justify-center p-8"
              style={{ background: `linear-gradient(135deg, ${current.backgroundColor || '#008069'} 0%, #075e54 100%)` }}
            >
              <h2
                className="text-4xl font-bold text-center italic drop-shadow-2xl leading-tight"
                style={{ color: current.textColor || '#ffffff' }}
              >
                "{current.content}"
              </h2>
            </div>
          )}
          {/* Caption overlay */}
          {(current?.caption || (current?.type === 'image' && current?.content)) && (
            <div className="absolute bottom-28 left-4 right-16 z-30">
              <p className="text-white text-sm bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2">
                {current?.caption || current?.content}
              </p>
            </div>
          )}
          {/* Music tag */}
          {current?.music && (
            <div className="absolute bottom-36 left-4 z-30 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
              <Music size={12} className="text-white animate-spin-slow" />
              <span className="text-white text-xs">{current.music}</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Right side actions */}
      <div className="absolute right-4 bottom-32 z-50 flex flex-col items-center gap-5" onClick={(e) => e.stopPropagation()}>
        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleLike}
            className={`p-3 rounded-full ${liked[currentId] ? 'bg-red-500' : 'bg-black/40'} backdrop-blur-sm transition-all active:scale-90`}
           aria-label="Like">
            <Heart size={22} className={`text-white ${liked[currentId] ? 'fill-white' : ''}`} />
          </button>
          <span className="text-white text-xs font-bold drop-shadow">
            {(current?.likesCount || 0) + (liked[currentId] ? 1 : 0)}
          </span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setShowComment(true)}
            className="p-3 rounded-full bg-black/40 backdrop-blur-sm"
           aria-label="Message">
            <MessageCircle size={22} className="text-white" />
          </button>
          <span className="text-white text-xs drop-shadow">{current?.replies?.length || 0}</span>
        </div>

        {/* Share */}
        <button onClick={handleShare} className="p-3 rounded-full bg-black/40 backdrop-blur-sm" aria-label="Share">
          <Share2 size={22} className="text-white" />
        </button>

        {/* Save/Download */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleSave}
            className={`p-3 rounded-full ${saved[currentId] ? 'bg-yellow-500' : 'bg-black/40'} backdrop-blur-sm`}
          >
            {saved[currentId] ? <Bookmark size={22} className="text-white fill-white" /> : <Download size={22} className="text-white" />}
          </button>
          <span className="text-white text-xs drop-shadow">{saved[currentId] ? 'Saved' : 'Save'}</span>
        </div>

        {/* More */}
        <button
          onClick={() => setShowActions(!showActions)}
          className="p-3 rounded-full bg-black/40 backdrop-blur-sm"
         aria-label="More options">
          <MoreVertical size={22} className="text-white" />
        </button>
      </div>

      {/* Emoji reactions bar */}
      <div className="absolute bottom-4 left-4 right-20 z-50 flex items-center gap-2 overflow-x-auto pb-1" onClick={(e) => e.stopPropagation()}>
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => addReaction(emoji)}
            className="text-2xl hover:scale-125 transition-transform active:scale-90 flex-shrink-0"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Comment modal */}
      <AnimatePresence>
        {showComment && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-x-0 bottom-0 z-[60] bg-[#0d1f35]/95 backdrop-blur-xl rounded-t-3xl p-6 border-t border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mb-4" />
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <MessageCircle size={18} /> Reply to Status
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }}
                placeholder="Andika reply..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-500 text-sm"
                autoFocus
              />
              <button onClick={handleComment} className="px-4 py-3 bg-green-600 rounded-xl text-white font-bold" aria-label="Send">
                <Send size={18} />
              </button>
            </div>
            <button onClick={() => setShowComment(false)} className="mt-3 w-full text-gray-400 text-sm py-2">
              Funga
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions menu */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-32 right-16 z-[60] bg-[#0d1f35] border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { icon: <Download size={16} />, label: 'Hifadhi Status', action: handleSave },
              { icon: <Share2 size={16} />, label: 'Share', action: handleShare },
              { icon: <Trash2 size={16} className="text-red-400" />, label: 'Futa (Yako)', action: async () => {
                if (!window.confirm('Futa status hii?')) return;
                try {
                  const token = localStorage.getItem('token');
                  const statusId = currentId.replace('status-', '');
                  await fetch(`${API_URL}/advanced/status/${statusId}`, {
                    method: 'DELETE',
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                  });
                  goNext();
                } catch { /* silent */ }
                setShowActions(false);
              }},
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { item.action(); setShowActions(false); }}
                className="flex items-center gap-3 w-full px-5 py-3 text-white hover:bg-white/10 transition-colors text-sm"
              >
                {item.icon} {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatusReel;
