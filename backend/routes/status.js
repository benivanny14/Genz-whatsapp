const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const Status = require('../models/Status');
const User = require('../models/User');

// Multer config for status media uploads
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'status');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpeg|jpg|png|gif|mp4|webm|mov)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type for status'));
    }
  }
});

// ============ CREATE STATUS ============
router.post('/', protect, async (req, res) => {
  try {
    const { type, content, caption, textStatus, music, privacy, excludedUsers, includedUsers, duration } = req.body;

    if (!type || !['text', 'image', 'video'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid status type' });
    }

    if (type === 'text' && (!textStatus?.text || !textStatus.text.trim())) {
      return res.status(400).json({ success: false, message: 'Text status requires text' });
    }

    if ((type === 'image' || type === 'video') && !content) {
      return res.status(400).json({ success: false, message: 'Media status requires content URL' });
    }

    const status = await Status.create({
      userId: req.user._id,
      type,
      content: content || '',
      caption: caption || '',
      textStatus: type === 'text' ? {
        text: textStatus?.text || '',
        backgroundColor: textStatus?.backgroundColor || '#128C7E',
        fontColor: textStatus?.fontColor || '#FFFFFF',
        fontStyle: textStatus?.fontStyle || 'normal'
      } : undefined,
      music: music || undefined,
      privacy: privacy || 'contacts',
      excludedUsers: excludedUsers || [],
      includedUsers: includedUsers || [],
      duration: duration || 0
    });

    // Populate userId for frontend
    const populated = await Status.findById(status._id)
      .populate('userId', 'username profilePicture');

    res.status(201).json({ success: true, status: populated });
  } catch (error) {
    console.error('Create status error:', error);
    res.status(500).json({ success: false, message: 'Failed to create status' });
  }
});

// ============ GET STATUSES (feed) ============
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's contacts
    const user = await User.findById(userId).select('contacts');
    const contactIds = (user.contacts || []).map(c => c.user || c._id);

    // Find statuses from contacts + self that aren't expired
    const statuses = await Status.find({
      userId: { $in: [...contactIds, userId] },
      expiresAt: { $gt: new Date() },
      archived: { $ne: true }
    })
    .populate('userId', 'username profilePicture')
    .sort({ createdAt: -1 })
    .limit(100);

    // Filter by privacy
    const visible = statuses.filter(status => {
      const ownerId = String(status.userId?._id || status.userId);

      // Own status always visible
      if (ownerId === String(userId)) return true;

      // Check if muted
      if (status.mutedBy?.some(id => String(id) === String(userId))) return false;

      // Check privacy rules
      if (status.privacy === 'nobody') return false;
      if (status.privacy === 'contacts_except') {
        return !status.excludedUsers?.some(id => String(id) === String(userId));
      }
      if (status.privacy === 'only_share_with') {
        return status.includedUsers?.some(id => String(id) === String(userId));
      }
      // 'contacts' - default
      return true;
    });

    // Mark viewed status for each
    const result = visible.map(status => {
      const statusObj = status.toObject();
      statusObj.isViewed = status.views?.some(v => String(v.userId) === String(userId));
      statusObj.isMuted = status.mutedBy?.some(id => String(id) === String(userId));
      return statusObj;
    });

    res.json({ success: true, statuses: result });
  } catch (error) {
    console.error('Get statuses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statuses' });
  }
});

// ============ VIEW STATUS ============
router.post('/:id/view', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    // Check if already viewed
    const alreadyViewed = status.views?.some(
      v => String(v.userId) === String(req.user._id)
    );

    if (!alreadyViewed) {
      status.views.push({ userId: req.user._id });
      status.viewCount = status.views.length;
      await status.save();
    }

    res.json({ success: true, viewCount: status.viewCount });
  } catch (error) {
    console.error('View status error:', error);
    res.status(500).json({ success: false, message: 'Failed to view status' });
  }
});

// ============ DELETE STATUS ============
router.delete('/:id', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    if (String(status.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Status.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Status deleted' });
  } catch (error) {
    console.error('Delete status error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete status' });
  }
});

// ============ GET VIEWERS ============
router.get('/viewers/:statusId', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.statusId)
      .populate('views.userId', 'username profilePicture');

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    // Only the owner can see viewers
    if (String(status.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, viewers: status.views });
  } catch (error) {
    console.error('Get viewers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch viewers' });
  }
});

// ============ UPDATE PRIVACY ============
router.put('/privacy', protect, async (req, res) => {
  try {
    const { type, allowedUsers, exceptUsers } = req.body;

    // This updates the user's default privacy setting for future statuses
    // Store in user settings
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'statusPrivacySettings.type': type || 'contacts',
        'statusPrivacySettings.allowedUsers': allowedUsers || [],
        'statusPrivacySettings.exceptUsers': exceptUsers || []
      }
    });

    res.json({ success: true, message: 'Privacy settings updated' });
  } catch (error) {
    console.error('Update privacy error:', error);
    res.status(500).json({ success: false, message: 'Failed to update privacy' });
  }
});

