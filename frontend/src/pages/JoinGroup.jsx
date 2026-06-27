import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Handles WhatsApp-style "tap to join a group" invite links.
 * Route: /join/:groupId/:code
 */
const JoinGroup = () => {
  const { groupId, code } = useParams();
  const navigate = useNavigate();
  const { refreshConversations, setStoredSelectedConversationId } = useChat();
  const [status, setStatus] = useState('joining'); // joining | success | already | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const join = async () => {
      if (!groupId || !code) {
        setStatus('error');
        setMessage('This invite link is invalid.');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/chat/groups/${groupId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ inviteCode: code })
        });
        const data = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (data?.success) {
          setStatus('success');
          setMessage(data.message || 'You joined the group!');
          await refreshConversations?.();
          setStoredSelectedConversationId?.(groupId);
        } else if (response.status === 400 && /already a member/i.test(data?.message || '')) {
          setStatus('already');
          setMessage('You are already in this group.');
          setStoredSelectedConversationId?.(groupId);
        } else {
          setStatus('error');
          setMessage(data?.message || 'This invite link is no longer valid.');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Join group error:', err);
          setStatus('error');
          setMessage('Network error. Please check your connection and try again.');
        }
      }
    };

    join();
    return () => { cancelled = true; };
  }, [groupId, code]);

  const goToChat = () => navigate('/chat', { replace: true });

  return (
    <div className="min-h-screen bg-[#0b141a] flex items-center justify-center p-4">
      <div className="bg-[#111b21] rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#00a884]/15 flex items-center justify-center mx-auto mb-4">
          {status === 'joining' && <Loader2 size={28} className="text-[#00a884] animate-spin" />}
          {(status === 'success' || status === 'already') && <CheckCircle2 size={28} className="text-[#00a884]" />}
          {status === 'error' && <XCircle size={28} className="text-red-400" />}
        </div>

        <h1 className="text-white text-lg font-semibold mb-2 flex items-center justify-center gap-2">
          <Users size={18} className="text-[#00a884]" />
          Group Invite
        </h1>

        <p className="text-[#8696a0] text-sm mb-6">
          {status === 'joining' ? 'Joining group...' : message}
        </p>

        {status !== 'joining' && (
          <button
            onClick={goToChat}
            className="w-full bg-[#00a884] hover:bg-[#06cf9c] text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {status === 'error' ? 'Go to chats' : 'Open chat'}
          </button>
        )}

        {status === 'error' && (
          <Link to="/chat" className="block mt-3 text-xs text-[#8696a0] hover:text-white">
            Return to GENZ WhatsApp
          </Link>
        )}
      </div>
    </div>
  );
};

export default JoinGroup;
