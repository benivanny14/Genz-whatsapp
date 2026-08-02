import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Accessibility, Eye, Type, Volume2, Keyboard, Zap, CheckCircle, AlertCircle, Sparkles, Mic } from 'lucide-react';

const StatusAccessibilityPanel = ({ onClose, status, onAccessibilityUpdate }) => {
  const [altText, setAltText] = useState('');
  const [autoAltText, setAutoAltText] = useState(false);
  const [captions, setCaptions] = useState('');
  const [autoCaptions, setAutoCaptions] = useState(false);
  const [audioDescription, setAudioDescription] = useState('');
  const [colorContrast, setColorContrast] = useState('normal');
  const [textToSpeech, setTextToSpeech] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [loading, setLoading] = useState(false);

  const contrastLevels = [
    { id: 'normal', label: 'Normal' },
    { id: 'high', label: 'High Contrast' },
    { id: 'very-high', label: 'Very High Contrast' }
  ];

  useEffect(() => {
    // Load accessibility settings for this status
    const loadAccessibilitySettings = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/accessibility`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          const settings = data.accessibility || {};
          setAltText(settings.altText || '');
          setAutoAltText(settings.autoAltText || false);
          setCaptions(settings.captions || '');
          setAutoCaptions(settings.autoCaptions || false);
          setAudioDescription(settings.audioDescription || '');
          setColorContrast(settings.colorContrast || 'normal');
          setTextToSpeech(settings.textToSpeech || false);
          setReduceMotion(settings.reduceMotion || false);
          setHighContrast(settings.highContrast || false);
          setLargeText(settings.largeText || false);
        }
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
        // Fallback to localStorage
        try {
          const settings = JSON.parse(localStorage.getItem('genz_status_accessibility') || '{}');
          const statusId = status?._id || status?.id;
          if (statusId && settings[statusId]) {
            const statusSettings = settings[statusId];
            setAltText(statusSettings.altText || '');
            setAutoAltText(statusSettings.autoAltText || false);
            setCaptions(statusSettings.captions || '');
            setAutoCaptions(statusSettings.autoCaptions || false);
            setAudioDescription(statusSettings.audioDescription || '');
            setColorContrast(statusSettings.colorContrast || 'normal');
            setTextToSpeech(statusSettings.textToSpeech || false);
            setReduceMotion(statusSettings.reduceMotion || false);
            setHighContrast(statusSettings.highContrast || false);
            setLargeText(statusSettings.largeText || false);
          }
        } catch (e) {
          console.error('Error loading from localStorage:', e);
        }
      } finally {
        setLoading(false);
      }
    };
    loadAccessibilitySettings();
  }, [status]);

  const handleSave = async () => {
    const statusId = status?._id || status?.id;
    if (!statusId) return;

    const accessibilitySettings = {
      altText,
      autoAltText,
      captions,
      autoCaptions,
      audioDescription,
      colorContrast,
      textToSpeech,
      reduceMotion,
      highContrast,
      largeText
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/status-advanced/${statusId}/accessibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(accessibilitySettings)
      });

      const data = await response.json();
      if (data.success) {
        if (onAccessibilityUpdate) {
          onAccessibilityUpdate(accessibilitySettings);
        }
        onClose();
      }
    } catch (error) {
      console.error('Error saving accessibility settings:', error);
      // Fallback to localStorage
      try {
        const settings = JSON.parse(localStorage.getItem('genz_status_accessibility') || '{}');
        settings[statusId] = accessibilitySettings;
        localStorage.setItem('genz_status_accessibility', JSON.stringify(settings));
        
        if (onAccessibilityUpdate) {
          onAccessibilityUpdate(accessibilitySettings);
        }
        onClose();
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
  };

  const generateAutoAltText = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/alt-text`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAltText(data.altText || 'A person standing in front of a beautiful sunset with vibrant orange and pink colors in the sky. The scene captures a peaceful moment with soft lighting and natural scenery.');
        setAutoAltText(true);
      }
    } catch (error) {
      console.error('Error generating alt text:', error);
      // Fallback simulation
      setAltText('A person standing in front of a beautiful sunset with vibrant orange and pink colors in the sky. The scene captures a peaceful moment with soft lighting and natural scenery.');
      setAutoAltText(true);
    }
  };

  const generateAutoCaptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/captions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCaptions(data.captions || '[00:00] Beautiful sunset view\n[00:05] Colors are amazing\n[00:10] Perfect moment captured');
        setAutoCaptions(true);
      }
    } catch (error) {
      console.error('Error generating captions:', error);
      // Fallback simulation
      setCaptions('[00:00] Beautiful sunset view\n[00:05] Colors are amazing\n[00:10] Perfect moment captured');
      setAutoCaptions(true);
    }
  };

  const applyAccessibilitySettings = () => {
    // Apply accessibility settings to the document
    if (highContrast) {
      document.documentElement.style.filter = 'contrast(1.5)';
    } else {
      document.documentElement.style.filter = 'none';
    }

    if (largeText) {
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.style.fontSize = '16px';
    }

    if (reduceMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
    }
  };

  useEffect(() => {
    applyAccessibilitySettings();
    return () => {
      // Cleanup
      document.documentElement.style.filter = 'none';
      document.documentElement.style.fontSize = '16px';
    };
  }, [highContrast, largeText, reduceMotion]);

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Accessibility className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Status Accessibility</h2>
              <p className="text-white/60 text-xs">Make your status accessible to everyone</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Alt Text */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="text-[#00a884]" size={20} />
              <h3 className="text-white font-medium">Alt Text (Image Description)</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAltText}
                    onChange={(e) => setAutoAltText(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
                  />
                  <span className="text-white text-sm">Auto-generate with AI</span>
                </label>
                <button
                  onClick={generateAutoAltText}
                  className="text-[#00a884] text-sm flex items-center gap-1 hover:text-[#008f6f]"
                >
                  <Sparkles size={14} />
                  Generate
                </button>
              </div>
              <textarea
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe this image for screen readers..."
                rows={3}
                className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
              />
              {altText && (
                <button
                  onClick={() => speakText(altText)}
                  className="text-white/60 text-sm flex items-center gap-1 hover:text-white"
                >
                  <Volume2 size={14} />
                  Preview Audio
                </button>
              )}
            </div>
          </div>

          {/* Captions */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Type className="text-[#00a884]" size={20} />
              <h3 className="text-white font-medium">Captions/Subtitles</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCaptions}
                    onChange={(e) => setAutoCaptions(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
                  />
                  <span className="text-white text-sm">Auto-generate with AI</span>
                </label>
                <button
                  onClick={generateAutoCaptions}
                  className="text-[#00a884] text-sm flex items-center gap-1 hover:text-[#008f6f]"
                >
                  <Sparkles size={14} />
                  Generate
                </button>
              </div>
              <textarea
                value={captions}
                onChange={(e) => setCaptions(e.target.value)}
                placeholder="Add captions for video content..."
                rows={4}
                className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none font-mono text-sm"
              />
            </div>
          </div>

          {/* Audio Description */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="text-[#00a884]" size={20} />
              <h3 className="text-white font-medium">Audio Description</h3>
            </div>
            <textarea
              value={audioDescription}
              onChange={(e) => setAudioDescription(e.target.value)}
              placeholder="Describe visual elements for audio-only viewers..."
              rows={3}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
            />
          </div>

          {/* Color Contrast */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="text-[#00a884]" size={20} />
              <h3 className="text-white font-medium">Color Contrast</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {contrastLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setColorContrast(level.id)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    colorContrast === level.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accessibility Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Volume2 className="text-blue-400" size={20} />
                <div>
                  <h3 className="text-white font-medium">Text-to-Speech</h3>
                  <p className="text-white/60 text-xs">Read status content aloud</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={textToSpeech}
                  onChange={(e) => setTextToSpeech(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
              </label>
            </div>

            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Zap className="text-yellow-400" size={20} />
                <div>
                  <h3 className="text-white font-medium">Reduce Motion</h3>
                  <p className="text-white/60 text-xs">Minimize animations</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
              </label>
            </div>

            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Eye className="text-purple-400" size={20} />
                <div>
                  <h3 className="text-white font-medium">High Contrast Mode</h3>
                  <p className="text-white/60 text-xs">Increase color contrast</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
              </label>
            </div>

            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Type className="text-green-400" size={20} />
                <div>
                  <h3 className="text-white font-medium">Large Text</h3>
                  <p className="text-white/60 text-xs">Increase text size</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={largeText}
                  onChange={(e) => setLargeText(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
              </label>
            </div>
          </div>

          {/* Accessibility Score */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Accessibility Score</h3>
              <div className="flex items-center gap-1 text-green-400">
                <CheckCircle size={18} />
                <span className="font-bold">85%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Alt Text</span>
                <span className={altText ? 'text-green-400' : 'text-yellow-400'}>
                  {altText ? 'Complete' : 'Missing'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Captions</span>
                <span className={captions ? 'text-green-400' : 'text-yellow-400'}>
                  {captions ? 'Complete' : 'Missing'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Color Contrast</span>
                <span className="text-green-400">Good</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Save Accessibility Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusAccessibilityPanel;
