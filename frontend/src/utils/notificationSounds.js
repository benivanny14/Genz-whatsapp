// Lightweight Web Audio API tone generator for in-app notification sounds.
// No audio asset files are bundled, so tones are synthesized on the fly —
// this keeps things reliable (no missing-file risk) and tiny.

const TONE_PATTERNS = {
  default: [[880, 0, 0.3]],
  classic: [[880, 0, 0.2], [880, 0.25, 0.15], [880, 0.45, 0.1]],
  modern: [[1400, 0, 0.05], [1000, 0.08, 0.15]],
  soft: [[440, 0, 0.4]],
  chime: [[1200, 0, 0.1], [800, 0.12, 0.15], [600, 0.3, 0.2]],
  droplet: [[1800, 0, 0.03], [1200, 0.04, 0.08], [600, 0.1, 0.15]],
  echo: [[880, 0, 0.2], [660, 0.3, 0.2], [440, 0.6, 0.3]],
  alert: [[1000, 0, 0.1], [1000, 0.15, 0.1], [1000, 0.3, 0.1]],
};

const CUSTOM_TONE_KEY = 'genz_custom_notification_tone';
let customAudioUrl = null;

let sharedCtx = null;
const getCtx = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new Ctx();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(err => {
      console.warn('[notificationSounds] Failed to resume AudioContext:', err);
    });
  }
  return sharedCtx;
};

/**
 * Play a short synthesized notification tone.
 * @param {string} soundKey - 'default' | 'classic' | 'modern' | 'soft' | 'custom' | 'none'
 * @param {number} volume - 0..1 gain multiplier
 */
export const playTone = (soundKey = 'default', volume = 0.4) => {
  if (soundKey === 'none') return;

  if (soundKey === 'custom') {
    try {
      const stored = localStorage.getItem(CUSTOM_TONE_KEY);
      if (stored) {
        if (!customAudioUrl) {
          const byteChars = atob(stored);
          const bytes = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'audio/mpeg' });
          customAudioUrl = URL.createObjectURL(blob);
        }
        const audio = new Audio(customAudioUrl);
        audio.volume = volume;
        audio.play().catch(() => {});
        return;
      }
    } catch (e) { /* fall through to synth */ }
  }

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

export const uploadCustomTone = (file) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('audio/')) {
      return reject(new Error('Invalid audio file'));
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      localStorage.setItem(CUSTOM_TONE_KEY, base64);
      customAudioUrl = null;
      resolve();
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const hasCustomTone = () => {
  return !!localStorage.getItem(CUSTOM_TONE_KEY);
};

export const removeCustomTone = () => {
  localStorage.removeItem(CUSTOM_TONE_KEY);
  customAudioUrl = null;
};

export const TONE_OPTIONS = [
  { id: 'default', name: 'Default (Tring)' },
  { id: 'classic', name: 'Classic' },
  { id: 'modern', name: 'Modern' },
  { id: 'soft', name: 'Soft' },
  { id: 'chime', name: 'Chime' },
  { id: 'droplet', name: 'Droplet' },
  { id: 'echo', name: 'Echo' },
  { id: 'alert', name: 'Alert' },
  { id: 'custom', name: 'Custom Upload' },
  { id: 'none', name: 'Silent' },
];

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
