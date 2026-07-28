import React, { useState } from 'react';
import { X, Eye, Ear, Zap, Contrast, Type, Image as ImageIcon, Volume2, CheckCircle } from 'lucide-react';

const AccessibilityPanel = ({ onClose, content, onSave }) => {
  const [altText, setAltText] = useState('');
  const [autoAltText, setAutoAltText] = useState(false);
  const [audioDescription, setAudioDescription] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState('medium');
  const [captionsEnabled, setCaptionsEnabled] = useState(true);

  const fontSizes = [
    { id: 'small', label: 'Small', size: '14px' },
    { id: 'medium', label: 'Medium', size: '16px' },
    { id: 'large', label: 'Large', size: '18px' },
    { id: 'xlarge', label: 'Extra Large', size: '20px' }
  ];

  const generateAutoAltText = () => {
    // Simulate AI-generated alt text (in production, this would use vision AI)
    setAutoAltText(true);
    const generatedText = "A status showing a person with a bright smile, wearing casual clothing, standing outdoors with natural lighting. The image has a warm, friendly tone.";
    setAltText(generatedText);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        altText,
        autoAltText,
        audioDescription,
        reduceMotion,
        highContrast,
        fontSize,
        captionsEnabled
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
            <h2 className="text-white text-lg font-semibold">Accessibility</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Alt Text */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-[#00a884]" />
                <h3 className="text-white font-medium">Alt Text</h3>
              </div>
              <button
                onClick={generateAutoAltText}
                className="text-[#00a884] hover:text-[#008f6f] text-sm flex items-center gap-1"
              >
                <Zap size={14} />
                Auto-Generate
              </button>
            </div>
            <textarea
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image for screen readers..."
              className="w-full bg-white/10 text-white p-3 rounded-lg outline-none resize-none h-24 placeholder-white/40"
            />
            {autoAltText && (
              <div className="mt-2 flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle size={14} />
                <span>AI-generated alt text applied</span>
              </div>
            )}
          </div>

          {/* Audio Description */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 size={18} className="text-[#00a884]" />
              <h3 className="text-white font-medium">Audio Description</h3>
            </div>
            <textarea
              value={audioDescription}
              onChange={(e) => setAudioDescription(e.target.value)}
              placeholder="Describe visual elements for audio-only playback..."
              className="w-full bg-white/10 text-white p-3 rounded-lg outline-none resize-none h-24 placeholder-white/40"
            />
            <p className="text-white/40 text-xs mt-2">
              Audio description helps visually impaired users understand visual content in videos.
            </p>
          </div>

          {/* Motion Settings */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-[#00a884]" />
              <h3 className="text-white font-medium">Motion Settings</h3>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white">Reduce Motion</p>
                <p className="text-white/60 text-sm">Minimize animations and transitions</p>
              </div>
              <button
                onClick={() => setReduceMotion(!reduceMotion)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  reduceMotion ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    reduceMotion ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Visual Settings */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Contrast size={18} className="text-[#00a884]" />
              <h3 className="text-white font-medium">Visual Settings</h3>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white">High Contrast</p>
                <p className="text-white/60 text-sm">Increase contrast for better visibility</p>
              </div>
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  highContrast ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    highContrast ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <p className="text-white mb-3">Font Size</p>
              <div className="grid grid-cols-4 gap-2">
                {fontSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setFontSize(size.id)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      fontSize === size.id
                        ? 'bg-[#00a884] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                    style={{ fontSize: size.size }}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Caption Settings */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ear size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Auto-Captions</p>
                  <p className="text-white/60 text-sm">Generate captions for video content</p>
                </div>
              </div>
              <button
                onClick={() => setCaptionsEnabled(!captionsEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  captionsEnabled ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    captionsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Accessibility Guidelines */}
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-white/60 text-xs">
              <Type size={14} className="inline mr-1" />
              These settings help make your content accessible to users with disabilities, following WCAG 2.1 guidelines.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
          >
            Apply Accessibility Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityPanel;
