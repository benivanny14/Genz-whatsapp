import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, FastForward, Rewind, Scissors, Music, Volume2, Play, Pause, RotateCcw } from 'lucide-react';

const VideoToolsPanel = ({ onClose, video, onSave }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedMusicFile, setSelectedMusicFile] = useState(null);
  const [selectedMusicUrl, setSelectedMusicUrl] = useState(null);
  const [musicVolume, setMusicVolume] = useState(0.5);

  // Drag state for trim handles
  const [dragging, setDragging] = useState(null); // 'start' | 'end' | null
  const timelineRef = useRef(null);

  useEffect(() => {
    if (video && videoRef.current) {
      videoRef.current.src = video;
      videoRef.current.load();
    }
  }, [video]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setTrimEnd(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.currentTime >= trimEnd) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
  };

  const handleVolumeChange = (vol) => {
    setVolume(vol);
    if (videoRef.current) videoRef.current.volume = vol;
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleMusicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (selectedMusicUrl) URL.revokeObjectURL(selectedMusicUrl);
      const url = URL.createObjectURL(file);
      setSelectedMusicFile(file);
      setSelectedMusicUrl(url);
    }
  };

  const removeMusic = () => {
    if (selectedMusicUrl) URL.revokeObjectURL(selectedMusicUrl);
    setSelectedMusicFile(null);
    setSelectedMusicUrl(null);
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const trimDuration = Math.max(0, trimEnd - trimStart);

  // Timeline drag handlers — proper touch+mouse support
  const getTimeFromPosition = useCallback((clientX) => {
    if (!timelineRef.current || !duration) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  }, [duration]);

  const handleTimelinePointerDown = useCallback((e) => {
    e.preventDefault();
    const time = getTimeFromPosition(e.clientX || e.touches?.[0]?.clientX);
    // Determine which handle is closer
    const distStart = Math.abs(time - trimStart);
    const distEnd = Math.abs(time - trimEnd);
    if (distStart < distEnd) {
      setDragging('start');
    } else {
      setDragging('end');
    }
  }, [getTimeFromPosition, trimStart, trimEnd]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e) => {
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      if (clientX == null) return;
      const time = getTimeFromPosition(clientX);
      if (dragging === 'start') {
        setTrimStart(Math.max(0, Math.min(time, trimEnd - 0.5)));
      } else {
        setTrimEnd(Math.min(duration, Math.max(time, trimStart + 0.5)));
      }
    };

    const handleUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragging, getTimeFromPosition, trimStart, trimEnd, duration]);

  // Reset — set trim to full duration
  const handleReset = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    setTrimProgress(0);
  };

  // Seek to trim start on video
  const seekToStart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = trimStart;
      setCurrentTime(trimStart);
    }
  };

  const seekToEnd = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = trimEnd;
      setCurrentTime(trimEnd);
    }
  };

  /**
   * Trim the video using MediaRecorder + canvas capture.
   * If music is added, mix it with the video audio via Web Audio API.
   */
  const handleTrim = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isTrimming) return;

    setIsTrimming(true);
    setTrimProgress(0);

    const videoEl = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 360;

    videoEl.currentTime = trimStart;
    videoEl.volume = 0;
    videoEl.muted = true;

    await new Promise((resolve) => {
      videoEl.onseeked = resolve;
    });

    const stream = canvas.captureStream(30);

    // Mix audio: video audio + background music (if any)
    try {
      const audioCtx = new AudioContext();
      const videoSource = audioCtx.createMediaElementSource(videoEl);
      const dest = audioCtx.createMediaStreamDestination();

      videoSource.connect(dest);
      videoSource.connect(audioCtx.destination); // hear video audio

      if (selectedMusicFile) {
        try {
          const musicArrayBuffer = await selectedMusicFile.arrayBuffer();
          const musicBuffer = await audioCtx.decodeAudioData(musicArrayBuffer);
          const musicSource = audioCtx.createBufferSource();
          musicSource.buffer = musicBuffer;
          musicSource.loop = true;

          const musicGain = audioCtx.createGain();
          musicGain.gain.value = musicVolume;

          musicSource.connect(musicGain);
          musicGain.connect(dest);
          musicSource.start(0, trimStart % musicBuffer.duration);
        } catch (musicErr) {
          console.warn('Music mixing failed, proceeding without music:', musicErr);
        }
      }

      dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    } catch (e) {
      console.warn('Audio capture not available for trim:', e);
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const trimPromise = new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };
    });

    recorder.start();
    videoEl.play();

    const drawFrame = () => {
      if (videoEl.currentTime >= trimEnd || videoEl.paused) {
        recorder.stop();
        videoEl.pause();
        setIsPlaying(false);
        return;
      }
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      setTrimProgress(Math.min(100, ((videoEl.currentTime - trimStart) / trimDuration) * 100));
      requestAnimationFrame(drawFrame);
    };
    requestAnimationFrame(drawFrame);

    const trimmedBlob = await trimPromise;
    setIsTrimming(false);
    setTrimProgress(100);

    const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
    const trimmedFile = new File([trimmedBlob], `trimmed-video.${ext}`, { type: trimmedBlob.type });

    if (onSave) {
      onSave(trimmedFile, URL.createObjectURL(trimmedBlob));
    }
  }, [trimStart, trimEnd, trimDuration, isTrimming, onSave, selectedMusicFile, musicVolume]);

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

  // Percentage positions for timeline
  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPct = duration > 0 ? (trimEnd / duration) * 100 : 100;
  const currentPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 md:p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-3 md:p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Scissors className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Video Trim</h2>
          </div>
          <div className="flex items-center gap-2">
            {isTrimming && (
              <span className="text-[#00a884] text-sm font-medium">{Math.round(trimProgress)}%</span>
            )}
            <button onClick={() => { if (selectedMusicUrl) URL.revokeObjectURL(selectedMusicUrl); onClose(); }} className="text-gray-400 hover:text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Video Preview */}
          <div className="flex-1 bg-black/50 flex flex-col items-center justify-center p-2 md:p-4 min-h-[200px] md:min-h-0">
            <video
              ref={videoRef}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              className="max-w-full max-h-[30vh] md:max-h-full rounded-lg"
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            <button
              onClick={togglePlayPause}
              className="mt-3 w-12 h-12 rounded-full bg-[#00a884] hover:bg-[#008f6f] flex items-center justify-center text-white shadow-lg"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
            </button>

            {/* ── Proper Trim Timeline with Drag Handles ── */}
            <div className="w-full mt-3 px-2">
              <div
                ref={timelineRef}
                className="relative w-full h-12 bg-white/10 rounded-lg overflow-visible cursor-pointer select-none"
                onMouseDown={handleTimelinePointerDown}
                onTouchStart={handleTimelinePointerDown}
              >
                {/* Dark outside trim region */}
                <div
                  className="absolute top-0 bottom-0 bg-black/50"
                  style={{ left: 0, width: `${startPct}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 bg-black/50"
                  style={{ left: `${endPct}%`, right: 0 }}
                />
                {/* Green trim region */}
                <div
                  className="absolute top-0 bottom-0 border-y-2 border-[#00a884] bg-[#00a884]/20"
                  style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
                />
                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none"
                  style={{ left: `${currentPct}%` }}
                />

                {/* Start handle */}
                <div
                  className={`absolute top-0 bottom-0 w-4 flex items-center justify-center z-20 cursor-ew-resize ${dragging === 'start' ? 'bg-[#00a884]' : 'bg-[#00a884]/80 hover:bg-[#00a884]'}`}
                  style={{ left: `calc(${startPct}% - 8px)` }}
                >
                  <div className="w-0.5 h-6 bg-white rounded" />
                </div>

                {/* End handle */}
                <div
                  className={`absolute top-0 bottom-0 w-4 flex items-center justify-center z-20 cursor-ew-resize ${dragging === 'end' ? 'bg-[#00a884]' : 'bg-[#00a884]/80 hover:bg-[#00a884]'}`}
                  style={{ left: `calc(${endPct}% - 8px)` }}
                >
                  <div className="w-0.5 h-6 bg-white rounded" />
                </div>
              </div>

              <div className="flex justify-between text-white/60 text-xs mt-1">
                <button onClick={seekToStart} className="text-[#00a884] font-medium hover:underline">{formatTime(trimStart)}</button>
                <span className="text-white/40">Duration: {formatTime(trimDuration)}</span>
                <button onClick={seekToEnd} className="text-[#00a884] font-medium hover:underline">{formatTime(trimEnd)}</button>
              </div>
            </div>
          </div>

          {/* Tools Panel */}
          <div className="w-full md:w-80 bg-[#0b141a] p-3 md:p-4 space-y-4 md:space-y-5 overflow-y-auto max-h-[35vh] md:max-h-none">
            {/* Trim Info */}
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Scissors size={16} />
                  <span>Trim Range</span>
                </div>
                <button onClick={handleReset} className="text-white/40 hover:text-white text-xs flex items-center gap-1">
                  <RotateCcw size={12} /> Reset
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-white text-sm">
                <div><span className="text-white/60">Start:</span> {formatTime(trimStart)}</div>
                <div className="text-center"><span className="text-white/60">Duration:</span> {formatTime(trimDuration)}</div>
                <div className="text-right"><span className="text-white/60">End:</span> {formatTime(trimEnd)}</div>
              </div>
            </div>

            {/* Playback Speed */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-3">Speed: {playbackSpeed}x</p>
              <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-2 rounded-lg text-xs transition-colors ${
                      playbackSpeed === speed
                        ? 'bg-[#00a884] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Volume */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-2">Volume: {Math.round(volume * 100)}%</p>
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-white/60 flex-shrink-0" />
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Background Music */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-2">Background Music</p>
              <label className="flex items-center gap-2 p-2 border-2 border-dashed border-white/30 rounded-lg hover:border-white/60 cursor-pointer">
                <Music size={18} className="text-white/50" />
                <span className="text-white/70 text-sm">{selectedMusicFile ? selectedMusicFile.name.substring(0, 20) + '...' : 'Add Music'}</span>
                <input type="file" accept="audio/*" onChange={handleMusicUpload} className="hidden" />
              </label>
              {selectedMusicUrl && (
                <div className="mt-2 space-y-2">
                  <audio src={selectedMusicUrl} controls className="w-full h-8 opacity-80" style={{ filter: 'invert(1) hue-rotate(180deg)' }} />
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">Vol:</span>
                    <input
                      type="range" min="0" max="1" step="0.1"
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-white/60 text-xs">{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <button onClick={removeMusic} className="text-red-400 text-xs hover:text-red-300">Remove Music</button>
                </div>
              )}
            </div>

            {/* Trim Button */}
            <button
              onClick={handleTrim}
              disabled={isTrimming || trimDuration <= 0.5}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Scissors size={18} />
              {isTrimming ? `Trimming... ${Math.round(trimProgress)}%` : 'Trim Video'}
            </button>

            {/* Apply without trim */}
            <button
              onClick={() => onSave && onSave(video, video)}
              className="w-full px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
            >
              Apply Without Trimming
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoToolsPanel;
