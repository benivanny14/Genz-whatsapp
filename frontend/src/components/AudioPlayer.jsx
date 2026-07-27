import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Play, Pause, Download, Eye } from 'lucide-react';
import { resolveMediaPlaybackUrl, ensureSignedMediaUrl } from '../utils/sanitizeMediaUrl';
import { useAuth } from '../context/AuthContext';
import { applyAntiScreenshot, initAntiScreenshotListeners, setScreenshotAttemptCallback, getScreenshotAttemptCallback, isAntiScreenshotActive } from '../utils/antiScreenshot';
import { getSocket } from '../services/socket';

// Static waveform bars — deterministic so they don't re-render randomly
const BARS = Array.from({ length: 36 }, (_, i) => {
  const heights = [3, 5, 8, 12, 9, 14, 18, 11, 7, 15, 20, 13, 6, 17, 10, 22, 16, 8, 19, 12, 5, 9, 14, 18, 11, 7, 15, 20, 13, 6, 17, 10, 8, 5, 3, 4];
  return heights[i] || 4;
});

const WaveformBar = ({ height, filled, isPlaying, index }) => (
  <div
    className={`rounded-full transition-colors duration-150 ${filled ? 'bg-white' : 'bg-white/35'}`}
    style={{
      width: 2.5,
      height: Math.max(4, height),
      transform: isPlaying && filled ? `scaleY(${1 + Math.sin(Date.now() / 200 + index) * 0.15})` : 'scaleY(1)',
    }}
  />
);

