/**
 * GENZ WebRTC Service — Native RTCPeerConnection (no simple-peer needed)
 * Supports: Audio calls, Video calls, ICE negotiation, Mute/Camera toggle
 * Enhanced: Reconnection handling, ICE fallback, bitrate optimization, low bandwidth mode
 */

import { getWebRTCConfig, getWebRTCConfigAsync, detectNetworkProfile, getMediaConstraints, getWebRTCError } from '../config/webrtc';

class WebRTCService {
  // Safe accessor - prevents null reference crashes
  get _pc() { return this.pc || null; }
  _requirePc(method) {
    if (!this.pc) { console.warn(`[WebRTC] ${method} called but no peer connection exists`); return false; }
    return true;
  }

  constructor() {
    this.pc = null;           // RTCPeerConnection
    this.localStream = null;
    this.remoteStream = null;
    this.callType = 'audio';
    this.socket = null;
    this.targetUserId = null;
    
    // Enhanced features
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.lowBandwidthMode = false;
    this.bitrateLimit = 500000; // 500kbps default
    this.connectionHealthCheck = null;
    this.iceCandidatesQueue = [];
    this.isReconnecting = false;

    // Callbacks
    this.onRemoteStream = null;
    this.onCallEnded = null;
    this.onCallError = null;
    this.onReconnecting = null;
    this.onConnectionHealth = null;
  }

