// Lightweight Web Audio API tone generator for in-app notification sounds.
// No audio asset files are bundled, so tones are synthesized on the fly —
// this keeps things reliable (no missing-file risk) and tiny.

const TONE_PATTERNS = {
  default: [[880, 0, 0.3]],
  classic: [[880, 0, 0.2], [880, 0.25, 0.15], [880, 0.45, 0.1]],
  modern: [[1400, 0, 0.05], [1000, 0.08, 0.15]],
  soft: [[440, 0, 0.4]],
};

let sharedCtx = null;
const getCtx = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new Ctx();
  }
  // Resume AudioContext if suspended (autoplay policy)
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(err => {
      console.warn('[notificationSounds] Failed to resume AudioContext:', err);
    });
  }
  return sharedCtx;
};

/**
 * Play a short synthesized notification tone.
 * @param {string} soundKey - 'default' | 'classic' | 'modern' | 'soft' | 'none'
 * @param {number} volume - 0..1 gain multiplier
 */
export const playTone = (soundKey = 'default', volume = 0.4) => {
  if (soundKey === 'none') return;
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const notes = TONE_PATTERNS[soundKey] || TONE_PATTERNS.default;
    notes.forEach(([freq, delay, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur + 0.05);
    });
  } catch (e) {
    console.warn('[notificationSounds] Failed to play tone:', e);
  }
};

const getSelectedSound = () => {
  try {
    return JSON.parse(localStorage.getItem('genz_settings_comprehensive') || '{}').notificationSound || 'default';
  } catch {
    return 'default';
  }
};

/** Sound for an incoming message. */
export const playMessageSound = () => playTone(getSelectedSound(), 0.4);

/** Softer/quieter sound confirming an outgoing message was sent. */
export const playSentSound = () => playTone(getSelectedSound(), 0.15);
