const {
  getWebRTCConfig,
  getQualityConfig,
  validateTurnConfig
} = require('../config/webrtc');

exports.getConfig = (req, res) => {
  const turnValidation = validateTurnConfig();
  const config = getWebRTCConfig();
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
