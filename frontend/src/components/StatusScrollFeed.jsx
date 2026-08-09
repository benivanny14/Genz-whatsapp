import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, Send, X, MoreVertical, Eye, Clock, MapPin, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = resolveApiBase();

const StatusScrollFeed = ({ statuses, onClose, currentUserId, initialStatusId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const isShareInProgressRef = useRef(false);

  const likeUserId = currentUserId || 'local-user';

  useEffect(() => {
    if (!initialStatusId || !statuses?.length) return;
    const i = statuses.findIndex((s) => String(s._id || s.id) === String(initialStatusId));
    if (i >= 0) setCurrentIndex(i);
  }, [initialStatusId, statuses]);

  // Initialize liked and saved states
  useEffect(() => {
    const initialLiked = {};
    const initialSaved = {};
    statuses.forEach((status, index) => {
      initialLiked[index] = status.likes?.includes(likeUserId) || false;
      initialSaved[index] = status.saves?.includes(likeUserId) || false;
    });
    setLiked(initialLiked);
    setSaved(initialSaved);
  }, [statuses, likeUserId]);

  // Handle scroll with snap
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const itemHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / itemHeight);

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < statuses.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, statuses.length]);

  // Handle double tap to like
  const handleDoubleTap = useCallback((e, index) => {
    e.stopPropagation();
    setLiked(prev => ({ ...prev, [index]: !prev[index] }));
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 1000);
  }, []);

  // Handle like toggle with API call
  const handleLike = useCallback(async (e, index) => {
    e.stopPropagation();
    const status = statuses[index];
    if (!status) return;

    try {
      const statusId = (status.id || status._id).replace('status-', '');
      const response = await authFetch(`${API_URL}/advanced/status/${statusId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: likeUserId })
      });
      const data = await response.json();
      if (data.success) {
        setLiked(prev => ({ ...prev, [index]: data.liked }));
      }
    } catch (error) {
      console.error('Like error:', error);
      // Fallback to local state
      setLiked(prev => ({ ...prev, [index]: !prev[index] }));
    }
  }, [statuses, likeUserId]);

  // Handle save toggle with API call
  const handleSave = useCallback(async (e, index) => {
    e.stopPropagation();
    const status = statuses[index];
    if (!status) return;

    try {
      const statusId = (status.id || status._id).replace('status-', '');
      const response = await authFetch(`${API_URL}/advanced/status/${statusId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: likeUserId })
      });
      const data = await response.json();
      if (data.success) {
        setSaved(prev => ({ ...prev, [index]: data.saved }));
      }
    } catch (error) {
      console.error('Save error:', error);
      // Fallback to local state
      setSaved(prev => ({ ...prev, [index]: !prev[index] }));
    }
  }, [statuses, likeUserId]);

  // Handle share with API call
  const handleShare = useCallback(async (e, status) => {
    e.stopPropagation();
    if (!status || isShareInProgressRef.current) return;

    try {
      const statusId = (status.id || status._id).replace('status-', '');
      const response = await authFetch(`${API_URL}/advanced/status/${statusId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: likeUserId })
      });
      const data = await response.json();
      if (data.success) {
        if (navigator.share) {
          isShareInProgressRef.current = true;
          try {
            await navigator.share({
              title: 'Status',
              text: status.caption || status.content,
              url: status.mediaUrl
            });
          } catch (shareError) {
            console.error('Native share error:', shareError);
          } finally {
            isShareInProgressRef.current = false;
          }
        }
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [likeUserId, statuses]);
  const handleReply = useCallback((e, index) => {
    e.stopPropagation();
    setShowReplyInput(true);
  }, []);

  const handleMoreOptions = useCallback(async (e) => {
    e.stopPropagation();
    const status = statuses[currentIndex];
    if (!status) return;
    const action = window.prompt('Options for this status:\n1. Copy link\n2. Report status\n\nEnter 1 or 2');
    if (action === '1') {
      const statusId = (status.id || status._id).replace('status-', '');
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/status/${statusId}`);
        alert('Status link copied to clipboard!');
      } catch (err) {
        alert('Could not copy link.');
      }
    } else if (action === '2') {
      const reason = window.prompt('Reason for reporting this status:');
      if (reason && reason.trim()) {
        alert(`Status reported. Reason: ${reason.trim()}`);
        setShowOptionsMenu(false);
      }
    }
  }, [statuses, currentIndex]);

  // Send reply with API call
  const sendReply = useCallback(async () => {
    if (!replyText.trim()) return;
    const status = statuses[currentIndex];
    if (!status) return;

    try {
      const statusId = (status.id || status._id).replace('status-', '');
      const response = await authFetch(`${API_URL}/advanced/status/${statusId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyText,
          type: 'text',
          userId: likeUserId,
          username: 'GENZ User'
        })
      });
      const data = await response.json();
      if (data.success) {
        console.log('Reply sent:', data);
      }
    } catch (error) {
      console.error('Reply error:', error);
    }
    setReplyText('');
    setShowReplyInput(false);
  }, [replyText, statuses, currentIndex, likeUserId]);

  // Handle video play/pause based on visibility
  useEffect(() => {
    statuses.forEach((status, index) => {
      const video = videoRefs.current[index];
      if (status.type === 'video' && video) {
        if (index === currentIndex) {
          video.play().catch(console.error);
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex, statuses]);

  // Handle scroll event
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const currentStatus = statuses[currentIndex];
  const progress = ((currentIndex + 1) / statuses.length) * 100;

  if (!currentStatus) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">No statuses to view</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
        {statuses.map((_, index) => (
          <div
            key={index}
            className={`flex-1 h-1 rounded-full transition-all duration-300 ${index < currentIndex ? 'bg-white' : 'bg-white/30'
              }`}
          />
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold border-2 border-white/30">
            {currentStatus.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-white font-semibold text-sm flex items-center gap-1.5">
              {currentStatus.username || 'Unknown'}
              {currentStatus.collabUsername && (
                <span className="text-pink-300 text-xs font-bold flex items-center gap-0.5">
                  <span className="text-white/50">&</span> {currentStatus.collabUsername}
                  <span className="bg-pink-500/30 text-pink-300 text-[9px] px-1 rounded-full ml-1">COLLAB</span>
                </span>
              )}
              {currentStatus.isContribution && (
                <span className="bg-purple-500/30 text-purple-300 text-[9px] px-1 rounded-full ml-1 font-bold">
                  CONTRIBUTED
                </span>
              )}
            </p>
            <p className="text-white/60 text-xs flex items-center gap-1">
              <Clock size={12} />
              {new Date(currentStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-white/60 text-xs">
            <Eye size={12} />
            <span>{currentStatus.viewsCount || 0}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-colors"
           aria-label="Close">
            <X size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* Scroll Container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        {statuses.map((status, index) => (
          <div
            key={status.id || index}
            className="h-screen w-full snap-start relative overflow-hidden"
            onDoubleClick={(e) => handleDoubleTap(e, index)}
          >
            {/* Media Content */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/20 via-transparent to-black/60">
              {status.type === 'image' ? (
                <img
                  src={status.mediaUrl || status.content}
                  alt="Status"
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              ) : status.type === 'video' ? (
                <video
                  ref={el => videoRefs.current[index] = el}
                  src={status.mediaUrl || status.content}
                  className="max-w-full max-h-full object-contain"
                  muted={isMuted}
                  loop
                  playsInline
                  onClick={() => setIsMuted(!isMuted)}
                />
              ) : status.type === 'location' ? (
                <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-teal-800 to-[#075e54]">
                  <div className="absolute inset-0">
                    {status?.locationData?.lat != null && status?.locationData?.lng != null ? (
                      <img
                        src={`https://static-maps.yandex.ru/1.x/?ll=${status.locationData.lng},${status.locationData.lat}&z=14&size=650,450&l=map&pt=${status.locationData.lng},${status.locationData.lat},pm2rdm`}
                        alt="Location map"
                        className="w-full h-full object-cover opacity-60"
                      />
                    ) : (
                      <div className="w-full h-full bg-teal-900" />
                    )}
                  </div>
                  <div className="relative z-10 bg-black/60 backdrop-blur rounded-2xl px-8 py-6 mx-6 text-center">
                    <MapPin className="text-[#00a884] mx-auto mb-3" size={48} />
                    <h2 className="text-2xl font-bold text-white">
                      {status?.locationData?.address || status?.content || 'Location'}
                    </h2>
                    {status?.locationData?.placeName && (
                      <p className="text-white/70 text-sm mt-1">{status.locationData.placeName}</p>
                    )}
                    {status?.locationData?.lat != null && status?.locationData?.lng != null && (
                      <a
                        href={`https://www.google.com/maps?q=${status.locationData.lat},${status.locationData.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-[#00a884] rounded-full text-white text-sm font-medium"
                      >
                        <Navigation size={16} />
                        Open in Maps
                      </a>
                    )}
                  </div>
                </div>
              ) : status.type === 'quiz' ? (
                <div
                  className="w-full h-full flex flex-col items-center justify-center p-8"
                  style={{ backgroundColor: status.backgroundColor || '#00a884' }}
                >
                  <h2 className="text-2xl font-bold text-white text-center mb-6 drop-shadow">
                    {status.quizQuestion || status.content}
                  </h2>
                  <div className="w-full max-w-sm space-y-3">
                    {(status.quizOptions || []).map((opt, optIdx) => {
                      const isCorrect = optIdx === Number(status.quizCorrectAnswer);
                      const selected = quizAnswers[index] === optIdx;
                      const answered = quizAnswers[index] !== undefined;
                      let cls = 'bg-white/20 text-white border border-white/30 hover:bg-white/30';
                      if (answered && selected && isCorrect) cls = 'bg-emerald-500 text-white border-emerald-300';
                      else if (answered && selected && !isCorrect) cls = 'bg-red-500 text-white border-red-300';
                      else if (answered && isCorrect) cls = 'bg-emerald-500/50 text-white border-emerald-300';
                      return (
                        <button
                          key={optIdx}
                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [index]: optIdx }))}
                          className={`w-full px-4 py-3 rounded-xl font-medium text-left transition-colors ${cls}`}
                        >
                          <span>{opt}</span>
                          {answered && isCorrect && <span className="float-right">✓</span>}
                          {answered && selected && !isCorrect && <span className="float-right">✗</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : status.type === 'question' ? (
                <div
                  className="w-full h-full flex flex-col items-center justify-center p-8"
                  style={{ backgroundColor: status.backgroundColor || '#00a884' }}
                >
                  <MessageCircle className="text-white/80 mb-4" size={40} />
                  <h2 className="text-2xl font-bold text-white text-center drop-shadow">
                    {status.questionText || status.content}
                  </h2>
                  {status.caption && <p className="text-white/70 text-sm mt-3 text-center">{status.caption}</p>}
                </div>
              ) : status.type === 'link' ? (
                <div
                  className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
                  style={{ backgroundColor: status.backgroundColor || '#00a884' }}
                >
                  <h2 className="text-2xl font-bold text-white mb-3 drop-shadow">{status.content}</h2>
                  {(status.linkUrl || status.mediaUrl) && (
                    <a
                      href={status.linkUrl || status.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 px-5 py-2 bg-white/25 backdrop-blur rounded-full text-white text-sm font-medium border border-white/30"
                    >
                      <Share2 size={16} /> Open Link
                    </a>
                  )}
                </div>
              ) : status.type === 'countdown' ? (
                <div
                  className="w-full h-full flex flex-col items-center justify-center p-8"
                  style={{ backgroundColor: status.backgroundColor || '#00a884' }}
                >
                  <Clock className="text-white/80 mb-4" size={40} />
                  <h2 className="text-2xl font-bold text-white text-center drop-shadow">
                    {status.content}
                  </h2>
                  {status.countdownDate && (
                    <p className="text-white/80 text-base mt-3">
                      {new Date(status.countdownDate).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center p-8"
                  style={{ backgroundColor: status.backgroundColor || '#00a884' }}
                >
                  <p
                    className="text-2xl font-bold text-center"
                    style={{ color: status.textColor || '#ffffff', fontFamily: status.font || 'sans-serif' }}
                  >
                    {status.content}
                  </p>
                </div>
              )}
            </div>

            {/* Heart Animation */}
            <AnimatePresence>
              {showHeartAnimation && index === currentIndex && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <Heart size={120} className="text-red-500 fill-red-500" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Caption */}
            {status.caption && (
              <div className="absolute bottom-24 left-4 right-16">
                <p className="text-white text-sm drop-shadow-lg">{status.caption}</p>
              </div>
            )}

            {/* Interaction Buttons */}
            {index === currentIndex && (
              <div className="absolute right-4 bottom-32 flex flex-col gap-4">
                <button
                  onClick={(e) => handleLike(e, index)}
                  className="p-3 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all transform hover:scale-110"
                 aria-label="Like">
                  <Heart
                    size={24}
                    className={liked[index] ? 'text-red-500 fill-red-500' : 'text-white'}
                  />
                </button>
                <button
                  onClick={(e) => handleReply(e, index)}
                  className="p-3 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all transform hover:scale-110"
                 aria-label="Message">
                  <MessageCircle size={24} className="text-white" />
                </button>
                <button
                  onClick={(e) => handleSave(e, index)}
                  className="p-3 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all transform hover:scale-110"
                >
                  <Bookmark
                    size={24}
                    className={saved[index] ? 'text-yellow-400 fill-yellow-400' : 'text-white'}
                  />
                </button>
                <button
                  onClick={(e) => handleShare(e, status)}
                  className="p-3 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all transform hover:scale-110"
                 aria-label="Share">
                  <Share2 size={24} className="text-white" />
                </button>
                <button
                  onClick={handleMoreOptions}
                  className="p-3 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all transform hover:scale-110"
                 aria-label="More options">
                  <MoreVertical size={24} className="text-white" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reply Input */}
      {showReplyInput && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="absolute bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t border-white/10"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to status..."
              className="flex-1 bg-white/10 text-white placeholder-white/50 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <button
              onClick={sendReply}
              className="p-3 bg-primary-600 rounded-full hover:bg-primary-700 transition-colors"
             aria-label="Send">
              <Send size={20} className="text-white" />
            </button>
            <button
              onClick={() => setShowReplyInput(false)}
              className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
             aria-label="Close">
              <X size={20} className="text-white" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Swipe Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40">
        <div className="w-1 h-12 bg-gradient-to-b from-transparent via-white/40 to-transparent rounded-full" />
        <p className="text-xs">Swipe to navigate</p>
      </div>
    </div>
  );
};

export default StatusScrollFeed;
