import React, { useState, useRef, useEffect } from 'react';
import { X, Crop, RotateCw, FlipHorizontal, FlipVertical, Maximize2 } from 'lucide-react';

const CropRotatePanel = ({ onClose, image, onSave }) => {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('free');
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const aspectRatios = [
    { id: 'free', label: 'Free' },
    { id: '1:1', label: '1:1' },
    { id: '4:3', label: '4:3' },
    { id: '16:9', label: '16:9' },
    { id: '9:16', label: '9:16' },
    { id: '3:2', label: '3:2' },
    { id: '2:3', label: '2:3' }
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
        setCropArea({ x: 0, y: 0, width: img.width, height: img.height });
        setImageLoaded(true);
      };
      img.src = image;
    }
  }, [image]);

  const applyTransforms = () => {
    if (!canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    };
    img.src = image;
  };

  useEffect(() => {
    applyTransforms();
  }, [rotation, flipH, flipV]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleFlipHorizontal = () => {
    setFlipH((prev) => !prev);
  };

  const handleFlipVertical = () => {
    setFlipV((prev) => !prev);
  };

  const handleAspectRatioChange = (ratio) => {
    setAspectRatio(ratio);
    if (ratio !== 'free' && canvasRef.current) {
      const canvas = canvasRef.current;
      const [w, h] = ratio.split(':').map(Number);
      const canvasRatio = canvas.width / canvas.height;
      const targetRatio = w / h;
      
      let newWidth, newHeight;
      if (canvasRatio > targetRatio) {
        newHeight = canvas.height;
        newWidth = newHeight * targetRatio;
      } else {
        newWidth = canvas.width;
        newHeight = newWidth / targetRatio;
      }
      
      setCropArea({
        x: (canvas.width - newWidth) / 2,
        y: (canvas.height - newHeight) / 2,
        width: newWidth,
        height: newHeight
      });
    }
  };

  const handleSave = () => {
    if (canvasRef.current && onSave) {
      // Apply crop
      const canvas = canvasRef.current;
      const croppedCanvas = document.createElement('canvas');
      const ctx = croppedCanvas.getContext('2d');
      
      croppedCanvas.width = cropArea.width;
      croppedCanvas.height = cropArea.height;
      
      ctx.drawImage(
        canvas,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
      );
      
      croppedCanvas.toBlob((blob) => {
        onSave(blob);
      }, 'image/png');
    }
  };

  const resetTransforms = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAspectRatio('free');
    if (canvasRef.current) {
      setCropArea({
        x: 0,
        y: 0,
        width: canvasRef.current.width,
        height: canvasRef.current.height
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col m-2 md:m-0">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Crop className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Crop & Rotate</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetTransforms}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
            >
              Reset
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Canvas Area */}
          <div className="flex-1 bg-black/50 flex items-center justify-center p-2 md:p-4 relative min-h-[200px] md:min-h-0">
            {imageLoaded && (
              <>
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full"
                />
                {/* Crop Overlay */}
                <div
                  className="absolute border-2 border-[#00a884] pointer-events-none"
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height,
                    display: canvasRef.current ? 'block' : 'none'
                  }}
                />
              </>
            )}
          </div>

          {/* Tools Panel */}
          <div className="w-full md:w-72 bg-[#0b141a] p-3 md:p-4 space-y-4 md:space-y-6 overflow-y-auto max-h-[40vh] md:max-h-none">
            {/* Rotate */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-3">Rotate</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRotate}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                >
                  <RotateCw size={18} />
                  <span>90°</span>
                </button>
                <div className="text-white text-center">
                  <div className="text-2xl font-bold">{rotation}°</div>
                </div>
              </div>
            </div>

            {/* Flip */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-3">Flip</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleFlipHorizontal}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                    flipH ? 'bg-[#00a884] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <FlipHorizontal size={18} />
                  <span>Horizontal</span>
                </button>
                <button
                  onClick={handleFlipVertical}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                    flipV ? 'bg-[#00a884] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <FlipVertical size={18} />
                  <span>Vertical</span>
                </button>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <p className="text-white/60 text-xs uppercase mb-3">Aspect Ratio</p>
              <div className="grid grid-cols-4 md:grid-cols-3 gap-2">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => handleAspectRatioChange(ratio.id)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      aspectRatio === ratio.id
                        ? 'bg-[#00a884] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Crop Info */}
            {imageLoaded && canvasRef.current && (
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                  <Maximize2 size={16} />
                  <span>Crop Area</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-white text-sm">
                  <div>
                    <span className="text-white/60">Width:</span>{' '}
                    {Math.round(cropArea.width)}px
                  </div>
                  <div>
                    <span className="text-white/60">Height:</span>{' '}
                    {Math.round(cropArea.height)}px
                  </div>
                </div>
              </div>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={!imageLoaded}
              className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropRotatePanel;
