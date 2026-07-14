import { useState, useEffect, useRef, useCallback } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Users, Monitor, MonitorOff } from 'lucide-react';
import { getSocket } from '../services/socket';
import webRTCService from '../services/webrtc';
import { getWebRTCConfigAsync } from '../config/webrtc';

const GroupCallScreen = ({ call, onEnd, currentUser }) => {
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const localStreamRef = useRef(null); // always holds the CURRENT stream, avoids stale closures in socket handlers
  const localVideoRef = useRef(null);
  const peerConnections = useRef({}); // { socketId: RTCPeerConnection }
  const remoteStreams = useRef({}); // { socketId: MediaStream }
  const socketRef = useRef(null);

  const isVideo = call?.callType === 'video';
  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  useEffect(() => {
    socketRef.current = getSocket();
    const socket = socketRef.current;

    // Start local stream
    const startLocal = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true, video: isVideo
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Join the call room
        socket.emit('group_call:join', { conversationId: call.conversationId });
      } catch (err) {
        console.error('[GroupCall] Local stream error:', err);
      }
    };

    startLocal();

    // Timer
    const timer = setInterval(() => setDuration(d => d + 1), 1000);

    // Socket events
    const onParticipantJoined = async ({ userId, socketId }) => {
      setParticipants(p => p.find(x => x.socketId === socketId) ? p : [...p, { userId, socketId, name: userId }]);
      // Create peer connection and send offer
      await createOffer(socketId);
    };

    const onParticipantLeft = ({ socketId }) => {
      setParticipants(p => p.filter(x => x.socketId !== socketId));
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
        delete remoteStreams.current[socketId];
      }
    };

    const onOffer = async ({ from, offer }) => {
      const pc = await createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('group_call:answer', { to: from, answer });
    };

    const onAnswer = async ({ from, answer }) => {
      const pc = peerConnections.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const onIce = async ({ from, candidate }) => {
      const pc = peerConnections.current[from];
      if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    };

    socket.on('group_call:participant_joined', onParticipantJoined);
    socket.on('group_call:participant_left', onParticipantLeft);
    socket.on('group_call:offer', onOffer);
    socket.on('group_call:answer', onAnswer);
    socket.on('group_call:ice', onIce);

    return () => {
      clearInterval(timer);
      socket.off('group_call:participant_joined', onParticipantJoined);
      socket.off('group_call:participant_left', onParticipantLeft);
      socket.off('group_call:offer', onOffer);
      socket.off('group_call:answer', onAnswer);
      socket.off('group_call:ice', onIce);
      try { localStreamRef.current?.getTracks().forEach(t => t.stop()); } catch(_){}
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, []);

  const createPeerConnection = async (socketId) => {
    if (peerConnections.current[socketId]) return peerConnections.current[socketId];
    const socket = socketRef.current;
    let config;
    try {
      config = await getWebRTCConfigAsync();
    } catch (_) {
      config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
    }
    const pc = new RTCPeerConnection(config);

    // Add local tracks (use ref, not state, so this always has the freshest stream
    // even when called from socket handlers registered on mount)
    const stream = localStreamRef.current;
    if (stream) stream.getTracks().forEach(t => { try { pc.addTrack(t, stream); } catch(_){} });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('group_call:ice', { to: socketId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      if (streams[0]) {
        remoteStreams.current[socketId] = streams[0];
        const vid = document.getElementById(`remote-video-${socketId}`);
        if (vid) vid.srcObject = streams[0];
      }
    };

    peerConnections.current[socketId] = pc;
    return pc;
  };

  const createOffer = async (socketId) => {
    const socket = socketRef.current;
    const pc = await createPeerConnection(socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('group_call:offer', { to: socketId, offer, conversationId: call.conversationId });
  };

  const handleEnd = () => {
    const socket = socketRef.current;
    socket?.emit('group_call:leave', { conversationId: call.conversationId });
    localStream?.getTracks().forEach(t => t.stop());
    Object.values(peerConnections.current).forEach(pc => pc.close());
    onEnd?.();
  };

  const handleMute = () => {
    const audio = localStream?.getAudioTracks()[0];
    if (audio) { audio.enabled = isMuted; setIsMuted(!isMuted); }
  };

  const handleCamera = () => {
    try {
      const video = localStream?.getVideoTracks()[0];
      if (video) { video.enabled = isCameraOff; setIsCameraOff(!isCameraOff); }
    } catch(e) { console.warn('[GroupCall] Camera toggle error:', e); }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0b141a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4 bg-gradient-to-b from-black/60 to-transparent">
        <div>
          <h2 className="text-white font-semibold">{call?.groupName || 'Group Call'}</h2>
          <p className="text-[#8696a0] text-sm">{fmt(duration)} · {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-1 bg-[#2a3942] px-2 py-1 rounded-full">
          <Users size={12} className="text-[#8696a0]" />
          <span className="text-[#8696a0] text-xs">{participants.length + 1}</span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 grid gap-1 p-2 overflow-hidden"
        style={{ gridTemplateColumns: participants.length === 0 ? '1fr' : participants.length < 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)' }}>
        {/* Local video */}
        <div className="relative bg-[#202c33] rounded-xl overflow-hidden flex items-center justify-center">
          {isVideo
            ? <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            : <div className="w-16 h-16 rounded-full bg-[#2a3942] flex items-center justify-center text-2xl font-bold text-white">
                {currentUser?.username?.charAt(0)?.toUpperCase() || 'Y'}
              </div>
          }
          <span className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">You {isMuted && '🔇'}</span>
        </div>
        {/* Remote videos */}
        {participants.map(p => (
          <div key={p.socketId} className="relative bg-[#202c33] rounded-xl overflow-hidden flex items-center justify-center">
            <video id={`remote-video-${p.socketId}`} autoPlay playsInline className="w-full h-full object-cover" />
            <span className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">{p.name}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-around items-center px-6 py-6 bg-gradient-to-t from-black/80 to-transparent">
        <CtrlBtn onClick={handleMute} active={isMuted}>
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </CtrlBtn>
        {isVideo && (
          <CtrlBtn onClick={handleCamera} active={isCameraOff}>
            {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
          </CtrlBtn>
        )}
        <button onClick={handleEnd}
          className="w-14 h-14 rounded-full bg-[#f15c6d] flex items-center justify-center shadow-lg active:scale-95 transition-all" aria-label="End call">
          <PhoneOff size={24} className="text-white" />
        </button>
      </div>
    </div>
  );
};

const CtrlBtn = ({ onClick, active, children }) => (
  <button onClick={onClick}
    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95
      ${active ? 'bg-white/20 text-white' : 'text-[#8696a0] hover:bg-white/10'}`}>
    {children}
  </button>
);

export default GroupCallScreen;
