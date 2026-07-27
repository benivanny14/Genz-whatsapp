const User = require('../models/User');

const defaultSettings = {
  performanceMode: 'balanced', // performance, balanced, battery-saver
  batterySaverEnabled: false,
  autoBatterySaver: true,
  batteryThreshold: 20, // percentage
  reduceAnimations: false,
  disableBackgroundSync: false,
  limitBackgroundProcesses: true,
  reduceImageQuality: false,
  disableVideoAutoPlay: true,
  disableGIFAutoPlay: true,
  reduceRefreshRate: false,
  enableDarkMode: false,
  hapticFeedback: true,
  soundEffects: true,
  notificationOptimization: true,
  adaptiveBrightness: false
};

const getUser = async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  return user;
};

const mergeSettings = (settings = {}) => ({
  ...defaultSettings,
  ...settings
});

// @desc    Get performance settings
// @route   GET /api/performance/settings
// @access  Private
exports.getPerformanceSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.performanceSettings?.toObject?.() || user.performanceSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get performance settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update performance settings
// @route   POST /api/performance/settings
// @access  Private
exports.updatePerformanceSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.performanceSettings?.toObject?.() || user.performanceSettings || {};
    
    user.performanceSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('performanceSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.performanceSettings });
  } catch (error) {
    console.error('Update performance settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set performance mode
// @route   POST /api/performance/mode
// @access  Private
exports.setPerformanceMode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { mode } = req.body;

    if (!['performance', 'balanced', 'battery-saver'].includes(mode)) {
      return res.status(400).json({ success: false, message: 'Invalid performance mode' });
    }

    const existing = user.performanceSettings?.toObject?.() || user.performanceSettings || {};
    
    // Apply mode-specific settings
    let modeSettings = {};
    if (mode === 'performance') {
      modeSettings = {
        reduceAnimations: false,
        disableBackgroundSync: false,
        limitBackgroundProcesses: false,
        reduceImageQuality: false,
        disableVideoAutoPlay: false,
        disableGIFAutoPlay: false,
        reduceRefreshRate: false
      };
    } else if (mode === 'battery-saver') {
      modeSettings = {
        reduceAnimations: true,
        disableBackgroundSync: true,
        limitBackgroundProcesses: true,
        reduceImageQuality: true,
        disableVideoAutoPlay: true,
        disableGIFAutoPlay: true,
        reduceRefreshRate: true,
        hapticFeedback: false,
        soundEffects: false
      };
    } else {
      // balanced
      modeSettings = {
        reduceAnimations: false,
        disableBackgroundSync: false,
        limitBackgroundProcesses: true,
        reduceImageQuality: false,
        disableVideoAutoPlay: true,
        disableGIFAutoPlay: true,
        reduceRefreshRate: false
      };
    }

    user.performanceSettings = mergeSettings({
      ...existing,
      performanceMode: mode,
      ...modeSettings
    });
    user.markModified('performanceSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.performanceSettings });
  } catch (error) {
    console.error('Set performance mode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle battery saver
// @route   POST /api/performance/battery-saver
// @access  Private
exports.toggleBatterySaver = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.performanceSettings?.toObject?.() || user.performanceSettings || {};
    
    const batterySaverEnabled = enabled !== undefined ? enabled : !existing.batterySaverEnabled;
    
    user.performanceSettings = mergeSettings({
      ...existing,
      batterySaverEnabled,
      performanceMode: batterySaverEnabled ? 'battery-saver' : existing.performanceMode
    });
    user.markModified('performanceSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.performanceSettings });
  } catch (error) {
    console.error('Toggle battery saver error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get battery status (mock)
// @route   GET /api/performance/battery-status
// @access  Private
exports.getBatteryStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.performanceSettings?.toObject?.() || user.performanceSettings);
    
    // In real implementation, get actual battery status from device
    // For now, return mock data
    const batteryStatus = {
      level: 75, // percentage
      charging: false,
      estimatedTimeRemaining: 480, // minutes
      health: 'good',
      temperature: 'normal'
    };

    const shouldEnableBatterySaver = settings.autoBatterySaver && 
                                     batteryStatus.level <= settings.batteryThreshold;

    res.status(200).json({
      success: true,
      batteryStatus,
      autoBatterySaverEnabled: settings.autoBatterySaver,
      batteryThreshold: settings.batteryThreshold,
      shouldEnableBatterySaver
    });
  } catch (error) {
    console.error('Get battery status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update battery threshold
// @route   POST /api/performance/battery-threshold
// @access  Private
exports.updateBatteryThreshold = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { threshold } = req.body;
    const existing = user.performanceSettings?.toObject?.() || user.performanceSettings || {};
    
    user.performanceSettings = mergeSettings({
      ...existing,
      batteryThreshold: threshold !== undefined ? threshold : existing.batteryThreshold
    });
    user.markModified('performanceSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.performanceSettings });
  } catch (error) {
    console.error('Update battery threshold error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get performance metrics (mock)
// @route   GET /api/performance/metrics
// @access  Private
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.performanceSettings?.toObject?.() || user.performanceSettings);
    
    // In real implementation, get actual performance metrics
    const metrics = {
      cpuUsage: 25, // percentage
      memoryUsage: 45, // percentage
      batteryUsage: 12, // percentage per hour
      networkUsage: 150, // MB per hour
      appStartTime: 1.2, // seconds
      frameRate: 60, // FPS
      thermalState: 'normal'
    };

    const optimizationScore = calculateOptimizationScore(settings, metrics);

    res.status(200).json({
      success: true,
      metrics,
      optimizationScore,
      currentMode: settings.performanceMode
    });
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

function calculateOptimizationScore(settings, metrics) {
  let score = 100;
  
  if (settings.performanceMode === 'battery-saver') {
    score = 90;
  } else if (settings.performanceMode === 'performance') {
    score = 70;
  }
  
  if (metrics.cpuUsage > 80) score -= 10;
  if (metrics.memoryUsage > 80) score -= 10;
  if (metrics.batteryUsage > 20) score -= 10;
  if (metrics.frameRate < 30) score -= 15;
  
  return Math.max(0, score);
}

// @desc    Toggle specific optimization
// @route   POST /api/performance/toggle-optimization
// @access  Private
exports.toggleOptimization = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { optimization, enabled } = req.body;
    const existing = user.performanceSettings?.toObject?.() || user.performanceSettings || {};
    
    const validOptimizations = [
      'reduceAnimations',
      'disableBackgroundSync',
      'limitBackgroundProcesses',
      'reduceImageQuality',
      'disableVideoAutoPlay',
      'disableGIFAutoPlay',
      'reduceRefreshRate',
      'hapticFeedback',
      'soundEffects',
      'notificationOptimization'
    ];

    if (!validOptimizations.includes(optimization)) {
      return res.status(400).json({ success: false, message: 'Invalid optimization' });
    }

    user.performanceSettings = mergeSettings({
      ...existing,
      [optimization]: enabled !== undefined ? enabled : !existing[optimization]
    });
    user.markModified('performanceSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.performanceSettings });
  } catch (error) {
    console.error('Toggle optimization error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset performance settings to default
// @route   POST /api/performance/reset
// @access  Private
exports.resetPerformanceSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.performanceSettings = mergeSettings({});
    user.markModified('performanceSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.performanceSettings });
  } catch (error) {
    console.error('Reset performance settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
