import React, { useState } from 'react';
import { X, MapPin, VolumeX, Plus, Palette, Layout, Move } from 'lucide-react';

const CustomUIPanel = ({ onClose, onSave }) => {
  const [pinIconPosition, setPinIconPosition] = useState('top-right');
  const [muteIconPosition, setMuteIconPosition] = useState('top-right');
  const [pinIconColor, setPinIconColor] = useState('#00a884');
  const [muteIconColor, setMuteIconColor] = useState('#ff6b6b');
  const [statusAddButtonVariant, setStatusAddButtonVariant] = useState('default');
  const [customButtonColor, setCustomButtonColor] = useState('#00a884');

  const positions = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-right', label: 'Bottom Right' }
  ];

  const buttonVariants = [
    { id: 'default', label: 'Default', preview: '🟢' },
    { id: 'gradient', label: 'Gradient', preview: '🌈' },
    { id: 'outline', label: 'Outline', preview: '⭕' },
    { id: 'filled', label: 'Filled', preview: '⬛' },
    { id: 'minimal', label: 'Minimal', preview: '⚪' },
    { id: 'custom', label: 'Custom', preview: '🎨' }
  ];

  const handleSave = () => {
    if (onSave) {
      onSave({
        pinIconPosition,
        muteIconPosition,
        pinIconColor,
        muteIconColor,
        statusAddButtonVariant,
        customButtonColor
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Palette className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Custom UI</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Pin Icon Position */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-[#00a884]" />
              Pin Icon Position
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {positions.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => setPinIconPosition(pos.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    pinIconPosition === pos.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
            <div>
              <p className="text-white/70 text-sm mb-2">Icon Color</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={pinIconColor}
                  onChange={(e) => setPinIconColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={pinIconColor}
                  onChange={(e) => setPinIconColor(e.target.value)}
                  className="flex-1 bg-white/10 text-white px-3 py-2 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Mute Icon Position */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <VolumeX size={18} className="text-[#00a884]" />
              Mute Icon Position
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {positions.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => setMuteIconPosition(pos.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    muteIconPosition === pos.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
            <div>
              <p className="text-white/70 text-sm mb-2">Icon Color</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={muteIconColor}
                  onChange={(e) => setMuteIconColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={muteIconColor}
                  onChange={(e) => setMuteIconColor(e.target.value)}
                  className="flex-1 bg-white/10 text-white px-3 py-2 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Status Add Button Variant */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Plus size={18} className="text-[#00a884]" />
              Status Add Button Variant
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {buttonVariants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setStatusAddButtonVariant(variant.id)}
                  className={`p-3 rounded-lg text-center transition-colors ${
                    statusAddButtonVariant === variant.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <span className="text-2xl">{variant.preview}</span>
                  <p className="text-xs mt-1">{variant.label}</p>
                </button>
              ))}
            </div>

            {statusAddButtonVariant === 'custom' && (
              <div>
                <p className="text-white/70 text-sm mb-2">Custom Button Color</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customButtonColor}
                    onChange={(e) => setCustomButtonColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customButtonColor}
                    onChange={(e) => setCustomButtonColor(e.target.value)}
                    className="flex-1 bg-white/10 text-white px-3 py-2 rounded text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Layout size={18} className="text-[#00a884]" />
              Preview
            </h3>
            <div className="bg-[#0b141a] rounded-lg p-4 relative h-32">
              {/* Preview Pin Icon */}
              <div
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center`}
                style={{
                  backgroundColor: pinIconColor,
                  top: pinIconPosition.includes('top') ? '8px' : 'auto',
                  bottom: pinIconPosition.includes('bottom') ? '8px' : 'auto',
                  left: pinIconPosition.includes('left') ? '8px' : 'auto',
                  right: pinIconPosition.includes('right') ? '8px' : 'auto'
                }}
              >
                <MapPin size={16} className="text-white" />
              </div>

              {/* Preview Mute Icon */}
              <div
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center`}
                style={{
                  backgroundColor: muteIconColor,
                  top: muteIconPosition.includes('top') ? '8px' : 'auto',
                  bottom: muteIconPosition.includes('bottom') ? '8px' : 'auto',
                  left: muteIconPosition.includes('left') ? '8px' : 'auto',
                  right: muteIconPosition.includes('right') ? '8px' : 'auto'
                }}
              >
                <VolumeX size={16} className="text-white" />
              </div>

              {/* Preview Add Button */}
              <div className="absolute bottom-4 right-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: statusAddButtonVariant === 'custom' ? customButtonColor : '#00a884'
                  }}
                >
                  <Plus size={24} className="text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
          >
            Apply Custom UI
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomUIPanel;
