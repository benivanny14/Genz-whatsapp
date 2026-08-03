import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingStickerOverlay = ({ onStickerReceived }) => {
  const [floatingStickers, setFloatingStickers] = useState([]);

  const spawnSticker = useCallback((stickerData, isOwn = true) => {
    const id = `fstick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const stick = {
      id,
      ...stickerData,
      left: 10 + Math.random() * 70,
      right: 10 + Math.random() * 70,
      size: isOwn ? 80 : 60,
      lifetime: 2000 + Math.random() * 1000,
    };
    setFloatingStickers(prev => [...prev, stick]);

    setTimeout(() => {
      setFloatingStickers(prev => prev.filter(s => s.id !== id));
    }, stick.lifetime);
  }, []);

  useEffect(() => {
    if (!onStickerReceived) return;
    const handler = (stickerData) => {
      spawnSticker(stickerData, false);
    };
    onStickerReceived(handler);
    return () => {
      setFloatingStickers([]);
    };
  }, [onStickerReceived, spawnSticker]);

  return (
    <AnimatePresence>
      {floatingStickers.map((sticker) => (
        <motion.div
          key={sticker.id}
          className="fixed pointer-events-none z-[160] select-none drop-shadow-lg"
          style={{
            bottom: '120px',
            right: `${sticker.right}%`,
            fontSize: `${sticker.size}px`,
          }}
          initial={{ opacity: 0, scale: 0.3, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.3, 1, 1.2, 0.8],
            y: [-0, -120, -240, -360],
            x: [0, sticker.right > 50 ? -20 : 20, sticker.right > 50 ? 10 : -10],
          }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{
            duration: sticker.lifetime / 1000,
            ease: 'easeOut',
          }}
        >
          <img
            src={sticker.url || sticker.content}
            alt="floating sticker"
            className="w-full h-auto object-contain"
            loading="lazy"
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

export default FloatingStickerOverlay;
