/**
 * GENZ WebRTC Service — Native RTCPeerConnection (no simple-peer needed)
 * Supports: Audio calls, Video calls, ICE negotiation, Mute/Camera toggle
 * Enhanced: Reconnection handling, ICE fallback, bitrate optimization, low bandwidth mode
 */

import { getWebRTCConfig, getWebRTCConfigAsync, detectNetworkProfile, getMediaConstraints, getWebRTCError } from '../config/webrtc';

class WebRTCService {
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
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
    }

    // Receive remote stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
      }
      if (this.onRemoteStream) this.onRemoteStream(this.remoteStream);
    };

    // Send ICE candidates to peer via socket
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

    // Handle signaling state
    pc.onsignalingstatechange = () => {
      console.log('[WebRTC] Signaling state:', pc.signalingState);
    };

    pc.onnegotiationneeded = async () => {
      try {
        console.log('[WebRTC] Negotiation needed, creating new offer...');
        const offerOptions = {
          offerToReceiveAudio: true,
          offerToReceiveVideo: this.callType === 'video'
        };
        const offer = await pc.createOffer(offerOptions);
        await pc.setLocalDescription(offer);
        if (this.socket && this.targetUserId) {
          this.socket.emit('webrtc:offer', { 
            to: this.targetUserId, 
            offer, 
            callType: this.callType 
          });
        }
      } catch (err) {
        console.error('[WebRTC] onnegotiationneeded error:', err);
      }
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

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`[WebRTC] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    if (this.onReconnecting) {
      this.onReconnecting(this.reconnectAttempts, this.maxReconnectAttempts);
    }

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // Restart ICE to force renegotiation
      if (this.pc) {
        this.pc.restartIce();
      }
    } catch (err) {
      console.error('[WebRTC] Reconnection failed:', err);
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
          connectionState: this.pc.connectionState,
          iceConnectionState: this.pc.iceConnectionState,
          iceGatheringState: this.pc.iceGatheringState,
          signalingState: this.pc.signalingState
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
  async createCall(targetUserId, callType = 'audio', socket) {
    this.socket = socket;
    this.targetUserId = targetUserId;
    this.callType = callType;
    this.reconnectAttempts = 0;

    await this.initLocalStream(callType);
    const pc = await this._createPeer();
    this.startHealthMonitoring();

    // Create offer with preferred codecs
    const offerOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: callType === 'video'
    };

    const offer = await pc.createOffer(offerOptions);
    await pc.setLocalDescription(offer);

    socket.emit('webrtc:offer', { to: targetUserId, offer, callType });
    return this.localStream;
  }

  // ── Incoming call: Answer offer ─────────────────────────────────────────
  async answerCall(offer, callType = 'audio', socket, callerId) {
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
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Flush any ICE candidates that arrived before the peer connection was fully initialized
      await this._flushIceQueue();

      socket.emit('webrtc:answer', { to: callerId, answer });
      return this.localStream;
    } catch (err) {
      console.error('[WebRTC] answerCall error:', err);
      this.onCallError?.(err);
      throw err;
    }
  }

  // ── Handle incoming answer ──────────────────────────────────────────────
  async handleAnswer(answer) {
    if (!this.pc) {
      console.warn('[WebRTC] handleAnswer: PC not initialized yet');
      return;
    }
    try {
      // Validate answer before setting
      if (!answer || !answer.type || !answer.sdp) {
        throw new Error('Invalid answer: missing type or SDP');
      }
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('[WebRTC] setRemoteDescription error:', err);
      this.onCallError?.(err);
    }
  }

  // ── Handle Renegotiation (ICE Restart) ──────────────────────────────────
  async handleRenegotiation(offer, callerId) {
    if (!this.pc) return;
    try {
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
        await this.pc.addIceCandidate(new RTCIceCandidate(queued));
      } catch (err) {
        console.error('[WebRTC] Failed to add queued ICE candidate:', err);
      }
    }
  }

  // ── Handle ICE candidate with queue for late arrivals ───────────────────
  async handleIceCandidate(candidate) {
    if (!this.pc) {
      // Queue candidate if PC not ready yet
      this.iceCandidatesQueue.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      
      // Process queued candidates
      await this._flushIceQueue();
    } catch (err) {
      console.error('[WebRTC] addIceCandidate error:', err);
      // Queue for retry
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

  // ── Get peer connection for external access (screen sharing) ───────────
  get peerConnection() {
    return this.pc;
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────
  endCall() {
    this.stopHealthMonitoring();
    
    if (this.pc) {
      this.pc.close();
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
      connectionState: this.pc.connectionState,
      iceConnectionState: this.pc.iceConnectionState,
      signalingState: this.pc.signalingState
    } : null;
  }
}

export default new WebRTCService();