  // ── Step 1: Get local media with adaptive quality ─────────────────────
  async initLocalStream(callType = 'audio', constraints = {}) {
    this.callType = callType;
    
    // Adaptive constraints based on bandwidth mode
    const defaultConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: this.lowBandwidthMode ? 16000 : 48000
      },
      video: callType === 'video' ? {
        width: this.lowBandwidthMode ? { ideal: 640 } : { ideal: 1280 },
        height: this.lowBandwidthMode ? { ideal: 480 } : { ideal: 720 },
        frameRate: this.lowBandwidthMode ? { ideal: 15 } : { ideal: 30 }
      } : false
    };

    const finalConstraints = { ...defaultConstraints, ...constraints };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      
      // Apply bitrate limits to video tracks
      if (callType === 'video' && this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack && 'getSettings' in videoTrack) {
          const settings = videoTrack.getSettings();
          if (settings.width && settings.height) {
            console.log('[WebRTC] Video quality:', settings.width, 'x', settings.height);
          }
        }
      }
      
      return this.localStream;
    } catch (err) {
      console.error('[WebRTC] Media access error:', err);
      
      // Fallback to lower quality on error
      if (!this.lowBandwidthMode && callType === 'video') {
        console.log('[WebRTC] Falling back to low bandwidth mode');
        this.lowBandwidthMode = true;
        return this.initLocalStream(callType, constraints);
      }
      
      throw err;
    }
  }

  // ── Step 2: Create RTCPeerConnection with enhanced features ───────────
  async _createPeer() {
    let peerConfig = getWebRTCConfig();
    try {
      peerConfig = await getWebRTCConfigAsync();
    } catch (error) {
      console.warn('[WebRTC] Falling back to bundled ICE config:', error.message);
    }

    const pc = new RTCPeerConnection(peerConfig);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('[WebRTC] Adding local track:', track.kind, track.id);
        pc.addTrack(track, this.localStream);
      });
    }

    // Receive remote stream
    pc.ontrack = (event) => {
      console.log('[WebRTC] Track received:', event.track.kind, event.streams?.length);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        console.log('[WebRTC] Remote stream set from event.streams[0]');
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
          console.log('[WebRTC] Created new MediaStream for remote');
        }
        this.remoteStream.addTrack(event.track);
        console.log('[WebRTC] Added track to remote stream:', event.track.kind);
      }
      if (this.onRemoteStream) this.onRemoteStream(this.remoteStream);
    };

    // Send ICE candidates to peer via socket (trickle ICE — don't wait for remote description)
    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket && this.targetUserId) {
        this.socket.emit('webrtc:ice_candidate', {
          to: this.targetUserId,
          candidate: event.candidate
        });
      }
    };

    // Enhanced connection state handling with reconnection
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[WebRTC] Connection state:', state);
      
      if (this.onConnectionHealth) {
        this.onConnectionHealth(state);
      }

      if (state === 'disconnected' || state === 'failed') {
        console.log('[WebRTC] Connection lost, attempting reconnection...');
        this._attemptReconnection();
      } else if (state === 'connected') {
        this.reconnectAttempts = 0; // Reset on successful connection
      } else if (state === 'closed') {
        if (this.onCallEnded) this.onCallEnded();
      }
    };

    // ICE connection state for better troubleshooting
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'failed') {
        console.log('[WebRTC] ICE failed, trying ICE restart');
        pc.restartIce();
      }
    };

    let isNegotiating = false;
    let negotiationQueue = Promise.resolve();

    const queueNegotiation = async () => {
      // Synchronous check before queuing
      if (isNegotiating || pc.signalingState !== 'stable') {
        console.log('[WebRTC] Skipping negotiation - state:', pc.signalingState, 'isNegotiating:', isNegotiating);
        return;
      }

      negotiationQueue = negotiationQueue.then(async () => {
        // Double-check state before proceeding
        if (isNegotiating || pc.signalingState !== 'stable') {
          console.log('[WebRTC] Skipping queued negotiation - state:', pc.signalingState, 'isNegotiating:', isNegotiating);
          return;
        }

        isNegotiating = true;
        try {
          console.log('[WebRTC] Negotiation needed, creating new offer...');
          // Do not force offerOptions here; it causes m-line order mismatch during renegotiation
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (this.socket && this.targetUserId) {
            this.socket.emit('webrtc:offer', { 
              to: this.targetUserId, 
              offer, 
              callType: this.callType,
              conversationId: this.conversationId
            });
          }
        } catch (err) {
          console.error('[WebRTC] onnegotiationneeded error:', err);
        } finally {
          isNegotiating = false;
        }
      });
    };

    // Handle signaling state
    pc.onsignalingstatechange = () => {
      console.log('[WebRTC] Signaling state:', pc.signalingState);
      if (pc.signalingState === 'stable') {
        isNegotiating = false;
      }
    };

    pc.onnegotiationneeded = () => {
      queueNegotiation();
    };

    this.pc = pc;
    return pc;
  }

  // ── Reconnection handling ───────────────────────────────────────────────
  async _attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebRTC] Max reconnection attempts reached');
      if (this.onCallEnded) this.onCallEnded();
      return;
    }

    // Prevent multiple simultaneous reconnection attempts
    if (this.isReconnecting) {
      console.log('[WebRTC] Reconnection already in progress, skipping');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`[WebRTC] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    if (this.onReconnecting) {
      this.onReconnecting(this.reconnectAttempts, this.maxReconnectAttempts);
    }

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // Only restart ICE if peer connection is still in a valid state
      if (this.pc && this.pc.signalingState !== 'closed') {
        console.log('[WebRTC] Restarting ICE...');
        this.pc.restartIce();
      } else {
        console.log('[WebRTC] Peer connection closed, cannot restart ICE');
      }
    } catch (err) {
      console.error('[WebRTC] Reconnection failed:', err);
    } finally {
      this.isReconnecting = false;
    }
  }

  // ── Toggle low bandwidth mode ───────────────────────────────────────────
  toggleLowBandwidthMode(enabled) {
    this.lowBandwidthMode = enabled;
    this.bitrateLimit = enabled ? 300000 : 500000; // 300kbps low, 500kbps normal
    
    // Restart media with new constraints if local stream exists
    if (this.localStream && this.callType === 'video') {
      this._updateVideoQuality();
    }
    
    console.log(`[WebRTC] Low bandwidth mode: ${enabled}`);
  }

  // ── Update video quality dynamically ───────────────────────────────────
  async _updateVideoQuality() {
    if (!this.localStream) return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    
    const constraints = {
      width: this.lowBandwidthMode ? { ideal: 640 } : { ideal: 1280 },
      height: this.lowBandwidthMode ? { ideal: 480 } : { ideal: 720 },
      frameRate: this.lowBandwidthMode ? { ideal: 15 } : { ideal: 30 }
    };
    
    try {
      await videoTrack.applyConstraints(constraints);
      console.log('[WebRTC] Video quality updated:', constraints);
    } catch (err) {
      console.error('[WebRTC] Failed to update video quality:', err);
    }
  }

  // ── Connection health monitoring ───────────────────────────────────────
  startHealthMonitoring() {
    if (this.connectionHealthCheck) {
      clearInterval(this.connectionHealthCheck);
    }

    this.connectionHealthCheck = setInterval(() => {
      if (this.pc) {
        const stats = {
          connectionState: this.pc?.connectionState,
          iceConnectionState: this.pc?.iceConnectionState,
          iceGatheringState: this.pc?.iceGatheringState,
          signalingState: this.pc?.signalingState
        };
        
        if (this.onConnectionHealth) {
          this.onConnectionHealth(stats);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  stopHealthMonitoring() {
    if (this.connectionHealthCheck) {
      clearInterval(this.connectionHealthCheck);
      this.connectionHealthCheck = null;
    }
  }

  // ── Outgoing call: Create offer ─────────────────────────────────────────
  async createCall(targetUserId, callType = 'audio', socket, conversationId = null) {
    this.socket = socket;
    this.targetUserId = targetUserId;
    this.callType = callType;
    this.conversationId = conversationId;
    this.reconnectAttempts = 0;

    await this.initLocalStream(callType);
    const pc = await this._createPeer();
    this.startHealthMonitoring();

    // IMPORTANT: do NOT pass legacy offerToReceiveAudio/offerToReceiveVideo
    // options here. Local tracks were already added via pc.addTrack() above,
    // which creates the audio/video transceivers in a fixed order. Mixing
    // addTrack-created transceivers with the legacy offerToReceive* options
    // can make the browser insert/duplicate transceivers in a different
    // order than later renegotiation offers (which correctly call
    // pc.createOffer() with no options) — causing the
    // "order of m-lines in subsequent offer doesn't match" error and
    // dropped/garbled calls. Keeping offer creation consistent (no options,
    // every time) keeps the m-line order stable across the whole call.
    
    // Temporarily disable onnegotiationneeded during initial offer creation
    // to prevent race conditions
    const originalOnNegotiationNeeded = pc.onnegotiationneeded;
    pc.onnegotiationneeded = null;
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    // Re-enable onnegotiationneeded after initial offer is set
    pc.onnegotiationneeded = originalOnNegotiationNeeded;

    socket.emit('webrtc:offer', { to: targetUserId, offer, callType, conversationId });
    return this.localStream;
  }

  // ── Incoming call: Answer offer ─────────────────────────────────────────
  async answerCall(offer, callType = 'audio', socket, callerId, callerSocketId = null) {
    this.socket = socket;
    this.targetUserId = callerId;
    this.callType = callType;
    this.reconnectAttempts = 0;

    try {
      await this.initLocalStream(callType);
      const pc = await this._createPeer();
      this.startHealthMonitoring();

      // Validate and set remote description with error handling
      if (!offer || !offer.type || !offer.sdp) {
        throw new Error('Invalid offer: missing type or SDP');
      }
      
      // Temporarily disable onnegotiationneeded during answer creation
      // to prevent race conditions
      const originalOnNegotiationNeeded = pc.onnegotiationneeded;
      pc.onnegotiationneeded = null;
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Re-enable onnegotiationneeded after answer is set
      pc.onnegotiationneeded = originalOnNegotiationNeeded;

      // Flush any ICE candidates that arrived before the peer connection was fully initialized
      await this._flushIceQueue();

      // Ensure answer has proper structure before emitting
      const answerPayload = {
        type: 'answer',
        sdp: pc.localDescription.sdp
      };
      
      console.log('[WebRTC] Emitting answer with structure:', { type: answerPayload.type, sdpLength: answerPayload.sdp?.length });
      socket.emit('webrtc:answer', { to: callerId, callerSocketId, answer: answerPayload });
      return this.localStream;
    } catch (err) {
      console.error('[WebRTC] answerCall error:', err);
      this.onCallError?.(err);
      throw err;
    }
  }

  // ── Handle incoming answer ──────────────────────────────────────────────
  async handleAnswer(answer) {
    console.log('[WebRTC] handleAnswer called with:', answer);
    
    if (!this.pc) {
      console.warn('[WebRTC] handleAnswer: PC not initialized yet');
      return;
    }
    
    // Early return for undefined/empty answers (duplicate socket events)
    if (!answer) {
      console.warn('[WebRTC] handleAnswer called with empty/undefined answer, ignoring');
      return;
    }
    
    try {
      // Validate answer structure before processing
      if (!answer.type || !answer.sdp) {
        console.error('[WebRTC] Invalid answer structure:', { 
          hasType: !!answer?.type, 
          hasSdp: !!answer?.sdp, 
          answerKeys: answer ? Object.keys(answer) : 'null',
          fullAnswer: answer 
        });
        throw new Error('Invalid answer: missing type or SDP');
      }
      
      if (!this.pc) throw new Error('No peer connection');
      
      // FIX: The signaling server emits the answer under two event names
      // (call:answered and webrtc:answer) for backward compatibility, and
      // the UI listens to both — so this can legitimately be called twice
      // for the same answer. Once we're past 'have-local-offer' the remote
      // description is already set; setting it again throws InvalidStateError.
      // Treat that as a harmless duplicate instead of an error.
      if (this.pc.signalingState === 'stable') {
        console.log('[WebRTC] Already in stable state, ignoring duplicate answer');
        return;
      }
      
      console.log('[WebRTC] Setting remote description with answer:', { 
        type: answer.type, 
        sdpLength: answer.sdp?.length,
        signalingState: this.pc.signalingState 
      });
      
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[WebRTC] Remote description set successfully');
      
      // Flush queued ICE candidates after remote description is set
      await this._flushIceQueue();
    } catch (err) {
      if (this.pc?.signalingState === 'stable') {
        // Duplicate answer arrived after the first one already applied — ignore.
        console.log('[WebRTC] Duplicate answer after stable state, ignoring');
        return;
      }
      console.error('[WebRTC] setRemoteDescription error:', err);
      this.onCallError?.(err);
    }
  }

  // ── Handle Renegotiation (ICE Restart) ──────────────────────────────────
  async handleRenegotiation(offer, callerId) {
    if (!this.pc) return;
    try {
      if (!this.pc) throw new Error('No peer connection for answer');
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      
      await this._flushIceQueue();
      
      if (this.socket) {
        this.socket.emit('webrtc:answer', { to: callerId, answer });
      }
      console.log('[WebRTC] Renegotiation answer sent');
    } catch (err) {
      console.error('[WebRTC] handleRenegotiation error:', err);
    }
  }

  async _flushIceQueue() {
    if (!this.pc) return;
    while (this.iceCandidatesQueue.length > 0) {
      const queued = this.iceCandidatesQueue.shift();
      try {
        if (this.pc) await this.pc.addIceCandidate(new RTCIceCandidate(queued));
      } catch (err) {
        console.error('[WebRTC] Failed to add queued ICE candidate:', err);
      }
    }
  }

  // ── Handle ICE candidate with queue for late arrivals ───────────────────
  async handleIceCandidate(candidate) {
    if (!this.pc) {
      this.iceCandidatesQueue.push(candidate);
      return;
    }

    if (!this.pc.remoteDescription) {
      this.iceCandidatesQueue.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      await this._flushIceQueue();
    } catch (err) {
      console.error('[WebRTC] addIceCandidate error:', err);
      this.iceCandidatesQueue.push(candidate);
    }
  }

  // ── Controls ────────────────────────────────────────────────────────────
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => { t.enabled = enabled; });
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => { t.enabled = enabled; });
    }
  }


  // ── Screen Share ────────────────────────────────────────────────────────
  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', displaySurface: 'monitor' },
        audio: true
      });

      if (!this.pc) throw new Error('No active call');

      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = this.pc?.getSenders().find(s => s.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(videoTrack);
      } else {
        if (this.pc) this.pc.addTrack(videoTrack, screenStream);
      }

      // Restore camera when screen share ends
      videoTrack.onended = () => this.stopScreenShare();

      this._screenStream = screenStream;
      return screenStream;
    } catch (err) {
      console.error('[WebRTC] Screen share error:', err);
      throw err;
    }
  }

  async stopScreenShare() {
    try {
      if (this._screenStream) {
        this._screenStream.getTracks().forEach(t => t.stop());
        this._screenStream = null;
      }
      // Restore camera track
      if (this.localStream && this.pc) {
        const cameraTrack = this.localStream.getVideoTracks()[0];
        if (cameraTrack) {
          const sender = this.pc?.getSenders().find(s => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(cameraTrack);
        }
      }
    } catch (err) {
      console.error('[WebRTC] Stop screen share error:', err);
    }
  }

  isScreenSharing() {
    return !!this._screenStream;
  }

  // ── Get peer connection for external access (screen sharing) ───────────
  get peerConnection() {
    return this.pc;
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────
  endCall() {
    this.stopHealthMonitoring();
    
    if (this.pc) {
      if (this.pc) this.pc.close();
      this.pc = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    this.remoteStream = null;
    this.targetUserId = null;
    this.reconnectAttempts = 0;
    this.iceCandidatesQueue = [];
    this.lowBandwidthMode = false;
  }

  getLocalStream() { return this.localStream; }
  getRemoteStream() { return this.remoteStream; }
  isVideoCall() { return this.callType === 'video'; }
  getConnectionState() {
    return this.pc ? {
      connectionState: this.pc?.connectionState ?? 'closed',
      iceConnectionState: this.pc?.iceConnectionState ?? 'closed',
      signalingState: this.pc?.signalingState ?? 'closed'
    } : null;
  }
}

export default new WebRTCService();
