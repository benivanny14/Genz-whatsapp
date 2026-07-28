import React, { useState, useRef, useEffect } from 'react';
import { X, Brush, Eraser, Undo, Redo, Square, Circle, ArrowUpRight, Droplet, Layers, Minus, Plus } from 'lucide-react';

const DrawingPanel = ({ onClose, image, onSave }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushType, setBrushType] = useState('pen');
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [opacity, setOpacity] = useState(1);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedShape, setSelectedShape] = useState(null);

  const brushTypes = [
    { id: 'pen', icon: Brush, label: 'Pen' },
    { id: 'marker', icon: Droplet, label: 'Marker' },
    { id: 'pencil', icon: Brush, label: 'Pencil' },
    { id: 'spray', icon: Layers, label: 'Spray' },
    { id: 'neon', icon: Brush, label: 'Neon' },
    { id: 'calligraphy', icon: Brush, label: 'Calligraphy' }
  ];

  const shapes = [
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' }
  ];

  const colors = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff',
    '#ff8888', '#88ff88', '#8888ff', '#ffff88', '#ff88ff'
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
        saveState();
      };
      img.src = image;
    }
  }, [image]);

  const saveState = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(canvas.toDataURL());
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      loadState(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      loadState(historyIndex + 1);
    }
  };

  const loadState = (index) => {
    if (canvasRef.current && history[index]) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[index];
    }
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    
    if (selectedShape) {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = opacity;
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.globalAlpha = opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (brushType === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = '#000000';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (brushType === 'neon') {
      ctx.shadowBlur = 10;
      ctx.shadowColor = brushColor;
    } else {
      ctx.shadowBlur = 0;
    }

    if (brushType === 'marker') {
      ctx.globalAlpha = 0.5;
    }

    if (brushType === 'spray') {
      for (let i = 0; i < 20; i++) {
        const offsetX = (Math.random() - 0.5) * brushSize * 2;
        const offsetY = (Math.random() - 0.5) * brushSize * 2;
        ctx.fillStyle = brushColor;
        ctx.fillRect(coords.x + offsetX, coords.y + offsetY, 1, 1);
      }
    } else if (brushType === 'pencil') {
      ctx.lineWidth = 1;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (selectedShape) {
      // Shape drawing will be completed on mouse up
    } else {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (selectedShape) {
      ctx.beginPath();
      if (selectedShape === 'rectangle') {
        ctx.rect(coords.x - 50, coords.y - 30, 100, 60);
      } else if (selectedShape === 'circle') {
        ctx.arc(coords.x, coords.y, 40, 0, Math.PI * 2);
      } else if (selectedShape === 'arrow') {
        ctx.moveTo(coords.x - 30, coords.y);
        ctx.lineTo(coords.x + 30, coords.y);
        ctx.lineTo(coords.x + 20, coords.y - 10);
        ctx.moveTo(coords.x + 30, coords.y);
        ctx.lineTo(coords.x + 20, coords.y + 10);
      }
      ctx.stroke();
      setSelectedShape(null);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    saveState();
  };

  const applyBlur = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Simple blur effect
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg;
      data[i + 1] = avg;
      data[i + 2] = avg;
    }
    
    ctx.putImageData(imageData, 0, 0);
    saveState();
  };

  const applyPixelate = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pixelSize = 10;
    const w = canvas.width;
    const h = canvas.height;
    
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    
    for (let y = 0; y < h; y += pixelSize) {
      for (let x = 0; x < w; x += pixelSize) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        for (let py = 0; py < pixelSize; py++) {
          for (let px = 0; px < pixelSize; px++) {
            const pi = ((y + py) * w + (x + px)) * 4;
            if (pi < data.length) {
              data[pi] = r;
              data[pi + 1] = g;
              data[pi + 2] = b;
            }
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    saveState();
  };

  const handleSave = () => {
    if (canvasRef.current && onSave) {
      canvasRef.current.toBlob((blob) => {
        onSave(blob);
      }, 'image/png');
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Brush className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Drawing Tools</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 text-white/60 hover:text-white disabled:opacity-30"
            >
              <Undo size={20} />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 text-white/60 hover:text-white disabled:opacity-30"
            >
              <Redo size={20} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white ml-2">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Canvas Area */}
          <div className="flex-1 bg-black/50 flex items-center justify-center p-4">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="max-w-full max-h-full cursor-crosshair"
              style={{ touchAction: 'none' }}
            />
          </div>

          {/* Tools Panel */}
          <div className="w-64 bg-[#0b141a] p-4 space-y-4 overflow-y-auto">
            {/* Brush Types */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-2">Brush Type</p>
              <div className="grid grid-cols-3 gap-2">
                {brushTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setBrushType(type.id);
                        setSelectedShape(null);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        brushType === type.id && !selectedShape
                          ? 'bg-[#00a884] text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    setBrushType('eraser');
                    setSelectedShape(null);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    brushType === 'eraser' && !selectedShape
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <Eraser size={18} />
                </button>
              </div>
            </div>

            {/* Shapes */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-2">Shapes</p>
              <div className="grid grid-cols-3 gap-2">
                {shapes.map((shape) => {
                  const Icon = shape.icon;
                  return (
                    <button
                      key={shape.id}
                      onClick={() => {
                        setSelectedShape(shape.id);
                        setBrushType('pen');
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        selectedShape === shape.id
                          ? 'bg-[#00a884] text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brush Size */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-2">Size: {brushSize}px</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBrushSize(Math.max(1, brushSize - 1))}
                  className="p-1 bg-white/10 rounded text-white"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="flex-1"
                />
                <button
                  onClick={() => setBrushSize(Math.min(50, brushSize + 1))}
                  className="p-1 bg-white/10 rounded text-white"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Opacity */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-2">Opacity: {Math.round(opacity * 100)}%</p>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Colors */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-2">Color</p>
              <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      brushColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Effects */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-2">Effects</p>
              <div className="space-y-2">
                <button
                  onClick={applyBlur}
                  className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
                >
                  Blur
                </button>
                <button
                  onClick={applyPixelate}
                  className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
                >
                  Pixelate
                </button>
              </div>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingPanel;
