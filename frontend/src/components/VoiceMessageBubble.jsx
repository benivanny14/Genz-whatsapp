import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Mic, Play, Pause, Trash2, Forward, Download, MoreVertical } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { resolveMediaPlaybackUrl } from '../utils/sanitizeMediaUrl';

// Generate deterministic waveform bars based on message ID for consistency
const generateWaveformBars = (messageId, count = 50) => {
  const bars = [];
  let seed = 0;
  if (messageId) {
    for (let i = 0; i < messageId.length; i++) {
      seed += messageId.charCodeAt(i) * (i + 1);
    }
  }
  
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  
  for (let i = 0; i < count; i++) {
    bars.push(Math.random() * 0.6 + 0.2);
  }
  
  return bars;
};

const VoiceMessageBubble = memo(({ message, isOwn, onForward, onDelete, onDownload, onEnded }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.duration || 0);
  const [showMenu, setShowMenu] = useState(false);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [waveformBars, setWaveformBars] = useState([]);
  const { mods } = useChat();
  
  // Generate waveform bars based on message ID for consistency
  useEffect(() => {
    const bars = generateWaveformBars(message._id || message.id);
    setWaveformBars(bars);
  }, [message._id, message.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      if (message.isViewOnce && !isOwn) {
        setHasPlayedOnce(true);
      }
      // Auto-play next voice message if enabled
      if (mods?.voiceAutoPlay && onEnded) {
        onEnded(message);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [mods?.voiceAutoPlay, onEnded]);

  // Draw waveform visualization
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const barCount = waveformBars.length || 50;
    const barWidth = width / barCount;
    const progress = duration > 0 ? currentTime / duration : 0;

    ctx.clearRect(0, 0, width, height);

    waveformBars.forEach((barHeightFactor, index) => {
      const x = index * barWidth;
      const barHeight = barHeightFactor * height * 0.8;
      const y = (height - barHeight) / 2;

      // Check if this bar should be highlighted based on progress
      const barProgress = index / barCount;
      const isPlayed = barProgress <= progress;

      ctx.fillStyle = isPlayed
        ? (isOwn ? 'rgba(255, 255, 255, 0.9)' : 'rgba(37, 211, 102, 0.9)')
        : (isOwn ? 'rgba(255, 255, 255, 0.3)' : 'rgba(37, 211, 102, 0.3)');

      ctx.beginPath();
      ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
      ctx.fill();
    });
  }, [waveformBars, currentTime, duration, isOwn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;

    // Initial draw
    drawWaveform();

    // Redraw on time update
    const handleTimeUpdate = () => {
      drawWaveform();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [drawWaveform]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (speed) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (message.isViewOnce && !isOwn && hasPlayedOnce) {
    return (
      <div className="relative max-w-[280px] mr-auto">
        <div className="p-3 rounded-2xl shadow-md bg-white text-gray-500 italic flex items-center gap-3 border border-gray-200">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <Mic size={16} />
          </div>
          <span className="text-sm font-medium">Sauti Imesikilizwa</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative max-w-[280px] ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
      <audio ref={audioRef} src={resolveMediaPlaybackUrl(message.mediaUrl || message.content)} />

      {/* Voice Message Bubble */}
      <div className={`p-3 rounded-2xl shadow-lg ${isOwn
        ? 'bg-[#25d366] text-white'
        : 'bg-white text-gray-800'
        }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Mic size={16} />
            </div>
            <span className="text-xs font-semibold flex items-center gap-1">
              Voice Note {message.isViewOnce && <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px] font-bold opacity-80" title="View Once">1</span>}
            </span>
            {message.voiceEffect && message.voiceEffect !== 'none' && (
              <span className="text-[9px] bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full font-bold uppercase">
                {message.voiceEffect}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-black/10 rounded-full transition-colors"
           aria-label="More options">
            <MoreVertical size={16} />
          </button>
        </div>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className={`absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10 min-w-[140px]`}>
            <button
              onClick={() => { onForward?.(message); setShowMenu(false); }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Forward size={14} /> Forward
            </button>
            <button
              onClick={() => { onDownload?.(message); setShowMenu(false); }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Download size={14} /> Download
            </button>
            {isOwn && (
              <button
                onClick={() => { onDelete?.(message); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        )}

        {/* Waveform Visualization */}
        <div
          className="relative h-12 bg-black/10 rounded-lg mb-2 cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            width={280}
            height={48}
          />
          {/* Progress Overlay */}
          <div
            className={`absolute top-0 left-0 h-full rounded-lg ${isOwn ? 'bg-black/20' : 'bg-[#25d366]/20'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Play Button */}
          <button
            onClick={togglePlay}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isOwn
              ? 'bg-white text-[#25d366] hover:scale-105'
              : 'bg-[#25d366] text-white hover:scale-105'
              }`}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-1" />}
          </button>

          {/* Time */}
          <div className="text-xs font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Speed Controls */}
          <div className="flex items-center gap-1">
            {[1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${playbackSpeed === speed
                  ? isOwn ? 'bg-white text-[#25d366]' : 'bg-[#25d366] text-white'
                  : isOwn ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Delivery Status */}
        {isOwn && (
          <div className="flex items-center justify-end mt-2 gap-1">
            <span className="text-[9px] opacity-70">
              {message.read ? '✓✓' : message.delivered ? '✓✓' : '✓'}
            </span>
            <span className="text-[9px] opacity-70">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export default VoiceMessageBubble;
