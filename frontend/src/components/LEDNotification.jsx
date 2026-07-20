import React, { useState } from 'react';
import { Lightbulb, X, Check, RefreshCw, Zap, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LEDNotification = ({ currentColor, colors, onSelect, onTest, onClose }) => {
  const [selectedColor, setSelectedColor] = useState(currentColor || 'white');
  const [isTesting, setIsTesting] = useState(false);

  const ledColors = [
    { id: 'off', name: 'Off', color: '#374151', icon: Lightbulb },
    { id: 'white', name: 'White', color: '#ffffff', icon: Lightbulb },
    { id: 'blue', name: 'Blue', color: '#3b82f6', icon: Lightbulb },
    { id: 'green', name: 'Green', color: '#22c55e', icon: Lightbulb },
    { id: 'red', name: 'Red', color: '#ef4444', icon: Lightbulb },
    { id: 'yellow', name: 'Yellow', color: '#eab308', icon: Lightbulb },
    { id: 'purple', name: 'Purple', color: '#a855f7', icon: Lightbulb },
    { id: 'cyan', name: 'Cyan', color: '#06b6d4', icon: Lightbulb },
    { id: 'orange', name: 'Orange', color: '#f97316', icon: Lightbulb },
  ];

  const handleSelect = (colorId) => {
    setSelectedColor(colorId);
    if (onSelect) {
      onSelect(colorId);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    if (onTest) {
      onTest(selectedColor);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTesting(false);
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
            <Lightbulb className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">LED Notification</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* LED Colors */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {ledColors.map(color => {
            const ColorIcon = color.icon;
            return (
              <button
                key={color.id}
                onClick={() => handleSelect(color.id)}
                className={`relative rounded-lg p-4 transition-all flex flex-col items-center gap-2 ${
                  selectedColor === color.id
                    ? 'ring-2 ring-[#00a884] ring-offset-2 ring-offset-[#1a2e35]'
                    : 'hover:ring-2 hover:ring-[#00a884]/50'
                }`}
                style={{ backgroundColor: color.id === 'off' ? '#1a2e35' : color.color + '20' }}
              >
                <ColorIcon size={24} style={{ color: color.color }} />
                <span className="text-white text-xs">{color.name}</span>
                {selectedColor === color.id && (
                  <div className="absolute top-2 right-2 bg-[#00a884] rounded-full p-1">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Test Button */}
        {selectedColor !== 'off' && (
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
                <Zap size={18} />
                Test LED
              </>
            )}
          </button>
        )}

        {/* Info */}
        <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
            <p className="text-yellow-500 text-xs">
              LED notifications require device support. Not all devices support LED notifications.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// LED Notification Settings Component
export const LEDNotificationSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Lightbulb size={18} className="text-[#00a884]" />
            LED Notification
          </p>
          <p className="text-gray-400 text-sm">Blinking light alerts</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, ledEnabled: !settings.ledEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.ledEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.ledEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.ledEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">LED color</p>
            <select
              value={settings.ledColor || 'white'}
              onChange={(e) => onUpdate({ ...settings, ledColor: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="white">White</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="red">Red</option>
              <option value="yellow">Yellow</option>
              <option value="purple">Purple</option>
              <option value="cyan">Cyan</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Blink frequency</p>
              <p className="text-gray-400 text-xs">Speed of LED blinking</p>
            </div>
            <select
              value={settings.ledBlinkFrequency || 'normal'}
              onChange={(e) => onUpdate({ ...settings, ledBlinkFrequency: e.target.value })}
              className="bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            >
              <option value="slow">Slow</option>
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Blink on messages</p>
              <p className="text-gray-400 text-xs">LED for new messages</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, ledOnMessages: !settings.ledOnMessages })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.ledOnMessages ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.ledOnMessages ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Blink on calls</p>
              <p className="text-gray-400 text-xs">LED for incoming calls</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, ledOnCalls: !settings.ledOnCalls })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.ledOnCalls ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.ledOnCalls ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Blink in silent mode</p>
              <p className="text-gray-400 text-xs">LED when sound is off</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, ledInSilent: !settings.ledInSilent })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.ledInSilent ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.ledInSilent ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// LED Button Component
export const LEDButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="LED notification"
    >
      <Lightbulb size={18} />
    </button>
  );
};

// LED Indicator Component
export const LEDIndicator = ({ color, isBlinking }) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full ${
          isBlinking ? 'animate-pulse' : ''
        }`}
        style={{ backgroundColor: color === 'off' ? '#374151' : color }}
      />
      <span className="text-gray-400 text-xs capitalize">{color}</span>
    </div>
  );
};

// LED Color Picker Component
export const LEDColorPicker = ({ selectedColor, onSelect }) => {
  const colors = [
    { id: 'white', color: '#ffffff' },
    { id: 'blue', color: '#3b82f6' },
    { id: 'green', color: '#22c55e' },
    { id: 'red', color: '#ef4444' },
    { id: 'yellow', color: '#eab308' },
    { id: 'purple', color: '#a855f7' },
  ];

  return (
    <div className="flex items-center gap-2">
      <Palette size={16} className="text-gray-400" />
      <div className="flex gap-1">
        {colors.map(color => (
          <button
            key={color.id}
            onClick={() => onSelect(color.id)}
            className={`w-6 h-6 rounded-full transition-all ${
              selectedColor === color.id ? 'ring-2 ring-[#00a884] ring-offset-1' : ''
            }`}
            style={{ backgroundColor: color.color }}
          />
        ))}
      </div>
    </div>
  );
};

export default LEDNotification;