const AudioPlayer = ({
  audioUrl,
  isOwn,
  duration: initialDuration,
  senderAvatar,
  senderName,
  onDownload,
  autoPlay = false,
  defaultSpeed = 1,
  messageId,
  onToggleLock,
  isLocked = false,
  isViewOnce = false,
  onViewOnceComplete,
  senderId,
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const parsedDefaultSpeed = typeof defaultSpeed === 'number' ? defaultSpeed :
    (typeof defaultSpeed === 'string' ? (parseFloat(defaultSpeed.replace(/x/gi, '')) || 1) : 1);
  const [speed, setSpeed] = useState(parsedDefaultSpeed);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [locked, setLocked] = useState(isLocked);
  const [viewOnceConsumed, setViewOnceConsumed] = useState(false);
  const rafRef = useRef(null);

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const [playbackUrl, setPlaybackUrl] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const { token } = useAuth();

  // Fix Cloudinary audio URLs: ensure proper format and full public_id
  const fixCloudinaryAudioUrl = useCallback((url) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    
    try {
      // Remove query parameters but keep the full URL path
      const urlWithoutParams = url.split('?')[0];
      
      console.log('[AudioPlayer] Original URL:', urlWithoutParams);
      console.log('[AudioPlayer] URL length:', urlWithoutParams.length);
      
      return urlWithoutParams;
    } catch (e) {
      console.warn('[AudioPlayer] Failed to fix Cloudinary URL:', e);
      return url;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchPlaybackUrl = async () => {
      if (!audioUrl) return;
      
      try {
        // First, try to get a signed URL for better security
        const signedUrl = await ensureSignedMediaUrl(audioUrl, token);
        if (active && signedUrl) {
          const fixedUrl = fixCloudinaryAudioUrl(signedUrl);
          const resolved = resolveMediaPlaybackUrl(fixedUrl);
          setPlaybackUrl(resolved);
          console.log('[AudioPlayer] Using signed URL (full):', resolved);
          return;
        }
      } catch (e) {
        console.warn('[AudioPlayer] Signed URL attempt failed:', e?.message || e);
      }
      
      // Fallback: use direct URL with proper resolution
      if (active) {
        try {
          const fixedUrl = fixCloudinaryAudioUrl(audioUrl);
          const resolved = resolveMediaPlaybackUrl(fixedUrl);
          setPlaybackUrl(resolved);
          console.log('[AudioPlayer] Using direct URL (full):', resolved);
        } catch (resolveError) {
          console.error('[AudioPlayer] Failed to resolve URL:', resolveError);
          if (active) {
            // Last resort: use the raw URL (also fixed)
            setPlaybackUrl(fixCloudinaryAudioUrl(audioUrl));
          }
        }
      }
    };
    
    fetchPlaybackUrl();
    return () => { active = false; };
  }, [audioUrl, token, retryCount, fixCloudinaryAudioUrl]);

  const onViewOnceCompleteRef = useRef(onViewOnceComplete);
  useEffect(() => {
    onViewOnceCompleteRef.current = onViewOnceComplete;
  }, [onViewOnceComplete]);

  // Create / update audio element
  useEffect(() => {
    if (!playbackUrl) {
      console.warn('[AudioPlayer] No playback URL available');
      return;
    }
    
    console.log('[AudioPlayer] Creating audio element with src:', playbackUrl);
    
    let isCleanedUp = false;
    
    // Create audio element directly without fetch
    const audio = new Audio();
    audio.crossOrigin = "anonymous"; // Allow CORS
    audio.preload = "metadata";
    audio.playbackRate = parsedDefaultSpeed;
    audio.src = playbackUrl;
    audioRef.current = audio;

    console.log('[AudioPlayer] Audio src set immediately to:', audio.src);
    console.log('[AudioPlayer] Audio element created, readyState:', audio.readyState);

    audio.onloadedmetadata = () => {
      if (isCleanedUp) return;
      const dur = audio.duration || initialDuration || 0;
      setDuration(dur);
      setLoaded(true);
      setError(false);
      console.log('[AudioPlayer] Audio loaded, duration:', dur);

      if (autoPlay) {
        audio.play().then(() => setIsPlaying(true)).catch(e => console.warn('Autoplay blocked:', e));
      }
    };
    audio.ontimeupdate = () => {
      if (isCleanedUp) return;
      setCurrentTime(audio.currentTime);
    };
    audio.onended = () => {
      if (isCleanedUp) return;
      setIsPlaying(false);
      setCurrentTime(0);
      if (isViewOnce && !isOwn) {
        setViewOnceConsumed(true);
        onViewOnceCompleteRef.current?.();
      }
    };
    audio.onerror = (e) => {
      if (isCleanedUp) return;
      console.error('[AudioPlayer] Audio playback error:', e);
      console.error('[AudioPlayer] Current src:', audio.src);
      console.error('[AudioPlayer] Network state:', audio.networkState);
      console.error('[AudioPlayer] Ready state:', audio.readyState);
      console.error('[AudioPlayer] Playback URL state:', playbackUrl);
      // Log more details about the error
      if (audio.error) {
        console.error('[AudioPlayer] Error code:', audio.error.code, 'Message:', audio.error.message);
      }
      // Limit retries to prevent infinite loops
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        console.log(`[AudioPlayer] Retry ${retryCount + 1}/2`);
      } else {
        setError(true);
        console.log('[AudioPlayer] Max retries reached, showing error');
      }
    };

    return () => {
      isCleanedUp = true; // Set flag first
      if (audio) {
        // Remove event handlers to prevent memory leaks
        audio.onloadedmetadata = null;
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.src = '';
      }
      audioRef.current = null;
      cancelAnimationFrame(rafRef.current);
    };
  }, [playbackUrl, autoPlay, initialDuration, parsedDefaultSpeed, isViewOnce, isOwn, retryCount]);

  // FIX: view-once voice notes render inline (this component) rather than
  // through the fullscreen view-once modal, so the anti-screenshot
  // protection (blur-on-blur, PrintScreen/Cmd+Shift+S detection, sender
  // notification) that the modal wires up never activated for them. Apply
  // the same protection here for the duration of playback.
  useEffect(() => {
    if (!isViewOnce || isOwn || viewOnceConsumed || !isPlaying) return;
    const wasActiveBefore = isAntiScreenshotActive();
    const previousCallback = getScreenshotAttemptCallback();
    initAntiScreenshotListeners();
    applyAntiScreenshot(true);
    setScreenshotAttemptCallback(() => {
      try {
        const socket = getSocket?.();
        if (socket && messageId && senderId) {
          socket.emit('viewonce:screenshot_attempt', { messageId, senderId });
        }
      } catch (e) {
        // non-fatal: screenshot notification is best-effort
      }
    });
    return () => {
      applyAntiScreenshot(wasActiveBefore);
      // Restore whatever callback (e.g. the conversation-level anti-screenshot
      // mod) was registered before, instead of nulling it out.
      setScreenshotAttemptCallback(previousCallback);
    };
  }, [isViewOnce, isOwn, viewOnceConsumed, isPlaying, messageId, senderId]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setError(true));
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  }, [duration]);

  const cycleSpeed = useCallback(() => {
    const speeds = [1, 1.5, 2];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, [speed]);

  const handleDownload = useCallback(() => {
    if (onDownload) { onDownload(audioUrl); return; }
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voice-note-${Date.now()}.webm`;
    a.click();
  }, [audioUrl, onDownload]);

  const handleToggleLock = useCallback(() => {
    const newLockedState = !locked;
    setLocked(newLockedState);
    if (onToggleLock && messageId) {
      onToggleLock(messageId, newLockedState);
    }
  }, [locked, onToggleLock, messageId]);

  const progress = duration > 0 ? currentTime / duration : 0;
  const filledBars = Math.round(progress * BARS.length);
  const displayTime = isPlaying ? formatTime(currentTime) : formatTime(duration || initialDuration);

  // Color scheme — matches TM WhatsApp exactly
  const bgColor = isOwn ? 'bg-[#005c4b]' : 'bg-[#1f2c34]';
  const playBg = isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-[#25d366]/20 hover:bg-[#25d366]/30';
  const playIcon = isOwn ? 'text-white' : 'text-[#25d366]';

  if (error) {
    return (
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${bgColor} min-w-[200px]`}>
        <span className="text-white/60 text-xs">⚠ Audio unavailable</span>
        {!isViewOnce && (
          <button onClick={handleDownload} className="ml-auto p-1.5 rounded-full hover:bg-white/10" aria-label="Download">
            <Download size={14} className="text-white/60" />
          </button>
        )}
      </div>
    );
  }

  if (isViewOnce && !isOwn && viewOnceConsumed) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${bgColor} min-w-[200px] text-white/70 italic text-sm`}>
        <Eye size={16} /> Voice note opened
      </div>
    );
  }

  if (isViewOnce && !isOwn && !viewOnceConsumed) {
    return (
      <button
        type="button"
        onClick={toggle}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${bgColor} min-w-[200px] text-white/90 text-sm hover:opacity-90 transition-opacity`}
      >
        <Eye size={16} />
        <span>Tap to play view-once voice</span>
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl ${bgColor} min-w-[220px] max-w-[280px] select-none`}>
      {/* Avatar circle (sender avatar or mic icon) */}
      <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-white/10 border border-white/15">
        {senderAvatar ? (
          <img src={senderAvatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white/70">
            <path d="M12 15a4 4 0 0 0 4-4V5a4 4 0 0 0-8 0v6a4 4 0 0 0 4 4zm6.5-4a6.5 6.5 0 0 1-13 0H4a8 8 0 0 0 7 7.93V21h2v-2.07A8 8 0 0 0 20 11h-1.5z" />
          </svg>
        )}
      </div>

      {/* Play / Pause */}
      <button
        type="button"
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${playBg}`}
      >
        {isPlaying
          ? <Pause size={16} className={playIcon} fill="currentColor" />
          : <Play size={16} className={playIcon} fill="currentColor" style={{ marginLeft: 1 }} />
        }
      </button>

      {/* Waveform + time */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Waveform seek bar */}
        <div
          className="flex items-center gap-[1.5px] h-7 cursor-pointer"
          onClick={handleSeek}
          title="Seek"
        >
          {BARS.map((h, i) => (
            <WaveformBar
              key={i}
              height={h}
              filled={i < filledBars}
              isPlaying={isPlaying}
              index={i}
            />
          ))}
        </div>

        {/* Time + speed + lock */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/70 font-mono leading-none">
            {displayTime}
          </span>
          <div className="flex items-center gap-2">
            {messageId && onToggleLock && (
              <button
                type="button"
                onClick={handleToggleLock}
                className={`text-[10px] font-bold transition-colors px-1 rounded ${locked ? 'text-yellow-400' : 'text-white/40 hover:text-white/70'}`}
                title={locked ? 'Unlock voice note' : 'Lock voice note'}
              >
                {locked ? '🔒' : '🔓'}
              </button>
            )}
            <button
              type="button"
              onClick={cycleSpeed}
              className="text-[10px] font-bold text-white/60 hover:text-white/90 transition-colors px-1 rounded"
            >
              {speed === 1 ? '1×' : speed === 1.5 ? '1.5×' : '2×'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(AudioPlayer);