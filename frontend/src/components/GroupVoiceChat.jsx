import React, { useEffect, useState, useCallback } from 'react';
import { Radio, PhoneOff, LogIn } from 'lucide-react';
import { getSocket } from '../services/socket';

/**
 * WhatsApp-TM style "Voice Chat" for big groups (>32 members): unlike a regular
 * call, nobody is rung — people simply drop in and out of an ambient audio room,
 * like a radio/Clubhouse session. This bar renders inside a group chat header area.
 */
const GroupVoiceChat = ({ conversationId, currentUserId, isAdmin }) => {
  const [active, setActive] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const socket = getSocket?.();
    if (!socket || !conversationId) return;

    const onStarted = (data) => {
      if (data.conversationId !== conversationId) return;
      setActive(true);
      setParticipants(data.participants || []);
    };
    const onJoined = (data) => {
      if (data.conversationId !== conversationId) return;
      setParticipants(data.participants || []);
      if (data.userId === currentUserId) setJoined(true);
    };
    const onLeft = (data) => {
      if (data.conversationId !== conversationId) return;
      setParticipants(data.participants || []);
      if (data.userId === currentUserId) setJoined(false);
    };
    const onEnded = (data) => {
      if (data.conversationId !== conversationId) return;
      setActive(false);
      setParticipants([]);
      setJoined(false);
    };

    socket.on('voicechat:started', onStarted);
    socket.on('voicechat:participant_joined', onJoined);
    socket.on('voicechat:participant_left', onLeft);
    socket.on('voicechat:ended', onEnded);

    return () => {
      socket.off('voicechat:started', onStarted);
      socket.off('voicechat:participant_joined', onJoined);
      socket.off('voicechat:participant_left', onLeft);
      socket.off('voicechat:ended', onEnded);
    };
  }, [conversationId, currentUserId]);

  const start = useCallback(() => {
    const socket = getSocket?.();
    if (!socket) return;
    socket.emit('voicechat:start', { conversationId });
    setActive(true);
    setJoined(true);
  }, [conversationId]);

  const join = useCallback(() => {
    const socket = getSocket?.();
    if (!socket) return;
    socket.emit('voicechat:join', { conversationId });
    setJoined(true);
  }, [conversationId]);

  const leave = useCallback(() => {
    const socket = getSocket?.();
    if (!socket) return;
    socket.emit('voicechat:leave', { conversationId });
    setJoined(false);
  }, [conversationId]);

  const end = useCallback(() => {
    const socket = getSocket?.();
    if (!socket) return;
    socket.emit('voicechat:end', { conversationId });
  }, [conversationId]);

  if (!active) {
    return (
      <button
        type="button"
        onClick={start}
        title="Start Voice Chat"
        aria-label="Start Voice Chat"
        className="hidden sm:flex p-2 hover:bg-white/10 rounded-lg transition-colors items-center justify-center"
      >
        <Radio size={18} className="text-white/80" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-[#25d366]/10 border border-[#25d366]/30 rounded-xl px-3 py-1.5">
      <Radio size={14} className="text-[#25d366] animate-pulse" />
      <span className="text-xs text-white/80 font-semibold">
        Voice Chat &middot; {participants.length} inside
      </span>
      {joined ? (
        <button
          type="button"
          onClick={leave}
          className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-lg flex items-center gap-1"
        >
          <PhoneOff size={12} /> Leave
        </button>
      ) : (
        <button
          type="button"
          onClick={join}
          className="text-xs bg-[#25d366] hover:bg-[#1fb355] text-white px-2 py-1 rounded-lg flex items-center gap-1"
        >
          <LogIn size={12} /> Join
        </button>
      )}
      {isAdmin && (
        <button
          type="button"
          onClick={end}
          className="text-xs text-red-400 hover:text-red-300 px-1"
        >
          End
        </button>
      )}
    </div>
  );
};

export default GroupVoiceChat;
