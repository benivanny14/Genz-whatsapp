import React, { useState } from 'react';
import { X, Link2, Phone, Video, Copy, Check, Share2 } from 'lucide-react';
import callLinkService from '../services/callLinkService';

/**
 * "Create Call Link" — WhatsApp's Calls tab lets you generate a link and send it
 * to anyone; whoever opens it joins the call directly without being dialled.
 */
const CallLinkModal = ({ conversationId = null, onClose }) => {
  const [callType, setCallType] = useState('voice');
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callLinkService.create({ conversationId, callType });
      setLink(data.link);
    } catch (err) {
      setError('Imeshindwa kutengeneza link. Jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = link
    ? link.shareUrl || `${window.location.origin}/call/join/${link.token}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // clipboard may be unavailable — silently ignore
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Jiunge na call yangu WhatsApp', url: shareUrl });
      } catch (_) {
        // user cancelled share sheet
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-[#111b21] w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Link2 size={18} className="text-[#25d366]" /> Create Call Link
          </h3>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {!link ? (
          <>
            <p className="text-white/50 text-sm mb-4">
              Tengeneza link. Mtu yeyote aliye nayo anaweza kujiunga na call bila kupigiwa.
            </p>
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => setCallType('voice')}
                className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 border ${
                  callType === 'voice'
                    ? 'border-[#25d366] bg-[#25d366]/10 text-[#25d366]'
                    : 'border-white/10 text-white/50'
                }`}
              >
                <Phone size={20} />
                <span className="text-xs font-semibold">Voice</span>
              </button>
              <button
                type="button"
                onClick={() => setCallType('video')}
                className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 border ${
                  callType === 'video'
                    ? 'border-[#25d366] bg-[#25d366]/10 text-[#25d366]'
                    : 'border-white/10 text-white/50'
                }`}
              >
                <Video size={20} />
                <span className="text-xs font-semibold">Video</span>
              </button>
            </div>
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-3 bg-[#008069] text-white rounded-xl font-semibold disabled:opacity-50"
            >
              {loading ? 'Inatengeneza...' : 'Create Call Link'}
            </button>
          </>
        ) : (
          <>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 break-all text-white/70 text-sm">
              {shareUrl}
            </div>
            <p className="text-white/30 text-xs mb-4">
              Link hii itakuwa hai kwa masaa 24. Tuma kwa mtu au group.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 py-3 bg-[#008069] text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Share2 size={16} /> Share
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CallLinkModal;
