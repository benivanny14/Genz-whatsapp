import React, { useState, useRef } from 'react';
import { X, Upload, Scissors, Wand2, Trash2, Image as ImageIcon, Sparkles } from 'lucide-react';

const StickerCreator = ({ onClose, onStickerCreated }) => {
  const [image, setImage] = useState(null);
  const [stickerName, setStickerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [customStickers, setCustomStickers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('genz_custom_stickers') || '[]');
    } catch { return []; }
  });
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target.result);
    reader.readAsDataURL(file);
    setError('');
  };

  const processSticker = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }
    setIsProcessing(true);
    setError('');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = image;
      });

      // Draw with white background, centered, with padding
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);

      const scale = Math.min(460 / img.width, 460 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (512 - w) / 2, (512 - h) / 2, w, h);

      const stickerUrl = canvas.toDataURL('image/png');

      const sticker = {
        id: Date.now().toString(),
        url: stickerUrl,
        name: stickerName.trim() || 'Custom Sticker',
        createdAt: new Date().toISOString()
      };

      const updated = [...customStickers, sticker];
      setCustomStickers(updated);
      localStorage.setItem('genz_custom_stickers', JSON.stringify(updated));
      onStickerCreated?.(sticker);
      setImage(null);
      setStickerName('');
    } catch (err) {
      console.error('Sticker processing error:', err);
      setError('Failed to process sticker');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteSticker = (id) => {
    const updated = customStickers.filter(s => s.id !== id);
    setCustomStickers(updated);
    localStorage.setItem('genz_custom_stickers', JSON.stringify(updated));
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d1f35] rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="text-white font-bold flex items-center gap-2">
            <Wand2 size={18} className="text-pink-400" /> Create Sticker
          </span>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {/* Upload area */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {!image ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-white/20 rounded-2xl py-12 flex flex-col items-center gap-3 hover:border-pink-400/50 hover:bg-white/5 transition-colors"
            >
              <div className="w-16 h-16 bg-pink-400/10 rounded-full flex items-center justify-center">
                <Upload size={28} className="text-pink-400" />
              </div>
              <p className="text-white font-medium">Upload an image</p>
              <p className="text-white/40 text-sm">PNG, JPG or WebP</p>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-white/10">
                <img src={image} alt="Sticker preview" className="w-full h-48 object-contain bg-white/5" />
                <button
                  onClick={() => { setImage(null); setError(''); }}
                  className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded-full hover:bg-black/90"
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-white/40 text-xs text-center">Sticker will be created at 512×512 with a white background</p>
            </div>
          )}

          {image && (
            <div className="mt-4">
              <label className="block text-sm text-white/70 mb-2">Sticker name</label>
              <input
                type="text"
                value={stickerName}
                onChange={(e) => setStickerName(e.target.value)}
                placeholder="My custom sticker"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-pink-400/50"
              />
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          {image && (
            <button
              onClick={processSticker}
              disabled={isProcessing}
              className="mt-4 w-full bg-pink-500 text-white py-3 rounded-xl font-semibold hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Scissors size={18} className="animate-pulse" /> Processing...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Create Sticker
                </>
              )}
            </button>
          )}

          {/* My custom stickers */}
          {customStickers.length > 0 && (
            <div className="mt-6">
              <h4 className="text-white/70 text-sm font-semibold mb-3 flex items-center gap-2">
                <ImageIcon size={14} /> My Stickers ({customStickers.length})
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {customStickers.map((sticker) => (
                  <div key={sticker.id} className="relative group">
                    <img src={sticker.url} alt={sticker.name} className="w-full aspect-square object-contain rounded-lg border border-white/10" />
                    <button
                      onClick={() => deleteSticker(sticker.id)}
                      className="absolute top-1 right-1 bg-black/70 text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Delete sticker"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StickerCreator;