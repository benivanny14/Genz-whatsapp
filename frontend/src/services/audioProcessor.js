// Audio processing utilities for voice effects

// Convert AudioBuffer to WAV format
const audioBufferToWav = (buffer) => {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numCh * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);
  
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
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
};

// Apply voice effect using Web Audio API
export const applyVoiceEffect = async (audioBlob, effect = 'none') => {
  if (effect === 'none' || !audioBlob) return audioBlob;
  
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    
    // Apply different effects based on selection
    switch (effect) {
      case 'child':
        source.playbackRate.value = 1.5;
        source.connect(offlineCtx.destination);
        break;
        
      case 'robot':
        source.playbackRate.value = 0.75;
        source.connect(offlineCtx.destination);
        
        // Add robotic effect with frequency modulation
        const oscillator = offlineCtx.createOscillator();
        oscillator.frequency.value = 50;
        oscillator.type = 'sawtooth';
        const gainNode = offlineCtx.createGain();
        gainNode.gain.value = 0.1;
        oscillator.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        oscillator.start(0);
        oscillator.stop(audioBuffer.duration);
        break;
        
      case 'deep':
        source.playbackRate.value = 0.6;
        source.connect(offlineCtx.destination);
        break;
        
      case 'echo':
        // Add echo effect
        const delayNode = offlineCtx.createDelay(1);
        delayNode.delayTime.value = 0.3;
        const feedbackNode = offlineCtx.createGain();
        feedbackNode.gain.value = 0.4;
        
        source.connect(delayNode);
        delayNode.connect(feedbackNode);
        feedbackNode.connect(delayNode);
        delayNode.connect(offlineCtx.destination);
        source.connect(offlineCtx.destination);
        break;
        
      default:
        source.connect(offlineCtx.destination);
    }
    
    source.start(0);
    const rendered = await offlineCtx.startRendering();
    
    // Convert back to blob
    const wavBlob = audioBufferToWav(rendered);
    await audioCtx.close();
    
    return wavBlob;
  } catch (error) {
    console.error('Voice effect failed, using original:', error);
    return audioBlob;
  }
};

// Compress audio to reduce file size
export const compressAudio = async (audioBlob, quality = 'medium') => {
  // For now, return the original blob
  // In production, this would use audio compression libraries
  return audioBlob;
};

// Noise suppression (basic implementation)
export const suppressNoise = async (audioBlob) => {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    
    // Create a high-pass filter to remove low-frequency noise
    const highPassFilter = offlineCtx.createBiquadFilter();
    highPassFilter.type = 'highpass';
    highPassFilter.frequency.value = 80; // Remove frequencies below 80Hz
    
    // Create a low-pass filter to remove high-frequency noise
    const lowPassFilter = offlineCtx.createBiquadFilter();
    lowPassFilter.type = 'lowpass';
    lowPassFilter.frequency.value = 8000; // Remove frequencies above 8kHz
    
    source.connect(highPassFilter);
    highPassFilter.connect(lowPassFilter);
    lowPassFilter.connect(offlineCtx.destination);
    
    source.start(0);
    const rendered = await offlineCtx.startRendering();
    
    const wavBlob = audioBufferToWav(rendered);
    await audioCtx.close();
    
    return wavBlob;
  } catch (error) {
    console.error('Noise suppression failed, using original:', error);
    return audioBlob;
  }
};

// Normalize audio volume
export const normalizeAudio = async (audioBlob) => {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    
    // Calculate peak amplitude
    const channelData = audioBuffer.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < channelData.length; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > peak) peak = abs;
    }
    
    // Apply gain to normalize to -3dB
    const targetPeak = 0.707; // -3dB
    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = targetPeak / (peak || 1);
    
    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);
    
    source.start(0);
    const rendered = await offlineCtx.startRendering();
    
    const wavBlob = audioBufferToWav(rendered);
    await audioCtx.close();
    
    return wavBlob;
  } catch (error) {
    console.error('Audio normalization failed, using original:', error);
    return audioBlob;
  }
};

// Get audio metadata
export const getAudioMetadata = async (audioBlob) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    
    audio.onloadedmetadata = () => {
      resolve({
        duration: audio.duration,
        sampleRate: null, // Would need to decode to get this
        channels: null
      });
    };
    
    audio.onerror = () => {
      resolve({
        duration: 0,
        sampleRate: null,
        channels: null
      });
    };
    
    audio.src = URL.createObjectURL(audioBlob);
  });
};
