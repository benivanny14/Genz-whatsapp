import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Layers, Video, Sliders, Eye, EyeOff, Upload, X, 
  Play, Pause, RefreshCw, Sparkles, Monitor
} from 'lucide-react';

const GlassThemeManager = ({ mods, setMods, onClose }) => {
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(mods?.videoBg || '');
  const [isPlaying, setIsPlaying] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || '';

  // Apply/remove glass mode on body
  useEffect(() => {
    if (mods?.glassMode) {
      document.documentElement.classList.add('glass-mode');
    } else {
      document.documentElement.classList.remove('glass-mode');
    }
    return () => document.documentElement.classList.remove('glass-mode');
  }, [mods?.glassMode]);

  // Wire up video background element
  useEffect(() => {
    const videoBg = document.getElementById('genz-video-bg');
    if (!videoBg) return;
    if (mods?.glassMode && mods?.videoBg && !mods.videoBg.startsWith('blob:')) {
      videoBg.src = mods.videoBg;
      videoBg.style.opacity = String(mods.videoBgOpacity ?? 0.4);
      videoBg.style.filter = `blur(${mods.videoBgBlur ?? 0}px)`;
      videoBg.style.display = 'block';
      videoBg.play().catch(() => {});
    } else {
      videoBg.removeAttribute('src');
      videoBg.load?.();
      videoBg.style.display = 'none';
    }
  }, [mods?.glassMode, mods?.videoBg, mods?.videoBgOpacity, mods?.videoBgBlur]);

  const handleVideoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      alert('Tafadhali chagua faili ya video (mp4, webm, mov)');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      alert('Video haipaswi kuzidi 500MB');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const url = data.fileUrl.startsWith('http') ? data.fileUrl : `${API_URL}${data.fileUrl}`;
        setVideoPreviewUrl(url);
        setMods(prev => ({ ...prev, videoBg: url }));
      } else {
        alert('Video upload failed. Please try again before applying it as a background.');
      }
    } catch {
      alert('Video upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const toggle = useCallback((key) => {
    setMods(prev => ({ ...prev, [key]: !prev[key] }));
  }, [setMods]);

  const presets = [
    { name: 'Ocean Deep', blur: 2, opacity: 0.35, color: 'rgba(0,100,200,0.3)' },
    { name: 'Night City', blur: 0, opacity: 0.45, color: 'rgba(50,0,100,0.3)' },
    { name: 'Matrix', blur: 1, opacity: 0.3, color: 'rgba(0,200,50,0.3)' },
    { name: 'Sunset', blur: 3, opacity: 0.4, color: 'rgba(200,80,0,0.3)' },
  ];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" 
         style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }}>
      <div className="w-full max-w-lg bg-[#0d1f35] rounded-2xl border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Layers size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Glass Theme</h2>
              <p className="text-blue-300 text-xs">Transparent UI + Video Background</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Glass Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-purple-400" />
              <div>
                <p className="text-white font-semibold">Glass Mode</p>
                <p className="text-gray-400 text-xs">UI nzima inakuwa transparent glass</p>
              </div>
            </div>
            <button
              onClick={() => toggle('glassMode')}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                mods?.glassMode
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                  : 'bg-white/10 border border-white/20'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${
                mods?.glassMode ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Video Background */}
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-2 text-blue-300 font-semibold">
              <Video size={18} /> Video Background
            </div>
            <div className="p-4 space-y-3">
              <p className="text-gray-400 text-xs">Upload video (mp4/webm) iwe background ya mfumo mzima</p>
              
              {/* Video Preview */}
              {videoPreviewUrl && (
                <div className="relative rounded-lg overflow-hidden h-32 bg-black">
                  <video
                    ref={videoRef}
                    src={videoPreviewUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                  <button
                    onClick={() => { setVideoPreviewUrl(''); setMods(prev => ({ ...prev, videoBg: '' })); }}
                    className="absolute top-2 right-2 bg-red-500 p-1 rounded-full"
                  >
                    <X size={12} className="text-white" />
                  </button>
                  <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-0.5 rounded">
                    Preview
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-3 border-2 border-dashed border-blue-500/40 rounded-xl text-blue-300 text-sm font-medium hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><RefreshCw size={16} className="animate-spin" /> Inapakia...</>
                ) : (
                  <><Upload size={16} /> Chagua Video (max 500MB)</>
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                hidden
                accept="video/*"
                onChange={(e) => handleVideoUpload(e.target.files[0])}
              />

              {/* URL input alternative */}
              <div>
                <p className="text-gray-500 text-xs mb-1">Au weka URL ya video:</p>
                <input
                  type="text"
                  value={videoPreviewUrl}
                  onChange={(e) => {
                    setVideoPreviewUrl(e.target.value);
                    setMods(prev => ({ ...prev, videoBg: e.target.value }));
                  }}
                  placeholder="https://example.com/video.mp4"
                  className="w-full bg-white/5 border border-white/15 rounded-lg p-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Blur & Opacity Controls */}
          {mods?.glassMode && (
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center gap-2 text-purple-300 font-semibold">
                <Sliders size={18} /> Glass Controls
              </div>
              <div className="p-4 space-y-4">
                {/* Glass Opacity */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400">Glass Opacity</span>
                    <span className="text-purple-300 font-bold">{Math.round((mods?.glassOpacity ?? 0.15) * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0.05" max="0.6" step="0.05"
                    value={mods?.glassOpacity ?? 0.15}
                    onChange={(e) => setMods(prev => ({ ...prev, glassOpacity: parseFloat(e.target.value) }))}
                    className="w-full accent-purple-500"
                  />
                </div>

                {/* Blur Strength */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400">Blur Strength</span>
                    <span className="text-blue-300 font-bold">{mods?.glassBlur ?? 20}px</span>
                  </div>
                  <input
                    type="range" min="0" max="40" step="2"
                    value={mods?.glassBlur ?? 20}
                    onChange={(e) => setMods(prev => ({ ...prev, glassBlur: parseInt(e.target.value) }))}
                    className="w-full accent-blue-500"
                  />
                </div>

                {/* Video Opacity */}
                {mods?.videoBg && (
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-400">Video Opacity</span>
                      <span className="text-green-300 font-bold">{Math.round((mods?.videoBgOpacity ?? 0.4) * 100)}%</span>
                    </div>
                    <input
                      type="range" min="0.1" max="1" step="0.05"
                      value={mods?.videoBgOpacity ?? 0.4}
                      onChange={(e) => setMods(prev => ({ ...prev, videoBgOpacity: parseFloat(e.target.value) }))}
                      className="w-full accent-green-500"
                    />
                  </div>
                )}

                {/* Video Blur */}
                {mods?.videoBg && (
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-400">Video Blur</span>
                      <span className="text-yellow-300 font-bold">{mods?.videoBgBlur ?? 0}px</span>
                    </div>
                    <input
                      type="range" min="0" max="20" step="1"
                      value={mods?.videoBgBlur ?? 0}
                      onChange={(e) => setMods(prev => ({ ...prev, videoBgBlur: parseInt(e.target.value) }))}
                      className="w-full accent-yellow-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Presets */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <p className="text-gray-300 text-sm font-semibold mb-3">Glass Presets</p>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setMods(prev => ({
                    ...prev,
                    glassMode: true,
                    glassBlur: preset.blur * 10,
                    videoBgOpacity: preset.opacity
                  }))}
                  className="p-3 rounded-lg border border-white/10 hover:border-white/30 text-left transition-all"
                  style={{ background: preset.color }}
                >
                  <p className="text-white text-xs font-bold">{preset.name}</p>
                  <p className="text-white/60 text-[10px]">Blur: {preset.blur * 10}px</p>
                </button>
              ))}
            </div>
          </div>

          {/* Apply / Reset */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setMods(prev => ({ ...prev, glassMode: false, videoBg: '', videoBgOpacity: 0.4, glassBlur: 20 }));
                setVideoPreviewUrl('');
              }}
              className="flex-1 py-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl font-semibold text-sm hover:bg-red-500/30 transition-all"
            >
              Reset to Default
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-500/30"
            >
              ✓ Apply Glass Theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlassThemeManager;
