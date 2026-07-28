import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Smile, Star, Heart, Flame, Ghost, Crown, Glasses, User } from 'lucide-react';

const ARFilterPanel = ({ onClose, image, onSave }) => {
  const canvasRef = useRef(null);
  const [originalImageData, setOriginalImageData] = useState(null);
  const [activeFilter, setActiveFilter] = useState('none');
  const [intensity, setIntensity] = useState(50);

  const arFilters = [
    { id: 'none', icon: User, label: 'None' },
    { id: 'glow', icon: Sparkles, label: 'Glow' },
    { id: 'beauty', icon: Smile, label: 'Beauty' },
    { id: 'star', icon: Star, label: 'Star Eyes' },
    { id: 'heart', icon: Heart, label: 'Heart Face' },
    { id: 'fire', icon: Flame, label: 'Fire' },
    { id: 'ghost', icon: Ghost, label: 'Ghost' },
    { id: 'crown', icon: Crown, label: 'Crown' },
    { id: 'glasses', icon: Glasses, label: 'Cool Glasses' }
  ];

  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setOriginalImageData(imageData);
      };
      img.src = image;
    }
  }, [image]);

  useEffect(() => {
    if (originalImageData && canvasRef.current) {
      applyARFilter();
    }
  }, [activeFilter, intensity, originalImageData]);

  const applyARFilter = () => {
    if (!canvasRef.current || !originalImageData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );
    const data = imageData.data;
    const factor = intensity / 50;

    switch (activeFilter) {
      case 'glow':
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (brightness > 150) {
            data[i] = Math.min(255, data[i] + 30 * factor);
            data[i + 1] = Math.min(255, data[i + 1] + 20 * factor);
            data[i + 2] = Math.min(255, data[i + 2] + 50 * factor);
          }
        }
        break;

      case 'beauty':
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Skin smoothing effect
          if (r > 100 && g > 50 && b > 30 && r > g && r > b) {
            const avg = (r + g + b) / 3;
            data[i] = r + (avg - r) * 0.2 * factor;
            data[i + 1] = g + (avg - g) * 0.2 * factor;
            data[i + 2] = b + (avg - b) * 0.2 * factor;
          }
        }
        break;

      case 'star':
        // Add sparkles to bright areas
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (brightness > 200 && Math.random() < 0.05 * factor) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }
        break;

      case 'heart':
        // Add pink tint to skin-like areas
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          if (r > 120 && g > 60 && b > 40 && r > g && r > b) {
            data[i] = Math.min(255, r + 20 * factor);
            data[i + 1] = Math.max(0, g - 10 * factor);
          }
        }
        break;

      case 'fire':
        // Add orange/red tint to bright areas
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (brightness > 100) {
            data[i] = Math.min(255, data[i] + 30 * factor);
            data[i + 1] = Math.max(0, data[i + 1] - 10 * factor);
            data[i + 2] = Math.max(0, data[i + 2] - 20 * factor);
          }
        }
        break;

      case 'ghost':
        // Add blue/white tint
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] + 20 * factor);
          data[i + 1] = Math.min(255, data[i + 1] + 30 * factor);
          data[i + 2] = Math.min(255, data[i + 2] + 50 * factor);
        }
        break;

      case 'crown':
        // Add golden tint to top area
        const height = imageData.height;
        for (let i = 0; i < data.length; i += 4) {
          const y = Math.floor((i / 4) / imageData.width);
          if (y < height * 0.3) {
            data[i] = Math.min(255, data[i] + 40 * factor);
            data[i + 1] = Math.min(255, data[i + 1] + 30 * factor);
            data[i + 2] = Math.max(0, data[i + 2] - 20 * factor);
          }
        }
        break;

      case 'glasses':
        // Add cool blue tint to middle area (simulating glasses)
        const h = imageData.height;
        const w = imageData.width;
        for (let i = 0; i < data.length; i += 4) {
          const y = Math.floor((i / 4) / w);
          const x = (i / 4) % w;
          if (y > h * 0.3 && y < h * 0.5 && x > w * 0.2 && x < w * 0.8) {
            data[i] = Math.max(0, data[i] - 20 * factor);
            data[i + 1] = Math.max(0, data[i + 1] - 10 * factor);
            data[i + 2] = Math.min(255, data[i + 2] + 30 * factor);
          }
        }
        break;

      default:
        break;
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const handleSave = () => {
    if (canvasRef.current && onSave) {
      canvasRef.current.toBlob((blob) => {
        onSave(blob);
      }, 'image/png');
    }
  };

  const resetFilter = () => {
    setActiveFilter('none');
    setIntensity(50);
    if (originalImageData && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.putImageData(originalImageData, 0, 0);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Sparkles className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">AR & Face Filters</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetFilter}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
            >
              Reset
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Canvas Area */}
          <div className="flex-1 bg-black/50 flex items-center justify-center p-4">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full"
            />
          </div>

          {/* Tools Panel */}
          <div className="w-72 bg-[#0b141a] p-4 space-y-6 overflow-y-auto">
            {/* Filter Selection */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-3">Select Filter</p>
              <div className="grid grid-cols-3 gap-2">
                {arFilters.map((filter) => {
                  const Icon = filter.icon;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                        activeFilter === filter.id
                          ? 'bg-[#00a884] text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-xs">{filter.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Intensity Control */}
            {activeFilter !== 'none' && (
              <div>
                <p className="text-white/60 text-xs uppercase mb-3">Intensity: {intensity}%</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {/* Filter Description */}
            {activeFilter !== 'none' && (
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-sm">
                  {arFilters.find(f => f.id === activeFilter)?.label} filter applied
                </p>
              </div>
            )}

            {/* Note */}
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/60 text-xs">
                Note: These are simulated AR effects. Real-time face tracking requires ML libraries like TensorFlow.js or MediaPipe.
              </p>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARFilterPanel;
