import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Smile, Eye, Minimize, Maximize, Sliders } from 'lucide-react';

const BeautyRetouchPanel = ({ onClose, image, onSave }) => {
  const canvasRef = useRef(null);
  const [originalImageData, setOriginalImageData] = useState(null);
  const [settings, setSettings] = useState({
    teethWhitening: 0,
    eyeBrightness: 0,
    faceSlim: 0,
    bigEyes: 0,
    smallFace: 0,
    longLegs: 0,
    skinSmooth: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0
  });

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
      applyBeautyEffects();
    }
  }, [settings, originalImageData]);

  const applyBeautyEffects = () => {
    if (!canvasRef.current || !originalImageData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );
    const data = imageData.data;

    // Apply brightness
    if (settings.brightness !== 0) {
      const brightnessFactor = settings.brightness / 50;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + brightnessFactor * 50));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightnessFactor * 50));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightnessFactor * 50));
      }
    }

    // Apply contrast
    if (settings.contrast !== 0) {
      const contrastFactor = (settings.contrast / 50) * 2;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * contrastFactor) + 128));
        data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * contrastFactor) + 128));
        data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * contrastFactor) + 128));
      }
    }

    // Apply saturation
    if (settings.saturation !== 0) {
      const saturationFactor = 1 + (settings.saturation / 50);
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2];
        data[i] = Math.min(255, Math.max(0, gray + saturationFactor * (data[i] - gray)));
        data[i + 1] = Math.min(255, Math.max(0, gray + saturationFactor * (data[i + 1] - gray)));
        data[i + 2] = Math.min(255, Math.max(0, gray + saturationFactor * (data[i + 2] - gray)));
      }
    }

    // Apply skin smoothing (simplified)
    if (settings.skinSmooth > 0) {
      const smoothFactor = settings.skinSmooth / 100;
      for (let i = 0; i < data.length; i += 4) {
        // Detect skin-like colors (simplified)
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
          // Apply smoothing
          const avg = (r + g + b) / 3;
          data[i] = r + (avg - r) * smoothFactor * 0.3;
          data[i + 1] = g + (avg - g) * smoothFactor * 0.3;
          data[i + 2] = b + (avg - b) * smoothFactor * 0.3;
        }
      }
    }

    // Apply teeth whitening (simplified - brighten yellowish areas)
    if (settings.teethWhitening > 0) {
      const whitenFactor = settings.teethWhitening / 100;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Detect yellowish/white areas
        if (r > 200 && g > 200 && b > 150 && r > b && g > b) {
          data[i] = Math.min(255, r + (255 - r) * whitenFactor * 0.5);
          data[i + 1] = Math.min(255, g + (255 - g) * whitenFactor * 0.5);
          data[i + 2] = Math.min(255, b + (255 - b) * whitenFactor * 0.5);
        }
      }
    }

    // Apply eye brightness (simplified - brighten dark circular areas)
    if (settings.eyeBrightness > 0) {
      const brightenFactor = settings.eyeBrightness / 100;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness < 100 && brightness > 30) {
          data[i] = Math.min(255, data[i] + brightenFactor * 30);
          data[i + 1] = Math.min(255, data[i + 1] + brightenFactor * 30);
          data[i + 2] = Math.min(255, data[i + 2] + brightenFactor * 30);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (canvasRef.current && onSave) {
      canvasRef.current.toBlob((blob) => {
        onSave(blob);
      }, 'image/png');
    }
  };

  const resetSettings = () => {
    setSettings({
      teethWhitening: 0,
      eyeBrightness: 0,
      faceSlim: 0,
      bigEyes: 0,
      smallFace: 0,
      longLegs: 0,
      skinSmooth: 0,
      brightness: 0,
      contrast: 0,
      saturation: 0
    });
  };

  const beautyControls = [
    { key: 'teethWhitening', icon: Smile, label: 'Teeth Whitening', min: 0, max: 100 },
    { key: 'eyeBrightness', icon: Eye, label: 'Eye Brightness', min: 0, max: 100 },
    { key: 'faceSlim', icon: Minimize, label: 'Face Slim', min: 0, max: 50 },
    { key: 'bigEyes', icon: Eye, label: 'Big Eyes', min: 0, max: 50 },
    { key: 'smallFace', icon: Minimize, label: 'Small Face', min: 0, max: 30 },
    { key: 'longLegs', icon: Maximize, label: 'Long Legs', min: 0, max: 30 },
    { key: 'skinSmooth', icon: Sparkles, label: 'Skin Smooth', min: 0, max: 100 }
  ];

  const basicControls = [
    { key: 'brightness', icon: Sliders, label: 'Brightness', min: -50, max: 50 },
    { key: 'contrast', icon: Sliders, label: 'Contrast', min: -50, max: 50 },
    { key: 'saturation', icon: Sliders, label: 'Saturation', min: -50, max: 50 }
  ];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Sparkles className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Beauty Retouch</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetSettings}
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
          <div className="w-80 bg-[#0b141a] p-4 space-y-6 overflow-y-auto">
            {/* Beauty Controls */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-3">Beauty Effects</p>
              <div className="space-y-4">
                {beautyControls.map((control) => {
                  const Icon = control.icon;
                  return (
                    <div key={control.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                          <Icon size={16} />
                          <span className="text-sm">{control.label}</span>
                        </div>
                        <span className="text-white/60 text-sm">{settings[control.key]}%</span>
                      </div>
                      <input
                        type="range"
                        min={control.min}
                        max={control.max}
                        value={settings[control.key]}
                        onChange={(e) => handleSettingChange(control.key, Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Basic Controls */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-3">Basic Adjustments</p>
              <div className="space-y-4">
                {basicControls.map((control) => {
                  const Icon = control.icon;
                  return (
                    <div key={control.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                          <Icon size={16} />
                          <span className="text-sm">{control.label}</span>
                        </div>
                        <span className="text-white/60 text-sm">{settings[control.key]}</span>
                      </div>
                      <input
                        type="range"
                        min={control.min}
                        max={control.max}
                        value={settings[control.key]}
                        onChange={(e) => handleSettingChange(control.key, Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/60 text-xs">
                Note: Face and body detection features are simulated. For professional results, use dedicated photo editing apps.
              </p>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeautyRetouchPanel;
