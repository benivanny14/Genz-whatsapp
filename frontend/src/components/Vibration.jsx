import React, { useState } from 'react';
import { Smartphone, X, Check, RefreshCw, Zap, Vibrate } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Vibration = ({ currentPattern, patterns, onSelect, onTest, onClose }) => {
  const [selectedPattern, setSelectedPattern] = useState(currentPattern || 'default');
  const [isTesting, setIsTesting] = useState(false);

  const vibrationPatterns = [
    { id: 'off', name: 'Off', description: 'No vibration', icon: Vibrate },
    { id: 'default', name: 'Default', description: 'Standard vibration', icon: Vibrate },
    { id: 'short', name: 'Short', description: 'Quick pulse', icon: Zap },
    { id: 'long', name: 'Long', description: 'Extended vibration', icon: Vibrate },
    { id: 'heartbeat', name: 'Heartbeat', description: 'Rhythmic pattern', icon: Vibrate },
    { id: 'custom', name: 'Custom', description: 'Create your own', icon: RefreshCw },
  ];

  const handleSelect = (patternId) => {
    setSelectedPattern(patternId);
    if (onSelect) {
      onSelect(patternId);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    if (navigator.vibrate) {
      const pattern = vibrationPatterns.find(p => p.id === selectedPattern);
      if (pattern?.id === 'short') {
        navigator.vibrate(100);
      } else if (pattern?.id === 'long') {
        navigator.vibrate(500);
      } else if (pattern?.id === 'heartbeat') {
        navigator.vibrate([100, 50, 100]);
      } else {
        navigator.vibrate(200);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsTesting(false);
    if (onTest) {
      onTest(selectedPattern);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Smartphone className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Vibration</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Vibration Patterns */}
        <div className="space-y-2 mb-4">
          {vibrationPatterns.map(pattern => {
            const PatternIcon = pattern.icon;
            return (
              <button
                key={pattern.id}
                onClick={() => handleSelect(pattern.id)}
                className={`w-full p-4 rounded-lg text-left transition-all flex items-center justify-between ${
                  selectedPattern === pattern.id
                    ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                    : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <PatternIcon size={18} className="text-gray-400" />
                  <div>
                    <p className="text-white">{pattern.name}</p>
                    <p className="text-gray-400 text-xs">{pattern.description}</p>
                  </div>
                </div>
                {selectedPattern === pattern.id && <Check size={18} className="text-[#00a884]" />}
              </button>
            );
          })}
        </div>

        {/* Test Button */}
        {selectedPattern !== 'off' && (
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-[#00a884]/30"
          >
            {isTesting ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Testing...
              </>
            ) : (
              <>
                <Vibrate size={18} />
                Test Vibration
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
};

// Vibration Settings Component
export const VibrationSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Vibrate size={18} className="text-[#00a884]" />
            Vibration
          </p>
          <p className="text-gray-400 text-sm">Haptic feedback</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, vibrationEnabled: !settings.vibrationEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.vibrationEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.vibrationEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Vibration intensity</p>
            <select
              value={settings.vibrationIntensity || 'medium'}
              onChange={(e) => onUpdate({ ...settings, vibrationIntensity: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Vibrate on messages</p>
              <p className="text-gray-400 text-xs">Vibrate for new messages</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, vibrateOnMessages: !settings.vibrateOnMessages })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.vibrateOnMessages ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.vibrateOnMessages ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Vibrate on calls</p>
              <p className="text-gray-400 text-xs">Vibrate for incoming calls</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, vibrateOnCalls: !settings.vibrateOnCalls })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.vibrateOnCalls ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.vibrateOnCalls ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Vibrate in silent mode</p>
              <p className="text-gray-400 text-xs">Vibrate even when silent</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, vibrateInSilent: !settings.vibrateInSilent })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.vibrateInSilent ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.vibrateInSilent ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Vibration Button Component
export const VibrationButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Vibration settings"
    >
      <Vibrate size={18} />
    </button>
  );
};

// Vibration Toggle Component
export const VibrationToggle = ({ isEnabled, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-full transition-colors ${
        isEnabled
          ? 'text-[#00a884] hover:bg-[#00a884]/10'
          : 'text-gray-400 hover:text-white'
      }`}
      title={isEnabled ? 'Vibration on' : 'Vibration off'}
    >
      <Vibrate size={18} />
    </button>
  );
};

// Vibration Intensity Slider Component
export const VibrationIntensitySlider = ({ intensity, onChange }) => {
  return (
    <div className="flex items-center gap-3">
      <Vibrate size={16} className="text-gray-400" />
      <input
        type="range"
        min="0"
        max="100"
        value={intensity}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 accent-[#00a884]"
      />
      <span className="text-gray-400 text-xs w-12">{intensity}%</span>
    </div>
  );
};

export default Vibration;
