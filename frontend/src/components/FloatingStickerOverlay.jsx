import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingStickerOverlay = ({ onStickerReceived, isMobile }) => {
  const [floatingStickers, setFloatingStickers] = useState([]);
  // Keep the latest callback in a ref so the registration effect below only
  // runs once (a new inline onStickerReceived reference on every parent render
  // used to retrigger it forever → "Maximum update depth exceeded").
  const onStickerReceivedRef = useRef(onStickerReceived);
  useEffect(() => {
    onStickerReceivedRef.current = onStickerReceived;
  }, [onStickerReceived]);

  const spawnSticker = useCallback((stickerData, own = true) => {
    const id = `fstick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const stick = {
      id,
      ...stickerData,
      left: 5 + Math.random() * 80,
      right: 5 + Math.random() * 80,
      size: isMobile ? 60 : (own ? 80 : 60),
      baseY: isMobile ? -80 : -120,
      amplitude: isMobile ? 60 : 80,
      lifetime: 2000 + Math.random() * 1000,
    };
    setFloatingStickers(prev => [...prev, stick]);

    setTimeout(() => {
      setFloatingStickers(prev => prev.filter(s => s.id !== id));
    }, stick.lifetime);
  }, [isMobile]);

  useEffect(() => {
    if (!onStickerReceivedRef.current) return;
    const handler = (stickerData) => spawnSticker(stickerData, false);
    onStickerReceivedRef.current(handler);
    return () => setFloatingStickers([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spawnSticker]);

  const bottomOffset = isMobile ? 'calc(100px + 4rem)' : '120px';

  return (
    <AnimatePresence>
      {floatingStickers.map((sticker) => (
        <motion.div
          key={sticker.id}
          className="fixed pointer-events-none z-[160] select-none drop-shadow-xl"
          style={{
            bottom: bottomOffset,
            left: `${sticker.left}%`,
            width: `${sticker.size}px`,
            height: `${sticker.size}px`,
          }}
          initial={{ opacity: 0, scale: 0.3, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.3, 1, 1.2, 0.8],
            y: [0, -sticker.amplitude, -(sticker.amplitude * 2), -(sticker.amplitude * 3)],
            x: [0, sticker.left > 50 ? -15 : 15, sticker.left > 50 ? 10 : -10],
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
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

export default FloatingStickerOverlay;
