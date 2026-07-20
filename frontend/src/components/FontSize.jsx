import React, { useState } from 'react';
import { Type, X, Check, Minus, Plus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FontSize = ({ currentSize, sizes, onSelect, onClose }) => {
  const [selectedSize, setSelectedSize] = useState(currentSize || 'medium');

  const fontSizes = [
    { id: 'small', label: 'Small', value: '14px', icon: Minus },
    { id: 'medium', label: 'Medium', value: '16px', icon: Type },
    { id: 'large', label: 'Large', value: '18px', icon: Plus },
    { id: 'extra_large', label: 'Extra Large', value: '20px', icon: Plus },
  ];

  const handleSelect = (sizeId) => {
    setSelectedSize(sizeId);
    if (onSelect) {
      onSelect(sizeId);
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
            <Type className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Font Size</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Font Size Options */}
        <div className="space-y-2 mb-6">
          {fontSizes.map(size => {
            const SizeIcon = size.icon;
            return (
              <button
                key={size.id}
                onClick={() => handleSelect(size.id)}
                className={`w-full p-4 rounded-lg text-left transition-all flex items-center gap-3 ${
                  selectedSize === size.id
                    ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                    : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
                }`}
              >
                <SizeIcon size={20} className="text-gray-400" />
                <div className="flex-1">
                  <p className="text-white font-medium">{size.label}</p>
                  <p className="text-gray-400 text-sm">{size.value}</p>
                </div>
                {selectedSize === size.id && <Check size={18} className="text-[#00a884]" />}
              </button>
            );
          })}
        </div>

        {/* Preview */}
        <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
          <p className="text-gray-400 text-xs mb-2">Preview</p>
          <p
            className="text-white"
            style={{ fontSize: fontSizes.find(s => s.id === selectedSize)?.value }}
          >
            This is how your text will appear with the selected font size.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// Font Size Settings Component
export const FontSizeSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Type size={18} className="text-[#00a884]" />
            Font Size
          </p>
          <p className="text-gray-400 text-sm">Adjust text size</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, fontSizeEnabled: !settings.fontSizeEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.fontSizeEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.fontSizeEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.fontSizeEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Message font size</p>
            <select
              value={settings.messageFontSize || 'medium'}
              onChange={(e) => onUpdate({ ...settings, messageFontSize: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra_large">Extra Large</option>
            </select>
          </div>

          <div>
            <p className="text-white text-sm mb-2">System font size</p>
            <select
              value={settings.systemFontSize || 'medium'}
              onChange={(e) => onUpdate({ ...settings, systemFontSize: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Use system font</p>
              <p className="text-gray-400 text-xs">Follow device settings</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, useSystemFont: !settings.useSystemFont })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.useSystemFont ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.useSystemFont ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Font Size Button Component
export const FontSizeButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Font size"
    >
      <Type size={18} />
    </button>
  );
};

// Font Size Quick Adjust Component
export const FontSizeQuickAdjust = ({ currentSize, onIncrease, onDecrease }) => {
  return (
    <div className="flex items-center gap-2 bg-[#0b141a] rounded-lg p-2 border border-[#00a884]/20">
      <button
        onClick={onDecrease}
        className="w-8 h-8 rounded-full bg-[#1a2e35] text-white flex items-center justify-center hover:bg-[#00a884] transition-colors"
      >
        <Minus size={16} />
      </button>
      <div className="flex-1 text-center">
        <span className="text-white text-sm">{currentSize}</span>
      </div>
      <button
        onClick={onIncrease}
        className="w-8 h-8 rounded-full bg-[#1a2e35] text-white flex items-center justify-center hover:bg-[#00a884] transition-colors"
      >
        <Plus size={16} />
      </button>
    </div>
  );
};

// Font Size Indicator Component
export const FontSizeIndicator = ({ size }) => {
  const sizeLabels = {
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    extra_large: 'Extra Large'
  };

  return (
    <div className="flex items-center gap-2 text-gray-400 text-xs">
      <Type size={12} />
      <span>{sizeLabels[size] || size}</span>
    </div>
  );
};

export default FontSize;
