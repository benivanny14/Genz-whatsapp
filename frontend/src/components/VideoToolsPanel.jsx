import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, FastForward, Rewind, Scissors, Layers, Music, Volume2, Mic, Play, Pause } from 'lucide-react';

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
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [musicVolume, setMusicVolume] = useState(0.5);

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
      // Auto-pause at trim end
      if (videoRef.current.currentTime >= trimEnd) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (vol) => {
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      // Start from trim start if before it
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
      const url = URL.createObjectURL(file);
      setSelectedMusic(url);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const trimDuration = trimEnd - trimStart;

  /**
   * Trim the video using MediaRecorder + canvas capture.
   * Plays the video from trimStart to trimEnd and records the canvas output.
   */
  const handleTrim = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isTrimming) return;

    setIsTrimming(true);
    setTrimProgress(0);

    const videoEl = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 360;

    // Seek to trim start
    videoEl.currentTime = trimStart;
    videoEl.volume = 0;
    videoEl.muted = true;

    await new Promise((resolve) => {
      videoEl.onseeked = resolve;
    });

    // Start recording the canvas
    const stream = canvas.captureStream(30);
    // Also capture audio if available
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(videoEl);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);
      dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    } catch (e) {
      // Audio capture may fail in some browsers, continue without it
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

    // Play from trimStart to trimEnd
    videoEl.play();

    // Draw frames to canvas
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

    // Create a File from the blob for upload
    const trimmedFile = new File([trimmedBlob], 'trimmed-video.webm', { type: trimmedBlob.type });

    // Pass the trimmed video back
    if (onSave) {
      onSave(trimmedFile, URL.createObjectURL(trimmedBlob));
    }
  }, [trimStart, trimEnd, trimDuration, isTrimming, onSave]);

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-4">
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
            <button onClick={onClose} className="text-gray-400 hover:text-white">
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
            {/* Hidden canvas for trim recording */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Play/Pause button */}
            <button
              onClick={togglePlayPause}
              className="mt-3 w-12 h-12 rounded-full bg-[#00a884] hover:bg-[#008f6f] flex items-center justify-center text-white shadow-lg"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
            </button>

            {/* Timeline + Trim Handles */}
            <div className="w-full mt-3 px-2">
              <div className="relative w-full h-12 bg-white/10 rounded-lg overflow-hidden">
                {/* Trim range indicator */}
                <div
                  className="absolute top-0 bottom-0 bg-[#00a884]/30 border-y-2 border-[#00a884]"
                  style={{
                    left: `${duration > 0 ? (trimStart / duration) * 100 : 0}%`,
                    width: `${duration > 0 ? (trimDuration / duration) * 100 : 100}%`
                  }}
                />
                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                  style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
                {/* Start handle */}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val < trimEnd - 0.5) setTrimStart(val);
                  }}
                  className="absolute inset-0 w-full opacity-0 cursor-ew-resize z-20"
                />
                {/* End handle */}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > trimStart + 0.5) setTrimEnd(val);
                  }}
                  className="absolute inset-0 w-full opacity-0 cursor-ew-resize z-20"
                />
              </div>
              <div className="flex justify-between text-white/60 text-xs mt-1">
                <span className="text-[#00a884] font-medium">{formatTime(trimStart)}</span>
                <span className="text-white/40">Duration: {formatTime(trimDuration)}</span>
                <span className="text-[#00a884] font-medium">{formatTime(trimEnd)}</span>
              </div>
            </div>
          </div>

          {/* Tools Panel */}
          <div className="w-full md:w-80 bg-[#0b141a] p-3 md:p-4 space-y-4 md:space-y-5 overflow-y-auto max-h-[35vh] md:max-h-none">
            {/* Trim Info */}
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Scissors size={16} />
                <span>Trim Range</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-white text-sm">
                <div>
                  <span className="text-white/60">Start:</span> {formatTime(trimStart)}
                </div>
                <div className="text-center">
                  <span className="text-white/60">Duration:</span> {formatTime(trimDuration)}
                </div>
                <div className="text-right">
                  <span className="text-white/60">End:</span> {formatTime(trimEnd)}
                </div>
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
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Add Music */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-2">Background Music</p>
              <label className="flex items-center gap-2 p-2 border-2 border-dashed border-white/30 rounded-lg hover:border-white/60 cursor-pointer">
                <Music size={18} className="text-white/50" />
                <span className="text-white/70 text-sm">{selectedMusic ? 'Change Music' : 'Upload Music'}</span>
                <input type="file" accept="audio/*" onChange={handleMusicUpload} className="hidden" />
              </label>
              {selectedMusic && (
                <div className="mt-2">
                  <p className="text-white/60 text-xs mb-1">Music Volume: {Math.round(musicVolume * 100)}%</p>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                    className="w-full"
                  />
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
              {isTrimming ? (
                <>Trimming... {Math.round(trimProgress)}%</>
              ) : (
                <>Trim Video</>
              )}
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
