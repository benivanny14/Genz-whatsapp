const {
  getWebRTCConfig,
  getQualityConfig,
  validateTurnConfig
} = require('../config/webrtc');

exports.getConfig = (req, res) => {
  const turnValidation = validateTurnConfig();
  const config = getWebRTCConfig();

  // SECURITY: per-user "Protect IP address in calls" — relay-only ICE policy
  // means the browser gathers only TURN candidates, never exposing the
  // user's real IP via STUN/direct candidates.
  if (req.user?.settings?.privacy?.protectIpAddressInCalls) {
    config.iceTransportPolicy = 'relay';
  }

  const hasTurn = config.iceServers.some((server) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    return urls.some((url) => String(url).startsWith('turn:') || String(url).startsWith('turns:'));
  });

  res.status(200).json({
    success: true,
    config,
    quality: getQualityConfig(),
    hasTurn,
    turnValid: turnValidation.valid,
    warnings: turnValidation.errors
  });
};
