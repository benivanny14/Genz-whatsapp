import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Lock, Eye, AlertCircle, Music, Link2, MapPin } from 'lucide-react';
import { resolveMediaPlaybackUrl } from '../utils/sanitizeMediaUrl';

const STATUS_TYPES = {
  text: 'text', image: 'image', video: 'video', voice: 'voice', audio: 'audio',
  gif: 'gif', link: 'link', music: 'music', quiz: 'quiz', question: 'question',
  countdown: 'countdown', location: 'location', collage: 'collage'
};

const PublicStatusViewer = () => {
  const { id } = useParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/status/shared/${id}`);
        const data = await res.json();
        if (cancelled) return;
        if (data?.success && data.status) {
          setStatus(data.status);
        } else {
          setError(data?.message || 'Status haipatikani');
        }
      } catch (e) {
        if (!cancelled) setError('Imeshindikana kupakia status. Jaribu tena.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const mediaUrl = status?.mediaUrl ? resolveMediaPlaybackUrl(status.mediaUrl) : '';
  const isMedia = status && ['image', 'video', 'gif', 'voice', 'audio', 'music', 'collage', 'boomerang', 'livePhoto', 'dualCamera'].includes(status.type);

  const formatExpiry = (expiresAt) => {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt) - Date.now();
    if (diff <= 0) return 'imeisha';
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins} min zimesalia`;
    return `${Math.round(mins / 60)} h zimesalia`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b141a] flex items-center justify-center">
        <div className="text-[#00a884] animate-pulse text-sm">Inapakia status...</div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="min-h-screen bg-[#0b141a] flex items-center justify-center p-6">
        <div className="bg-[#1a2e35] rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-[#ef4444] mx-auto mb-4" />
          <h1 className="text-white text-xl font-semibold mb-2">Status haipatikani</h1>
          <p className="text-gray-400 text-sm mb-6">{error || 'Link hii labda imeisha muda wake au status haijasharewa hadharani.'}</p>
          <Link to="/" className="inline-block px-6 py-3 bg-[#00a884] hover:bg-[#008f72] text-white rounded-lg font-medium">
            Rudi kwenye GENZ
          </Link>
        </div>
      </div>
    );
  }

  const bg = status.backgroundColor || '#075E54';
  const fg = status.textColor || '#ffffff';

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link to="/" className="text-[#00a884] hover:text-[#00c98f] p-2 -ml-2" aria-label="Back">
            <ArrowLeft size={22} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">{status.username || 'GENZ Status'}</p>
            <p className="text-gray-400 text-xs flex items-center gap-1">
              <Clock size={12} /> {new Date(status.createdAt || Date.now()).toLocaleString()}
              {status.expiresAt && <span> · inaisha: {formatExpiry(status.expiresAt)}</span>}
            </p>
          </div>
          {status.viewsCount > 0 && (
            <span className="text-gray-400 text-xs flex items-center gap-1">
              <Eye size={14} /> {status.viewsCount}
            </span>
          )}
        </div>

        {/* Status body */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{ backgroundColor: bg, minHeight: 420 }}
        >
          {!isMedia && status.type === 'text' && (
            <div className="p-8 flex items-center justify-center min-h-[420px]">
              <p className="text-2xl leading-relaxed text-center break-words" style={{ color: fg }}>
                {status.content || status.caption}
              </p>
            </div>
          )}

          {status.type === 'link' && (
            <div className="p-8 flex items-center justify-center min-h-[420px]">
              <a
                href={status.linkUrl || status.content}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 backdrop-blur px-6 py-4 rounded-xl text-white flex items-center gap-3 max-w-full"
              >
                <Link2 size={20} />
                <span className="truncate">{status.linkUrl || status.content}</span>
              </a>
            </div>
          )}

          {status.type === 'location' && (
            <div className="p-8 flex items-center justify-center min-h-[420px]">
              <div className="text-center text-white">
                <MapPin size={40} className="mx-auto mb-3 opacity-80" />
                <p className="font-medium">{status.locationData?.placeName || status.locationData?.address || 'Location'}</p>
                {status.locationData?.lat && (
                  <a
                    href={`https://www.google.com/maps?q=${status.locationData.lat},${status.locationData.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-4 px-4 py-2 bg-[#00a884] hover:bg-[#008f72] rounded-lg text-sm"
                  >
                    Fungua Ramani
                  </a>
                )}
              </div>
            </div>
          )}

          {(status.type === 'image' || status.type === 'gif') && mediaUrl && (
            <img src={mediaUrl} alt={status.caption || 'Status'} className="w-full min-h-[420px] object-cover" />
          )}

          {status.type === 'video' && mediaUrl && (
            <video
              src={mediaUrl}
              controls
              autoPlay
              playsInline
              className="w-full min-h-[420px] bg-black"
              style={{ maxHeight: '70vh' }}
            />
          )}

          {(status.type === 'voice' || status.type === 'audio' || status.type === 'music') && mediaUrl && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[420px] gap-4">
              {status.type === 'music' && <Music size={40} className="text-white opacity-80" />}
              <audio src={mediaUrl} controls className="w-full" />
            </div>
          )}

          {status.type === 'collage' && Array.isArray(status.collageImages) && status.collageImages.length > 0 && (
            <div className="grid grid-cols-2 gap-1 p-1">
              {status.collageImages.map((img, i) => (
                <img key={i} src={resolveMediaPlaybackUrl(img)} alt="" className="w-full h-56 object-cover rounded-lg" />
              ))}
            </div>
          )}

          {/* Caption overlay for media */}
          {isMedia && status.caption && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-5">
              <p className="text-white text-sm leading-relaxed">{status.caption}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-4 flex items-center justify-center gap-1">
          <Lock size={12} /> Imesharewa kupitia GENZ — inaonekana kwa muda mfupi tu
        </p>
      </div>
    </div>
  );
};

export default PublicStatusViewer;
