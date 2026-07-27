import { useState, useRef, useCallback, useEffect } from 'react';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [error, setError] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);

  const audioRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const handlersRef = useRef({});

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startProgressTracking = useCallback(() => {
    stopProgressTracking();
    progressIntervalRef.current = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 100);
  }, [stopProgressTracking]);

  const loadAudio = useCallback((audioUrlOrBlob) => {
    try {
      setError(null);

      if (!audioUrlOrBlob) {
        throw new Error('No audio source provided');
      }

      if (audioRef.current) {
        const prev = audioRef.current;
        const h = handlersRef.current;
        if (h.onLoadedMetadata) prev.removeEventListener('loadedmetadata', h.onLoadedMetadata);
        if (h.onTimeUpdate) prev.removeEventListener('timeupdate', h.onTimeUpdate);
        if (h.onEnded) prev.removeEventListener('ended', h.onEnded);
        if (h.onError) prev.removeEventListener('error', h.onError);
        if (h.onWaiting) prev.removeEventListener('waiting', h.onWaiting);
        if (h.onCanPlay) prev.removeEventListener('canplay', h.onCanPlay);
        prev.pause();
        prev.currentTime = 0;
      }

      const audio = new Audio();
      audioRef.current = audio;

      const onLoadedMetadata = () => {
        setDuration(audio.duration);
        setIsBuffering(false);
      };
      const onTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      const onEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        stopProgressTracking();
      };
      const onError = (e) => {
        console.error('Audio error:', e);
        const errorMessage = audio.error ? audio.error.message : 'Failed to load audio';
        setError(errorMessage);
        setIsPlaying(false);
        setIsBuffering(false);
      };
      const onWaiting = () => setIsBuffering(true);
      const onCanPlay = () => setIsBuffering(false);

      handlersRef.current = {
        onLoadedMetadata,
        onTimeUpdate,
        onEnded,
        onError,
        onWaiting,
        onCanPlay
      };

      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      audio.addEventListener('waiting', onWaiting);
      audio.addEventListener('canplay', onCanPlay);

      if (audioUrlOrBlob instanceof Blob) {
        audio.src = URL.createObjectURL(audioUrlOrBlob);
      } else if (typeof audioUrlOrBlob === 'string') {
        audio.src = audioUrlOrBlob;
      } else {
        throw new Error('Invalid audio source type');
      }

      audio.load();
      return true;
    } catch (err) {
      console.error('Load audio error:', err);
      setError('Failed to load audio');
      return false;
    }
  }, [stopProgressTracking]);

  const play = useCallback(() => {
    if (!audioRef.current) return;

    try {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          startProgressTracking();
        })
        .catch((err) => {
          console.error('Play error:', err);
          setError('Failed to play audio');
        });
    } catch (err) {
      console.error('Play error:', err);
      setError('Failed to play audio');
    }
  }, [playbackSpeed, startProgressTracking]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;

    try {
      audioRef.current.pause();
      setIsPlaying(false);
      stopProgressTracking();
    } catch (err) {
      console.error('Pause error:', err);
    }
  }, [stopProgressTracking]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time) => {
    if (!audioRef.current) return;

    try {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    } catch (err) {
      console.error('Seek error:', err);
    }
  }, []);

  const setSpeed = useCallback((speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopProgressTracking();

    if (audioRef.current) {
      const audio = audioRef.current;
      const h = handlersRef.current;
      if (h.onLoadedMetadata) audio.removeEventListener('loadedmetadata', h.onLoadedMetadata);
      if (h.onTimeUpdate) audio.removeEventListener('timeupdate', h.onTimeUpdate);
      if (h.onEnded) audio.removeEventListener('ended', h.onEnded);
      if (h.onError) audio.removeEventListener('error', h.onError);
      if (h.onWaiting) audio.removeEventListener('waiting', h.onWaiting);
      if (h.onCanPlay) audio.removeEventListener('canplay', h.onCanPlay);
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
      handlersRef.current = {};
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setIsBuffering(false);
  }, [stopProgressTracking]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    error,
    isBuffering,
    loadAudio,
    play,
    pause,
    toggle,
    seek,
    setSpeed,
    cleanup
  };
};
