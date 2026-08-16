import React, { useEffect, useRef, useState } from 'react';
import { Scissors, Play, Pause, RotateCcw, Loader, Music, CheckCircle } from 'lucide-react';

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

function formatTime(s) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const MusicTrimmer = ({ file, onTrim }) => {
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [applied, setApplied] = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setLoading(true);
    setError('');
    setApplied(null);

    (async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        await ctx.resume?.();
        const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        await ctx.close();
        if (cancelled) return;
        setAudioBuffer(buffer);
        setDuration(buffer.duration);
        setStart(0);
        setEnd(Math.min(buffer.duration, 30));
      } catch (e) {
        if (cancelled) return;
        setError('Could not read this music file. Try another file.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (applied) {
      setApplied(null);
      onTrim(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  const handlePreviewPlay = () => {
    const a = previewRef.current;
    if (!a) return;
    if (isPreviewPlaying) {
      a.pause();
      setIsPreviewPlaying(false);
      return;
    }
    a.currentTime = start;
    a.play();
    setIsPreviewPlaying(true);
  };

  const handleTimeUpdate = () => {
    const a = previewRef.current;
    if (a && isPreviewPlaying && a.currentTime >= end) {
      a.pause();
      setIsPreviewPlaying(false);
    }
  };

  const handleApply = () => {
    if (!audioBuffer || end <= start) return;
    const startIdx = Math.floor(start * audioBuffer.sampleRate);
    const endIdx = Math.floor(end * audioBuffer.sampleRate);
    const len = Math.max(1, endIdx - startIdx);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const trimmed = ctx.createBuffer(audioBuffer.numberOfChannels, len, audioBuffer.sampleRate);
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      trimmed.copyToChannel(audioBuffer.getChannelData(ch).slice(startIdx, endIdx), ch);
    }
    const blob = audioBufferToWav(trimmed);
    ctx.close().catch(() => {});
    const url = URL.createObjectURL(blob);
    setApplied({ url, start, end });
    onTrim({ blob, url, start, end });
  };

  const handleReset = () => {
    if (applied?.url) URL.revokeObjectURL(applied.url);
    setApplied(null);
    setStart(0);
    setEnd(Math.min(duration, 30));
    onTrim(null);
  };

  const handleSliderChange = (which, val) => {
    const v = Math.max(0, Math.min(duration, Number(val)));
    if (which === 'start') {
      setStart(Math.min(v, end - 1));
    } else {
      setEnd(Math.max(v, start + 1));
    }
  };

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader size={16} className="animate-spin" />
        Inasoma muziki...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Scissors size={16} className="text-blue-600 dark:text-blue-400" />
          Trim Music
        </div>
        {applied && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle size={14} /> Imekatwa: {formatTime(start)} - {formatTime(end)}
          </span>
        )}
      </div>

      <audio
        ref={previewRef}
        src={sourceUrl}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPreviewPlaying(false)}
        className="hidden"
      />

      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={handlePreviewPlay}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          {isPreviewPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPreviewPlaying ? 'Pause' : 'Preview'}
        </button>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Wimbo: {formatTime(duration)}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Anza</span>
            <span className="font-medium">{formatTime(start)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(1, duration)}
            step={0.1}
            value={start}
            onChange={(e) => handleSliderChange('start', e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Ishia</span>
            <span className="font-medium">{formatTime(end)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(1, duration)}
            step={0.1}
            value={end}
            onChange={(e) => handleSliderChange('end', e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatTime(end - start)} inachaguliwa
        </div>
        <div className="flex items-center gap-2">
          {applied && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg transition-colors"
            >
              <RotateCcw size={14} /> Reset
            </button>
          )}
          <button
            type="button"
            onClick={handleApply}
            disabled={end <= start}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            <Music size={14} /> Kata Wimbo
          </button>
        </div>
      </div>
    </div>
  );
};

export default MusicTrimmer;
