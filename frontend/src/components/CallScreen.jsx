import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Video, Mic, MicOff, Camera, CameraOff, PhoneOff, Volume2, VolumeX, RotateCcw, Wifi, WifiOff, Monitor, MonitorOff } from 'lucide-react';
import webRTCService from '../services/webrtc';
import { playCallRingtone } from '../utils/soundPlayer';
import { getSocket } from '../services/socket';

const stopStream = (stream) => stream?.getTracks?.().forEach((t) => t.stop());

const CallScreen = ({ call, onEndCall, onAcceptCall, onRejectCall }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [callStatus, setCallStatus] = useState(call?.status || 'calling');
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);
  const socketRef = useRef(null);

  const isVideoCall = call?.type === 'video' || call?.callType === 'video';
  const isIncoming = call?.status === 'incoming';
  const callerName = call?.user?.username || call?.callerName || call?.user?.name || 'Unknown';
  const profilePic = call?.user?.profilePicture || call?.callerPicture || null;

  useEffect(() => {
    if (call?.status) setCallStatus(call.status);
  }, [call?.status]);

  // ── Get socket ──────────────────────────────────────────────────────────
  useEffect(() => {
    socketRef.current = getSocket();
  }, []);

  // ── Ringtone ─────────────────────────────────────────────────────────────
  const audioCtxRef = useRef(null);
  const ringerRef = useRef(null);

  const startRingtone = useCallback(() => {
    try {
      // Play ringtone via soundPlayer
      try { playCallRingtone(); } catch (_) {}
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;

      // Resume AudioContext if suspended (autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(err => {
          console.warn('[CallScreen] Failed to resume AudioContext:', err);
        });
      }

      const ring = () => {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(err => {
            console.warn('[CallScreen] Failed to resume AudioContext during ring:', err);
          });
        }
        [400, 450].forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = freq;
          osc.type = 'sine';
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
          gain.gain.setValueAtTime(0.4, ctx.currentTime + 0.4);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.45);
          gain.gain.setValueAtTime(0, ctx.currentTime + 0.65);
          gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.7);
          gain.gain.setValueAtTime(0.4, ctx.currentTime + 1.05);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.1);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 1.15);
        });
      };
      ring();
      ringerRef.current = setInterval(ring, 3200);
    } catch (e) { /* silent */ }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringerRef.current) { clearInterval(ringerRef.current); ringerRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
  }, []);

  useEffect(() => {
    if (callStatus === 'incoming' || callStatus === 'calling') startRingtone();
    else stopRingtone();
    return stopRingtone;
  }, [callStatus, startRingtone, stopRingtone]);

  // ── Call timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [callStatus]);

  // ── Outgoing call setup ────────────────────────────────────────────────
  useEffect(() => {
    if (!call || isIncoming) return;
    cancelledRef.current = false;
    let retryCount = 0;
    let retryTimer = null;

    const startCall = async () => {
      if (cancelledRef.current) return;
      const socket = socketRef.current || getSocket();

      if (!socket?.connected) {
        if (++retryCount > 6) { setCallStatus('ended'); onEndCall?.(); return; }
        retryTimer = setTimeout(startCall, 1500);
        return;
      }

      try {
        const targetUserId = call.calleeId || call.user?._id || call.targetUserId;
        if (!targetUserId) throw new Error('No target user');

        const stream = await webRTCService.createCall(targetUserId, call.type || 'audio', socket, call.conversationId);
        if (cancelledRef.current) return;

        setHasLocalStream(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        webRTCService.onRemoteStream = (remoteStream) => {
          if (cancelledRef.current) return;
          setHasRemoteStream(true);
          setCallStatus('connected');
          setConnectionQuality('good');
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
        };

        webRTCService.onCallEnded = () => { setCallStatus('ended'); onEndCall?.(); };
        webRTCService.onReconnecting = () => setIsReconnecting(true);
        webRTCService.onConnectionHealth = (state) => {
          setIsReconnecting(false);
          if (state === 'connected' || state === 'completed') setConnectionQuality('good');
          else if (state === 'disconnected') setConnectionQuality('poor');
        };

        // Check if remote stream already arrived
        if (webRTCService.remoteStream) webRTCService.onRemoteStream(webRTCService.remoteStream);

      } catch (err) {
        if (cancelledRef.current) return;
        console.error('[CallScreen] startCall error:', err);
        if (err.name === 'NotAllowedError') {
          setErrorMsg('Camera/microphone access denied. Please allow access and try again.');
        } else if (err.name === 'NotFoundError') {
          setErrorMsg('Camera or microphone not found.');
        } else {
          setErrorMsg('Could not start call. Please try again.');
        }
      }
    };

    startCall();
    return () => { cancelledRef.current = true; clearTimeout(retryTimer); };
  }, [call?.conversationId, call?.calleeId]);

  // ── Socket listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current || getSocket();
    if (!socket) return;

    const onAnswer = async ({ answer } = {}) => {
      if (!answer?.type || !answer?.sdp) return;
      try {
        await webRTCService.handleAnswer(answer);
        setCallStatus('connected');
      } catch (e) { console.error('[CallScreen] handleAnswer error:', e); }
    };
    const onIce = async ({ candidate }) => {
      if (candidate) await webRTCService.handleIceCandidate(candidate);
    };
    const onAccepted = ({ answer } = {}) => {
      if (answer?.type && answer?.sdp) {
        setCallStatus('connected');
      } else {
        setCallStatus(prev => (prev === 'calling' ? 'connecting' : prev));
      }
    };
    const onEnded = () => { setCallStatus('ended'); onEndCall?.(); };
    const onRejected = () => { setCallStatus('ended'); onEndCall?.(); };

    socket.on('webrtc:answer', onAnswer);
    socket.on('call:answered', onAnswer);
    socket.on('webrtc:ice_candidate', onIce);
    socket.on('call:ice-candidate', onIce);
    socket.on('call:accepted', onAccepted);
    socket.on('call:ended', onEnded);
    socket.on('call:ended_all', onEnded);
    socket.on('call:rejected', onRejected);

    return () => {
      socket.off('webrtc:answer', onAnswer);
      socket.off('call:answered', onAnswer);
      socket.off('webrtc:ice_candidate', onIce);
      socket.off('call:ice-candidate', onIce);
      socket.off('call:accepted', onAccepted);
      socket.off('call:ended', onEnded);
      socket.off('call:ended_all', onEnded);
      socket.off('call:rejected', onRejected);
    };
  }, []);

  // ── Accept incoming call ────────────────────────────────────────────────
  const handleAccept = async () => {
    setCallStatus('connecting');
    stopRingtone();
    try {
      const socket = socketRef.current || getSocket();
      if (socket && call?.callerId) {
        // NOTE: only tell the caller "accepted" here — do NOT also emit an
        // empty 'webrtc:answer' before the real SDP answer exists. Doing so
        // used to make the server relay a fake 'call:accepted'/'webrtc:answer'
        // with no answer payload, which flipped the caller's UI to
        // "connected" before the peer connection was actually negotiated.
        // The real answer (with SDP) is emitted below inside
        // webRTCService.answerCall() once it's actually ready.
        socket.emit('call:accept', { conversationId: call.conversationId, callerId: call.callerId });
      }

      const stream = await webRTCService.answerCall(
        call.offer, call.type || 'audio', socket, call.callerId, call.callerSocketId
      );
      if (!stream) throw new Error('No local stream');

      setHasLocalStream(true);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      webRTCService.onRemoteStream = (remoteStream) => {
        setHasRemoteStream(true);
        setCallStatus('connected');
        setConnectionQuality('good');
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
      };
      webRTCService.onCallEnded = () => { setCallStatus('ended'); onEndCall?.(); };

      if (webRTCService.remoteStream) webRTCService.onRemoteStream(webRTCService.remoteStream);

    } catch (err) {
      console.error('[CallScreen] Accept error:', err);
      if (err.name === 'NotAllowedError') setErrorMsg('Please allow camera/microphone access');
      else setErrorMsg('Could not connect call');
    }
    onAcceptCall?.();
  };

  const handleReject = () => {
    stopRingtone();
    const socket = socketRef.current || getSocket();
    if (socket && call?.callerId) {
      socket.emit('call:reject', {
        conversationId: call.conversationId,
        callerId: call.callerId,
        callerSocketId: call.callerSocketId,
        callType: call.type || 'audio'
      });
    }
    webRTCService.endCall();
    onRejectCall?.();
  };

  const handleEndCall = () => {
    stopRingtone();
    const socket = socketRef.current || getSocket();
    if (socket) {
      socket.emit('call:end', {
        conversationId: call?.conversationId,
        targetUserId: call?.calleeId || call?.callerId,
        callType: call?.type || 'audio'
      });
    }
    webRTCService.endCall();
    onEndCall?.();
  };

  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await webRTCService.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await webRTCService.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error('[CallScreen] Screen share error:', err);
    }
  };

  const handleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    webRTCService.toggleAudio(!next);
    const socket = socketRef.current || getSocket();
    socket?.emit('call:toggle-audio', { targetUserId: call?.calleeId || call?.callerId, enabled: !next });
  };

  const handleCamera = () => {
    const next = !isCameraOff;
    setIsCameraOff(next);
    webRTCService.toggleVideo(!next);
    const socket = socketRef.current || getSocket();
    socket?.emit('call:toggle-video', { targetUserId: call?.calleeId || call?.callerId, enabled: !next });
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const requestCallFullscreen = useCallback(() => {
    if (document.fullscreenElement || !document.documentElement?.requestFullscreen) return;
    document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  const exitCallFullscreen = useCallback(() => {
    if (!document.fullscreenElement || !document.exitFullscreen) return;
    document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (callStatus === 'incoming' || callStatus === 'calling' || callStatus === 'connecting' || callStatus === 'connected') {
      requestCallFullscreen();
    } else {
      exitCallFullscreen();
    }
    return () => exitCallFullscreen();
  }, [callStatus, requestCallFullscreen, exitCallFullscreen]);

  if (!call) return null;

  // ── Incoming call UI ────────────────────────────────────────────────────
  if (isIncoming && callStatus === 'incoming') {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-[#0b141a] pt-20 pb-14"
        style={{ backgroundImage: 'radial-gradient(ellipse at top, #1a2631 0%, #0b141a 70%)' }}>
        <div className="text-center text-white flex flex-col items-center">
          <p className="text-[#8696a0] mb-6 flex items-center gap-2 text-sm">
            {isVideoCall ? <Video size={14} /> : <Phone size={14} />}
            GENZ {isVideoCall ? 'Video' : 'Voice'} Call
          </p>
          {profilePic
            ? <img src={profilePic} alt={callerName} className="w-28 h-28 rounded-full object-cover mb-4 border-4 border-[#00a884]" />
            : <div className="w-28 h-28 bg-[#2a3942] rounded-full flex items-center justify-center text-5xl text-white mb-4 border-4 border-[#00a884]">
                {callerName.charAt(0).toUpperCase()}
              </div>
          }
          <h2 className="text-3xl font-light mb-2 tracking-wide">{callerName}</h2>
          <p className="text-[#8696a0] text-base animate-pulse">Incoming {isVideoCall ? 'video' : 'voice'} call...</p>
        </div>

        <div className="flex w-full px-16 justify-between items-end">
          <div className="flex flex-col items-center gap-2">
            <button onClick={handleReject}
              className="w-16 h-16 rounded-full bg-[#f15c6d] hover:bg-[#d94f5e] flex items-center justify-center shadow-lg transition-all active:scale-95" aria-label="End call">
              <PhoneOff size={28} className="text-white" />
            </button>
            <span className="text-[#8696a0] text-xs">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-[#00a884] hover:bg-[#008f6f] flex items-center justify-center shadow-lg transition-all active:scale-95 animate-bounce">
              {isVideoCall ? <Video size={28} className="text-white" /> : <Phone size={28} className="text-white" />}
            </button>
            <span className="text-[#8696a0] text-xs">Accept</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Active / Connecting call UI ────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#0b141a]"
      style={{ backgroundImage: 'radial-gradient(ellipse at top, #1a2631 0%, #0b141a 70%)' }}>

      {/* Remote video (video calls only) */}
      {isVideoCall && hasRemoteStream && (
        <video ref={remoteVideoRef} autoPlay playsInline muted={false}
          className="absolute inset-0 w-full h-full object-cover"
          onLoadStart={() => console.log('[CallScreen] Remote video loading started')}
          onCanPlay={() => console.log('[CallScreen] Remote video can play')}
          onPlay={() => console.log('[CallScreen] Remote video playing')}
          onError={(e) => console.error('[CallScreen] Remote video error:', e)}
        />
      )}

      {/* CRITICAL FIX: dedicated audio element for the remote stream.
          Voice calls never rendered ANY element for the remote track before
          (only the <video> above, which only mounts for video calls), so
          two people on a voice call would connect but never hear each
          other. This element is always mounted (audio-only OR video call,
          hidden either way) and just exists to play back remote audio;
          for video calls the <video> element above also carries audio,
          but keeping this too is a safe, silent no-op there. */}
      <audio ref={remoteAudioRef} autoPlay playsInline
        onError={(e) => console.error('[CallScreen] Remote audio error:', e)}
        style={{ display: 'none' }}
      />

      {/* Top overlay: caller info */}
      <div className={`absolute top-0 left-0 w-full pt-12 pb-8 flex flex-col items-center z-10 ${isVideoCall && hasRemoteStream ? 'bg-gradient-to-b from-black/70 to-transparent' : ''}`}>
        {/* Connection quality */}
        <div className="flex items-center gap-1 mb-3">
          {connectionQuality === 'good'
            ? <Wifi size={12} className="text-[#00a884]" />
            : <WifiOff size={12} className="text-yellow-400" />}
          {isReconnecting && <RotateCcw size={12} className="text-yellow-400 animate-spin" />}
        </div>

        {(!isVideoCall || !hasRemoteStream) && (
          profilePic
            ? <img src={profilePic} alt={callerName} className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-[#00a884]" />
            : <div className="w-24 h-24 bg-[#2a3942] rounded-full flex items-center justify-center text-4xl text-white mb-4 border-2 border-[#00a884]">
                {callerName.charAt(0).toUpperCase()}
              </div>
        )}
        <h2 className="text-2xl text-white font-light drop-shadow">{callerName}</h2>
        <p className="text-[#8696a0] text-sm mt-1">
          {callStatus === 'calling' ? 'Ringing...'
            : callStatus === 'connecting' ? 'Connecting...'
            : callStatus === 'connected' ? fmt(duration)
            : 'Call ended'}
        </p>
        {errorMsg && (
          <p className="mt-2 text-red-400 text-xs px-4 text-center bg-black/40 py-1 rounded-full">{errorMsg}</p>
        )}
      </div>

      {/* Local video PiP */}
      {isVideoCall && hasLocalStream && (
        <div className="absolute bottom-32 right-4 w-28 h-40 rounded-xl overflow-hidden border-2 border-[#2a3942] z-20 shadow-2xl">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      )}

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 w-full pb-12 pt-6 px-8 flex justify-around items-center z-10 ${isVideoCall ? 'bg-gradient-to-t from-black/80 to-transparent' : 'bg-[#111b21]'}`}>
        {isVideoCall && (
          <ControlBtn onClick={handleCamera} active={isCameraOff} title={isCameraOff ? 'Camera off' : 'Camera on'}>
            {isCameraOff ? <CameraOff size={22} /> : <Camera size={22} />}
          </ControlBtn>
        )}
        {isVideoCall && (
          <ControlBtn onClick={handleScreenShare} active={isScreenSharing} title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
            {isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
          </ControlBtn>
        )}
        <ControlBtn onClick={() => setIsSpeakerOn(p => !p)} active={!isSpeakerOn} title="Speaker">
          {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
        </ControlBtn>
        <ControlBtn onClick={handleMute} active={isMuted} title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </ControlBtn>
        <button onClick={handleEndCall}
          className="w-14 h-14 rounded-full bg-[#f15c6d] hover:bg-[#d94f5e] text-white flex items-center justify-center shadow-lg transition-all active:scale-95" aria-label="End call">
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

const ControlBtn = ({ onClick, active, title, children }) => (
  <button onClick={onClick} title={title}
    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${active ? 'bg-white/20 text-white' : 'text-[#8696a0] hover:bg-white/10'}`}>
    {children}
  </button>
);

export default CallScreen;
