import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, Video, Link2, AlertCircle } from 'lucide-react';
import callLinkService from '../services/callLinkService';
import { useChat } from '../context/ChatContext';

const JoinCallLink = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { initiateCall, conversations } = useChat();
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await callLinkService.resolve(token);
        setLink(data.link);
      } catch (err) {
        setError('Call link haipo tena au imeisha muda wake.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const data = await callLinkService.join(token);

      if (data.conversationId) {
        // If we already share this conversation, hop into it and start the call
        const conv = (conversations || []).find(
          (c) => String(c._id) === String(data.conversationId)
        );
        window.dispatchEvent(
          new CustomEvent('open-chat', { detail: { conversationId: data.conversationId } })
        );
        navigate('/chat');
        if (conv) {
          setTimeout(() => initiateCall?.(data.callType === 'video' ? 'video' : 'audio', conv), 400);
        }
      } else {
        // Ad-hoc link with no existing conversation — take the user to a chat with the creator
        navigate('/chat');
      }
    } catch (err) {
      setError('Imeshindwa kujiunga na call. Jaribu tena.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0b141a] text-white/60">
        Inapakia link...
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0b141a] text-white gap-4 px-6">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-center text-white/70">{error || 'Link si sahihi.'}</p>
        <button
          type="button"
          onClick={() => navigate('/chat')}
          className="px-5 py-2.5 bg-[#008069] rounded-xl font-semibold"
        >
          Rudi WhatsApp
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0b141a] text-white gap-6 px-6">
      <div className="w-20 h-20 rounded-full bg-[#25d366]/15 flex items-center justify-center">
        {link.callType === 'video' ? (
          <Video size={36} className="text-[#25d366]" />
        ) : (
          <Phone size={36} className="text-[#25d366]" />
        )}
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">
          {link.createdBy?.name || link.createdBy?.username || 'Mtu'} amekualika kwenye call
        </p>
        <p className="text-white/40 text-sm mt-1 flex items-center gap-1 justify-center">
          <Link2 size={12} /> {link.callType === 'video' ? 'Video Call' : 'Voice Call'}
        </p>
      </div>
      <button
        type="button"
        onClick={handleJoin}
        disabled={joining}
        className="px-8 py-3 bg-[#25d366] hover:bg-[#1fb355] text-black font-bold rounded-2xl disabled:opacity-50"
      >
        {joining ? 'Inajiunga...' : 'Jiunge na Call'}
      </button>
    </div>
  );
};

export default JoinCallLink;
