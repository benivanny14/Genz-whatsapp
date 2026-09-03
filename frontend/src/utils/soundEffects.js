/**
 * Extended Sound Effects for Genz Messenger
 * Supplements notificationSounds.js with additional tones for:
 * - Success/error feedback
 * - Recording start/stop
 * - Group mention alerts
 * - UI interactions (optional, controlled by user settings)
 */

let audioCtx = null;

const getCtx = () => {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {
      return null;
    }
  }
  return audioCtx;
};

const playTone = (freq, duration = 0.1, volume = 0.3, type = 'sine') => {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
};

/** Success chime — ascending two-tone */
export const playSuccessSound = () => {
  playTone(523, 0.1, 0.2, 'sine');
  setTimeout(() => playTone(784, 0.12, 0.18, 'sine'), 100);
};

/** Error/warning — descending tone */
export const playErrorSound = () => {
  playTone(400, 0.15, 0.2, 'square');
  setTimeout(() => playTone(300, 0.2, 0.15, 'square'), 150);
};

/** Recording start beep */
export const playRecordStartSound = () => {
  playTone(440, 0.15, 0.2, 'triangle');
};

/** Recording stop beep */
export const playRecordStopSound = () => {
  playTone(880, 0.1, 0.15, 'triangle');
  setTimeout(() => playTone(660, 0.12, 0.12, 'triangle'), 100);
};

/** Group mention alert — attention-getting three-tone */
export const playMentionSound = () => {
  playTone(523, 0.12, 0.3, 'sine');
  setTimeout(() => playTone(659, 0.12, 0.25, 'sine'), 120);
  setTimeout(() => playTone(784, 0.15, 0.2, 'sine'), 240);
};

/** Initialize audio context on first user interaction */
export const initAudio = () => {
  try {
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  } catch (_) {}
};

export const isAudioSupported = () => {
  try {
    return !!(window.AudioContext || window.webkitAudioContext);
  } catch (_) {
    return false;
  }
};
