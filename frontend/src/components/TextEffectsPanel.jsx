import React, { useState } from 'react';
import { X, Type, Sparkles, Layers, Palette, RotateCw, Zap } from 'lucide-react';

const TextEffectsPanel = ({ onClose, onEffectChange, currentEffects = {} }) => {
  const [animation, setAnimation] = useState(currentEffects.animation || 'none');
  const [is3D, setIs3D] = useState(currentEffects.is3D || false);
  const [glow, setGlow] = useState(currentEffects.glow || 'none');
  const [neon, setNeon] = useState(currentEffects.neon || 'none');
  const [gradient, setGradient] = useState(currentEffects.gradient || 'none');
  const [pattern, setPattern] = useState(currentEffects.pattern || 'none');
  const [isCurve, setIsCurve] = useState(currentEffects.isCurve || false);

  const animations = [
    { value: 'none', label: 'None' },
    { value: 'fadeIn', label: 'Fade In' },
    { value: 'slideUp', label: 'Slide Up' },
    { value: 'slideDown', label: 'Slide Down' },
    { value: 'slideLeft', label: 'Slide Left' },
    { value: 'slideRight', label: 'Slide Right' },
    { value: 'zoomIn', label: 'Zoom In' },
    { value: 'zoomOut', label: 'Zoom Out' },
    { value: 'rotate', label: 'Rotate' },
    { value: 'bounce', label: 'Bounce' },
    { value: 'pulse', label: 'Pulse' },
    { value: 'shake', label: 'Shake' }
  ];

  const glowOptions = [
    { value: 'none', label: 'None' },
    { value: 'soft', label: 'Soft' },
    { value: 'medium', label: 'Medium' },
    { value: 'strong', label: 'Strong' },
    { value: 'intense', label: 'Intense' }
  ];

  const neonOptions = [
    { value: 'none', label: 'None' },
    { value: 'blue', label: 'Blue' },
    { value: 'pink', label: 'Pink' },
    { value: 'green', label: 'Green' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'purple', label: 'Purple' },
    { value: 'red', label: 'Red' },
    { value: 'cyan', label: 'Cyan' }
  ];

  const gradients = [
    { value: 'none', label: 'None' },
    { value: 'rainbow', label: 'Rainbow' },
    { value: 'sunset', label: 'Sunset' },
    { value: 'ocean', label: 'Ocean' },
    { value: 'forest', label: 'Forest' },
    { value: 'fire', label: 'Fire' },
    { value: 'galaxy', label: 'Galaxy' },
    { value: 'pastel', label: 'Pastel' }
  ];

  const patterns = [
    { value: 'none', label: 'None' },
    { value: 'dots', label: 'Dots' },
    { value: 'lines', label: 'Lines' },
    { value: 'grid', label: 'Grid' },
    { value: 'waves', label: 'Waves' },
    { value: 'zigzag', label: 'Zigzag' },
    { value: 'checkerboard', label: 'Checkerboard' },
    { value: 'stripes', label: 'Stripes' }
  ];

  const handleEffectChange = (key, value) => {
    if (onEffectChange) {
      onEffectChange({ [key]: value });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Type className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Text Effects</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Animation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Sparkles size={18} />
              <span className="font-medium">Animation</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {animations.map((anim) => (
                <button
                  key={anim.value}
                  onClick={() => {
                    setAnimation(anim.value);
                    handleEffectChange('animation', anim.value);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    animation === anim.value
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3D Effect */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Layers size={18} />
              <span className="font-medium">3D Effect</span>
            </div>
            <button
              onClick={() => {
                setIs3D(!is3D);
                handleEffectChange('is3D', !is3D);
              }}
              className={`w-12 h-6 rounded-full transition-colors ${
                is3D ? 'bg-[#00a884]' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  is3D ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Glow */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Zap size={18} />
              <span className="font-medium">Glow</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {glowOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setGlow(opt.value);
                    handleEffectChange('glow', opt.value);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    glow === opt.value
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Neon */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Sparkles size={18} />
              <span className="font-medium">Neon</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {neonOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setNeon(opt.value);
                    handleEffectChange('neon', opt.value);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    neon === opt.value
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gradient */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Palette size={18} />
              <span className="font-medium">Gradient</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {gradients.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setGradient(opt.value);
                    handleEffectChange('gradient', opt.value);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    gradient === opt.value
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pattern */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Layers size={18} />
              <span className="font-medium">Pattern</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {patterns.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setPattern(opt.value);
                    handleEffectChange('pattern', opt.value);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    pattern === opt.value
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Curve/Circular */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <RotateCw size={18} />
              <span className="font-medium">Curve/Circular Text</span>
            </div>
            <button
              onClick={() => {
                setIsCurve(!isCurve);
                handleEffectChange('isCurve', !isCurve);
              }}
              className={`w-12 h-6 rounded-full transition-colors ${
                isCurve ? 'bg-[#00a884]' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  isCurve ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextEffectsPanel;
