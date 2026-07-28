import React, { useState, useRef, useEffect } from 'react';
import { X, Volume2, VolumeX, Sun, Moon, Eye, EyeOff } from 'lucide-react';

const StatusViewingPanel = ({ onClose, video, onSave }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [hideViewers, setHideViewers] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (video && videoRef.current) {
      videoRef.current.src = video;
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [video, volume, isMuted]);

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleVolumeChange = (vol) => {
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      if (vol > 0 && isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const handleBrightnessChange = (value) => {
    setBrightness(value);
    if (videoRef.current) {
      videoRef.current.style.filter = `brightness(${value}%)`;
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        isMuted,
        volume,
        brightness,
        sliderPosition,
        hideViewers
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Eye className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Status Viewing Controls</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Video Preview */}
        <div className="bg-black/50 flex items-center justify-center p-4">
          <video
            ref={videoRef}
            controls
            className="max-w-full max-h-64"
          />
        </div>

        {/* Controls */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Sound Controls */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-4">Sound Controls</h3>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isMuted ? <VolumeX size={18} className="text-white/60" /> : <Volume2 size={18} className="text-white/60" />}
                <span className="text-white/70">Mute Sound</span>
              </div>
              <button
                onClick={handleMuteToggle}
                className={`w-12 h-6 rounded-full transition-colors ${
                  isMuted ? 'bg-red-500' : 'bg-[#00a884]'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    isMuted ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>

            <div>
              <p className="text-white/70 text-sm mb-2">Volume: {Math.round(volume * 100)}%</p>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Brightness Control */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Sun size={18} className="text-[#00a884]" />
              Brightness Control
            </h3>
            
            <div>
              <p className="text-white/70 text-sm mb-2">Brightness: {brightness}%</p>
              <input
                type="range"
                min="50"
                max="150"
                value={brightness}
                onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Slider Position */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-4">Slider Position</h3>
            
            <div>
              <p className="text-white/70 text-sm mb-2">Position: {sliderPosition}%</p>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Viewer List */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Viewer List</p>
                  <p className="text-white/60 text-sm">Show who viewed your status</p>
                </div>
              </div>
              <button
                onClick={() => setHideViewers(!hideViewers)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  hideViewers ? 'bg-red-500' : 'bg-[#00a884]'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    hideViewers ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>
            {hideViewers && (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                <EyeOff size={14} />
                <span>Viewers will be hidden from the list</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
          >
            Apply Viewing Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusViewingPanel;
