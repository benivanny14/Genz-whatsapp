import React, { useState, useEffect } from 'react';
import { X, Volume2, Play, Pause, RefreshCw, Languages, Zap, Sliders } from 'lucide-react';

const TextToSpeechPanel = ({ onClose, onGenerateSpeech }) => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0) {
        setSelectedVoice(availableVoices[0]);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const handleSpeak = () => {
    if (!text.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onpause = () => setIsPaused(true);
    utterance.onresume = () => setIsPaused(false);

    window.speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleGenerate = () => {
    if (onGenerateSpeech && text.trim()) {
      onGenerateSpeech({
        text,
        voice: selectedVoice?.name,
        rate,
        pitch,
        volume
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
            <Volume2 className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Text to Speech</h2>
              <p className="text-white/60 text-xs">Convert text to voice</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Text Input */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Enter Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste text here..."
              rows={4}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
            />
          </div>

          {/* Voice Selection */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Select Voice</label>
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const voice = voices.find(v => v.name === e.target.value);
                setSelectedVoice(voice || null);
              }}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            >
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name} className="bg-[#1a2e35]">
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Rate Control */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/60 text-xs">Speed</p>
              <span className="text-white text-sm">{rate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full"
            />
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

          {/* Playback Controls */}
          <div className="flex gap-2">
            <button
              onClick={handleSpeak}
              disabled={!text.trim() || isSpeaking}
              className="flex-1 px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play size={20} />
              Speak
            </button>
            <button
              onClick={handlePause}
              disabled={!isSpeaking}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium disabled:opacity-50"
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
            </button>
            <button
              onClick={handleStop}
              disabled={!isSpeaking}
              className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-white font-medium disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              setText('');
              setRate(1);
              setPitch(1);
              setVolume(1);
              handleStop();
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
            onClick={handleGenerate}
            disabled={!text.trim()}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Speech
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextToSpeechPanel;
