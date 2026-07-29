import React, { useState, useEffect } from 'react';
import { X, Mic, Volume2, Sliders, Play, Pause, RefreshCw, Zap } from 'lucide-react';

const VoiceChangerPanel = ({ onClose, onApplyEffect }) => {
  const [selectedEffect, setSelectedEffect] = useState('normal');
  const [pitch, setPitch] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);

  const voiceEffects = [
    { id: 'normal', label: 'Normal', icon: Mic },
    { id: 'robot', label: 'Robot', icon: Zap },
    { id: 'deep', label: 'Deep Voice', icon: Volume2 },
    { id: 'high', label: 'High Pitch', icon: Mic },
    { id: 'slow', label: 'Slow Motion', icon: Sliders },
    { id: 'fast', label: 'Fast Forward', icon: Zap },
    { id: 'echo', label: 'Echo', icon: Volume2 },
    { id: 'reverb', label: 'Reverb', icon: Volume2 },
    { id: 'chipmunk', label: 'Chipmunk', icon: Mic },
    { id: 'monster', label: 'Monster', icon: Zap }
  ];

  const handleRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Stop recording after 5 seconds
      setTimeout(() => {
        mediaRecorder.stop();
        setIsRecording(false);
      }, 5000);
    } catch (error) {
      console.error('Error recording:', error);
    }
  };

  const handlePlay = () => {
    if (!audioBlob) return;
    
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.play();
  };

  const handleApply = () => {
    if (onApplyEffect && audioBlob) {
      onApplyEffect({
        effect: selectedEffect,
        pitch,
        speed,
        volume,
        audioBlob
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Mic className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Voice Changer</h2>
              <p className="text-white/60 text-xs">Modify your voice effects</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Voice Effects */}
          <div>
            <p className="text-white/60 text-xs mb-3 uppercase">Voice Effects</p>
            <div className="grid grid-cols-5 gap-2">
              {voiceEffects.map((effect) => {
                const Icon = effect.icon;
                return (
                  <button
                    key={effect.id}
                    onClick={() => setSelectedEffect(effect.id)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                      selectedEffect === effect.id
                        ? 'bg-[#00a884] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-xs">{effect.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pitch Control */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/60 text-xs">Pitch</p>
              <span className="text-white text-sm">{pitch.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Speed Control */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/60 text-xs">Speed</p>
              <span className="text-white text-sm">{speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Volume Control */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/60 text-xs">Volume</p>
              <span className="text-white text-sm">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Recording */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-medium">Record Voice</p>
              {audioBlob && (
                <button
                  onClick={handlePlay}
                  className="text-[#00a884] flex items-center gap-1"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
              )}
            </div>
            <button
              onClick={handleRecord}
              disabled={isRecording}
              className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isRecording ? (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  Recording...
                </>
              ) : (
                <>
                  <Mic size={20} />
                  Record
                </>
              )}
            </button>
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              setSelectedEffect('normal');
              setPitch(1);
              setSpeed(1);
              setVolume(1);
              setAudioBlob(null);
            }}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw size={20} />
            Reset
          </button>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleApply}
            disabled={!audioBlob}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Voice Effect
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceChangerPanel;
