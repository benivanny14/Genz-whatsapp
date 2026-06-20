import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Video, Mic, MicOff, Camera, CameraOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import webRTCService from '../services/webrtc';
import { getSocket } from '../services/socket';

const stopStream = (stream) => {
  stream?.getTracks?.().forEach((track) => track.stop());
};

const CallScreen = ({ call, onEndCall, onAcceptCall, onRejectCall, onToggleMute, onToggleCamera }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [callStatus, setCallStatus] = useState(call?.status || 'calling');
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const socket = getSocket();

  const isVideoCall = call?.type === 'video';
  const isIncoming = call?.status === 'incoming';
  const callerName = call?.user?.username || call?.callerName || 'Unknown'; 
  const profilePic = call?.user?.profilePicture || call?.callerProfilePic || null;

  useEffect(() => {
    return () => {
      stopRingtone();
    };
  }, []);
 
  // ── Ringtone using Web Audio API ──
  const audioCtxRef = useRef(null);
  const ringerIntervalRef = useRef(null);

  const startRingtone = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      
      const playRing = () => {
        if (ctx.state === 'suspended') ctx.resume();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Standard UK/Europe ring frequencies
        osc1.frequency.value = 400;
        osc2.frequency.value = 450;
        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Ring cadence: 0.4s on, 0.2s off, 0.4s on, 2s off
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime + 0.4);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.45);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.6);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.65);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime + 1.0);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.05);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.1);
        osc2.stop(ctx.currentTime + 1.1);
      };

      playRing();
      ringerIntervalRef.current = setInterval(playRing, 3000);
    } catch (e) {
      console.warn('Audio ringtone failed:', e);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringerIntervalRef.current) {
      clearInterval(ringerIntervalRef.current);
      ringerIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (callStatus === 'incoming' || callStatus === 'calling') {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [callStatus, startRingtone, stopRingtone]);


  // ── Start call timer when connected ──
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => setDuration(p => p + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callStatus]);

  // ── Initialize outgoing call ──
  const socketRetryRef = useRef(0);

  useEffect(() => {
    if (!call || isIncoming) return;
    socketRetryRef.current = 0;
    let retryTimer = null;
    let cancelled = false;

    const startCall = async () => {
      if (cancelled) return;

      if (!socket) {
        socketRetryRef.current += 1;
        if (socketRetryRef.current > 5) {
          console.error('[CallScreen] Socket unavailable after 5 retries, aborting call.');
          setCallStatus('ended');
          onEndCall?.();
          return;
        }
        console.warn(`[CallScreen] Socket not available yet, retry ${socketRetryRef.current}/5...`);
        retryTimer = setTimeout(startCall, 2000);
        return;
      }

      try {
        const targetUserId = call.calleeId || call.user?._id || call.callerId;
        if (!targetUserId) {
          throw new Error('Missing call target user');
        }
        const stream = await webRTCService.createCall(
          targetUserId,
          call.type || 'audio',
          socket,
          call.conversationId
        );
        if (cancelled) return;
        setHasLocalStream(true);
        if (localVideoRef.current && stream) localVideoRef.current.srcObject = stream;

        webRTCService.onRemoteStream = (remoteStream) => {
          setHasRemoteStream(true);
          setCallStatus('connected');
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        };
        
        if (webRTCService.remoteStream) {
          webRTCService.onRemoteStream(webRTCService.remoteStream);
        }

        webRTCService.onCallEnded = () => {
          setCallStatus('ended');
          onEndCall?.();
        };
      } catch (err) {
        console.error('[CallScreen] Error starting call:', err);
      }
    };

    if (call.status !== 'incoming') startCall();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [call?.conversationId, socket]);

  // ── Socket: receive WebRTC answer + ICE candidates ──
  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async ({ answer }) => {
      await webRTCService.handleAnswer(answer);
      setCallStatus('connected');
    };
    const handleIce = async ({ candidate }) => {
      await webRTCService.handleIceCandidate(candidate);
    };

    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice_candidate', handleIce);
    socket.on('call:accepted', () => { setCallStatus('connected'); });
    socket.on('call:ended', () => { setCallStatus('ended'); onEndCall?.(); });
    socket.on('call:rejected', () => { setCallStatus('ended'); onEndCall?.(); });

    return () => {
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice_candidate', handleIce);
      socket.off('call:accepted');
      socket.off('call:ended');
      socket.off('call:rejected');
    };
  }, [socket]);

  // ── Accept incoming call ──
  const handleAccept = async () => {
    setCallStatus('connecting');
    try {
      if (socket && call?.callerId) {
        socket.emit('call:accept', {
          conversationId: call.conversationId,
          callerId: call.callerId
        });
      }
      const stream = await webRTCService.answerCall(
        call.offer,
        call.type || 'audio',
        socket,
        call.callerId
      );
      setHasLocalStream(true);
      if (localVideoRef.current && stream) localVideoRef.current.srcObject = stream;

      webRTCService.onRemoteStream = (remoteStream) => {
        setHasRemoteStream(true);
        setCallStatus('connected');
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      };
      
      if (webRTCService.remoteStream) {
        webRTCService.onRemoteStream(webRTCService.remoteStream);
      }
    } catch (err) {
      console.error('[CallScreen] Error accepting call:', err);
    }
    onAcceptCall?.();
  };

  const handleReject = () => {
    webRTCService.endCall();
    onRejectCall?.();
  };

  const handleEndCall = () => {
    webRTCService.endCall();
    if (socket && call?.conversationId) {
      socket.emit('call:end', { conversationId: call.conversationId });
    }
    onEndCall?.();
  };

  // ── Connection quality monitoring ──
  useEffect(() => {
    if (callStatus === 'connected') {
      const qualityInterval = setInterval(() => {
        const connState = webRTCService.getConnectionState();
        if (connState) {
          if (connState.iceConnectionState === 'connected' || connState.iceConnectionState === 'completed') {
            setConnectionQuality('good');
          } else if (connState.iceConnectionState === 'checking') {
            setConnectionQuality('checking');
          } else if (connState.iceConnectionState === 'disconnected') {
            setConnectionQuality('poor');
          } else {
            setConnectionQuality('unknown');
          }
        }
      }, 3000);
      return () => clearInterval(qualityInterval);
    }
  }, [callStatus]);

  const handleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    webRTCService.toggleAudio(!next);
    onToggleMute?.(next);
  };

  const handleCamera = () => {
    const next = !isCameraOff;
    setIsCameraOff(next);
    webRTCService.toggleVideo(!next);
    onToggleCamera?.(next);
  };

  const formatDuration = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!call) return null;

  // ── Incoming call UI ──
  if (isIncoming && callStatus === 'incoming') {
    return (
      <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-between bg-[#0b141a] pt-16 pb-12">
        <div className="text-center text-white flex flex-col items-center">
          <p className="text-[#8696a0] mb-4 flex items-center justify-center gap-2">
            {isVideoCall ? <Video size={16} /> : <Phone size={16} />}
            WhatsApp {isVideoCall ? 'Video' : 'Audio'} Call
          </p>
          {profilePic ? (
            <img src={profilePic} alt={callerName} className="w-24 h-24 rounded-full object-cover mb-4" />
          ) : (
            <div className="w-24 h-24 bg-[#6b7c85] rounded-full flex items-center justify-center text-4xl text-white mb-4">
              {callerName.charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className="text-3xl font-normal mb-2">{callerName}</h2>
          <p className="text-lg text-[#8696a0]">Incoming...</p>
        </div>
        
        <div className="flex w-full px-12 justify-between items-end pb-8">
          <div className="flex flex-col items-center">
            <button onClick={handleReject}
              className="w-16 h-16 rounded-full bg-[#f15c6d] flex items-center justify-center mb-2">
              <PhoneOff size={28} className="text-white" />
            </button>
            <span className="text-[#8696a0] text-sm">Decline</span>
          </div>
          
          <div className="flex flex-col items-center">
            <button onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-[#00a884] flex items-center justify-center mb-2">
              {isVideoCall ? <Video size={28} className="text-white" /> : <Phone size={28} className="text-white" />}
            </button>
            <span className="text-[#8696a0] text-sm">Accept</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Active call UI ──
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-[#0b141a]">
      {/* Remote video (full screen for video calls) */}
      {isVideoCall && hasRemoteStream && (
        <video ref={remoteVideoRef} autoPlay playsInline
          className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Caller info overlay */}
      <div className={`absolute top-0 left-0 w-full pt-12 pb-8 flex flex-col items-center justify-start text-white z-10 transition-opacity duration-300 ${isVideoCall && hasRemoteStream ? 'bg-gradient-to-b from-black/60 to-transparent' : ''}`}>
        {(!isVideoCall || !hasRemoteStream) && (
          <div className="flex flex-col items-center mt-8 mb-4">
             {profilePic ? (
              <img src={profilePic} alt={callerName} className="w-24 h-24 rounded-full object-cover mb-4" />
            ) : (
              <div className="w-24 h-24 bg-[#6b7c85] rounded-full flex items-center justify-center text-4xl text-white mb-4">
                {callerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
        <h2 className="text-2xl font-normal drop-shadow-md">{callerName}</h2>
        <p className="text-[#8696a0] mt-1 text-sm font-medium drop-shadow-md">
          {callStatus === 'calling' ? 'Calling...' :
            callStatus === 'connecting' ? 'Connecting...' :
              callStatus === 'connected' ? formatDuration(duration) :
                'Call ended'}
        </p>
      </div>

      {/* Local video (PiP) */}
      {isVideoCall && hasLocalStream && (
        <div className="absolute bottom-32 right-4 w-28 h-40 bg-gray-900 rounded-lg overflow-hidden border border-[#202c33] z-20 shadow-lg">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      )}

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 w-full pb-10 pt-6 px-6 flex justify-around items-center z-10 ${isVideoCall ? 'bg-gradient-to-t from-black/80 to-transparent' : 'bg-[#111b21]'}`}>
        
        <button onClick={handleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCameraOff ? 'bg-white/20 text-white' : 'text-[#8696a0] hover:bg-white/10'}`}
          title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}>
          {isCameraOff ? <CameraOff size={24} /> : <Camera size={24} />}
        </button>

        <button onClick={() => setIsSpeakerOn(p => !p)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isSpeakerOn ? 'text-[#8696a0] hover:bg-white/10' : 'bg-white/20 text-white'}`}
          title={isSpeakerOn ? 'Speaker on' : 'Speaker off'}>
          {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>

        <button onClick={handleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-white/20 text-white' : 'text-[#8696a0] hover:bg-white/10'}`}
          title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button onClick={handleEndCall}
          className="w-14 h-14 rounded-full bg-[#f15c6d] hover:bg-[#d65161] text-white flex items-center justify-center transition-transform">
          <PhoneOff size={26} />
        </button>
      </div>
    </div>
  );
};

export default CallScreen;
