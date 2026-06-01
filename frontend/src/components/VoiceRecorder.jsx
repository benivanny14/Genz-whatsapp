import { useRef, useState, useCallback, useEffect } from 'react';
import { Mic, Send, Trash2, Lock, ChevronLeft, ChevronUp, Pause, Play, Square, Wand2 } from 'lucide-react';
import { applyVoiceEffect, VOICE_EFFECT_PRESETS } from '../utils/voiceEffects';
import toast from 'react-hot-toast';

/** WhatsApp-style accent */
const WA_GREEN = '#25D366';

const LiveWaveform = ({ analyser, isActive, isPaused }) => {
  const [bars, setBars] = useState(() => Array(28).fill(4));
  const rafRef = useRef(null);

  useEffect(() => {
    if (!isActive || !analyser || isPaused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (!isActive || isPaused) setBars(Array(28).fill(4));
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const bins = 28;
      const step = Math.max(1, Math.floor(data.length / bins));
      const next = [];
      for (let i = 0; i < bins; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j] || 0;
        const h = (sum / step / 255) * 34 + 4;
        next.push(Math.min(38, Math.max(4, h)));
      }
      setBars(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isActive, isPaused]);

  return (
    <div className="flex items-center gap-[2px] h-9 flex-1 min-w-0">
      {bars.map((h, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-75"
          style={{
            width: 2.5,
            height: h,
            backgroundColor: isPaused ? '#889096' : WA_GREEN,
            opacity: isActive ? 0.92 : 0.35
          }}
        />
      ))}
    </div>
  );
};

function audioBufferToWav(buffer) {
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

async function blobToPlayablePreview(blob) {
  const t = blob?.type || '';
  if (t.includes('wav') || t.includes('mpeg')) return blob;
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume?.();
    const audioBuf = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const wav = audioBufferToWav(audioBuf);
    await ctx.close();
    return wav;
  } catch {
    return blob;
  }
}

const VoiceRecorder = ({
  onSend,
  canSend,
  ghostMode,
  sendRecordingStatus,
  onActiveChange,
  voiceConstraints,
  voiceEffectMod = 'none',
  onFallback
}) => {
  const [pickerEffect, setPickerEffect] = useState(null);
  const effectiveEffect = pickerEffect ?? voiceEffectMod ?? 'none';
  const effectiveEffectRef = useRef(effectiveEffect);
  useEffect(() => {
    effectiveEffectRef.current = effectiveEffect;
  }, [effectiveEffect]);

  useEffect(() => {
    setPickerEffect(null);
  }, [voiceEffectMod]);

  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const isLockedRef = useRef(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [duration, setDuration] = useState(0);
  const [swipe, setSwipe] = useState(null);
  const [error, setError] = useState(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [applyingEffect, setApplyingEffect] = useState(false);
  const [analyserNode, setAnalyserNode] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const cancelledRef = useRef(false);
  const durationRef = useRef(0);
  const previewAudioRef = useRef(null);
  const previewObjectUrlRef = useRef(null);
  const finalBlobRef = useRef(null);
  const audioAnalysisCtxRef = useRef(null);

  const isRecordingRef = useRef(false);

  const formatDuration = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const stopAnalyser = useCallback(() => {
    try {
      audioAnalysisCtxRef.current?.close?.();
    } catch (_) {
      /* noop */
    }
    audioAnalysisCtxRef.current = null;
    setAnalyserNode(null);
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration((d) => {
        const n = d + 1;
        durationRef.current = n;
        return n;
      });
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const revokePreviewObjectUrl = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  };

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    stopAnalyser();
  }, [stopAnalyser]);

  const resetAll = useCallback(() => {
    stopStream();
    setIsRecording(false);
    isRecordingRef.current = false;
    isLockedRef.current = false;
    setIsLocked(false);
    setIsPaused(false);
    setIsPreviewMode(false);
    setSwipe(null);
    setIsViewOnce(false);
    revokePreviewObjectUrl();
    setPreviewAudioUrl(null);
    finalBlobRef.current = null;
    setApplyingEffect(false);
    previewAudioRef.current?.pause();
    setIsPlayingPreview(false);
    setPickerEffect(null);
    if (onActiveChange) onActiveChange(false);
    if (!ghostMode && sendRecordingStatus) sendRecordingStatus(false);
  }, [stopStream, ghostMode, sendRecordingStatus, onActiveChange]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop();
    resetAll();
    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
  }, [resetAll]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;
    try {
      setError(null);
      cancelledRef.current = false;
      audioChunksRef.current = [];
      setDuration(0);
      durationRef.current = 0;
      setIsPaused(false);
      setIsPreviewMode(false);
      revokePreviewObjectUrl();
      setPreviewAudioUrl(null);
      finalBlobRef.current = null;
      setApplyingEffect(false);

      const audioOpts = {
        echoCancellation: voiceConstraints?.echoCancellation !== false,
        noiseSuppression: voiceConstraints?.noiseSuppression !== false,
        autoGainControl: voiceConstraints?.autoGainControl !== false,
        channelCount: 1
      };

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (onFallback) {
          onFallback();
        } else {
          toast.error("Kurekodi sauti kunahitaji mfumo salama (HTTPS au Localhost).");
        }
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioOpts });
      streamRef.current = stream;

      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        await ctx.resume?.();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;
        const src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);
        audioAnalysisCtxRef.current = ctx;
        setAnalyserNode(analyser);
      } catch (ae) {
        console.warn('[VoiceRecorder] Waveform analyser skipped:', ae);
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopStream();
        if (cancelledRef.current) return;

        const rawType = recorder.mimeType || 'audio/webm';
        const raw = new Blob(audioChunksRef.current, { type: rawType });
        if (raw.size < 120) return;

        setApplyingEffect(true);
        const fx = effectiveEffectRef.current;
        let processed = raw;
        try {
          processed = await applyVoiceEffect(raw, fx);
        } catch (effectError) {
          console.error('[VoiceRecorder] Voice effect application failed:', effectError);
          // Fall back to original audio if effect fails
          processed = raw;
        }
        setApplyingEffect(false);
        finalBlobRef.current = processed;

        if (!isLockedRef.current) {
          if (onSend) onSend(processed, durationRef.current, fx, isViewOnce);
          finalBlobRef.current = null;
          audioChunksRef.current = [];
          setIsRecording(false);
          isRecordingRef.current = false;
          if (onActiveChange) onActiveChange(false);
          if (!ghostMode && sendRecordingStatus) sendRecordingStatus(false);
          setPickerEffect(null);
        } else {
          let playable = processed;
          try {
            playable = await blobToPlayablePreview(processed);
          } catch (previewError) {
            console.error('[VoiceRecorder] Preview conversion failed:', previewError);
            // Fall back to processed blob if preview conversion fails
            playable = processed;
          }
          revokePreviewObjectUrl();
          const url = URL.createObjectURL(playable);
          previewObjectUrlRef.current = url;
          setPreviewAudioUrl(url);
          setIsPreviewMode(true);
          setIsRecording(false);
          if (!ghostMode && sendRecordingStatus) sendRecordingStatus(false);
        }
      };

      recorder.start(120);
      setIsRecording(true);
      isLockedRef.current = false;
      setIsLocked(false);
      setSwipe(null);
      startTimer();
      if (onActiveChange) onActiveChange(true);
      if (!ghostMode && sendRecordingStatus) sendRecordingStatus(true);
      if (navigator.vibrate) navigator.vibrate(40);
    } catch (err) {
      if (onFallback) {
        onFallback();
      } else {
        setError('Ruhusa ya maikrofoni imekataliwa');
        console.error('VoiceRecorder error:', err);
      }
      isRecordingRef.current = false;
    }
  }, [
    isRecording,
    ghostMode,
    sendRecordingStatus,
    onSend,
    voiceConstraints,
    onActiveChange,
    stopAnalyser,
    stopStream
  ]);

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      clearTimer();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimer();
      setIsPaused(false);
    }
  };

  const stopAndPreview = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      clearTimer();
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (!ghostMode && sendRecordingStatus) sendRecordingStatus(false);
    }
  };

  const sendDirectly = () => {
    if (!finalBlobRef.current && mediaRecorderRef.current?.state !== 'inactive') {
      clearTimer();
      isLockedRef.current = false;
      setIsLocked(false);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      if (!ghostMode && sendRecordingStatus) sendRecordingStatus(false);
      if (onActiveChange) onActiveChange(false);
    } else if (finalBlobRef.current) {
      if (onSend) onSend(finalBlobRef.current, durationRef.current, effectiveEffectRef.current, isViewOnce);
      resetAll();
    }
  };

  const onMouseDown = (e) => {
    if (e.button !== 0 || !canSend) return;
    e.preventDefault();
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startRecording();
  };

  const onMouseMove = useCallback(
    (e) => {
      if (!isRecording || isLocked) return;
      const dx = e.clientX - startXRef.current;
      const dy = startYRef.current - e.clientY;
      if (dx < -56) setSwipe('left');
      else if (dy > 56) setSwipe('up');
      else setSwipe(null);
    },
    [isRecording, isLocked]
  );

  const onMouseUp = useCallback(
    (e) => {
      if (!isRecording || isLocked) return;
      const dx = e.clientX - startXRef.current;
      const dy = startYRef.current - e.clientY;
      if (dx < -56) cancelRecording();
      else if (dy > 56) {
        isLockedRef.current = true;
        setIsLocked(true);
        setSwipe(null);
      } else sendDirectly();
      setSwipe(null);
    },
    [isRecording, isLocked, cancelRecording]
  );

  const onTouchStart = (e) => {
    if (!canSend) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    startRecording();
  };

  const onTouchMove = useCallback(
    (e) => {
      if (!isRecording || isLocked) return;
      const dx = e.touches[0].clientX - startXRef.current;
      const dy = startYRef.current - e.touches[0].clientY;
      if (dx < -56) setSwipe('left');
      else if (dy > 56) setSwipe('up');
      else setSwipe(null);
    },
    [isRecording, isLocked]
  );

  const onTouchEnd = useCallback(
    (e) => {
      if (!isRecording || isLocked) return;
      const dx = e.changedTouches[0].clientX - startXRef.current;
      const dy = startYRef.current - e.changedTouches[0].clientY;
      if (dx < -56) cancelRecording();
      else if (dy > 56) {
        isLockedRef.current = true;
        setIsLocked(true);
        setSwipe(null);
      } else sendDirectly();
      setSwipe(null);
    },
    [isRecording, isLocked, cancelRecording]
  );

  useEffect(
    () => () => {
      stopStream();
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      clearInterval(timerRef.current);
    },
    [stopStream]
  );

  const effectMeta = VOICE_EFFECT_PRESETS.find((x) => x.id === effectiveEffect);

  if (isPreviewMode) {
    return (
      <div className="flex-1 flex items-center justify-between gap-2 bg-dark-surface rounded-2xl p-2 px-4 border border-[#25D366]/35">
        <button type="button" onClick={cancelRecording} className="text-red-500 hover:text-red-600 transition-colors p-2">
          <Trash2 size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (isPlayingPreview) {
                previewAudioRef.current.pause();
                setIsPlayingPreview(false);
              } else {
                previewAudioRef.current.play();
                setIsPlayingPreview(true);
              }
            }}
            className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white flex-shrink-0 shadow-md"
          >
            {isPlayingPreview ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <div className="h-1 bg-gray-600 flex-1 rounded-full overflow-hidden">
            <div className={`h-full bg-[#25D366] ${isPlayingPreview ? 'animate-pulse w-full' : 'w-1/3'}`} />
          </div>
          <span className="text-xs text-white/80 font-mono tabular-nums">{formatDuration(duration)}</span>
          {effectiveEffect !== 'none' && (
            <span className="text-[10px] bg-[#075e54]/80 text-[#dcf8c6] px-2 py-0.5 rounded-full border border-white/10 flex-shrink-0">
              {effectMeta?.icon} {effectMeta?.label}
            </span>
          )}
          <audio ref={previewAudioRef} src={previewAudioUrl} onEnded={() => setIsPlayingPreview(false)} className="hidden" />
        </div>

        <button
          type="button"
          onClick={() => setIsViewOnce(!isViewOnce)}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border mr-1 ${isViewOnce ? 'bg-[#25D366] text-white border-[#25D366]' : 'bg-transparent text-gray-400 border-gray-500'
            }`}
          title="View Once"
        >
          <span className="text-[12px] font-bold">1</span>
        </button>

        <button
          type="button"
          onClick={sendDirectly}
          className="w-11 h-11 rounded-full bg-[#25D366] hover:brightness-110 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
        >
          <Send size={18} className="ml-0.5" />
        </button>
      </div>
    );
  }

  if (isRecording || isLocked) {
    return (
      <div className="flex-1 flex items-center gap-2 relative select-none touch-none">
        {!isLocked && (
          <div
            className="absolute -top-14 right-2 flex flex-col items-center gap-1 pointer-events-none z-20"
            style={{ opacity: swipe === 'up' ? 1 : 0.45, transition: 'opacity 0.15s' }}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${swipe === 'up' ? 'bg-[#25D366] border-[#128c7e] scale-110' : 'bg-dark-surface border-dark-border'
                }`}
            >
              <Lock size={15} className={swipe === 'up' ? 'text-white' : 'text-dark-textSecondary'} />
            </div>
            <ChevronUp size={12} className="text-dark-textSecondary animate-bounce" />
            <span className="text-[9px] text-dark-textSecondary">Funga</span>
          </div>
        )}

        <div className="flex-1 flex items-center gap-2 px-2 py-1 bg-[#102029] border border-white/10 rounded-full relative overflow-hidden min-w-0 shadow-inner">
          {isLocked && (
            <button type="button" onClick={cancelRecording} className="text-red-500 hover:bg-red-500/10 p-2 rounded-full flex-shrink-0" title="Futa">
              <Trash2 size={18} />
            </button>
          )}

          {!isLocked && (
            <div className="relative flex-shrink-0 ml-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#25D366]" />
              <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-35" />
            </div>
          )}

          {!isLocked && (
            <div className="flex items-center gap-1 flex-shrink-0" style={{ opacity: swipe === 'left' ? 1 : 0.55 }}>
              <ChevronLeft size={14} className={swipe === 'left' ? 'text-red-400' : 'text-dark-textSecondary'} />
              <span className={`text-[11px] font-semibold whitespace-nowrap ${swipe === 'left' ? 'text-red-400' : 'text-dark-textSecondary'}`}>
                Telezesha kufuta
              </span>
            </div>
          )}

          {isLocked && (
            isPaused ? (
              <button type="button" onClick={resumeRecording} className="text-[#25D366] hover:bg-[#25D366]/10 p-2 rounded-full flex-shrink-0">
                <Mic size={18} />
              </button>
            ) : (
              <button type="button" onClick={pauseRecording} className="text-gray-400 hover:bg-white/5 p-2 rounded-full flex-shrink-0">
                <Pause size={18} />
              </button>
            )
          )}

          {swipe !== 'left' && (
            <LiveWaveform analyser={analyserNode} isActive={isRecording && !isPaused} isPaused={isPaused || isLocked && isPaused} />
          )}

          <span className={`${isPaused ? 'text-gray-500' : 'text-[#25D366]'} font-mono text-xs font-bold whitespace-nowrap flex-shrink-0 mr-1`}>
            {formatDuration(duration)}
          </span>

          {isLocked && (
            <button
              type="button"
              onClick={() => setIsViewOnce(!isViewOnce)}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors border flex-shrink-0 ${isViewOnce ? 'bg-[#25D366] text-white border-[#25D366]' : 'bg-transparent text-gray-400 border-gray-500'
                }`}
              title="View Once"
            >
              <span className="text-[10px] font-bold">1</span>
            </button>
          )}

          {isLocked && (
            <button
              type="button"
              onClick={sendDirectly}
              className="w-9 h-9 rounded-full bg-[#25D366] hover:brightness-110 flex items-center justify-center shadow-lg transition-transform active:scale-90 flex-shrink-0 ml-1"
              title="Tuma"
            >
              <Send size={15} className="ml-0.5 text-white" />
            </button>
          )}
        </div>

        {!isLocked && (
          <div
            className="absolute inset-0 z-[5] cursor-pointer"
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 relative">
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowEffects((p) => !p)}
          className={`p-2.5 rounded-full transition-all ${effectiveEffect !== 'none' ? 'bg-[#128c7e] text-white' : 'text-dark-textSecondary hover:text-white hover:bg-white/10'
            }`}
          title="Voice effects / Voice changer"
        >
          <Wand2 size={17} />
        </button>

        {showEffects && (
          <div className="absolute bottom-14 right-0 bg-[#0b141a] border border-white/12 rounded-2xl p-3 shadow-2xl z-[250] w-[280px] max-h-[52vh] overflow-y-auto">
            <p className="text-white text-xs font-bold mb-2 flex items-center gap-1">
              <Wand2 size={12} /> Voice changer (kama GENZ Settings)
            </p>
            <div className="grid grid-cols-4 gap-2">
              {VOICE_EFFECT_PRESETS.map((effect) => (
                <button
                  key={effect.id}
                  type="button"
                  onClick={() => {
                    setPickerEffect(effect.id);
                    setShowEffects(false);
                  }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${effectiveEffect === effect.id
                    ? 'bg-[#075e54] border-[#25D366] scale-[1.03]'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                >
                  <span className="text-lg">{effect.icon}</span>
                  <span className="text-[9px] text-white font-semibold leading-tight text-center">{effect.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/50 mt-2 text-center leading-snug">
              Chaguo la mipangilio (Voice Changer) ndiyo msingi; hapa unaweza kubadilisha kabla ya rekodi.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        className={`p-3.5 text-white rounded-full transition-all shadow-lg active:scale-95 relative ${applyingEffect ? 'bg-[#128c7e] animate-pulse' : 'bg-[#25D366] hover:brightness-110'
          }`}
        title={applyingEffect ? 'Inachakata sauti...' : 'Shikilia rekodi · Telezesha juu kufunga · Toko kuondoka'}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onContextMenu={(e) => e.preventDefault()}
        disabled={applyingEffect || !canSend}
      >
        {applyingEffect ? <Wand2 size={21} className="animate-spin" /> : <Mic size={21} />}
        {effectiveEffect !== 'none' && !applyingEffect && (
          <span className="absolute -top-1 -right-1 text-[11px] bg-[#075e54] rounded-full w-5 h-5 flex items-center justify-center border border-white/20">
            {effectMeta?.icon}
          </span>
        )}
      </button>

      {error && (
        <div className="absolute bottom-14 right-0 bg-red-600/95 text-white text-[11px] px-3 py-2 rounded-xl whitespace-normal max-w-[220px] z-[260]">
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
