import React, { useState } from 'react';
import { X, Eye, Keyboard, BookOpen, Palette } from 'lucide-react';

const AccessibilityAdvancedPanel = ({ onClose, onSave }) => {
  const [colorBlindMode, setColorBlindMode] = useState('none');
  const [switchAccessEnabled, setSwitchAccessEnabled] = useState(false);
  const [brailleSupportEnabled, setBrailleSupportEnabled] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);

  const colorBlindModes = [
    { id: 'none', label: 'None', description: 'No color adjustment' },
    { id: 'protanopia', label: 'Protanopia', description: 'Red-Blind' },
    { id: 'deuteranopia', label: 'Deuteranopia', description: 'Green-Blind' },
    { id: 'tritanopia', label: 'Tritanopia', description: 'Blue-Blind' },
    { id: 'achromatopsia', label: 'Achromatopsia', description: 'Monochromacy' }
  ];

  const handleSave = () => {
    if (onSave) {
      onSave({
        colorBlindMode,
        switchAccessEnabled,
        brailleSupportEnabled,
        highContrastMode
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Eye className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Advanced Accessibility</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Color Blind Mode */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={18} className="text-[#00a884]" />
              <h3 className="text-white font-medium">Color Blind Mode</h3>
            </div>
            <div className="space-y-2">
              {colorBlindModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setColorBlindMode(mode.id)}
                  className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                    colorBlindMode === mode.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <p className="font-medium">{mode.label}</p>
                  <p className="text-xs opacity-70">{mode.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Switch Access */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Switch Access</p>
                  <p className="text-white/50 text-sm">Navigate with keyboard/switch</p>
                </div>
              </div>
              <button
                onClick={() => setSwitchAccessEnabled(!switchAccessEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  switchAccessEnabled ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    switchAccessEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {switchAccessEnabled && (
              <div className="mt-4 space-y-2">
                <p className="text-white/60 text-sm">Switch Controls:</p>
                <div className="space-y-1">
                  <p className="text-white/40 text-xs">Tab - Navigate</p>
                  <p className="text-white/40 text-xs">Enter/Space - Select</p>
                  <p className="text-white/40 text-xs">Esc - Close/Back</p>
                  <p className="text-white/40 text-xs">Arrow Keys - Move</p>
                </div>
              </div>
            )}
          </div>

          {/* Braille Support */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Braille Support</p>
                  <p className="text-white/50 text-sm">Braille display compatibility</p>
                </div>
              </div>
              <button
                onClick={() => setBrailleSupportEnabled(!brailleSupportEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  brailleSupportEnabled ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    brailleSupportEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {brailleSupportEnabled && (
              <div className="mt-4">
                <p className="text-white/60 text-sm">Compatible with:</p>
                <div className="space-y-1 mt-2">
                  <p className="text-white/40 text-xs">• Refreshable Braille Displays</p>
                  <p className="text-white/40 text-xs">• Braille Keyboards</p>
                  <p className="text-white/40 text-xs">• Screen Readers with Braille Output</p>
                </div>
              </div>
            )}
          </div>

          {/* High Contrast Mode */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">High Contrast Mode</p>
                  <p className="text-white/50 text-sm">Increase contrast for visibility</p>
                </div>
              </div>
              <button
                onClick={() => setHighContrastMode(!highContrastMode)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  highContrastMode ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    highContrastMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
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

export default AccessibilityAdvancedPanel;
