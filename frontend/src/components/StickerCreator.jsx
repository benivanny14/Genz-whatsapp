import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Scissors, Wand2, Trash2, Image as ImageIcon, Video as VideoIcon, Sparkles } from 'lucide-react';

const StickerCreator = ({ onClose, onStickerCreated }) => {
  const [media, setMedia] = useState(null); // { type: 'image'|'video', url }
  const [stickerName, setStickerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [customStickers, setCustomStickers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('genz_custom_stickers') || '[]');
    } catch { return []; }
  });
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  // Revoke object URLs (videos) when the creator closes
  useEffect(() => {
    const url = media?.type === 'video' ? media.url : null;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please select an image or video file');
      return;
    }
    if (media?.type === 'video') URL.revokeObjectURL(media.url);
    if (file.type.startsWith('video/')) {
      setMedia({ type: 'video', url: URL.createObjectURL(file) });
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setMedia({ type: 'image', url: ev.target.result });
      reader.readAsDataURL(file);
    }
    setError('');
  };

  // Smart crop: detect the content bounding box (pixels that are not near-white
  // or transparent), then crop a square centered on it and scale to 512×512 with
  // a transparent background — WhatsApp-style stickers instead of white bars.
  const createSquareSticker = (source, srcW, srcH) => {
    const detectCanvas = document.createElement('canvas');
    detectCanvas.width = srcW;
    detectCanvas.height = srcH;
    const dctx = detectCanvas.getContext('2d');
    dctx.drawImage(source, 0, 0, srcW, srcH);

    let imgData = null;
    try { imgData = dctx.getImageData(0, 0, srcW, srcH); } catch (e) { /* cross-origin */ }

    let box = null;
    if (imgData) {
      const { data, width, height } = imgData;
      const threshold = 240; // treat near-white as background
      let minX = width, minY = height, maxX = -1, maxY = -1;
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const i = (y * width + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          const isBg = a < 25 || (r > threshold && g > threshold && b > threshold);
          if (!isBg) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX >= 0 && maxY >= 0 && (maxX - minX) > 8 && (maxY - minY) > 8) {
        box = { minX, minY, maxX, maxY };
      }
    }

    const pad = 12;
    let cropX, cropY, cropW, cropH;
    if (box) {
      cropX = Math.max(0, box.minX - pad);
      cropY = Math.max(0, box.minY - pad);
      cropW = Math.min(srcW - cropX, box.maxX - box.minX + pad * 2);
      cropH = Math.min(srcH - cropY, box.maxY - box.minY + pad * 2);
    } else {
      cropX = 0; cropY = 0; cropW = srcW; cropH = srcH;
    }

    // Make the crop region square, centered on the detected content
    const side = Math.max(cropW, cropH);
    let sx = cropX + cropW / 2 - side / 2;
    let sy = cropY + cropH / 2 - side / 2;
    sx = Math.max(0, Math.min(sx, srcW - side));
    sy = Math.max(0, Math.min(sy, srcH - side));
    const actualSide = Math.min(side, srcW - sx, srcH - sy);
    sx = Math.max(0, Math.min(sx, srcW - actualSide));
    sy = Math.max(0, Math.min(sy, srcH - actualSide));

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    // Transparent background (WhatsApp-style stickers)
    ctx.clearRect(0, 0, 512, 512);

    // Only draw inside the detected content box; everything outside stays
    // transparent (no white bars / letterboxing around the subject).
    const scale = 512 / actualSide;
    if (box) {
      const contentX = (box.minX - sx) * scale;
      const contentY = (box.minY - sy) * scale;
      const contentW = (box.maxX - box.minX) * scale;
      const contentH = (box.maxY - box.minY) * scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(contentX, contentY, contentW, contentH);
      ctx.clip();
      ctx.drawImage(detectCanvas, sx, sy, actualSide, actualSide, 0, 0, 512, 512);
      ctx.restore();
    } else {
      ctx.drawImage(detectCanvas, sx, sy, actualSide, actualSide, 0, 0, 512, 512);
    }
    return canvas;
  };

  const processSticker = async () => {
    if (!media) {
      setError('Please select an image or video first');
      return;
    }
    setIsProcessing(true);
    setError('');

    try {
      let outCanvas;
      if (media.type === 'image') {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = media.url;
        });
        outCanvas = createSquareSticker(img, img.naturalWidth, img.naturalHeight);
      } else {
        // Video: use the frame the user paused on
        const video = videoRef.current;
        if (!video || !video.videoWidth) {
          throw new Error('Video frame not ready');
        }
        outCanvas = createSquareSticker(video, video.videoWidth, video.videoHeight);
      }

      const stickerUrl = outCanvas.toDataURL('image/png');

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
      if (media.type === 'video') URL.revokeObjectURL(media.url);
      setMedia(null);
      setStickerName('');
    } catch (err) {
      console.error('Sticker processing error:', err);
      setError('Failed to process sticker. Make sure your video has loaded and is paused on a frame.');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteSticker = (id) => {
    const updated = customStickers.filter(s => s.id !== id);
    setCustomStickers(updated);
    localStorage.setItem('genz_custom_stickers', JSON.stringify(updated));
  };

  const clearMedia = () => {
    if (media?.type === 'video') URL.revokeObjectURL(media.url);
    setMedia(null);
    setError('');
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
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {!media ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-white/20 rounded-2xl py-12 flex flex-col items-center gap-3 hover:border-pink-400/50 hover:bg-white/5 transition-colors"
            >
              <div className="w-16 h-16 bg-pink-400/10 rounded-full flex items-center justify-center">
                <Upload size={28} className="text-pink-400" />
              </div>
              <p className="text-white font-medium">Upload an image or video</p>
              <p className="text-white/40 text-sm">PNG, JPG, WebP or MP4</p>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-white/10">
                {media.type === 'image' ? (
                  <img src={media.url} alt="Sticker preview" className="w-full h-48 object-contain bg-white/5" />
                ) : (
                  <video
                    ref={videoRef}
                    src={media.url}
                    controls
                    muted
                    playsInline
                    className="w-full h-48 object-contain bg-white/5"
                  />
                )}
                <button
                  onClick={clearMedia}
                  className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded-full hover:bg-black/90"
                  aria-label="Remove media"
                >
                  <X size={16} />
                </button>
              </div>
              {media.type === 'video' ? (
                <p className="text-white/40 text-xs text-center flex items-center justify-center gap-1">
                  <VideoIcon size={12} /> Pause the video on the frame you want, then create the sticker
                </p>
              ) : (
                <p className="text-white/40 text-xs text-center">Sticker will be smart-cropped to 512×512 with a transparent background</p>
              )}
            </div>
          )}

          {media && (
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

          {media && (
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
