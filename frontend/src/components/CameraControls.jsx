import React, { useState, useRef, useEffect } from 'react';
import { Grid, RotateCw, Sun, Sliders, X } from 'lucide-react';

const CameraControls = ({ onClose, onCapture, onSettingsChange }) => {
  const [showGrid, setShowGrid] = useState(true);
  const [showLevel, setShowLevel] = useState(true);
  const [exposure, setExposure] = useState(0);
  const [whiteBalance, setWhiteBalance] = useState('auto');
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const whiteBalanceOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'daylight', label: 'Daylight' },
    { value: 'cloudy', label: 'Cloudy' },
    { value: 'incandescent', label: 'Incandescent' },
    { value: 'fluorescent', label: 'Fluorescent' }
  ];

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Camera access error:', err);
      alert('Failed to access camera');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0);

    // Apply exposure adjustment
    if (exposure !== 0) {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const factor = (exposure + 100) / 100;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * factor);     // R
        data[i + 1] = Math.min(255, data[i + 1] * factor); // G
        data[i + 2] = Math.min(255, data[i + 2] * factor); // B
      }
      context.putImageData(imageData, 0, 0);
    }

    canvas.toBlob((blob) => {
      if (onCapture) {
        onCapture(blob);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleSettingsChange = (key, value) => {
    if (onSettingsChange) {
      onSettingsChange({ [key]: value });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <button onClick={onClose} className="text-white p-2">
          <X size={24} />
        </button>
        <h2 className="text-white font-semibold">Camera Controls</h2>
        <button onClick={capturePhoto} className="text-white p-2">
          <RotateCw size={24} />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Grid Overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/30" />
              ))}
            </div>
          </div>
        )}

        {/* Level Indicator */}
        {showLevel && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-32 h-1 bg-white/30 rounded-full relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full" />
            </div>
          </div>
        )}
      </div>

      {/* Controls Panel */}
      <div className="bg-black/80 p-4 space-y-4">
        {/* Grid Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Grid size={20} />
            <span>Grid Lines</span>
          </div>
          <button
            onClick={() => {
              setShowGrid(!showGrid);
              handleSettingsChange('showGrid', !showGrid);
            }}
            className={`w-12 h-6 rounded-full transition-colors ${
              showGrid ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                showGrid ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Level Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <RotateCw size={20} />
            <span>Level Indicator</span>
          </div>
          <button
            onClick={() => {
              setShowLevel(!showLevel);
              handleSettingsChange('showLevel', !showLevel);
            }}
            className={`w-12 h-6 rounded-full transition-colors ${
              showLevel ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                showLevel ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Exposure Control */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white">
            <Sun size={20} />
            <span>Exposure</span>
            <span className="text-white/60 text-sm">{exposure}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={exposure}
            onChange={(e) => {
              setExposure(Number(e.target.value));
              handleSettingsChange('exposure', Number(e.target.value));
            }}
            className="w-full"
          />
        </div>

        {/* White Balance */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white">
            <Sliders size={20} />
            <span>White Balance</span>
          </div>
          <select
            value={whiteBalance}
            onChange={(e) => {
              setWhiteBalance(e.target.value);
              handleSettingsChange('whiteBalance', e.target.value);
            }}
            className="w-full bg-white/10 text-white p-2 rounded border border-white/20"
          >
            {whiteBalanceOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CameraControls;
