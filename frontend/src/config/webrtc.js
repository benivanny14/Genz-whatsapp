/**
 * WebRTC Configuration (Frontend)
 * Handles ICE server configuration for STUN/TURN servers
 */
import api from '../services/api';
import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Default STUN servers (free, public)
 */
const DEFAULT_STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];

/**
 * Get ICE servers configuration from environment variables
 * @returns {Array<Object>} ICE servers configuration
 */
const getIceServers = () => {
  const iceServers = [...DEFAULT_STUN_SERVERS];

  // Add TURN server if configured
  const turnUrl = import.meta.env.VITE_TURN_SERVER_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential
    });

    // Add TURN over TCP if configured
    const turnUrlTcp = import.meta.env.VITE_TURN_SERVER_URL_TCP;
    if (turnUrlTcp) {
      iceServers.push({
        urls: turnUrlTcp,
        username: turnUsername,
        credential: turnCredential
      });
    }

    // Add TURN over TLS if configured
    const turnUrlTls = import.meta.env.VITE_TURN_SERVER_URL_TLS;
    if (turnUrlTls) {
      iceServers.push({
        urls: turnUrlTls,
        username: turnUsername,
        credential: turnCredential
      });
    }
  }

  return iceServers;
};

/**
 * Get WebRTC configuration options
 * @returns {Object} WebRTC configuration
 */
const getWebRTCConfig = () => {
  return {
    iceServers: getIceServers(),
    iceTransportPolicy: import.meta.env.VITE_ICE_TRANSPORT_POLICY || 'all',
    iceCandidatePoolSize: parseInt(import.meta.env.VITE_ICE_CANDIDATE_POOL_SIZE) || 10,
    bundlePolicy: import.meta.env.VITE_BUNDLE_POLICY || 'balanced',
    rtcpMuxPolicy: import.meta.env.VITE_RTCP_MUX_POLICY || 'require'
  };
};

let runtimeConfigPromise = null;
let runtimeConfigCache = null;

const getRuntimeWebRTCConfig = async () => {
  if (runtimeConfigCache) return runtimeConfigCache;
  if (runtimeConfigPromise) return runtimeConfigPromise;

  runtimeConfigPromise = authFetch(`${API_URL}/webrtc/config`)
    .then((response) => response.json())
    .then((data) => {
      if (!data.success || !data.config?.iceServers) {
        throw new Error('Invalid WebRTC config response');
      }
      runtimeConfigCache = data.config;
      return runtimeConfigCache;
    })
    .catch((error) => {
      console.warn('[WebRTC] Backend config unavailable; using frontend fallback:', error.message);
      return getWebRTCConfig();
    })
    .finally(() => {
      runtimeConfigPromise = null;
    });

  return runtimeConfigPromise;
};

const getWebRTCConfigAsync = async () => getRuntimeWebRTCConfig();

/**
 * Network profiles for different connection qualities
 */
