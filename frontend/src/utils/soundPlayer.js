// Real notification sound player using Web Audio API
// No external files needed - generates sounds programmatically

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null;

const getCtx = () => {
  if (!ctx || ctx.state === 'closed') ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

// WhatsApp-style message received sound
export const playMessageSound = () => {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, c.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    osc.start(c.currentTime); osc.stop(c.currentTime + 0.3);
  } catch (_) {}
};

// Message sent sound
export const playSentSound = () => {
  try {
    const c = getCtx();
    [900, 1100].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, c.currentTime + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.2, c.currentTime + i * 0.07 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.07 + 0.15);
      osc.start(c.currentTime + i * 0.07); osc.stop(c.currentTime + i * 0.07 + 0.15);
    });
  } catch (_) {}
};

// Incoming call ringtone
export const playCallRingtone = () => {
  try {
    const c = getCtx();
    const ring = (startTime) => {
      [440, 493].forEach(freq => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain); gain.connect(c.destination);
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.05);
        gain.gain.setValueAtTime(0.35, startTime + 0.4);
        gain.gain.linearRampToValueAtTime(0, startTime + 0.45);
        osc.start(startTime); osc.stop(startTime + 0.5);
      });
    };
    ring(c.currentTime);
    ring(c.currentTime + 0.6);
  } catch (_) {}
};

// Video call start sound
export const playCallConnectedSound = () => {
  try {
    const c = getCtx();
    [523, 659, 784].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, c.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.3, c.currentTime + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.18);
      osc.start(c.currentTime + i * 0.12); osc.stop(c.currentTime + i * 0.12 + 0.2);
    });
  } catch (_) {}
};

export default { playMessageSound, playSentSound, playCallRingtone, playCallConnectedSound };
