import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Video, Mic, MicOff, Camera, CameraOff, PhoneOff, Volume2, VolumeX, PhoneIncoming, Circle, Square, Monitor, MonitorStop } from 'lucide-react';
import webRTCService from '../services/webrtc';
import { getSocket } from '../services/socket';

const getSupportedMimeType = (types = []) => {
  if (typeof MediaRecorder === 'undefined') return '';
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);
  const recordingAudioContextRef = useRef(null);
  const recordingMixedAudioTrackRef = useRef(null);
  const screenStreamRef = useRef(null);
  const socket = getSocket();

  const isVideoCall = call?.type === 'video';
  const isIncoming = call?.status === 'incoming';
  const callerName = call?.user?.username || call?.callerName || 'Unknown'; 

  function cleanupRecordingResources() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recordingMixedAudioTrackRef.current) {
      recordingMixedAudioTrackRef.current.stop();
      recordingMixedAudioTrackRef.current = null;
    }
    if (recordingAudioContextRef.current) {
      recordingAudioContextRef.current.close().catch(() => {});
      recordingAudioContextRef.current = null;
    }
  }

  function createMixedAudioTrack(streams = []) {
    const audioTracks = streams
      .flatMap((stream) => stream?.getAudioTracks?.() || [])
      .filter((track) => track.readyState === 'live');

    if (!audioTracks.length) return null;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return audioTracks[0].clone();

    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    audioTracks.forEach((track) => {
      const source = context.createMediaStreamSource(new MediaStream([track]));
      source.connect(destination);
    });

    recordingAudioContextRef.current = context;
    recordingMixedAudioTrackRef.current = destination.stream.getAudioTracks()[0] || null;
    return recordingMixedAudioTrackRef.current;
  }

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopStream(recordingStreamRef.current);
      stopStream(screenStreamRef.current);
      cleanupRecordingResources();
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
  useEffect(() => {
    if (!call || isIncoming) return;

    const startCall = async () => {
      try {
        if (!socket) {
          console.warn('[CallScreen] Socket not available yet, waiting...');
          setTimeout(startCall, 500);
          return;
        }

        const targetUserId = call.calleeId || call.targetUserId || call.user?._id || call.callerId;
        const stream = await webRTCService.createCall(
          targetUserId,
          call.type || 'audio',
          socket,
          call.conversationId
        );
        setHasLocalStream(true);
        if (localVideoRef.current && stream) localVideoRef.current.srcObject = stream;

        webRTCService.onRemoteStream = (remoteStream) => {
          setHasRemoteStream(true);
          setCallStatus('connected');
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        };
        webRTCService.onCallEnded = () => {
          setCallStatus('ended');
          onEndCall?.();
        };
      } catch (err) {
        console.error('[CallScreen] Error starting call:', err);
      }
    };

    if (call.status !== 'incoming') startCall();
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
    socket.on('call:ended', () => { setCallStatus('ended'); onEndCall?.(); });
    socket.on('call:rejected', () => { setCallStatus('ended'); onEndCall?.(); });

    return () => {
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice_candidate', handleIce);
      socket.off('call:ended');
      socket.off('call:rejected');
    };
  }, [socket]);

  // ── Accept incoming call ──
  const handleAccept = async () => {
    setCallStatus('connecting');
    try {
      const stream = await webRTCService.answerCall(
        call.offer,
        call.type || 'audio',
        socket,
        call.callerId,
        call.callerSocketId
      );
      setHasLocalStream(true);
      if (localVideoRef.current && stream) localVideoRef.current.srcObject = stream;

      webRTCService.onRemoteStream = (remoteStream) => {
        setHasRemoteStream(true);
        setCallStatus('connected');
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      };
    } catch (err) {
      console.error('[CallScreen] Error accepting call:', err);
      setCallStatus(call?.offer ? 'incoming' : 'connecting');
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

  // ── Fullscreen toggle ──
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.() || document.documentElement.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  };

  // ── Handle fullscreen change ──
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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

  // ── Screen Sharing Functions ──
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const startScreenShare = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in this browser');
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true
      });

      screenStreamRef.current = screenStream;
      const videoTrack = screenStream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No screen video track was selected');
      }

      // Replace video track in WebRTC connection
      if (webRTCService.peerConnection) {
        const sender = webRTCService.peerConnection.getSenders().find(s =>
          s.track?.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      // Update local video to show screen
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      setIsScreenSharing(true);

      // Handle user clicking "Stop sharing"
      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Error starting screen share:', err);
      stopStream(screenStreamRef.current);
      screenStreamRef.current = null;
      alert(err.message || 'Could not start screen sharing. Please ensure you have granted the necessary permissions.');
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Revert to the existing camera stream used by the call.
    if (isVideoCall && webRTCService.peerConnection) {
      try {
        const cameraStream = webRTCService.getLocalStream();
        const videoTrack = !isCameraOff
          ? cameraStream?.getVideoTracks?.().find((track) => track.readyState === 'live')
          : null;
        const sender = webRTCService.peerConnection.getSenders().find(s =>
          s.track?.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(videoTrack || null);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream || null;
        }
      } catch (err) {
        console.error('Error reverting to camera:', err);
      }
    }

    setIsScreenSharing(false);
  };

  // ── 

  // ── Call Recording Functions ──
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('Call recording is not supported in this browser');
      }

      const localStream = webRTCService.getLocalStream();
      const remoteStream = webRTCService.getRemoteStream();
      const recordingStream = new MediaStream();

      if (isVideoCall) {
        const sourceVideoTrack =
          remoteStream?.getVideoTracks?.().find((track) => track.readyState === 'live') ||
          screenStreamRef.current?.getVideoTracks?.().find((track) => track.readyState === 'live') ||
          localStream?.getVideoTracks?.().find((track) => track.readyState === 'live');

        if (sourceVideoTrack) {
          recordingStream.addTrack(sourceVideoTrack.clone());
        }
      }

      const mixedAudioTrack = createMixedAudioTrack([localStream, remoteStream]);
      if (mixedAudioTrack) {
        recordingStream.addTrack(mixedAudioTrack);
      } else {
        [localStream, remoteStream].forEach((stream) => {
          stream?.getAudioTracks?.()
            .filter((track) => track.readyState === 'live')
            .forEach((track) => recordingStream.addTrack(track.clone()));
        });
      }

      if (!recordingStream.getTracks().length) {
        throw new Error('No active call media is available to record yet');
      }

      const mimeType = getSupportedMimeType(isVideoCall
        ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        : ['audio/webm;codecs=opus', 'audio/webm']
      );
      const mediaRecorder = new MediaRecorder(
        recordingStream,
        mimeType ? { mimeType } : undefined
      );

      recordedChunksRef.current = [];
      recordingStreamRef.current = recordingStream;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        saveRecording();
        stopStream(recordingStreamRef.current);
        recordingStreamRef.current = null;
        cleanupRecordingResources();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(p => p + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Could not start recording. Please ensure you have granted the necessary permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingTime(0);
  };

  const saveRecording = () => {
    if (!recordedChunksRef.current.length) return;
    const recorderMimeType = mediaRecorderRef.current?.mimeType || (isVideoCall ? 'video/webm' : 'audio/webm');
    const blob = new Blob(recordedChunksRef.current, {
      type: recorderMimeType
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GENZ_Call_${callerName}_${new Date().toISOString().slice(0, 10)}.webm`;
    a.click();
    URL.revokeObjectURL(url);

    recordedChunksRef.current = [];
  };

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
      <div className="fixed inset-0 z-[1000] flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2440 50%, #0a1628 100%)' }}>
        <div className="text-center text-white">
          <div className="w-28 h-28 bg-blue-600 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-bold shadow-2xl ring-4 ring-blue-400/30 animate-pulse">
            {callerName.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-2xl font-bold mb-1">{callerName}</h2>
          <p className="text-blue-300/70 mb-2">{isVideoCall ? 'Incoming Video Call' : 'Incoming Audio Call'}</p>
          <div className="flex items-center justify-center gap-1 animate-pulse mb-10">
            {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-blue-400 rounded-full" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
          <div className="flex items-center justify-center gap-12">
            <button onClick={handleReject}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-xl transition-transform hover:scale-110">
              <PhoneOff size={24} />
            </button>
            <button onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-xl transition-transform hover:scale-110 animate-bounce">
              {isVideoCall ? <Video size={24} /> : <Phone size={24} />}
            </button>
          </div>
          <p className="text-sm text-white/40 mt-8">Tap to accept or decline</p>
        </div>
      </div>
    );
  }

  // ── Active call UI ──
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d1f3c 100%)' }}>

      {/* Remote video (full screen for video calls) */}
      {isVideoCall && hasRemoteStream && (
        <video ref={remoteVideoRef} autoPlay playsInline
          className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Caller info */}
      <div className="flex-1 flex flex-col items-center justify-center text-white z-10">
        {(!isVideoCall || !hasRemoteStream) && (
          <>
            <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-2xl">
              {callerName.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-2xl font-bold">{callerName}</h2>
            <p className="text-white/60 mt-1">
              {callStatus === 'calling' ? 'Calling...' :
                callStatus === 'connecting' ? 'Connecting...' :
                  callStatus === 'connected' ? formatDuration(duration) :
                    'Call ended'}
            </p>
            {callStatus === 'calling' && (
              <div className="flex items-center gap-1 mt-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
            {callStatus === 'connected' && (
              <span className="text-green-400 text-xs font-bold mt-1 uppercase tracking-widest">● Connected</span>
            )}
          </>
        )}
        {isVideoCall && callStatus === 'connected' && (
          <div className="absolute top-4 left-4 flex items-center gap-3">
            <div className="text-white/70 text-sm font-mono">
              {formatDuration(duration)}
            </div>
            {/* Connection quality indicator */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${connectionQuality === 'good' ? 'bg-green-500/30 text-green-400' :
                connectionQuality === 'checking' ? 'bg-yellow-500/30 text-yellow-400' :
                  connectionQuality === 'poor' ? 'bg-red-500/30 text-red-400' :
                    'bg-gray-500/30 text-gray-400'
              }`}>
              {connectionQuality === 'good' && '● Good'}
              {connectionQuality === 'checking' && '○ Checking'}
              {connectionQuality === 'poor' && '● Poor'}
              {connectionQuality === 'unknown' && '○ Unknown'}
            </div>
          </div>
        )}

        {/* Fullscreen button */}
        {callStatus === 'connected' && (
          <button onClick={toggleFullscreen}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all z-30"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        )}
      </div>

      {/* Local video (PiP) */}
      {isVideoCall && hasLocalStream && (
        <div className="absolute top-16 right-4 w-28 h-40 bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 z-20 shadow-xl">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {/* Screen share indicator */}
          {isScreenSharing && (
            <div className="absolute bottom-2 left-2 right-2 bg-blue-600 text-white text-xs text-center py-1 rounded">
              Screen Share
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="pb-12 flex flex-col items-center gap-6 z-10">
        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 text-red-400 text-sm font-bold animate-pulse">
            <Circle size={12} fill="currentColor" />
            <span>Recording {formatDuration(recordingTime)}</span>
          </div>
        )}

        <div className="flex items-center gap-6">
          <button onClick={handleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {isVideoCall && (
            <button onClick={handleCamera}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isCameraOff ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
              title={isCameraOff ? 'Show Camera' : 'Hide Camera'}>
              {isCameraOff ? <CameraOff size={22} /> : <Camera size={22} />}
            </button>
          )}

          {/* Screen sharing button */}
          {isVideoCall && (
            <button onClick={toggleScreenShare}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-blue-600 text-white animate-pulse' : 'bg-white/10 text-white hover:bg-white/20'}`}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}>
              {isScreenSharing ? <MonitorStop size={22} /> : <Monitor size={22} />}
            </button>
          )}

          {/* Recording button */}
          <button onClick={toggleRecording}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}>
            {isRecording ? <Square size={22} /> : <Circle size={22} />}
          </button>

          <button onClick={handleEndCall}
            className="w-18 h-18 w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105">
            <PhoneOff size={28} />
          </button>

          <button onClick={() => setIsSpeakerOn(p => !p)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isSpeakerOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/30 text-red-400'}`}
            title="Speaker">
            {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
        </div>

        {isVideoCall && !hasLocalStream && (
          <p className="text-white/30 text-xs">Camera not started</p>
        )}
      </div>
    </div>
  );
};

export default CallScreen;
