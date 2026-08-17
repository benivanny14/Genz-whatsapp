import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Link2, MapPin, Loader2 } from 'lucide-react';
import { resolveApiBase } from '../utils/resolveApiBase';

const SharedStatusView = () => {
  const { statusId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('share') || searchParams.get('token');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        // Forward an expiring share token (minted by the owner) so anonymous
        // visitors can view the status; without it only public/legacy statuses
        // and logged-in viewers pass the server checks.
        const qs = shareToken ? `?share=${encodeURIComponent(shareToken)}` : '';
        const res = await fetch(`${resolveApiBase()}/status/share/${statusId}${qs}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.success && data.status) setStatus(data.status);
          else setError(data.message || 'Status not found');
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load status');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [statusId, shareToken]);

  const bgStyle = status ? { backgroundColor: status.backgroundColor || '#075E54' } : {};
  const textStyle = status ? { color: status.textColor || '#ffffff', fontFamily: status.fontStyle === 'serif' ? 'Georgia, serif' : status.fontStyle === 'mono' ? 'monospace' : 'sans-serif' } : {};

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 bg-black/80 border-b border-white/10 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-white text-sm font-medium truncate">
          {status ? `Status by ${status.username || 'Someone'}` : 'Status'}
        </div>
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden" style={bgStyle}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={36} className="text-white/70 animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
            <div className="text-4xl">😕</div>
            <p>{error}</p>
            <p className="text-xs text-white/50">This status may have been deleted or the link is invalid.</p>
          </div>
        )}
        {status && (
          <div className="absolute inset-0 flex items-center justify-center">
            {status.type === 'image' || (status.mediaUrl && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(status.mediaUrl)) ? (
              <img
                src={status.mediaUrl}
                alt="Status"
                className="max-w-full max-h-full object-contain"
              />
            ) : status.type === 'video' || (status.mediaUrl && /\.(mp4|webm|mov)(\?|$)/i.test(status.mediaUrl)) ? (
              <video
                src={status.mediaUrl}
                className="max-w-full max-h-full object-contain"
                autoPlay
                muted
                loop
                playsInline
                controls
              />
            ) : status.type === 'audio' || status.type === 'voice' ? (
              <div className="w-full max-w-md p-6 text-center">
                {status.content && (
                  <p className="text-xl font-semibold mb-4" style={textStyle}>{status.content}</p>
                )}
                {status.mediaUrl && <audio src={status.mediaUrl} controls className="w-full" autoPlay />}
              </div>
            ) : status.type === 'location' && status.locationData ? (
              <div className="w-full h-full relative">
                <img
                  src={`https://static-maps.yandex.ru/1.x/?ll=${status.locationData.lng},${status.locationData.lat}&z=14&size=650,450&l=map&pt=${status.locationData.lng},${status.locationData.lat},pm2rdm`}
                  alt="Location map"
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2 bg-black/60 rounded-full mx-auto max-w-xs px-4 py-2">
                  <MapPin size={16} className="text-white" />
                  <span className="text-white text-sm">{status.locationData.placeName || status.locationData.address || 'Shared location'}</span>
                </div>
              </div>
            ) : status.type === 'link' && status.linkUrl ? (
              <div className="max-w-md w-full p-8 text-center">
                <Link2 size={40} className="mx-auto mb-4 opacity-70" />
                <a
                  href={status.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold underline break-all"
                  style={textStyle}
                >
                  {status.content || status.linkUrl}
                </a>
              </div>
            ) : status.type === 'quiz' ? (
              <div className="max-w-md w-full p-8 text-center">
                <h2 className="text-2xl font-bold mb-6" style={textStyle}>{status.quizQuestion || status.content}</h2>
                <div className="space-y-3">
                  {(status.quizOptions || []).map((opt, i) => (
                    <div key={i} className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 text-white text-left">
                      {String.fromCharCode(65 + i)}. {opt}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Text status */
              <div className="w-full h-full flex items-center justify-center p-8">
                <p className="text-center text-3xl md:text-4xl font-bold break-words max-w-2xl" style={textStyle}>
                  {status.content}
                </p>
              </div>
            )}
            {/* Caption */}
            {status.caption && (
              <div className="absolute bottom-6 left-0 right-0 text-center px-6">
                <p className="text-white text-sm bg-black/50 inline-block rounded-full px-4 py-1.5 max-w-lg mx-auto">{status.caption}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedStatusView;
