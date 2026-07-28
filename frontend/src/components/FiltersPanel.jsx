import React, { useState, useRef, useEffect } from 'react';
import { X, Sliders, Sun, Contrast, Droplets, Sparkles, Zap, Palette, Image as ImageIcon } from 'lucide-react';

const FiltersPanel = ({ onClose, image, onSave }) => {
  const canvasRef = useRef(null);
  const [originalImageData, setOriginalImageData] = useState(null);
  const [activeFilter, setActiveFilter] = useState('none');
  const [intensity, setIntensity] = useState(50);

  const filters = [
    { id: 'none', icon: ImageIcon, label: 'None' },
    { id: 'vintage', icon: Sun, label: 'Vintage' },
    { id: 'bw', icon: Contrast, label: 'B&W' },
    { id: 'hdr', icon: Sparkles, label: 'HDR' },
    { id: 'vignette', icon: Droplets, label: 'Vignette' },
    { id: 'grain', icon: Sparkles, label: 'Grain' },
    { id: 'lightleak', icon: Sun, label: 'Light Leak' },
    { id: 'bokeh', icon: Droplets, label: 'Bokeh' },
    { id: 'glitch', icon: Zap, label: 'Glitch' },
    { id: 'neon', icon: Sparkles, label: 'Neon' },
    { id: 'cartoon', icon: Palette, label: 'Cartoon' },
    { id: 'sketch', icon: ImageIcon, label: 'Sketch' }
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
      applyFilter();
    }
  }, [activeFilter, intensity, originalImageData]);

  const applyFilter = () => {
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
      case 'vintage':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * (1 + 0.2 * factor));     // R
          data[i + 1] = data[i + 1] * (1 - 0.1 * factor);            // G
          data[i + 2] = data[i + 2] * (1 - 0.2 * factor);            // B
        }
        break;

      case 'bw':
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg;
          data[i + 1] = avg;
          data[i + 2] = avg;
        }
        break;

      case 'hdr':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.pow(data[i] / 255, 0.6) * 255 * factor);
          data[i + 1] = Math.min(255, Math.pow(data[i + 1] / 255, 0.6) * 255 * factor);
          data[i + 2] = Math.min(255, Math.pow(data[i + 2] / 255, 0.6) * 255 * factor);
        }
        break;

      case 'vignette':
        const centerX = imageData.width / 2;
        const centerY = imageData.height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
        
        for (let y = 0; y < imageData.height; y++) {
          for (let x = 0; x < imageData.width; x++) {
            const i = (y * imageData.width + x) * 4;
            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            const vignette = 1 - (dist / maxDist) * factor * 0.8;
            data[i] *= vignette;
            data[i + 1] *= vignette;
            data[i + 2] *= vignette;
          }
        }
        break;

      case 'grain':
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 50 * factor;
          data[i] = Math.max(0, Math.min(255, data[i] + noise));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        break;

      case 'lightleak':
        for (let i = 0; i < data.length; i += 4) {
          const x = (i / 4) % imageData.width;
          const leak = Math.sin(x * 0.02) * 30 * factor;
          data[i] = Math.min(255, data[i] + leak);
          data[i + 1] = Math.min(255, data[i + 1] + leak * 0.5);
        }
        break;

      case 'bokeh':
        // Simplified bokeh effect
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (brightness > 128) {
            const boost = (brightness - 128) * 0.3 * factor;
            data[i] = Math.min(255, data[i] + boost);
            data[i + 1] = Math.min(255, data[i + 1] + boost);
            data[i + 2] = Math.min(255, data[i + 2] + boost);
          }
        }
        break;

      case 'glitch':
        const shift = Math.floor(10 * factor);
        for (let y = 0; y < imageData.height; y++) {
          if (Math.random() < 0.1 * factor) {
            for (let x = 0; x < imageData.width; x++) {
              const i = (y * imageData.width + x) * 4;
              const shiftedX = (x + shift) % imageData.width;
              const shiftedI = (y * imageData.width + shiftedX) * 4;
              if (shiftedI < data.length) {
                data[i] = data[shiftedI];
                data[i + 1] = data[shiftedI + 1];
                data[i + 2] = data[shiftedI + 2];
              }
            }
          }
        }
        break;

      case 'neon':
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (brightness > 100) {
            data[i] = Math.min(255, data[i] * 1.5 * factor);
            data[i + 1] = Math.min(255, data[i + 1] * 0.5);
            data[i + 2] = Math.min(255, data[i + 2] * 1.5 * factor);
          }
        }
        break;

      case 'cartoon':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.floor(data[i] / 32) * 32;
          data[i + 1] = Math.floor(data[i + 1] / 32) * 32;
          data[i + 2] = Math.floor(data[i + 2] / 32) * 32;
        }
        break;

      case 'sketch':
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const sketch = 255 - avg;
          data[i] = sketch;
          data[i + 1] = sketch;
          data[i + 2] = sketch;
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
            <Sliders className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Filters</h2>
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
                {filters.map((filter) => {
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
                  {filters.find(f => f.id === activeFilter)?.label} filter applied
                </p>
              </div>
            )}

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

export default FiltersPanel;
