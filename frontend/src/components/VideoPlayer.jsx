import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Settings, Download, Share, Subtitles, RotateCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VideoPlayer = ({ videoUrl, onClose, onDownload, onShare, autoPlay = false }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play();
    }
  }, [autoPlay]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    const seekTime = (e.target.value / 100) * duration;
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleSkip = (seconds) => {
    const video = videoRef.current;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const handleSpeedChange = (speed) => {
    const video = videoRef.current;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!isFullscreen) {
      container.requestFullscreen?.() || container.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onMouseMove={handleMouseMove}
    >
      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="max-w-full max-h-full"
          onClick={togglePlay}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10"
        >
          <X size={24} />
        </button>

        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={togglePlay}
            className="absolute bg-black/50 text-white p-4 rounded-full hover:bg-black/70 transition-colors"
          >
            <Play size={48} fill="white" />
          </motion.button>
        )}

        {/* Controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6"
            >
              {/* Progress Bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(currentTime / duration) * 100 || 0}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00a884] [&::-webkit-slider-thumb]:rounded-full"
                />
                <div className="flex justify-between text-white text-xs mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Skip Back */}
                  <button
                    onClick={() => handleSkip(-10)}
                    className="text-white hover:text-[#00a884] transition-colors"
                  >
                    <SkipBack size={24} />
                  </button>

                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="text-white hover:text-[#00a884] transition-colors"
                  >
                    {isPlaying ? <Pause size={32} /> : <Play size={32} fill="white" />}
                  </button>

                  {/* Skip Forward */}
                  <button
                    onClick={() => handleSkip(10)}
                    className="text-white hover:text-[#00a884] transition-colors"
                  >
                    <SkipForward size={24} />
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-[#00a884] transition-colors"
                    >
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>

                  {/* Time */}
                  <span className="text-white text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Subtitles */}
                  <button
                    onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                    className={`text-white hover:text-[#00a884] transition-colors ${subtitlesEnabled ? 'text-[#00a884]' : ''}`}
                  >
                    <Subtitles size={20} />
                  </button>

                  {/* Settings */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="text-white hover:text-[#00a884] transition-colors"
                    >
                      <Settings size={20} />
                    </button>

                    {/* Settings Menu */}
                    <AnimatePresence>
                      {showSettings && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute bottom-8 right-0 bg-[#1a2e35] rounded-lg p-4 min-w-[150px] shadow-xl"
                        >
                          <p className="text-white text-sm font-medium mb-3">Playback Speed</p>
                          <div className="space-y-2">
                            {speeds.map(speed => (
                              <button
                                key={speed}
                                onClick={() => handleSpeedChange(speed)}
                                className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                                  playbackSpeed === speed
                                    ? 'bg-[#00a884] text-white'
                                    : 'text-gray-300 hover:bg-[#00a884]/20'
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Download */}
                  {onDownload && (
                    <button
                      onClick={onDownload}
                      className="text-white hover:text-[#00a884] transition-colors"
                    >
                      <Download size={20} />
                    </button>
                  )}

                  {/* Share */}
                  {onShare && (
                    <button
                      onClick={onShare}
                      className="text-white hover:text-[#00a884] transition-colors"
                    >
                      <Share size={20} />
                    </button>
                  )}

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-white hover:text-[#00a884] transition-colors"
                  >
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtitles Overlay */}
        {subtitlesEnabled && (
          <div className="absolute bottom-20 left-0 right-0 text-center">
            <div className="inline-block bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
              Sample subtitle text would appear here
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Video Message Component
export const VideoMessage = ({ message, onPlay }) => {
  const [thumbnail, setThumbnail] = useState(null);

  useEffect(() => {
    // Generate thumbnail from video
    if (message.mediaUrl) {
      const video = document.createElement('video');
      video.src = message.mediaUrl;
      video.currentTime = 1;
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        setThumbnail(canvas.toDataURL());
      };
    }
  }, [message.mediaUrl]);

  const duration = message.duration || 0;
  const formattedDuration = `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`;

  return (
    <div className="relative bg-[#0b141a] rounded-lg overflow-hidden max-w-sm cursor-pointer group" onClick={() => onPlay(message)}>
      {/* Thumbnail */}
      {thumbnail ? (
        <img src={thumbnail} alt="Video thumbnail" className="w-full h-48 object-cover" />
      ) : (
        <div className="w-full h-48 bg-[#1a2e35] flex items-center justify-center">
          <Play size={48} className="text-gray-600" />
        </div>
      )}

      {/* Play Button Overlay */}
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-[#00a884]/80 p-4 rounded-full">
          <Play size={32} fill="white" className="text-white" />
        </div>
      </div>

      {/* Duration Badge */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
        {formattedDuration}
      </div>

      {/* Video Indicator */}
      <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
        <RotateCw size={12} />
        Video
      </div>
    </div>
  );
};

// Video Gallery Component
export const VideoGallery = ({ videos, onSelectVideo, onDownload, onShare }) => {
  const [selectedVideo, setSelectedVideo] = useState(null);

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <RotateCw size={20} className="text-[#00a884]" />
        Videos ({videos.length})
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {videos.map(video => (
          <VideoMessage
            key={video._id}
            message={video}
            onPlay={(video) => setSelectedVideo(video)}
          />
        ))}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-12 bg-[#0b141a] rounded-lg">
          <RotateCw className="text-gray-600 mx-auto mb-4" size={48} />
          <p className="text-gray-400">No videos yet</p>
        </div>
      )}

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayer
            videoUrl={selectedVideo.mediaUrl}
            onClose={() => setSelectedVideo(null)}
            onDownload={() => onDownload(selectedVideo)}
            onShare={() => onShare(selectedVideo)}
            autoPlay
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoPlayer;
