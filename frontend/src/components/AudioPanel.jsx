import React, { useState, useRef, useEffect } from 'react';
import { X, Music, Mic, Volume2, Play, Pause, Upload, Trash2, Plus } from 'lucide-react';

const AudioPanel = ({ onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('music');
  const [backgroundMusic, setBackgroundMusic] = useState(null);
  const [voiceOver, setVoiceOver] = useState(null);
  const [soundEffects, setSoundEffects] = useState([]);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [voiceVolume, setVoiceVolume] = useState(0.8);
  const [effectsVolume, setEffectsVolume] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const presetMusic = [
    { id: 'upbeat', name: 'Upbeat Pop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 'chill', name: 'Chill Lo-Fi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { id: 'dramatic', name: 'Dramatic', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { id: 'happy', name: 'Happy', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
    { id: 'romantic', name: 'Romantic', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
    { id: 'epic', name: 'Epic', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' }
  ];

  const presetEffects = [
    { id: 'applause', name: 'Applause', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
    { id: 'laugh', name: 'Laugh Track', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
    { id: 'whoosh', name: 'Whoosh', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
    { id: 'ding', name: 'Ding', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
    { id: 'pop', name: 'Pop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3' },
    { id: 'click', name: 'Click', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' }
  ];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  const handleMusicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBackgroundMusic({ name: file.name, url });
    }
  };

  const handleVoiceOverUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVoiceOver({ name: file.name, url });
    }
  };

  const handleEffectUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSoundEffects([...soundEffects, { name: file.name, url }]);
    }
  };

  const handleAddPresetEffect = (effect) => {
    setSoundEffects([...soundEffects, { name: effect.name, url: effect.url || '' }]);
  };

  const handleRemoveEffect = (index) => {
    setSoundEffects(soundEffects.filter((_, i) => i !== index));
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      try {
        mediaRecorderRef.current?.stop();
        clearInterval(recordTimerRef.current);
        setIsRecording(false);
        setRecordTime(0);
      } catch (e) {
        console.error('Failed to stop recording:', e);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0) {
          setVoiceOver({ name: `Recording-${Date.now()}.webm`, url: URL.createObjectURL(blob) });
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);
      recordTimerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    } catch (e) {
      console.error('Failed to start recording:', e);
      alert('Microphone access is required to record. Please check your permissions.');
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        backgroundMusic,
        voiceOver,
        soundEffects,
        musicVolume,
        voiceVolume,
        effectsVolume
      });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Music className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Audio Tools</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('music')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'music'
                ? 'bg-[#00a884] text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Music size={16} className="inline mr-2" />
            Background Music
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'voice'
                ? 'bg-[#00a884] text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Mic size={16} className="inline mr-2" />
            Voice Over
          </button>
          <button
            onClick={() => setActiveTab('effects')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'effects'
                ? 'bg-[#00a884] text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Volume2 size={16} className="inline mr-2" />
            Sound Effects
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'music' && (
            <div className="space-y-6">
              {/* Upload Custom Music */}
              <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-white/30 rounded-xl hover:border-white/60 cursor-pointer">
                <Upload size={32} className="text-white/50" />
                <span className="text-white/70">Upload Background Music</span>
                <input type="file" accept="audio/*" onChange={handleMusicUpload} className="hidden" />
              </label>

              {/* Preset Music */}
              <div>
                <p className="text-white/60 text-sm mb-3">Preset Music</p>
                <div className="grid grid-cols-2 gap-2">
                  {presetMusic.map((music) => (
                    <button
                      key={music.id}
                      onClick={() => setBackgroundMusic(music)}
                      className={`px-4 py-3 rounded-lg text-sm transition-colors ${
                        backgroundMusic?.id === music.id
                          ? 'bg-[#00a884] text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {music.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Music Player */}
              {backgroundMusic && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">{backgroundMusic.name}</span>
                    <button
                      onClick={() => setBackgroundMusic(null)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <audio
                    ref={audioRef}
                    src={backgroundMusic.url}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="hidden"
                  />
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePlayPause}
                      className="p-2 bg-[#00a884] rounded-full text-white"
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-white/60 text-xs mb-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={(e) => {
                          if (audioRef.current) {
                            audioRef.current.currentTime = Number(e.target.value);
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-white/60 text-xs mb-2">Music Volume: {Math.round(musicVolume * 100)}%</p>
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
                </div>
              )}
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              {/* Upload Voice Over */}
              <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-white/30 rounded-xl hover:border-white/60 cursor-pointer">
                <Mic size={32} className="text-white/50" />
                <span className="text-white/70">Upload Voice Over</span>
                <input type="file" accept="audio/*" onChange={handleVoiceOverUpload} className="hidden" />
              </label>

              {/* Voice Over Controls */}
              {voiceOver && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">{voiceOver.name}</span>
                    <button
                      onClick={() => setVoiceOver(null)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div>
                    <p className="text-white/60 text-xs mb-2">Voice Volume: {Math.round(voiceVolume * 100)}%</p>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Record Voice Note */}
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/60 text-sm mb-3">Record Voice Note</p>
                <button
                  onClick={handleRecordToggle}
                  className={`w-full px-4 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 ${
                    isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-[#00a884] hover:bg-[#008f6f]'
                  }`}
                >
                  {isRecording ? <Pause size={18} /> : <Mic size={18} />}
                  <span>{isRecording ? `Stop Recording ${Math.floor(recordTime / 60)}:${String(recordTime % 60).padStart(2, '0')}` : 'Start Recording'}</span>
                </button>
                <p className="text-white/40 text-xs mt-2">
                  Note: Voice recording requires microphone access and MediaRecorder API
                </p>
              </div>
            </div>
          )}

          {activeTab === 'effects' && (
            <div className="space-y-6">
              {/* Upload Custom Effect */}
              <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-white/30 rounded-xl hover:border-white/60 cursor-pointer">
                <Plus size={32} className="text-white/50" />
                <span className="text-white/70">Upload Sound Effect</span>
                <input type="file" accept="audio/*" onChange={handleEffectUpload} className="hidden" />
              </label>

              {/* Preset Effects */}
              <div>
                <p className="text-white/60 text-sm mb-3">Preset Effects</p>
                <div className="grid grid-cols-3 gap-2">
                  {presetEffects.map((effect) => (
                    <button
                      key={effect.id}
                      onClick={() => handleAddPresetEffect(effect)}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
                    >
                      {effect.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Added Effects */}
              {soundEffects.length > 0 && (
                <div>
                  <p className="text-white/60 text-sm mb-3">Added Effects</p>
                  <div className="space-y-2">
                    {soundEffects.map((effect, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                      >
                        <span className="text-white text-sm">{effect.name}</span>
                        <button
                          onClick={() => handleRemoveEffect(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Effects Volume */}
              {soundEffects.length > 0 && (
                <div>
                  <p className="text-white/60 text-xs mb-2">Effects Volume: {Math.round(effectsVolume * 100)}%</p>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={effectsVolume}
                    onChange={(e) => setEffectsVolume(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
          >
            Apply Audio
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioPanel;
