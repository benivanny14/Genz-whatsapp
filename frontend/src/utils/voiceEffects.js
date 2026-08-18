/**
 * Unified TM WhatsApp–style voice note processing for GENZ.
 * Used by ChatContext (voice changer mod), VoiceRecorder, and GENZ Settings presets.
 *
 * Female/Male/Girl/Boy use a two-part recipe that sounds natural on real speech:
 *   1. A moderate playbackRate shift (the browser's high-quality resampler),
 *      kept away from the chipmunk/demon extremes.
 *   2. A formant EQ that colours the spectrum toward the target gender
 *      (female: brighter F2/F3 + airy top; male: chestier low-mid, darker top),
 *      plus a light compressor for natural, even levels.
 * This is the approach production web voice changers use — robust on real
 * voices with changing pitch (no phase-sensitive artifacts), while the EQ
 * supplies the perceptual gender cue.
 */

export const VOICE_EFFECT_PRESETS = [
  { id: 'none', label: 'Normal', icon: '🎙️', hint: 'Original voice' },
  { id: 'female', label: 'Female', icon: '👩', hint: 'Realistic female voice (pitch + formant EQ)' },
  { id: 'male', label: 'Male', icon: '👨', hint: 'Realistic male voice (pitch + formant EQ)' },
  { id: 'girl', label: 'Girl', icon: '👧', hint: 'Soft voice, slightly higher pitch' },
  { id: 'boy', label: 'Boy', icon: '👦', hint: 'Slightly lower pitch' },
  { id: 'child', label: 'Child', icon: '👶', hint: 'High pitch (playback ↑)' },
  { id: 'robot', label: 'Robot', icon: '🤖', hint: 'Robot / soft distortion' },
  { id: 'deep', label: 'Deep', icon: '🌊', hint: 'Deep bass' },
  { id: 'echo', label: 'Echo', icon: '📣', hint: 'Echo effect' }
];

/**
 * Gender effects: playbackRate (1 = no change) + formant EQ preset.
 * Rates are deliberately moderate: ~1.24 up lifts a male voice into the
 * feminine range without chipmunk squeak; ~0.78 down drops a female voice
 * into the male range without a "demon" growl.
 */
const GENDER_PRESETS = {
  female: { rate: 1.24, eq: 'female' },
  male: { rate: 0.78, eq: 'male' },
  girl: { rate: 1.12, eq: 'bright' },
  boy: { rate: 0.88, eq: 'warm' }
};

/**
 * Formant EQ chain — colours a pitch-shifted voice toward the target gender.
 * Returns an array of biquad filters to chain (the last one connects onward).
 */
function buildFormantChain(ctx, preset) {
  const filters = [];
  const add = (type, freq, q, gain) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    if (gain !== undefined) f.gain.value = gain;
    filters.push(f);
    return f;
  };

  if (preset === 'female') {
    // Brighter F2/F3 + airy top — the classic female vocal-tract colour.
    add('peaking', 260, 1.0, 1.5);
    add('peaking', 1050, 1.2, 2.0);
    add('peaking', 2900, 1.0, 3.0);
    add('highshelf', 6200, 0.8, 2.5);
  } else if (preset === 'male') {
    // Chesty low-mid + darker top — the classic male vocal-tract colour.
    add('lowshelf', 150, 0.8, 2.5);
    add('peaking', 280, 1.0, 3.0);
    add('peaking', 900, 1.0, 1.5);
    add('peaking', 2600, 1.0, -2.0);
    add('highshelf', 5200, 0.8, -3.0);
  } else if (preset === 'bright') {
    add('peaking', 3000, 1.0, 2.0);
    add('highshelf', 6000, 0.8, 1.5);
  } else if (preset === 'warm') {
    add('peaking', 250, 1.0, 2.5);
    add('highshelf', 5500, 0.8, -1.5);
  }
  return filters;
}

