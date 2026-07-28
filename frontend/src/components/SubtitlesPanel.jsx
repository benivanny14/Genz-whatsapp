import React, { useState, useRef, useEffect } from 'react';
import { X, Subtitles, Languages, Mic, FileText, Plus, Trash2, Play, Pause } from 'lucide-react';

const SubtitlesPanel = ({ onClose, video, onSave }) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState({ text: '', startTime: 0, endTime: 0 });
  const [autoCaptionEnabled, setAutoCaptionEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'sw', name: 'Swahili' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'zh', name: 'Chinese' }
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

  const handleAddSubtitle = () => {
    if (currentSubtitle.text.trim()) {
      setSubtitles([...subtitles, { ...currentSubtitle, id: Date.now() }]);
      setCurrentSubtitle({ text: '', startTime: currentTime, endTime: currentTime + 3 });
    }
  };

  const handleDeleteSubtitle = (id) => {
    setSubtitles(subtitles.filter(sub => sub.id !== id));
  };

  const handleEditSubtitle = (id, field, value) => {
    setSubtitles(subtitles.map(sub => 
      sub.id === id ? { ...sub, [field]: value } : sub
    ));
  };

  const handleAutoCaption = () => {
    setAutoCaptionEnabled(!autoCaptionEnabled);
    // Auto-caption requires speech recognition API
    if (!autoCaptionEnabled) {
      console.log('Auto-caption requires Web Speech API integration');
    }
  };

  const handleTranslate = () => {
    // Translation requires translation API
    console.log('Translation requires translation API integration (Google Translate, DeepL, etc.)');
  };

  const handleExportSubtitles = () => {
    const srtContent = subtitles.map((sub, index) => {
      return `${index + 1}\n${formatSRTTime(sub.startTime)} --> ${formatSRTTime(sub.endTime)}\n${sub.text}\n`;
    }).join('\n');
    
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    a.click();
  };

  const formatSRTTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ subtitles, targetLanguage });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Subtitles className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Subtitles & Translation</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'manual'
                ? 'bg-[#00a884] text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <FileText size={16} className="inline mr-2" />
            Manual
          </button>
          <button
            onClick={() => setActiveTab('auto')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'auto'
                ? 'bg-[#00a884] text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Mic size={16} className="inline mr-2" />
            Auto-Caption
          </button>
          <button
            onClick={() => setActiveTab('translate')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'translate'
                ? 'bg-[#00a884] text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Languages size={16} className="inline mr-2" />
            Translate
          </button>
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
            
            {/* Subtitle Overlay */}
            {subtitles.length > 0 && (
              <div className="w-full mt-4 bg-white/10 rounded-lg p-3">
                <div className="flex items-center justify-between text-white/60 text-sm mb-2">
                  <span>Timeline</span>
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
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
            )}
          </div>

          {/* Tools Panel */}
          <div className="w-96 bg-[#0b141a] p-4 space-y-4 overflow-y-auto">
            {activeTab === 'manual' && (
              <div className="space-y-4">
                {/* Add Subtitle */}
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-xs uppercase mb-3">Add Subtitle</p>
                  <textarea
                    value={currentSubtitle.text}
                    onChange={(e) => setCurrentSubtitle({ ...currentSubtitle, text: e.target.value })}
                    placeholder="Enter subtitle text..."
                    className="w-full bg-white/10 text-white p-3 rounded-lg resize-none h-20 outline-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <div className="flex-1">
                      <p className="text-white/60 text-xs mb-1">Start: {formatTime(currentSubtitle.startTime)}</p>
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentSubtitle.startTime}
                        onChange={(e) => setCurrentSubtitle({ ...currentSubtitle, startTime: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-white/60 text-xs mb-1">End: {formatTime(currentSubtitle.endTime)}</p>
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentSubtitle.endTime}
                        onChange={(e) => setCurrentSubtitle({ ...currentSubtitle, endTime: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddSubtitle}
                    className="w-full mt-3 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white text-sm flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add Subtitle
                  </button>
                </div>

                {/* Subtitle List */}
                <div>
                  <p className="text-white/60 text-xs uppercase mb-3">Subtitles ({subtitles.length})</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {subtitles.map((sub) => (
                      <div key={sub.id} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <input
                            type="text"
                            value={sub.text}
                            onChange={(e) => handleEditSubtitle(sub.id, 'text', e.target.value)}
                            className="flex-1 bg-transparent text-white text-sm outline-none"
                          />
                          <button
                            onClick={() => handleDeleteSubtitle(sub.id)}
                            className="text-red-400 hover:text-red-300 ml-2"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex gap-2 text-white/40 text-xs">
                          <span>{formatTime(sub.startTime)}</span>
                          <span>-</span>
                          <span>{formatTime(sub.endTime)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export */}
                <button
                  onClick={handleExportSubtitles}
                  disabled={subtitles.length === 0}
                  className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export as SRT
                </button>
              </div>
            )}

            {activeTab === 'auto' && (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-xs uppercase mb-3">Auto-Caption</p>
                  <button
                    onClick={handleAutoCaption}
                    className={`w-full px-4 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 ${
                      autoCaptionEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-[#00a884] hover:bg-[#008f6f]'
                    }`}
                  >
                    <Mic size={18} />
                    {autoCaptionEnabled ? 'Stop Auto-Caption' : 'Start Auto-Caption'}
                  </button>
                  <p className="text-white/40 text-xs mt-2">
                    Uses Web Speech API for real-time speech recognition
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-xs uppercase mb-3">Settings</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-white text-sm mb-2">Language</p>
                      <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="w-full bg-white/10 text-white p-2 rounded border border-white/20"
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-xs uppercase mb-2">Note</p>
                  <p className="text-white/40 text-xs">
                    Auto-caption works best with clear audio and may require browser support for Web Speech API.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'translate' && (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-xs uppercase mb-3">Translate Subtitles</p>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-white text-sm mb-2">Source Language</p>
                      <select
                        className="w-full bg-white/10 text-white p-2 rounded border border-white/20"
                      >
                        <option value="auto">Auto Detect</option>
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <p className="text-white text-sm mb-2">Target Language</p>
                      <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="w-full bg-white/10 text-white p-2 rounded border border-white/20"
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleTranslate}
                    disabled={subtitles.length === 0}
                    className="w-full mt-4 px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Translate All Subtitles
                  </button>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white/60 text-xs uppercase mb-2">Note</p>
                  <p className="text-white/40 text-xs">
                    Translation requires integration with translation APIs like Google Translate, DeepL, or Microsoft Translator.
                  </p>
                </div>
              </div>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
            >
              Apply Subtitles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubtitlesPanel;
