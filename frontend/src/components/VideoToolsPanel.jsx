import React, { useState, useRef, useEffect } from 'react';
import { X, FastForward, Rewind, Scissors, Layers, Music, Volume2, Mic, MessageSquare, Zap } from 'lucide-react';

const VideoToolsPanel = ({ onClose, video, onSave }) => {
  const videoRef = useRef(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isReversed, setIsReversed] = useState(false);
  const [volume, setVolume] = useState(1);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [transition, setTransition] = useState('none');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const transitions = [
    { id: 'none', label: 'None' },
    { id: 'fade', label: 'Fade' },
    { id: 'slide', label: 'Slide' },
    { id: 'zoom', label: 'Zoom' },
    { id: 'wipe', label: 'Wipe' }
  ];

  useEffect(() => {
    if (video && videoRef.current) {
      videoRef.current.src = video;
      videoRef.current.load();
    }
  }, [video]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleReverse = () => {
    setIsReversed(!isReversed);
    // Video reversal requires processing the video frames
    // This is a placeholder for the feature
    console.log('Video reversal requires frame-by-frame processing');
  };

  const handleVolumeChange = (vol) => {
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  const handleMusicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedMusic(url);
    }
  };

  const handleTrim = () => {
    // Trimming requires video processing
    console.log('Video trimming requires frame extraction and re-encoding');
  };

  const handleSplit = () => {
    // Splitting requires video processing
    console.log('Video splitting requires frame extraction');
  };

  const handleMerge = () => {
    // Merging requires video processing
    console.log('Video merging requires video processing library');
  };

  const handleVoiceChanger = () => {
    // Voice changer requires audio processing
    console.log('Voice changer requires audio processing library');
  };

  const handleSave = () => {
    if (onSave) {
      // In a real implementation, this would process the video with all effects
      // For now, we'll return the original video
      onSave(video);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Layers className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Video Tools</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Video Preview */}
          <div className="flex-1 bg-black/50 flex flex-col items-center justify-center p-4">
            <video
              ref={videoRef}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              controls
              className="max-w-full max-h-full"
            />
            
            {/* Timeline */}
            <div className="w-full mt-4 bg-white/10 rounded-lg p-3">
              <div className="flex items-center justify-between text-white/60 text-sm mb-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = Number(e.target.value);
                  }
                }}
                className="w-full"
              />
            </div>
          </div>

          {/* Tools Panel */}
          <div className="w-80 bg-[#0b141a] p-4 space-y-5 overflow-y-auto">
            {/* Playback Speed */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-3">Playback Speed: {playbackSpeed}x</p>
              <div className="grid grid-cols-4 gap-2">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-2 rounded-lg text-sm transition-colors ${
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

            {/* Reverse */}
            <button
              onClick={handleReverse}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                isReversed ? 'bg-[#00a884] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Rewind size={18} />
              <span>Reverse Video</span>
            </button>

            {/* Volume Control */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-3">Volume: {Math.round(volume * 100)}%</p>
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-white/60" />
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

            {/* Fade In/Out */}
            <div className="space-y-3">
              <div>
                <p className="text-white/60 text-xs uppercase mb-2">Fade In: {fadeIn}s</p>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={fadeIn}
                  onChange={(e) => setFadeIn(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase mb-2">Fade Out: {fadeOut}s</p>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={fadeOut}
                  onChange={(e) => setFadeOut(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Add Music */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-3">Background Music</p>
              <label className="flex flex-col items-center gap-2 p-3 border-2 border-dashed border-white/30 rounded-lg hover:border-white/60 cursor-pointer mb-2">
                <Music size={20} className="text-white/50" />
                <span className="text-white/70 text-sm">Upload Music</span>
                <input type="file" accept="audio/*" onChange={handleMusicUpload} className="hidden" />
              </label>
              {selectedMusic && (
                <div>
                  <p className="text-white/60 text-xs uppercase mb-2">Music Volume: {Math.round(musicVolume * 100)}%</p>
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

            {/* Transitions */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-3">Transition Effect</p>
              <div className="grid grid-cols-3 gap-2">
                {transitions.map((trans) => (
                  <button
                    key={trans.id}
                    onClick={() => setTransition(trans.id)}
                    className={`px-2 py-2 rounded-lg text-xs transition-colors ${
                      transition === trans.id
                        ? 'bg-[#00a884] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {trans.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Tools */}
            <div className="space-y-2">
              <p className="text-white/60 text-xs uppercase mb-2">Advanced Tools</p>
              <button
                onClick={handleTrim}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
              >
                <Scissors size={16} />
                <span>Trim Video</span>
              </button>
              <button
                onClick={handleSplit}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
              >
                <Layers size={16} />
                <span>Split Video</span>
              </button>
              <button
                onClick={handleMerge}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
              >
                <Layers size={16} />
                <span>Merge Videos</span>
              </button>
              <button
                onClick={handleVoiceChanger}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
              >
                <Mic size={16} />
                <span>Voice Changer</span>
              </button>
            </div>

            {/* Note */}
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/60 text-xs">
                Note: Advanced video processing (trim, split, merge, voice changer) requires server-side processing or WebAssembly libraries.
              </p>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoToolsPanel;
