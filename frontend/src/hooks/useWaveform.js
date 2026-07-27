import { useRef, useCallback, useEffect } from 'react';

export const useWaveform = () => {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dataArrayRef = useRef(null);

  const initialize = useCallback(async (stream) => {
    try {
      // Create AudioContext with optimized settings
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass({
        latencyHint: 'interactive',
        sampleRate: 44100
      });

      // Create analyser node
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      // Create source from stream
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      // Create data array for frequency data
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      return true;
    } catch (error) {
      console.error('Waveform initialization error:', error);
      return false;
    }
  }, []);

  const getWaveformData = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) {
      return null;
    }

    try {
      // Get frequency data in real-time
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      // Convert to waveform bars (use lower frequencies for voice)
      const bars = [];
      const barCount = 30;
      const step = Math.floor(dataArrayRef.current.length / barCount);

      for (let i = 0; i < barCount; i++) {
        const dataIndex = i * step;
        const value = dataArrayRef.current[dataIndex];
        // Normalize to 0-1 range
        bars.push(value / 255);
      }

      return bars;
    } catch (error) {
      console.error('Waveform data error:', error);
      return null;
    }
  }, []);

  const startAnalysis = useCallback((callback) => {
    const analyze = () => {
      const data = getWaveformData();
      if (data) {
        callback(data);
      }
      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, [getWaveformData]);

  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopAnalysis();

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    dataArrayRef.current = null;
  }, [stopAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    initialize,
    getWaveformData,
    startAnalysis,
    stopAnalysis,
    cleanup
  };
};
