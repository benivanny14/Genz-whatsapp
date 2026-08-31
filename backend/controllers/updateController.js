const Update = require('../models/Update');
const User = require('../models/User');
const Notification = require('../models/Notification');

exports.checkForUpdate = async (req, res) => {
  try {
    const { currentVersionCode } = req.query;
    const latest = await Update.findOne().sort({ versionCode: -1 });
    
    if (!latest) return res.json({ success: true, update: null });
    
    const needsUpdate = currentVersionCode && parseInt(currentVersionCode) < latest.versionCode;
    res.json({
      success: true,
      update: needsUpdate ? latest : null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.uploadUpdate = async (req, res) => {
  try {
    const { version, versionCode, changelog, mandatory, downloadUrl: customUrl } = req.body;
    
    // Allow either a file upload or a custom downloadUrl
    const apkUrl = customUrl || (req.file && req.file.path);
    if (!apkUrl) {
      return res.status(400).json({ success: false, message: 'APK URL or file required' });
    }
    
    const update = await Update.create({
      version,
      versionCode: parseInt(versionCode),
      changelog,
      mandatory: mandatory === 'true',
      downloadUrl: apkUrl,
      bundleUrl: req.body.bundleUrl || null,
      uploadedBy: req.user?._id
    });
    
    // Emit to socket for real-time notification
    const io = req.app?.get('io');
    if (io) {
      io.emit('update:available', update);
    }
    
    // Create in-app notifications for all users
    try {
      const users = await User.find({}).select('_id').limit(1000);
      const notifications = users.map(user => ({
        userId: user._id,
        type: 'update',
        title: '🎉 Update Mpya!',
        body: `Genz Messenger v${version} imetoka. ${changelog}`,
        data: { version, url: apkUrl }
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications, { ordered: false }).catch(() => {});
      }
    } catch (notifErr) {
      // Non-critical — don't fail the update upload
      console.warn('Update notification batch failed:', notifErr.message);
    }
    
    res.json({ success: true, update });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getUpdateStats = async (req, res) => {
  try {
    const updates = await Update.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('uploadedBy', 'username');
    res.json({ success: true, updates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
