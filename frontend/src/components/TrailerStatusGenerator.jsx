import React, { useState, useEffect, useRef } from 'react';
import { X, Film, Play, Pause, Music, Upload, Loader2, Video, Sparkles, Trash2, Send } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const WIDTH = 720;
const HEIGHT = 1280;

// Build a movie-trailer style sequence from the user's recent statuses:
// opening title card -> "coming soon" -> each status with a crossfade ->
// closing "watch now" card.
const buildSequence = (statuses, username) => {
  const seq = [];
  seq.push({ kind: 'title', text: 'GENZ', sub: username || '', duration: 2.0 });
  seq.push({ kind: 'title', text: 'COMING SOON', sub: 'A GENZ Story', duration: 1.6 });
  for (const s of statuses.slice(0, 8)) {
    const item = { kind: 'status', status: s, duration: 2.2 };
    seq.push(item);
  }
  seq.push({ kind: 'title', text: 'WATCH NOW', sub: `@${username || 'genz'}`, duration: 2.0 });
  return seq;
};

const loadImage = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

const TrailerStatusGenerator = ({ statuses, user, onClose }) => {
  const { uploadStatusMedia, createStatus } = useChat();
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const musicInputRef = useRef(null);

  const [musicFile, setMusicFile] = useState(null);
  const [musicUrl, setMusicUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const myStatuses = (statuses || []).filter(
    (s) => String(s.user?._id || s.userId) === String(user?._id || user?.id)
  );
  const username = user?.username || user?.name || 'GENZ';

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      if (musicUrl) URL.revokeObjectURL(musicUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMusicSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    setMusicFile(file);
    setMusicUrl(URL.createObjectURL(file));
  };

  const drawTitleCard = (ctx, text, sub) => {
    const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    grad.addColorStop(0, '#05020d');
    grad.addColorStop(0.5, '#140533');
    grad.addColorStop(1, '#05020d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '900 96px Arial Black, Impact, sans-serif';
    ctx.fillText(text, WIDTH / 2, HEIGHT / 2 - 40);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 - 200, HEIGHT / 2 + 10);
    ctx.lineTo(WIDTH / 2 + 200, HEIGHT / 2 + 10);
    ctx.stroke();

    ctx.fillStyle = 'rgba(236,72,153,0.95)';
    ctx.font = '600 40px Arial, sans-serif';
    ctx.fillText(sub, WIDTH / 2, HEIGHT / 2 + 70);

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '22px Arial, sans-serif';
    ctx.fillText('● ● ●', WIDTH / 2, HEIGHT - 140);
  };

  const drawStatusFrame = (ctx, status) => {
    const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const media = status.mediaUrl;
    const type = status.type;

    if ((type === 'image' || media) && !['text', 'link', 'quiz', 'question'].includes(type)) {
      loadImage(media).then((img) => {
        if (!img) return;
        const scale = Math.max(WIDTH / img.width, HEIGHT / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
      });
    } else {
      ctx.fillStyle = status.backgroundColor || '#1e1b4b';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = status.textColor || '#ffffff';
      ctx.font = '800 44px Arial, sans-serif';
      ctx.textAlign = 'center';
      const lines = String(status.caption || status.content || '').split('\n').slice(0, 4);
      lines.forEach((line, i) => {
        ctx.fillText(line.slice(0, 32), WIDTH / 2, HEIGHT / 2 - 60 + i * 64);
      });
    }

    ctx.fillStyle = 'rgba(236,72,153,0.9)';
    ctx.font = '600 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`— GENZ STORY —`, WIDTH / 2, HEIGHT - 80);
  };

  const generate = async () => {
    setError('');
    setResultBlob(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl('');

    const sequence = buildSequence(myStatuses, username);
    if (myStatuses.length === 0) {
      setError('You have no statuses to build a trailer. Create a status first.');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    setGenerating(true);

    try {
      const canvasStream = canvas.captureStream(30);
      let audioStream = null;
      let audioCtx = null;

      if (musicUrl) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioEl = new Audio(musicUrl);
        audioEl.loop = true;
        const src = audioCtx.createMediaElementSource(audioEl);
        const dest = audioCtx.createMediaStreamDestination();
        src.connect(dest);
        src.connect(audioCtx.destination);
        await audioEl.play();
        audioStream = dest.stream;
      }

      const tracks = [...canvasStream.getVideoTracks()];
      if (audioStream) tracks.push(...audioStream.getAudioTracks());
      const stream = new MediaStream(tracks);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_000_000 });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const done = new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      recorder.start();

      let total = 0;
      for (const item of sequence) total += item.duration;
      const startT = performance.now();
      let elapsed = 0;

      const renderLoop = () => {
        elapsed = (performance.now() - startT) / 1000;

        if (elapsed >= total) {
          recorder.stop();
          if (audioCtx) { audioCtx.close().catch(() => {}); }
          setProgress(100);
          return;
        }

        // Find current item + local time
        let t = elapsed;
        let item = sequence[0];
        for (const it of sequence) {
          if (t <= it.duration) { item = it; break; }
          t -= it.duration;
        }

        const fade = 0.4;
        const alpha = Math.min(1, Math.min(t / fade, (item.duration - t) / fade));

        if (item.kind === 'title') {
          drawTitleCard(ctx, item.text, item.sub);
        } else {
          ctx.globalAlpha = Math.max(0.15, alpha);
          drawStatusFrame(ctx, item.status);
          ctx.globalAlpha = 1;
        }

        setProgress(Math.min(99, Math.round((elapsed / total) * 100)));
        requestAnimationFrame(renderLoop);
      };

      renderLoop();
      const blob = await done;

      setResultBlob(blob);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      if (videoRef.current) {
        videoRef.current.src = url;
      }
      setSuccess('Trailer imeundwa! Kaa play ili uione.');
    } catch (err) {
      console.error('Trailer generation error:', err);
      setError('Trailer generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const postAsStatus = async () => {
    if (!resultBlob) return;
    setPosting(true);
    setError('');
    try {
      const ext = resultBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([resultBlob], `genz-trailer-${Date.now()}.${ext}`, { type: resultBlob.type });
      const up = await uploadStatusMedia(file);
      if (!up.fileUrl) throw new Error(up.message || 'Upload failed');
      const data = await createStatus({
        type: 'video',
        content: '🎬 GENZ Trailer',
        mediaUrl: up.fileUrl,
        mediaType: 'video',
        caption: 'My GENZ movie trailer',
        backgroundColor: '#0f172a',
        textColor: '#ffffff',
        privacy: 'contacts'
      });
      if (!data.success) throw new Error(data.message || 'Failed to create status');
      setSuccess('Trailer posted as status!');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Post trailer error:', err);
      setError(err.message || 'Failed to post trailer');
    } finally {
      setPosting(false);
    }
  };

  const discard = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl('');
    setResultBlob(null);
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0b141a] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-purple-500/30 shadow-2xl">
        <div className="sticky top-0 bg-[#0b141a]/95 backdrop-blur flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Film size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white text-lg font-bold">Movie Trailer Status</h2>
              <p className="text-white/50 text-xs">Auto timeline from your statuses + music</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full" aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs text-white/60 bg-white/5 rounded-lg px-3 py-2">
            <Sparkles size={14} className="text-pink-400" />
            Generating a trailer from your recent statuses ({myStatuses.length} statuses) na animation za movie-style.
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2">{error}</div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg px-3 py-2">{success}</div>
          )}

          {/* Music picker */}
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Music size={16} className="text-purple-400" />
              <p className="text-white text-sm font-medium">Background Music</p>
            </div>
            <input
              ref={musicInputRef}
              type="file"
              accept="audio/*"
              onChange={handleMusicSelect}
              className="w-full bg-white/10 text-white text-sm px-3 py-2 rounded-lg border border-white/20 file:mr-2 file:px-3 file:py-1 file:rounded file:bg-purple-600 file:text-white file:border-0"
            />
            {musicFile && (
              <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
                <Music size={12} /> {musicFile.name}
              </p>
            )}
          </div>

          {/* Canvas (hidden, used for recording) */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Preview */}
          <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '9 / 16', maxHeight: '420px' }}>
            {resultUrl ? (
              <video ref={videoRef} src={resultUrl} controls className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#05020d] via-[#140533] to-[#05020d]">
                <Film size={64} className="text-purple-500 mb-3" />
                <p className="text-white/70 text-sm">Preview will appear here</p>
              </div>
            )}

            {generating && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                <Loader2 size={40} className="text-purple-400 animate-spin mb-3" />
                <p className="text-white font-medium">Inatengeneza trailer... {progress}%</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={generate}
              disabled={generating || myStatuses.length === 0}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {generating ? <Loader2 size={20} className="animate-spin" /> : <Video size={20} />}
              {generating ? `Generating... ${progress}%` : 'Generate Trailer'}
            </button>

            {resultUrl && (
              <div className="flex gap-2">
                <button
                  onClick={postAsStatus}
                  disabled={posting}
                  className="flex-1 px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {posting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {posting ? 'Posting...' : 'Post as Status'}
                </button>
                <button
                  onClick={discard}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Discard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrailerStatusGenerator;
