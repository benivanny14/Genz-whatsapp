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
  const { refreshConversations, selectConversation } = useChat();
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

      const token = localStorage.getItem('token');
      // FIX: Unauthenticated users hitting a group invite link previously got a
      // generic "invalid link" error (401 from the protected /join route).
      // Instead, send them to log in and resume the join automatically after.
      if (!token) {
        try {
          sessionStorage.setItem('pendingGroupInvite', JSON.stringify({ groupId, code }));
        } catch (_) { /* ignore storage errors */ }
        navigate(`/login?redirect=/join/${groupId}/${code}`, { replace: true });
        return;
      }

      try {
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

        if (data?.pending) {
          // FIX: Group requires admin approval — the join request was sent but
          // the user is NOT a member yet. Previously this fell through to the
          // "success" branch and falsely said "You joined the group!" while
          // also trying to open a conversation the user has no access to.
          setStatus('already');
          setMessage(data?.message || 'Join request sent. Waiting for admin approval.');
        } else if (data?.success || data?.alreadyMember) {
          setStatus(data.alreadyMember ? 'already' : 'success');
          setMessage(data.alreadyMember ? 'You are already in this group.' : 'You joined the group!');
          // If backend returned the conversation, open it immediately
          if (data.conversation) {
            await refreshConversations?.();
            selectConversation?.(groupId);
            // Give state a moment to settle, then navigate
            setTimeout(() => navigate('/chat', { replace: true }), 1200);
          } else {
            await refreshConversations?.();
            selectConversation?.(groupId);
          }
        } else if (response.status === 400 && /already a member/i.test(data?.message || '')) {
          setStatus('already');
          setMessage('You are already in this group.');
          selectConversation?.(groupId);
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
            {status === 'error' ? 'Go to chats' : 'View Group'}
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
