/**
 * WebRTC Configuration
 * Handles ICE server configuration for STUN/TURN servers
 */

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
 * Get ICE servers configuration
 * Combines STUN and TURN servers from environment variables
 * @returns {Array<Object>} ICE servers configuration
 */
const getIceServers = () => {
  const iceServers = [...DEFAULT_STUN_SERVERS];

  // Add TURN server if configured
  if (process.env.TURN_SERVER_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({
      urls: process.env.TURN_SERVER_URL,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL
    });

    // Add TURN over TCP if configured (for restrictive networks)
    if (process.env.TURN_SERVER_URL_TCP) {
      iceServers.push({
        urls: process.env.TURN_SERVER_URL_TCP,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL
      });
    }

    // Add TURN over TLS if configured (for secure connections)
    if (process.env.TURN_SERVER_URL_TLS) {
      iceServers.push({
        urls: process.env.TURN_SERVER_URL_TLS,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL
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
    iceTransportPolicy: process.env.ICE_TRANSPORT_POLICY || 'all', // 'all', 'relay', or 'none'
    iceCandidatePoolSize: parseInt(process.env.ICE_CANDIDATE_POOL_SIZE) || 10,
    bundlePolicy: process.env.BUNDLE_POLICY || 'balanced', // 'balanced', 'max-bundle', or 'max-compat'
    rtcpMuxPolicy: process.env.RTCP_MUX_POLICY || 'require'
  };
};

/**
 * Validate TURN server configuration
 * @returns {Object} Validation result { valid: boolean, errors: Array<string> }
 */
const validateTurnConfig = () => {
  const errors = [];

  if (process.env.TURN_SERVER_URL) {
    if (!process.env.TURN_USERNAME) {
      errors.push('TURN_USERNAME is required when TURN_SERVER_URL is set');
    }
    if (!process.env.TURN_CREDENTIAL) {
      errors.push('TURN_CREDENTIAL is required when TURN_SERVER_URL is set');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Get connection quality monitoring configuration
 * @returns {Object} Quality monitoring config
 */
const getQualityConfig = () => {
  return {
    enabled: process.env.QUALITY_MONITORING === 'true',
    statsInterval: parseInt(process.env.STATS_INTERVAL) || 1000, // milliseconds
    qualityThreshold: {
      packetLoss: parseFloat(process.env.PACKET_LOSS_THRESHOLD) || 0.1, // 10%
      jitter: parseFloat(process.env.JITTER_THRESHOLD) || 100, // milliseconds
      rtt: parseFloat(process.env.RTT_THRESHOLD) || 300 // milliseconds
    }
  };
};

/**
 * Parse TURN server URL to extract protocol and address
 * @param {string} turnUrl - TURN server URL
 * @returns {Object} Parsed URL components
 */
const parseTurnUrl = (turnUrl) => {
  try {
    const url = new URL(turnUrl.startsWith('turn:') ? turnUrl : `turn:${turnUrl}`);
    return {
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      port: url.port || (url.protocol === 'turns:' ? 5349 : 3478),
      transport: url.searchParams.get('transport') || 'udp'
    };
  } catch (error) {
    console.error('[WebRTC] Failed to parse TURN URL:', error);
    return null;
  }
};

/**
 * Generate TURN server URL with transport
 * @param {string} host - TURN server host
 * @param {number} port - TURN server port
 * @param {string} transport - Transport protocol (udp, tcp, or tls)
 * @returns {string} TURN server URL
 */
const generateTurnUrl = (host, port, transport = 'udp') => {
  const protocol = transport === 'tls' ? 'turns' : 'turn';
  return `${protocol}:${host}:${port}?transport=${transport}`;
};

/**
 * WebRTC configuration for different network conditions
 */
const NETWORK_PROFILES = {
  // Low bandwidth (mobile, 3G)
  low: {
    iceTransportPolicy: 'relay',
    iceCandidatePoolSize: 5,
    video: {
      maxWidth: 640,
      maxHeight: 480,
      maxFrameRate: 15
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  },
  // Medium bandwidth (4G, WiFi)
  medium: {
    iceTransportPolicy: 'all',
    iceCandidatePoolSize: 10,
    video: {
      maxWidth: 1280,
      maxHeight: 720,
      maxFrameRate: 30
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  },
  // High bandwidth (broadband)
  high: {
    iceTransportPolicy: 'all',
    iceCandidatePoolSize: 15,
    video: {
      maxWidth: 1920,
      maxHeight: 1080,
      maxFrameRate: 60
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
 * Get network profile based on environment or user preference
 * @param {string} profile - Profile name (low, medium, high)
 * @returns {Object} Network profile configuration
 */
const getNetworkProfile = (profile = 'medium') => {
  return NETWORK_PROFILES[profile] || NETWORK_PROFILES.medium;
};

/**
 * Detect network quality based on connection type
 * @param {string} connectionType - Network connection type (wifi, cellular, ethernet, etc.)
 * @returns {string} Network profile name
 */
const detectNetworkProfile = (connectionType) => {
  if (!connectionType) return 'medium';
  
  const type = connectionType.toLowerCase();
  
  if (type.includes('cellular') || type.includes('3g') || type.includes('2g')) {
    return 'low';
  }
  
  if (type.includes('wifi') || type.includes('4g') || type.includes('lte')) {
    return 'medium';
  }
  
  if (type.includes('ethernet') || type.includes('fiber')) {
    return 'high';
  }
  
  return 'medium';
};

module.exports = {
  DEFAULT_STUN_SERVERS,
  getIceServers,
  getWebRTCConfig,
  validateTurnConfig,
  getQualityConfig,
  parseTurnUrl,
  generateTurnUrl,
  NETWORK_PROFILES,
  getNetworkProfile,
  detectNetworkProfile
};