// ============ GET PRIVACY ============
router.get('/privacy', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('statusPrivacySettings');
    const settings = user.statusPrivacySettings || { type: 'contacts', allowedUsers: [], exceptUsers: [] };
    res.json({ success: true, ...settings });
  } catch (error) {
    console.error('Get privacy error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch privacy' });
  }
});

// ============ MUTE STATUS USER ============
router.post('/:id/mute', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const alreadyMuted = status.mutedBy?.some(id => String(id) === String(req.user._id));
    if (!alreadyMuted) {
      status.mutedBy.push(req.user._id);
      await status.save();
    }

    res.json({ success: true, message: 'User muted' });
  } catch (error) {
    console.error('Mute error:', error);
    res.status(500).json({ success: false, message: 'Failed to mute' });
  }
});

// ============ UNMUTE STATUS USER ============
router.post('/:id/unmute', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    status.mutedBy = (status.mutedBy || []).filter(id => String(id) !== String(req.user._id));
    await status.save();

    res.json({ success: true, message: 'User unmuted' });
  } catch (error) {
    console.error('Unmute error:', error);
    res.status(500).json({ success: false, message: 'Failed to unmute' });
  }
});

// ============ ADD REACTION ============
router.post('/:id/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    // Check if user already reacted with this emoji
    const existingIdx = status.reactions.findIndex(
      r => String(r.userId) === String(req.user._id) && r.emoji === emoji
    );

    if (existingIdx >= 0) {
      // Toggle off (remove reaction)
      status.reactions.splice(existingIdx, 1);
    } else {
      // Remove any existing reaction from this user first, then add new
      status.reactions = status.reactions.filter(
        r => String(r.userId) !== String(req.user._id)
      );
      status.reactions.push({ userId: req.user._id, emoji });
    }

    await status.save();

    res.json({ success: true, reactions: status.reactions });
  } catch (error) {
    console.error('React error:', error);
    res.status(500).json({ success: false, message: 'Failed to react' });
  }
});

// ============ GET REACTIONS ============
router.get('/:id/reactions', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id)
      .populate('reactions.userId', 'username profilePicture');

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    res.json({ success: true, reactions: status.reactions });
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reactions' });
  }
});

// ============ UPLOAD MEDIA ============
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/status/${req.file.filename}`;

    res.json({
      success: true,
      fileUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
});

// ============ MY STATUS ============
router.get('/my-status', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const statuses = await Status.find({
      userId,
      expiresAt: { $gt: new Date() }
    })
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 });

    const totalViews = statuses.reduce((sum, s) => sum + (s.viewCount || s.views?.length || 0), 0);

    res.json({
      statuses,
      totalViews,
      count: statuses.length
    });
  } catch (err) {
    console.error('Get my status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ FEED (grouped by user) ============
router.get('/feed', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('contacts');
    const contactIds = (user.contacts || []).map(c => c.user || c._id);

    const statuses = await Status.find({
      userId: { $in: [...contactIds, userId] },
      expiresAt: { $gt: new Date() },
      archived: { $ne: true }
    })
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(100);

    // Group by user
    const userMap = new Map();
    statuses.forEach(status => {
      const uid = String(status.userId?._id || status.userId);
      if (!uid) return;

      const isViewed = status.views?.some(v => String(v.userId) === String(userId));

      if (!userMap.has(uid)) {
        userMap.set(uid, {
          user: {
            _id: uid,
            username: status.userId?.username || 'Unknown',
            profilePic: status.userId?.profilePicture || ''
          },
          statuses: [],
          hasUnviewed: false
        });
      }

      const group = userMap.get(uid);
      group.statuses.push(status);
      if (!isViewed) group.hasUnviewed = true;
    });

    const result = Array.from(userMap.values());

    // Sort: unviewed first, then by most recent
    result.sort((a, b) => {
      if (a.hasUnviewed !== b.hasUnviewed) return b.hasUnviewed ? 1 : -1;
      const ta = new Date(a.statuses[0]?.createdAt || 0);
      const tb = new Date(b.statuses[0]?.createdAt || 0);
      return tb - ta;
    });

    res.json(result);
  } catch (err) {
    console.error('Get feed error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ ARCHIVE ============
router.get('/archive', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const statuses = await Status.find({
      userId,
      archived: true
    })
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 });

    res.json({ archived: statuses });
  } catch (err) {
    console.error('Get archived error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/archive/:id', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }
    if (String(status.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    status.archived = true;
    await status.save();
    res.json({ success: true, message: 'Status archived' });
  } catch (err) {
    console.error('Archive status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/unarchive/:id', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }
    if (String(status.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    status.archived = false;
    await status.save();
    res.json({ success: true, message: 'Status unarchived' });
  } catch (err) {
    console.error('Unarchive status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
