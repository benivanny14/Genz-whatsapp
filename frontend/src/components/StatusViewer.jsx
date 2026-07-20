import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Clock, Eye, ChevronUp, ChevronLeft, ChevronRight, Pause, Play, Users, MessageCircle, Trash2, Share2, MoreVertical, Download, Heart, Send, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import { getSocket } from '../services/socket';
import statusService from '../services/statusService';
import { chatAPI } from '../services/api';

const sid = (s) => String(s?._id || '');

const LOCAL_OWNER_IDS = new Set(['local-user', '60d5ecb8b392cb371c664c12']);

const StatusViewer = ({ status, onClose, statuses: propStatuses }) => {
  const { statuses: contextStatuses, viewStatus, deleteStatus, replyToStatus, contacts, conversations } = useChat();
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
  const [likesList, setLikesList] = useState([]);
  const [showHeart, setShowHeart] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [detailedViewers, setDetailedViewers] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const previousStatusIdRef = useRef(null);
  const replyInputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const currentStatus = statuses[currentIndex];
  const currentId = currentStatus ? sid(currentStatus) : '';

  const getContactName = useCallback((viewerUserId, defaultName) => {
    if (!contacts) return defaultName;
    const contact = contacts.find(c => String(c.contactId?._id || c.contactId) === String(viewerUserId) || String(c._id) === String(viewerUserId));
    return contact?.nickname || contact?.username || defaultName;
  }, [contacts]);

  useEffect(() => {
    if (currentStatus) {
      const reactions = currentStatus.reactions || [];
      const likes = reactions.filter(r => r.emoji === '❤️' || r.emoji === '\u2764\uFE0F' || r.emoji === 'like');
      setLikeCount(likes.length);
      setLiked(likes.some(r => String(r.user?._id || r.user) === String(user?._id)));
      
      const parsedLikesList = likes.map(r => {
        const userId = r.user?._id || r.user;
        const defaultName = r.user?.username || 'User';
        return {
          userId,
          username: getContactName(userId, defaultName)
        };
      });
      setLikesList(parsedLikesList);
    }
  }, [currentStatus, user, getContactName]);

  const statusUserId = currentStatus?.user?._id || currentStatus?.user || currentStatus?.userId;
  const isOwnStatus = currentStatus && (
    String(statusUserId) === String(user?._id) || 
    String(statusUserId) === String(user?.id) || 
    (currentStatus.username && user?.username && currentStatus.username === user?.username) ||
    LOCAL_OWNER_IDS.has(String(statusUserId))
  );

  const handleDeleteStatus = async (e) => {
    e.stopPropagation();
    if (!currentStatus) return;
    
    if (window.confirm("Are you sure you want to delete this status?")) {
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
    return currentStatus.views.map((v) => {
      const viewerId = v.user?._id || v.user;
      const defaultName = v.user?.username || v.username || (typeof v.user === 'string' ? v.user : 'User');
      return {
        userId: viewerId,
        username: getContactName(viewerId, defaultName),
        viewedAt: v.viewedAt || v.timestamp
      };
    });
  }, [currentStatus, detailedViewers, getContactName]);

  useEffect(() => {
    if (!showViewers || !isOwnStatus || !currentId) return;
    let cancelled = false;
    setLoadingViewers(true);
    (async () => {
      try {
        const data = await statusService.getStatusViewers(currentId);
        if (!cancelled && data) {
          if (data.viewers) {
            setDetailedViewers(data.viewers
              .filter(v => {
                const viewerId = v.user?._id || v.user || v._id;
                return String(viewerId) !== String(user?._id);
              })
              .map((v) => {
                const viewerId = v.user?._id || v.user || v._id;
                const defaultName = v.username || v.user?.username || 'User';
                return {
                  userId: viewerId,
                  username: getContactName(viewerId, defaultName),
                  viewedAt: v.viewedAt
                };
              }));
          }
          if (data.reactions) {
            const likes = data.reactions.filter(r => r.emoji === '❤️' || r.emoji === '\u2764\uFE0F' || r.emoji === 'like');
            setLikeCount(likes.length);
            setLiked(likes.some(r => String(r.user?._id || r.user) === String(user?._id)));
            setLikesList(likes.map(r => {
              const userId = r.user?._id || r.user;
              const defaultName = r.user?.username || 'User';
              return {
                userId,
                username: getContactName(userId, defaultName)
              };
            }));
          }
        }
      } catch (_) { /* optional endpoint */ }
    })();
    // FIX: Always clear loading state after a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!cancelled) setLoadingViewers(false);
    }, 5000);
    return () => { 
      cancelled = true;
      setLoadingViewers(false);
      clearTimeout(timeoutId);
    };
  }, [showViewers, isOwnStatus, currentId, getContactName, user?._id]);

  const viewCount = currentStatus
    ? (typeof currentStatus.viewsCount === 'number' ? currentStatus.viewsCount : viewersList.length)
    : 0;

  const displayViewCount = isOwnStatus ? viewCount : viewCount;

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
      // Navigate to the conversation so user can see their reply
      // FIX: previously only dispatched 'open-chat' with a conversationId
      // and never called navigate('/chat'). If this was the very first
      // message to that status owner, the conversation didn't exist in
      // local state yet, so ChatContext's listener silently found nothing
      // to select — combined with never navigating, the person was left
      // looking at whatever chat (or screen) was open before, which read as
      // "replying opens the wrong chat". We now pass the full conversation
      // object and explicitly navigate, matching how notification taps work.
      try {
        const statusOwnerId = statuses[currentIndex]?.userId || statuses[currentIndex]?.user?._id;
        if (statusOwnerId) {
          const { chatAPI } = await import('../services/api');
          const res = await chatAPI.getOrCreateConversation(statusOwnerId);
          const conv = res?.data?.conversation || res?.data;
          if (conv?._id) {
            window.dispatchEvent(new CustomEvent('open-chat', { detail: { conversationId: conv._id, conversation: conv } }));
            if (!window.location.pathname.includes('/chat')) {
              navigate('/chat');
            }
            setTimeout(() => { onClose?.(); }, 200);
          }
        }
      } catch (_) {}
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

  // ── Forward: WhatsApp-style "send this status into a chat" ─────────────
  // The old handleForward only opened the OS share sheet (or copied text),
  // which is not what "Forward" means in WhatsApp — Forward sends the
  // status content/media as an actual message into a chat the person picks,
  // right inside the app. This restores that as its own action, separate
  // from the OS share sheet (kept below as handleShareExternal).
  const [showForwardPicker, setShowForwardPicker] = useState(false);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardSelected, setForwardSelected] = useState(new Set());
  const [forwardSending, setForwardSending] = useState(false);

  const forwardableChats = useMemo(() => {
    const list = Array.isArray(conversations) ? conversations : [];
    const q = forwardSearch.trim().toLowerCase();
    return list.filter((c) => {
      const name = c.isGroup ? (c.name || 'Group') : (c.participants?.find(p => String(p._id) !== String(user?._id))?.username || c.name || 'Chat');
      return !q || name.toLowerCase().includes(q);
    });
  }, [conversations, forwardSearch, user]);

  const toggleForwardChat = useCallback((chatId) => {
    setForwardSelected((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId); else next.add(chatId);
      return next;
    });
  }, []);

  const handleSendForward = useCallback(async () => {
    if (!currentStatus || forwardSelected.size === 0 || forwardSending) return;
    setForwardSending(true);
    try {
      const messageType = ['image', 'video', 'voice', 'audio'].includes(currentStatus.type) ? currentStatus.type : 'text';
      const content = currentStatus.content || currentStatus.caption || '';
      await Promise.all(Array.from(forwardSelected).map((conversationId) =>
        chatAPI.sendMessage({
          conversationId,
          content,
          messageType,
          mediaUrl: currentStatus.mediaUrl || '',
          isForwarded: true
        })
      ));
      setShowForwardPicker(false);
      setForwardSelected(new Set());
      setShowActions(false);
    } catch (e) {
      console.error('[StatusViewer] Forward to chat failed:', e);
      window.alert('Imeshindwa kutuma status. Jaribu tena.');
    } finally {
      setForwardSending(false);
    }
  }, [currentStatus, forwardSelected, forwardSending]);

  const handleForward = useCallback(() => {
    if (!currentStatus) return;
    setForwardSelected(new Set());
    setForwardSearch('');
    setShowForwardPicker(true);
  }, [currentStatus]);

  const handleShareExternal = useCallback(async () => {
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
            className="p-2 hover:bg-white/10 rounded-full transition-colors" title={isPaused ? 'Play' : 'Pause'}
            aria-label={isPaused ? 'Play' : 'Pause'}>
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
          {isOwnStatus && (
            <button type="button" onClick={handleDeleteStatus} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-colors" aria-label="Delete status">
              <Trash2 size={20} />
            </button>
          )}
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Close status">
            <X size={24} />
          </button>
        </div>
      </div>

      <button type="button" onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/30 hover:bg-black/50 text-white disabled:opacity-30" disabled={currentIndex === 0} aria-label="Previous status">
        <ChevronLeft size={28} />
      </button>
      <button type="button" onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/30 hover:bg-black/50 text-white" aria-label="Next status">
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
                <span>✅</span> Reply sent!
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowReplyInput(false)} className="text-white/50 hover:text-white p-1" aria-label="Close">
                  <X size={18} />
                </button>
                <input
                  ref={replyInputRef}
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                  placeholder="Type a reply..."
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

      {/* ── Bottom Controls ── */}
      {isOwnStatus ? (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-50">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowViewers(true); setIsPaused(true); }}
            className="flex items-center gap-2 bg-[#1f2c34]/80 backdrop-blur-md px-6 py-2 rounded-full text-white/90 hover:bg-[#202c33] transition-all"
          >
            <Eye size={20} />
            <span className="font-medium">{displayViewCount}</span>
            <ChevronUp size={20} className="ml-1" />
          </button>
        </div>
      ) : (
        <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2 z-50">
          <div className="flex items-center gap-6 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full">
            <button type="button" onClick={handleReply}
              className="flex flex-col items-center text-white/80 hover:text-white transition-all active:scale-90">
              <MessageCircle size={24} />
              <span className="text-[10px] mt-1">Reply</span>
            </button>
            <button type="button" onClick={handleLike}
              className={`flex flex-col items-center transition-all active:scale-90 ${liked ? 'text-red-500' : 'text-white/80 hover:text-white'}`}>
              <Heart size={24} className={liked ? 'fill-current' : ''} />
              <span className="text-[10px] mt-1">{likeCount > 0 ? likeCount : 'Like'}</span>
            </button>
            <button type="button" onClick={handleDownload}
              className="flex flex-col items-center text-white/80 hover:text-white transition-all active:scale-90">
              <Download size={24} />
              <span className="text-[10px] mt-1">Save</span>
            </button>
            <button type="button" onClick={handleForward}
              className="flex flex-col items-center text-white/80 hover:text-white transition-all active:scale-90">
              <Send size={24} />
              <span className="text-[10px] mt-1">Forward</span>
            </button>
          </div>
          <div className="text-white/40 text-[10px] flex items-center gap-1">
            <ChevronUp size={10} /> Double-tap ❤️ to like
          </div>
        </div>
      )}

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
        {showViewers && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-x-0 bottom-0 h-1/2 bg-[#1f2c34] rounded-t-3xl z-[60] p-4 shadow-2xl border-t border-white/10 flex flex-col"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Eye size={18} className="text-[#00a884]" /> {viewersList.length} Viewed
                {likeCount > 0 && (
                  <span className="flex items-center gap-1 ml-2 text-red-400 text-sm font-normal">
                    <Heart size={14} className="fill-red-400" /> {likeCount}
                  </span>
                )}
              </h3>
              <div className="flex gap-4">
                <button type="button" onClick={handleForward} className="text-white/70 hover:text-white transition-all" aria-label="Forward status"><Send size={20} /></button>
                <button type="button" onClick={handleShareExternal} className="text-white/70 hover:text-white transition-all" aria-label="Share status externally"><Share2 size={20} /></button>
                <button type="button" onClick={handleDelete} className="text-red-400 hover:text-red-500 transition-all" aria-label="Delete status"><Trash2 size={20} /></button>
                <button type="button" onClick={() => setShowViewers(false)} className="text-white/70 hover:text-white transition-all" aria-label="Close viewers list"><X size={24} /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1 pr-2">
              {loadingViewers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              ) : viewersList.length === 0 ? (
                <div className="text-white/50 text-center mt-10 text-sm">No viewers yet</div>
              ) : (
                viewersList.map((viewer, i) => {
                  const viewerHasLiked = likesList.some(
                    (liker) => String(liker.userId) === String(viewer.userId)
                  );
                  return (
                    <div key={`${viewer.username}-${i}`} className="flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white font-bold">
                          {viewer.username.charAt(0).toUpperCase()}
                        </div>
                        {viewerHasLiked && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#1f2c34] shadow-lg">
                            <Heart size={10} className="text-white fill-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm truncate">{viewer.username}</div>
                        <div className="text-white/50 text-[10px]">
                          {new Date(viewer.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {viewerHasLiked && (
                        <Heart size={16} className="text-red-500 fill-red-500 flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Forward to chat picker ─────────────────────────────────────── */}
      <AnimatePresence>
        {showForwardPicker && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[500] flex items-end sm:items-center justify-center"
            onClick={() => !forwardSending && setShowForwardPicker(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1f2c34] rounded-t-3xl sm:rounded-2xl w-full sm:w-96 max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-white font-semibold">Forward status</h3>
                <button type="button" onClick={() => setShowForwardPicker(false)} className="text-white/70 hover:text-white" aria-label="Close">
                  <X size={22} />
                </button>
              </div>

              <div className="p-3 border-b border-white/10">
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-2">
                  <Search size={16} className="text-white/50" />
                  <input
                    value={forwardSearch}
                    onChange={(e) => setForwardSearch(e.target.value)}
                    placeholder="Search chats..."
                    className="bg-transparent flex-1 text-white text-sm outline-none placeholder:text-white/40"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-2">
                {forwardableChats.length === 0 ? (
                  <div className="text-white/50 text-center mt-8 text-sm px-4">No chats found</div>
                ) : (
                  forwardableChats.map((c) => {
                    const name = c.isGroup ? (c.name || 'Group') : (c.participants?.find(p => String(p._id) !== String(user?._id))?.username || c.name || 'Chat');
                    const isSelected = forwardSelected.has(c._id);
                    return (
                      <button
                        type="button"
                        key={c._id}
                        onClick={() => toggleForwardChat(c._id)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-left text-white text-sm truncate">{name}</span>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${isSelected ? 'bg-[#00a884] border-[#00a884]' : 'border-white/30'}`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="p-4 border-t border-white/10">
                <button
                  type="button"
                  disabled={forwardSelected.size === 0 || forwardSending}
                  onClick={handleSendForward}
                  className="w-full py-3 rounded-full bg-[#00a884] disabled:bg-white/10 disabled:text-white/40 text-white font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Send size={16} />
                  {forwardSending ? 'Sending...' : forwardSelected.size > 0 ? `Send to ${forwardSelected.size}` : 'Select a chat'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StatusViewer;