function audioBufferToWav(buffer) {
  if (!buffer || buffer.numberOfChannels === 0) {
    console.error('[voiceEffects] Invalid audio buffer for WAV conversion');
    return new Blob([], { type: 'audio/wav' });
  }

  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numCh * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Render a buffer through a formant EQ + compressor chain to a WAV blob.
 * When playbackRate is given, the source also plays at that rate.
 */
async function renderWithChain(audioBuffer, eqPreset, playbackRate = 1) {
  const offlineLength = Math.max(1, Math.ceil(audioBuffer.length / Math.max(0.0001, playbackRate)));
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    offlineLength,
    audioBuffer.sampleRate
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = playbackRate;

  const filters = buildFormantChain(offlineCtx, eqPreset);
  let node = source;
  for (const f of filters) {
    node.connect(f);
    node = f;
  }

  const comp = offlineCtx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 20;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;
  node.connect(comp);
  comp.connect(offlineCtx.destination);

  source.start(0);
  const rendered = await offlineCtx.startRendering();
  return audioBufferToWav(rendered);
}

export async function applyVoiceEffect(audioBlob, effect = 'none') {
  if (effect === 'none' || !audioBlob || audioBlob.size === 0) return audioBlob;

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume?.();

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    // Female / Male / Girl / Boy — pitch shift + formant EQ + compression.
    if (GENDER_PRESETS[effect]) {
      const cfg = GENDER_PRESETS[effect];
      const wavBlob = await renderWithChain(audioBuffer, cfg.eq, cfg.rate);
      await audioCtx.close();
      return wavBlob;
    }

    // Simple legacy effects (child / deep / robot / echo)
    const rateMap = {
      child: 1.48,
      deep: 0.62,
      robot: 0.82,
      echo: 1
    };
    const rate = rateMap[effect] || 1;
    const offlineLength = Math.max(1, Math.ceil(audioBuffer.length / Math.max(0.0001, rate)));

    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      offlineLength,
      audioBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    const connectDry = () => source.connect(offlineCtx.destination);

    source.playbackRate.value = rate;

    if (effect === 'robot') {
      // Robotic distortion via waveshaper (keep dry + wet for clarity)
      const waveShaper = offlineCtx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i / 512) - 1;
        curve[i] = Math.tanh(x * 3.5);
      }
      waveShaper.curve = curve;
      waveShaper.oversample = '4x';
      const dryGain = offlineCtx.createGain();
      dryGain.gain.value = 0.6;
      const wetGain = offlineCtx.createGain();
      wetGain.gain.value = 0.9;
      source.connect(dryGain);
      source.connect(waveShaper);
      waveShaper.connect(wetGain);
      dryGain.connect(offlineCtx.destination);
      wetGain.connect(offlineCtx.destination);
    } else if (effect === 'echo') {
      const delayNode = offlineCtx.createDelay(1);
      delayNode.delayTime.value = 0.22;
      const feedback = offlineCtx.createGain();
      feedback.gain.value = 0.35;
      const dry = offlineCtx.createGain();
      dry.gain.value = 0.92;
      const wet = offlineCtx.createGain();
      wet.gain.value = 0.55;
      source.connect(dry);
      dry.connect(offlineCtx.destination);
      source.connect(delayNode);
      delayNode.connect(wet);
      wet.connect(offlineCtx.destination);
      delayNode.connect(feedback);
      feedback.connect(delayNode);
    } else {
      connectDry();
    }

    source.start(0);
    const rendered = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWav(rendered);
    await audioCtx.close();
    return wavBlob;
  } catch (e) {
    console.error('[voiceEffects] applyVoiceEffect failed, using original:', e);
    return audioBlob;
  }
}

/** Short sine burst for Settings “test voice effect” preview (no microphone). */
export async function createTestToneBlob(durationSec = 0.45, frequencyHz = 220) {
  const sampleRate = 48000;
  const frames = Math.max(1, Math.floor(sampleRate * durationSec));
  const offline = new OfflineAudioContext(1, frames, sampleRate);
  const osc = offline.createOscillator();
  const gain = offline.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequencyHz;
  gain.gain.value = 0.22;
  osc.connect(gain);
  gain.connect(offline.destination);
  osc.start(0);
  osc.stop(durationSec);
  const rendered = await offline.startRendering();
  return audioBufferToWav(rendered);
}
