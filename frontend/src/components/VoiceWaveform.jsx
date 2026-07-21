import React, { useRef, useEffect, memo } from 'react';

const VoiceWaveform = ({
  isRecording = false,
  audioData = [],
  height = 40,
  barCount = 30,
  color = '#25d366',
  progress = 0,
  onSeek = null,
  isPlayback = false
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvas.offsetWidth, height);

    if (isRecording) {
      drawRecordingWaveform(ctx, canvas.offsetWidth, height, color, barCount);
    } else if (isPlayback && audioData.length > 0) {
      drawPlaybackWaveform(ctx, canvas.offsetWidth, height, color, progress, audioData);
    } else if (audioData.length > 0) {
      drawStaticWaveform(ctx, canvas.offsetWidth, height, color, audioData);
    }
  }, [isRecording, audioData, height, barCount, color, progress, isPlayback]);

  const drawRecordingWaveform = (ctx, width, height, color, barCount) => {
    const barWidth = width / barCount;
    const centerY = height / 2;

    for (let i = 0; i < barCount; i++) {
      const barHeight = Math.random() * (height * 0.8) + (height * 0.1);
      const x = i * barWidth;
      const y = centerY - barHeight / 2;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
      ctx.fill();
    }
  };

  const drawStaticWaveform = (ctx, width, height, color, data) => {
    const barWidth = width / data.length;
    const centerY = height / 2;

    data.forEach((value, i) => {
      const barHeight = value * height;
      const x = i * barWidth;
      const y = centerY - barHeight / 2;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
      ctx.fill();
    });
  };

  const drawPlaybackWaveform = (ctx, width, height, color, progress, data) => {
    const barWidth = width / data.length;
    const centerY = height / 2;
    const playedBars = Math.floor(data.length * progress);

    data.forEach((value, i) => {
      const barHeight = value * height;
      const x = i * barWidth;
      const y = centerY - barHeight / 2;

      ctx.fillStyle = i < playedBars ? color : `${color}40`;
      ctx.beginPath();
      ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
      ctx.fill();
    });
  };

  const handleClick = (e) => {
    if (!onSeek || !isPlayback) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;

    onSeek(Math.max(0, Math.min(1, progress)));
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        width: '100%',
        height: `${height}px`,
        cursor: isPlayback ? 'pointer' : 'default'
      }}
    />
  );
};

export default memo(VoiceWaveform);
