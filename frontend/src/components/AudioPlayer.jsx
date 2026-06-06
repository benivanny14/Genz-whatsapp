import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Play, Pause, Download, Eye } from 'lucide-react';
import { resolveMediaPlaybackUrl, ensureSignedMediaUrl } from '../utils/sanitizeMediaUrl';
import { useAuth } from '../context/AuthContext';

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
      height: height,
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
  const { token } = useAuth(); // We need token from AuthContext

  useEffect(() => {
    let active = true;
    const fetchSignedUrl = async () => {
      try {
        // Try signed URL first
        const signedUrl = await ensureSignedMediaUrl(audioUrl, token);
        if (active) {
          const resolved = resolveMediaPlaybackUrl(signedUrl);
          setPlaybackUrl(resolved);
          console.log('[AudioPlayer] Using signed URL:', resolved?.substring(0, 100));
        }
      } catch (e) {
        console.warn('[AudioPlayer] Signed URL failed, trying direct:', e);
        if (active) {
          // Fallback to direct URL
          const resolved = resolveMediaPlaybackUrl(audioUrl);
          setPlaybackUrl(resolved);
          console.log('[AudioPlayer] Using direct URL:', resolved?.substring(0, 100));
        }
      }
    };
    if (audioUrl) {
      fetchSignedUrl();
    }
    return () => { active = false; };
  }, [audioUrl, token]);

  // Create / update audio element
  useEffect(() => {
    if (!playbackUrl) return;
    const audio = new Audio(playbackUrl);
    audio.preload = 'metadata';
    audio.playbackRate = parsedDefaultSpeed;
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || initialDuration || 0);
      setLoaded(true);
      setError(false);

      if (autoPlay) {
        audio.play().then(() => setIsPlaying(true)).catch(e => console.warn('Autoplay blocked:', e));
      }
    };
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (isViewOnce && !isOwn) {
        setViewOnceConsumed(true);
        onViewOnceComplete?.();
      }
    };
    audio.onerror = () => setError(true);

    return () => {
      audio.pause();
      audio.src = '';
      cancelAnimationFrame(rafRef.current);
    };
  }, [playbackUrl, autoPlay, initialDuration, parsedDefaultSpeed, isViewOnce, isOwn, onViewOnceComplete]);

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
          <button onClick={handleDownload} className="ml-auto p-1.5 rounded-full hover:bg-white/10">
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