const NETWORK_PROFILES = {
  low: {
    iceTransportPolicy: 'relay',
    video: {
      width: { ideal: 640, max: 640 },
      height: { ideal: 480, max: 480 },
      frameRate: { ideal: 15, max: 15 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  },
  medium: {
    iceTransportPolicy: 'all',
    video: {
      width: { ideal: 1280, max: 1280 },
      height: { ideal: 720, max: 720 },
      frameRate: { ideal: 30, max: 30 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  },
  high: {
    iceTransportPolicy: 'all',
    video: {
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
      frameRate: { ideal: 60, max: 60 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      highPassFilter: true
    }
  }
};

/**
 * Get network profile based on user preference or detection
 * @param {string} profile - Profile name (low, medium, high)
 * @returns {Object} Network profile configuration
 */
const getNetworkProfile = (profile = 'medium') => {
  return NETWORK_PROFILES[profile] || NETWORK_PROFILES.medium;
};

/**
 * Detect network profile based on connection type
 * @param {Object} connection - Navigator connection info
 * @returns {string} Network profile name
 */
const detectNetworkProfile = (connection) => {
  if (!connection) return 'medium';

  const type = connection.effectiveType || connection.type;
  const downlink = connection.downlink || 10; // Mbps

  // Low bandwidth (3G, slow 4G)
  if (type === 'slow-2g' || type === '2g' || type === '3g' || downlink < 1.5) {
    return 'low';
  }

  // High bandwidth (fast 4G, WiFi, Ethernet)
  if (type === '4g' || downlink >= 10) {
    return 'high';
  }

  // Medium bandwidth
  return 'medium';
};

/**
 * Get media constraints based on network profile
 * @param {string} profile - Network profile name
 * @param {boolean} video - Whether to include video
 * @param {boolean} audio - Whether to include audio
 * @returns {Object} Media constraints
 */
const getMediaConstraints = (profile = 'medium', video = true, audio = true) => {
  const networkProfile = getNetworkProfile(profile);
  const constraints = {};

  if (video) {
    constraints.video = networkProfile.video;
  }

  if (audio) {
    constraints.audio = networkProfile.audio;
  }

  return constraints;
};

/**
 * Connection quality monitoring
 */
class ConnectionQualityMonitor {
  constructor() {
    this.stats = {
      packetLoss: 0,
      jitter: 0,
      rtt: 0,
      bitrate: 0
    };
    this.thresholds = {
      packetLoss: 0.1, // 10%
      jitter: 100, // milliseconds
      rtt: 300 // milliseconds
    };
    this.monitoringInterval = null;
  }

  /**
   * Start monitoring connection quality
   * @param {RTCPeerConnection} peerConnection - WebRTC peer connection
   * @param {Function} onQualityChange - Callback when quality changes
   * @param {number} interval - Monitoring interval in milliseconds
   */
  startMonitoring(peerConnection, onQualityChange, interval = 1000) {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const stats = await peerConnection.getStats();
        this.calculateStats(stats);
        this.checkQuality(onQualityChange);
      } catch (error) {
        console.error('[WebRTC] Stats collection error:', error);
      }
    }, interval);
  }

  /**
   * Stop monitoring connection quality
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Calculate statistics from RTCStatsReport
   * @param {RTCStatsReport} stats - WebRTC stats report
   */
  calculateStats(stats) {
    let totalPackets = 0;
    let lostPackets = 0;
    let totalRtt = 0;
    let rttCount = 0;

    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        totalPackets += report.packetsReceived || 0;
        lostPackets += report.packetsLost || 0;
        
        if (report.roundTripTime) {
          totalRtt += report.roundTripTime;
          rttCount++;
        }
      }
    });

    this.stats.packetLoss = totalPackets > 0 ? lostPackets / totalPackets : 0;
    this.stats.rtt = rttCount > 0 ? totalRtt / rttCount : 0;
  }

  /**
   * Check if quality is below threshold
   * @param {Function} onQualityChange - Callback when quality changes
   */
  checkQuality(onQualityChange) {
    const isPoorQuality =
      this.stats.packetLoss > this.thresholds.packetLoss ||
      this.stats.rtt > this.thresholds.rtt;

    if (isPoorQuality && onQualityChange) {
      onQualityChange({
        quality: 'poor',
        stats: this.stats
      });
    }
  }

  /**
   * Get current stats
   * @returns {Object} Current connection stats
   */
  getStats() {
    return { ...this.stats };
  }
}

/**
 * WebRTC error types and messages
 */
const WEBRTC_ERRORS = {
  PEER_CONNECTION_FAILED: {
    code: 'PEER_CONNECTION_FAILED',
    message: 'Failed to establish peer connection'
  },
  ICE_CONNECTION_FAILED: {
    code: 'ICE_CONNECTION_FAILED',
    message: 'ICE connection failed - check network or TURN server'
  },
  MEDIA_ACCESS_DENIED: {
    code: 'MEDIA_ACCESS_DENIED',
    message: 'Camera or microphone access denied'
  },
  MEDIA_NOT_FOUND: {
    code: 'MEDIA_NOT_FOUND',
    message: 'Camera or microphone not found'
  },
  SIGNALING_ERROR: {
    code: 'SIGNALING_ERROR',
    message: 'Signaling connection error'
  },
  TIMEOUT: {
    code: 'TIMEOUT',
    message: 'Connection timeout'
  }
};

/**
 * Get user-friendly error message
 * @param {Error} error - WebRTC error
 * @returns {Object} Error object with code and message
 */
const getWebRTCError = (error) => {
  const errorMessage = error.message || error.toString();

  if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
    return WEBRTC_ERRORS.MEDIA_ACCESS_DENIED;
  }

  if (errorMessage.includes('NotFoundError') || errorMessage.includes('not found')) {
    return WEBRTC_ERRORS.MEDIA_NOT_FOUND;
  }

  if (errorMessage.includes('ICE') || errorMessage.includes('connection failed')) {
    return WEBRTC_ERRORS.ICE_CONNECTION_FAILED;
  }

  if (errorMessage.includes('timeout')) {
    return WEBRTC_ERRORS.TIMEOUT;
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: errorMessage
  };
};

export {
  DEFAULT_STUN_SERVERS,
  getIceServers,
  getWebRTCConfig,
  getWebRTCConfigAsync,
  NETWORK_PROFILES,
  getNetworkProfile,
  detectNetworkProfile,
  getMediaConstraints,
  ConnectionQualityMonitor,
  WEBRTC_ERRORS,
  getWebRTCError
};
