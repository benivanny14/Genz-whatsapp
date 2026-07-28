import React, { useState, useRef, useEffect } from 'react';
import { X, Droplets, Palette, Image as ImageIcon, Layers, Video, Upload, X as CloseIcon } from 'lucide-react';

const BackgroundToolsPanel = ({ onClose, image, onSave }) => {
  const canvasRef = useRef(null);
  const [originalImageData, setOriginalImageData] = useState(null);
  const [activeTool, setActiveTool] = useState('blur');
  const [blurIntensity, setBlurIntensity] = useState(5);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [selectedGradient, setSelectedGradient] = useState('none');
  const [selectedPattern, setSelectedPattern] = useState('none');
  const [customImage, setCustomImage] = useState(null);
  const [customVideo, setCustomVideo] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const gradients = [
    { id: 'none', label: 'None', value: 'none' },
    { id: 'sunset', label: 'Sunset', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'ocean', label: 'Ocean', value: 'linear-gradient(135deg, #667eea 0%, #00c6fb 100%)' },
    { id: 'forest', label: 'Forest', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { id: 'fire', label: 'Fire', value: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' },
    { id: 'galaxy', label: 'Galaxy', value: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' },
    { id: 'pastel', label: 'Pastel', value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }
  ];

  const patterns = [
    { id: 'none', label: 'None' },
    { id: 'dots', label: 'Dots' },
    { id: 'lines', label: 'Lines' },
    { id: 'grid', label: 'Grid' },
    { id: 'waves', label: 'Waves' },
    { id: 'checkerboard', label: 'Checkerboard' }
  ];

  const colors = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff'
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
        setImageLoaded(true);
      };
      img.src = image;
    }
  }, [image]);

  useEffect(() => {
    if (originalImageData && canvasRef.current) {
      applyBackgroundTool();
    }
  }, [activeTool, blurIntensity, selectedColor, selectedGradient, selectedPattern, customImage, originalImageData]);

  const applyBackgroundTool = () => {
    if (!canvasRef.current || !originalImageData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    switch (activeTool) {
      case 'blur':
        applyBlur();
        break;
      case 'color':
        applyColor();
        break;
      case 'gradient':
        applyGradient();
        break;
      case 'pattern':
        applyPattern();
        break;
      case 'image':
        applyCustomImage();
        break;
      case 'video':
        applyCustomVideo();
        break;
      default:
        ctx.putImageData(originalImageData, 0, 0);
    }
  };

  const applyBlur = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.filter = `blur(${blurIntensity}px)`;
    ctx.drawImage(canvasRef.current, 0, 0);
    ctx.filter = 'none';
  };

  const applyColor = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = selectedColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Blend original image with color
    ctx.globalAlpha = 0.7;
    ctx.putImageData(originalImageData, 0, 0);
    ctx.globalAlpha = 1;
  };

  const applyGradient = () => {
    if (selectedGradient === 'none') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(originalImageData, 0, 0);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    
    // Parse gradient colors (simplified)
    const colors = selectedGradient.match(/#[a-fA-F0-9]{6}/g) || ['#667eea', '#764ba2'];
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1] || colors[0]);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.globalAlpha = 0.6;
    ctx.putImageData(originalImageData, 0, 0);
    ctx.globalAlpha = 1;
  };

  const applyPattern = () => {
    if (selectedPattern === 'none') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(originalImageData, 0, 0);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.putImageData(originalImageData, 0, 0);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    const patternSize = 20;
    
    for (let y = 0; y < canvas.height; y += patternSize) {
      for (let x = 0; x < canvas.width; x += patternSize) {
        switch (selectedPattern) {
          case 'dots':
            ctx.beginPath();
            ctx.arc(x + patternSize / 2, y + patternSize / 2, 3, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'lines':
            ctx.fillRect(x, y + patternSize / 2 - 1, patternSize, 2);
            break;
          case 'grid':
            ctx.fillRect(x + patternSize / 2 - 1, y, 2, patternSize);
            ctx.fillRect(x, y + patternSize / 2 - 1, patternSize, 2);
            break;
          case 'waves':
            ctx.beginPath();
            ctx.moveTo(x, y + patternSize / 2);
            ctx.quadraticCurveTo(x + patternSize / 4, y, x + patternSize / 2, y + patternSize / 2);
            ctx.quadraticCurveTo(x + patternSize * 3 / 4, y + patternSize, x + patternSize, y + patternSize / 2);
            ctx.stroke();
            break;
          case 'checkerboard':
            if ((x / patternSize + y / patternSize) % 2 === 0) {
              ctx.fillRect(x, y, patternSize, patternSize);
            }
            break;
        }
      }
    }
  };

  const applyCustomImage = () => {
    if (!customImage) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(originalImageData, 0, 0);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const bgImg = new Image();
    bgImg.onload = () => {
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.7;
      ctx.putImageData(originalImageData, 0, 0);
      ctx.globalAlpha = 1;
    };
    bgImg.src = customImage;
  };

  const applyCustomVideo = () => {
    // Video background would require video element and frame extraction
    // This is a placeholder for the feature
    console.log('Video background feature requires video element implementation');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCustomImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCustomVideo(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (canvasRef.current && onSave) {
      canvasRef.current.toBlob((blob) => {
        onSave(blob);
      }, 'image/png');
    }
  };

  const resetTools = () => {
    setActiveTool('blur');
    setBlurIntensity(5);
    setSelectedColor('#ffffff');
    setSelectedGradient('none');
    setSelectedPattern('none');
    setCustomImage(null);
    setCustomVideo(null);
    if (originalImageData && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.putImageData(originalImageData, 0, 0);
    }
  };

  const tools = [
    { id: 'blur', icon: Droplets, label: 'Blur' },
    { id: 'color', icon: Palette, label: 'Color' },
    { id: 'gradient', icon: Layers, label: 'Gradient' },
    { id: 'pattern', icon: Layers, label: 'Pattern' },
    { id: 'image', icon: ImageIcon, label: 'Image' },
    { id: 'video', icon: Video, label: 'Video' }
  ];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Layers className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Background Tools</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetTools}
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
            {/* Tool Selection */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-3">Select Tool</p>
              <div className="grid grid-cols-3 gap-2">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                        activeTool === tool.id
                          ? 'bg-[#00a884] text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-xs">{tool.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tool-specific Controls */}
            {activeTool === 'blur' && (
              <div>
                <p className="text-white/60 text-xs uppercase mb-3">Blur Intensity: {blurIntensity}px</p>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={blurIntensity}
                  onChange={(e) => setBlurIntensity(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {activeTool === 'color' && (
              <div>
                <p className="text-white/60 text-xs uppercase mb-3">Select Color</p>
                <div className="grid grid-cols-5 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-full border-2 transition-transform ${
                        selectedColor === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTool === 'gradient' && (
              <div>
                <p className="text-white/60 text-xs uppercase mb-3">Select Gradient</p>
                <div className="space-y-2">
                  {gradients.map((gradient) => (
                    <button
                      key={gradient.id}
                      onClick={() => setSelectedGradient(gradient.value)}
                      className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedGradient === gradient.value
                          ? 'bg-[#00a884] text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {gradient.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === 'pattern' && (
              <div>
                <p className="text-white/60 text-xs uppercase mb-3">Select Pattern</p>
                <div className="grid grid-cols-3 gap-2">
                  {patterns.map((pattern) => (
                    <button
                      key={pattern.id}
                      onClick={() => setSelectedPattern(pattern.id)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedPattern === pattern.id
                          ? 'bg-[#00a884] text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {pattern.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === 'image' && (
              <div>
                <p className="text-white/60 text-xs uppercase mb-3">Upload Background Image</p>
                <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-white/30 rounded-lg hover:border-white/60 cursor-pointer">
                  <Upload size={24} className="text-white/50" />
                  <span className="text-white/70 text-sm">Click to upload</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {customImage && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={customImage} alt="Background" className="w-16 h-16 object-cover rounded" />
                    <button
                      onClick={() => setCustomImage(null)}
                      className="p-1 bg-red-500 rounded text-white"
                    >
                      <CloseIcon size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTool === 'video' && (
              <div>
                <p className="text-white/60 text-xs uppercase mb-3">Upload Background Video</p>
                <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-white/30 rounded-lg hover:border-white/60 cursor-pointer">
                  <Upload size={24} className="text-white/50" />
                  <span className="text-white/70 text-sm">Click to upload</span>
                  <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                </label>
                {customVideo && (
                  <div className="mt-2 flex items-center gap-2">
                    <Video size={16} className="text-white/70" />
                    <span className="text-white/70 text-sm">Video selected</span>
                    <button
                      onClick={() => setCustomVideo(null)}
                      className="p-1 bg-red-500 rounded text-white"
                    >
                      <CloseIcon size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={!imageLoaded}
              className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Background
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundToolsPanel;
