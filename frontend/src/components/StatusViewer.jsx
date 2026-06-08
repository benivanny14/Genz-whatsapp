import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Clock, Eye, ChevronUp, ChevronLeft, ChevronRight, Pause, Play, Users, MessageCircle, Trash2, Share2, MoreVertical, Download, Heart, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import { getSocket } from '../services/socket';
import statusService from '../services/statusService';

const sid = (s) => String(s?._id || s.id || '');

const LOCAL_OWNER_IDS = new Set(['local-user', '60d5ecb8b392cb371c664c12']);

const StatusViewer = ({ status, onClose, statuses: propStatuses }) => {
  const { statuses: contextStatuses, viewStatus, deleteStatus, replyToStatus } = useChat();
  const { user } = useUser();
  const statuses = useMemo(() => (propStatuses?.length ? propStatuses : contextStatuses) || [], [propStatuses, contextStatuses]);

  const initialIndex = useMemo(() => {
    if (!status || !statuses.length) return 0;
    const i = statuses.findIndex((s) => sid(s) === sid(status));
    return i >= 0 ? i : 0;
  }, [status, statuses]);

  const [progress, setProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showViewers, setShowViewers] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [detailedViewers, setDetailedViewers] = useState([]);
  const previousStatusIdRef = useRef(null);
  const replyInputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const currentStatus = statuses[currentIndex];
  const currentId = currentStatus ? sid(currentStatus) : '';

  const isOwnStatus = currentStatus && (
    String(currentStatus.userId) === String(user?._id) || 
    String(currentStatus.userId) === String(user?.id) || 
    (currentStatus.username && user?.username && currentStatus.username === user?.username) ||
    LOCAL_OWNER_IDS.has(String(currentStatus.userId))
  );

  const handleDeleteStatus = async (e) => {
    e.stopPropagation();
    if (!currentStatus) return;
    
    if (window.confirm("Je, una uhakika unataka kufuta status hii?")) {
      try {
        await deleteStatus(sid(currentStatus));
        // If it's the last status in the viewer, close it
        if (statuses.length <= 1) {
          onClose();
        } else if (currentIndex === statuses.length - 1) {
          // If it's the last item but there are others before it, go back
          setCurrentIndex(prev => prev - 1);
        }
        // otherwise, it stays on the same index but the array will update and show the next one
      } catch (err) {
        console.error("Failed to delete status", err);
      }
    }
  };

  const viewersList = useMemo(() => {
    if (detailedViewers.length) return detailedViewers;
    if (!currentStatus?.views || !Array.isArray(currentStatus.views)) return [];
    return currentStatus.views.map((v) => ({
      username: v.user?.username || v.username || (typeof v.user === 'string' ? v.user : 'User'),
      viewedAt: v.viewedAt || v.timestamp
    }));
  }, [currentStatus, detailedViewers]);

  useEffect(() => {
    if (!showViewers || !isOwnStatus || !currentId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await statusService.getStatusViewers(currentId);
        if (!cancelled && data?.viewers?.length) {
          setDetailedViewers(data.viewers.map((v) => ({
            username: v.username || v.user?.username || 'User',
            viewedAt: v.viewedAt
          })));
        }
      } catch (_) { /* optional endpoint */ }
    })();
    return () => { cancelled = true; };
  }, [showViewers, isOwnStatus, currentId]);

  const viewCount = currentStatus
    ? (typeof currentStatus.viewsCount === 'number' ? currentStatus.viewsCount : viewersList.length)
    : 0;

  const handleReply = useCallback(() => {
    if (!currentStatus) return;
    setShowReplyInput(true);
    setTimeout(() => replyInputRef.current?.focus(), 100);
  }, [currentStatus]);

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || replySending) return;
    setReplySending(true);
    try {
      if (replyToStatus) await replyToStatus(currentId, { content: replyText.trim() });
      else await statusService.replyToStatus(currentId, { content: replyText.trim() });
      // Emit socket event for real-time notification
      const socket = getSocket();
      if (socket) socket.emit('status_comment', {
        statusId: currentId,
        content: replyText.trim()
      });
      setReplyText('');
      setReplySuccess(true);
      setTimeout(() => { setReplySuccess(false); setShowReplyInput(false); }, 1500);
    } catch (error) {
      console.error('Error replying to status:', error);
    } finally {
      setReplySending(false);
    }
  }, [replyText, replySending, replyToStatus, currentId]);

  const handleDelete = useCallback(async () => {
    if (!currentStatus || !isOwnStatus) return;
    if (!window.confirm('Delete this status?')) return;
    try {
      if (deleteStatus) await deleteStatus(currentId);
      else await statusService.deleteStatus(currentId);
      onClose();
    } catch (error) {
      console.error('Error deleting status:', error);
      window.alert('Failed to delete status');
    }
  }, [currentStatus, currentId, deleteStatus, isOwnStatus, onClose]);

  const handleForward = useCallback(async () => {
    if (!currentStatus) return;
    const line = [currentStatus.caption, currentStatus.content, currentStatus.mediaUrl].filter(Boolean).join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Status', text: line });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(line);
        window.alert('Copied to clipboard');
      } else {
        window.prompt('Copy:', line);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentStatus]);

  // ── Like / Heart reaction ──
  const handleLike = useCallback(() => {
    if (!currentStatus) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(c => newLiked ? c + 1 : Math.max(0, c - 1));
    if (newLiked) {
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
    }
    // Emit socket events for real-time sync
    const socket = getSocket();
    if (socket) {
      socket.emit('status_like', { statusId: currentId, liked: newLiked });
      if (newLiked) socket.emit('live_reaction', { chatId: currentId, emoji: '\u2764\uFE0F' });
    }
  }, [currentStatus, currentId, liked]);

  // Double-tap to like
  const lastTapRef = useRef(0);
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleLike();
    }
    lastTapRef.current = now;
  }, [handleLike]);

  // ── Status Saver: download media or copy text ──
  const handleDownload = useCallback(async () => {
    if (!currentStatus) return;
    const mediaUrl = currentStatus.mediaUrl;
    if (mediaUrl) {
      try {
        const response = await fetch(mediaUrl, { mode: 'cors' });
        const blob = await response.blob();
        const ext = currentStatus.type === 'video' ? 'mp4'
          : currentStatus.type === 'audio' ? 'mp3'
          : 'jpg';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `GENZ_Status_${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      } catch (e) {
        // Fallback: open in new tab for manual save
        window.open(mediaUrl, '_blank');
      }
    } else if (currentStatus.content) {
      try {
        await navigator.clipboard.writeText(currentStatus.content);
        window.alert('✅ Text status copied to clipboard!');
      } catch (e) {
        window.prompt('Copy this text:', currentStatus.content);
      }
    }
  }, [currentStatus]);

  const getStatusDuration = useCallback(() => {
    if (!currentStatus) return 5000;
    if (currentStatus.type === 'video') return 15000;
    if (currentStatus.type === 'audio') return 12000;
    return 7000;
  }, [currentStatus]);

  useEffect(() => {
    if (!currentStatus) return;

    if (previousStatusIdRef.current !== currentId) {
      previousStatusIdRef.current = currentId;
      setDetailedViewers([]);
      setIsPaused(false);

      (async () => {
        try {
          await statusService.viewStatus(currentId);
          if (viewStatus) viewStatus(currentId);
        } catch (error) {
          console.error('Error viewing status:', error);
        }
      })();
    }

    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return undefined;
    }

    setProgress(0);
    const duration = getStatusDuration();
    const intervalMs = 50;
    const step = (intervalMs / duration) * 100;
    let acc = 0;

    timerRef.current = setInterval(() => {
      acc += step;
      if (acc >= 100) {
        clearInterval(timerRef.current);
        setProgress(100);
        if (currentIndex < statuses.length - 1) {
          setCurrentIndex((i) => i + 1);
        } else {
          onClose();
        }
        return;
      }
      setProgress(acc);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, currentId, currentStatus, getStatusDuration, onClose, statuses.length, viewStatus, isPaused]);

  const goNext = useCallback((e) => {
    e?.stopPropagation?.();
    if (currentIndex < statuses.length - 1) setCurrentIndex((i) => i + 1);
    else onClose();
  }, [currentIndex, statuses.length, onClose]);

  const goPrev = useCallback((e) => {
    e?.stopPropagation?.();
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const handleScroll = (e) => {
    if (e.deltaY > 0 && currentIndex < statuses.length - 1) setCurrentIndex((prev) => prev + 1);
    if (e.deltaY < 0 && currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  if (!currentStatus) {
    return null;
  }

  const created = currentStatus.createdAt || currentStatus.timestamp;

  return (
    <motion.div
      onWheel={handleScroll}
      onClick={handleTap}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center select-none"
    >
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-50">
        {statuses.map((_, index) => (
          <div key={sid(statuses[index]) || index} className="h-1 bg-white/20 flex-1 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-75 linear ${index < currentIndex ? 'bg-white' : index === currentIndex ? 'bg-white' : ''}`}
              style={{ width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-50 text-white px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center font-bold text-lg shadow-lg">
            {currentStatus.username?.charAt(0) || '?'}
          </div>
          <div>
            <h3 className="font-bold text-sm">{currentStatus.username || 'Unknown'}</h3>
            <div className="flex items-center gap-1 opacity-70 text-[10px]">
              <Clock size={10} />
              <span>
                {created ? new Date(created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={(e) => { e.stopPropagation(); setIsPaused((p) => !p); }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors" title={isPaused ? 'Play' : 'Pause'}>
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
          {isOwnStatus && (
            <button type="button" onClick={handleDeleteStatus} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-colors">
              <Trash2 size={20} />
            </button>
          )}
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
      </div>

      <button type="button" onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/30 hover:bg-black/50 text-white disabled:opacity-30" disabled={currentIndex === 0}>
        <ChevronLeft size={28} />
      </button>
      <button type="button" onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/30 hover:bg-black/50 text-white">
        <ChevronRight size={28} />
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -300, opacity: 0 }}
          className="w-full h-full flex items-center justify-center"
        >
          {currentStatus.type === 'image' && currentStatus.mediaUrl && (
            <div className="flex flex-col items-center">
              <img src={currentStatus.mediaUrl} alt="Status" className="max-h-[85vh] max-w-full object-contain shadow-2xl" loading="lazy" />
              {currentStatus.caption && (
                <p className="mt-4 text-white text-center px-4 bg-black/50 rounded-lg py-2">{currentStatus.caption}</p>
              )}
            </div>
          )}
          {currentStatus.type === 'video' && currentStatus.mediaUrl && (
            <div className="flex flex-col items-center w-full max-w-4xl">
              <video src={currentStatus.mediaUrl} controls autoPlay className="max-h-[85vh] max-w-full object-contain shadow-2xl" />
              {currentStatus.caption && (
                <p className="mt-4 text-white text-center px-4 bg-black/50 rounded-lg py-2">{currentStatus.caption}</p>
              )}
            </div>
          )}
          {currentStatus.type === 'audio' && currentStatus.mediaUrl && (
            <div className="flex flex-col items-center w-full max-w-lg">
              <div className="w-full h-64 bg-gradient-to-br from-[#008069] to-[#075e54] rounded-3xl flex items-center justify-center shadow-2xl">
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center">
                  <div className="w-24 h-24 bg-white/30 rounded-full flex items-center justify-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                      <div className="w-8 h-8 bg-primary-600 rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
              <audio src={currentStatus.mediaUrl} controls autoPlay className="w-full mt-8" />
              {currentStatus.caption && (
                <p className="mt-4 text-white text-center px-4 bg-black/50 rounded-lg py-2">{currentStatus.caption}</p>
              )}
            </div>
          )}
          {currentStatus.type === 'text' && (
            <div
              className="w-full h-full flex items-center justify-center text-center p-12 rounded-none"
              style={{
                background: `linear-gradient(135deg, ${currentStatus.backgroundColor || '#008069'} 0%, #075e54 100%)`
              }}
            >
              <h2
                className="text-3xl md:text-5xl font-bold italic drop-shadow-lg max-w-2xl px-4"
                style={{ color: currentStatus.textColor || '#ffffff' }}
              >
                &ldquo;{currentStatus.content}&rdquo;
              </h2>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Inline Reply Input (slides up) ── */}
      <AnimatePresence>
        {showReplyInput && (
          <motion.div
            key="reply-input"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-[80] bg-black/80 backdrop-blur-xl border-t border-white/10 p-3"
          >
            {replySuccess ? (
              <div className="flex items-center justify-center gap-2 py-2 text-green-400 font-semibold">
                <span>✅</span> Reply imtumwa!
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowReplyInput(false)} className="text-white/50 hover:text-white p-1">
                  <X size={18} />
                </button>
                <input
                  ref={replyInputRef}
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                  placeholder="Andika reply..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-green-400/50 transition-all"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || replySending}
                  className="w-9 h-9 rounded-full bg-[#25d366] hover:bg-[#1ebe5d] disabled:opacity-40 flex items-center justify-center transition-all"
                >
                  {replySending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send size={16} className="text-white" />}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2 z-50">
        <div className="flex items-center gap-6">
          {/* Reply */}
          <button type="button" onClick={handleReply}
            className="flex flex-col items-center text-white/80 hover:text-white transition-all active:scale-90">
            <MessageCircle size={26} />
            <span className="text-[10px] mt-1">Reply</span>
          </button>
          {/* Views */}
          <button type="button" onClick={(e) => { e.stopPropagation(); setShowViewers(!showViewers); }}
            className="flex flex-col items-center text-white/80 hover:text-white transition-all">
            <Eye size={26} />
            <span className="text-[10px] mt-1">{viewCount}</span>
          </button>
          {/* Like */}
          <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }}
            className="flex flex-col items-center transition-all active:scale-90">
            <Heart size={26}
              className={`transition-all duration-200 ${liked ? 'fill-red-500 text-red-500 scale-125' : 'text-white/80 hover:text-white'}`}
            />
            <span className={`text-[10px] mt-1 ${liked ? 'text-red-400' : 'text-white/70'}`}>{likeCount > 0 ? likeCount : 'Like'}</span>
          </button>
          {/* Save */}
          <button type="button" onClick={handleDownload}
            className="flex flex-col items-center text-white/80 hover:text-white transition-all active:scale-90">
            <Download size={26} />
            <span className="text-[10px] mt-1">Save</span>
          </button>
          {/* Share */}
          <button type="button" onClick={handleForward}
            className="flex flex-col items-center text-white/80 hover:text-white transition-all active:scale-90">
            <Share2 size={26} />
            <span className="text-[10px] mt-1">Share</span>
          </button>
          {isOwnStatus && (
            <button type="button" onClick={() => setShowActions(!showActions)}
              className="flex flex-col items-center text-white/80 hover:text-white transition-all">
              <MoreVertical size={26} />
              <span className="text-[10px] mt-1">More</span>
            </button>
          )}
        </div>
        <div className="text-white/40 text-[10px] flex items-center gap-1">
          <ChevronUp size={10} /> Double-tap ❤️ to like
        </div>
      </div>

      {/* Floating heart animation on double-tap */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            key="heart"
            initial={{ opacity: 1, scale: 0.5, y: 0 }}
            animate={{ opacity: 0, scale: 2, y: -120 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-[400]"
          >
            <Heart size={80} className="fill-red-500 text-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-24 right-4 bg-dark-surface rounded-lg shadow-2xl border border-white/10 z-[70] overflow-hidden"
          >
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-3 px-4 py-3 text-dark-text hover:bg-dark-hover w-full transition-colors"
            >
              <Trash2 size={18} className="text-red-500" />
              <span>Delete Status</span>
            </button>
            <button
              type="button"
              onClick={handleForward}
              className="flex items-center gap-3 px-4 py-3 text-dark-text hover:bg-dark-hover w-full transition-colors"
            >
              <Share2 size={18} />
              <span>Forward / Share</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showViewers && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-x-0 bottom-0 h-1/2 bg-dark-surface rounded-t-3xl z-[60] p-6 shadow-2xl border-t border-white/10"
          >
            <button
              type="button"
              className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-6 block"
              onClick={() => setShowViewers(false)}
              aria-label="Close viewers"
            />
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Users size={18} /> Viewed by
            </h3>
            <div className="space-y-4 overflow-y-auto max-h-[80%]">
              {viewersList.map((viewer, i) => (
                <div key={`${viewer.username}-${i}`} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                    {viewer.username?.charAt(0) || '?'}
                  </div>
                  <span className="text-dark-text text-sm">{viewer.username || 'Unknown'}</span>
                </div>
              ))}
              {!viewersList.length && <p className="text-dark-textSecondary text-center py-10">No views yet</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StatusViewer;
