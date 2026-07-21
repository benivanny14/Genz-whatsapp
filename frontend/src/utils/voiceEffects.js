/**
 * Unified TM WhatsApp–style voice note processing for GENZ.
 * Used by ChatContext (voice changer mod), VoiceRecorder, and GENZ Settings presets.
 */

export const VOICE_EFFECT_PRESETS = [
  { id: 'none', label: 'Kawaida', icon: '🎙️', hint: 'Sauti asilia' },
  { id: 'child', label: 'Mtoto', icon: '👶', hint: 'Juuchi ya juu (playback ↑)' },
  { id: 'girl', label: 'Msichana', icon: '👩', hint: 'Sauti laini iliyo pitch kidogo juu' },
  { id: 'boy', label: 'Mvulana', icon: '👨', hint: 'Pitch ya chini kiasi' },
  { id: 'robot', label: 'Roboti', icon: '🤖', hint: 'Roboti / distortion laini' },
  { id: 'deep', label: 'Mzito', icon: '🌊', hint: 'Basso nzito' },
  { id: 'echo', label: 'Echo', icon: '📣', hint: 'Kielelezo cha kusikitisha' }
];

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

export async function applyVoiceEffect(audioBlob, effect = 'none') {
  if (effect === 'none' || !audioBlob || audioBlob.size === 0) return audioBlob;

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume?.();

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    // Determine playback rate factor for offline render length calculation
    const rateMap = {
      child: 1.48,
      girl: 1.22,
      boy: 0.84,
      deep: 0.62,
      robot: 0.82,
      echo: 1
    };
    const rate = rateMap[effect] || 1;

    // Compute a safe offline length that accounts for playbackRate changes
    const offlineLength = Math.max(1, Math.ceil(audioBuffer.length / Math.max(0.0001, rate)));

    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      offlineLength,
      audioBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    const connectDry = () => source.connect(offlineCtx.destination);

    // set playbackRate early so offline length matches expectation
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
      // mix dry + shaped
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
      // simple pitch/speed effects fall back to dry connection
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
