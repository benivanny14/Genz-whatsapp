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

// ============ CREATE POLL ============
router.post('/:id/poll', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { question, options, allowMultiple, expiresAt } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });
    if (String(status.userId) !== String(userId)) return res.status(403).json({ success: false, message: 'You do not have permission' });

    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Question and at least 2 options are required' });
    }

    status.poll = {
      question,
      options: options.map((opt, idx) => ({
        id: idx,
        text: opt,
        votes: 0
      })),
      allowMultiple: Boolean(allowMultiple),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      totalVotes: 0,
      voters: []
    };
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    console.error('Create poll error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ VOTE ON POLL ============
router.post('/:id/poll/vote', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { optionIds } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });
    if (!status.poll) return res.status(400).json({ success: false, message: 'This status has no poll' });

    if (status.poll.expiresAt && new Date() > status.poll.expiresAt) {
      return res.status(400).json({ success: false, message: 'Poll has expired' });
    }

    const existingVote = status.poll.voters.find(v => String(v.user) === String(userId));
    if (existingVote) {
      return res.status(400).json({ success: false, message: 'You have already voted in this poll' });
    }

    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one option is required' });
    }

    if (!status.poll.allowMultiple && optionIds.length > 1) {
      return res.status(400).json({ success: false, message: 'Multiple selections not allowed' });
    }

    const validOptionIds = status.poll.options.map(o => o.id);
    const invalidOptions = optionIds.filter(id => !validOptionIds.includes(id));
    if (invalidOptions.length > 0) {
      return res.status(400).json({ success: false, message: 'Invalid option IDs' });
    }

    optionIds.forEach(optId => {
      const option = status.poll.options.find(o => o.id === optId);
      if (option) {
        option.votes = (option.votes || 0) + 1;
      }
    });

    status.poll.totalVotes = (status.poll.totalVotes || 0) + 1;
    status.poll.voters.push({
      user: userId,
      optionIds,
      votedAt: new Date()
    });

    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    console.error('Vote poll error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ SHARE TOKEN & PUBLIC SHARE VIEW ============
const { createShareToken, verifyShareToken } = require('../utils/statusShareToken');
const mongoose = require('mongoose');

// PUBLIC: View a shared status via share token (no auth required)
router.get('/shared/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }
    const status = await Status.findById(id)
      .populate('userId', 'username profilePicture');
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }
    // Expired?
    if (status.expiresAt && new Date(status.expiresAt).getTime() <= Date.now()) {
      return res.status(410).json({ success: false, message: 'Status has expired' });
    }
    // Archived?
    if (status.archived) {
      return res.status(410).json({ success: false, message: 'Status is no longer available' });
    }
    // Verify share token
    const shareToken = verifyShareToken(req.query.share || req.query.token);
    const hasValidToken = Boolean(shareToken) && String(shareToken.statusId) === String(status._id);
    if (!hasValidToken) {
      return res.status(403).json({ success: false, message: 'Invalid or expired share link' });
    }
    // Return minimal status data (no viewer/privacy leaks)
    res.json({
      success: true,
      status: {
        _id: status._id,
        type: status.type,
        content: status.content,
        textStatus: status.textStatus,
        caption: status.caption,
        username: status.userId?.username || 'Someone',
        profilePicture: status.userId?.profilePicture || '',
        createdAt: status.createdAt,
        expiresAt: status.expiresAt
      }
    });
  } catch (err) {
    console.error('Shared status view error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Generate share token (owner only)
router.post('/:id/share-token', protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }
    const status = await Status.findById(id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }
    if (String(status.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the owner can generate a share link' });
    }
    const token = createShareToken(status._id);
    const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const shareUrl = `${baseUrl}/status/shared/${status._id}?share=${token}`;
    res.json({ success: true, token, shareUrl });
  } catch (err) {
    console.error('Share token error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ FORWARD STATUS ============
router.post('/:id/forward', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { contacts, groups, message: customMessage } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });

    if (!status.forwards) status.forwards = [];
    status.forwards.push({
      forwardedBy: userId,
      contacts: contacts || [],
      groups: groups || [],
      message: customMessage || '',
      forwardedAt: new Date()
    });
    status.forwardCount = (status.forwardCount || 0) + 1;
    await status.save();

    const Conversation = require('../models/Conversation');
    const Message = require('../models/Message');
    const { getUnreadCount } = require('../utils/unreadCount');
    const io = req.app.get('io');

    const quotedStatus = {
      statusId: status._id.toString(),
      ownerName: status.userId?.username || 'Status',
      preview: status.content || status.caption || 'Status',
      type: status.type || 'text',
      mediaUrl: status.content || null
    };

    const content = customMessage || (status.content || status.caption || '📸 Status');
    const targetConversationIds = [...(contacts || []), ...(groups || [])];

    const results = [];
    for (const convId of targetConversationIds) {
      try {
        const conversation = await Conversation.findById(convId);
        if (!conversation) continue;

        if (!conversation.participants.some(p => String(p) === String(userId))) {
          continue;
        }

        const message = await Message.create({
          conversationId: conversation._id,
          sender: userId,
          content: content,
          messageType: 'text',
          replyTo: null,
          quotedStatus
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username profilePicture');

        const outgoingMessage = {
          _id: message._id,
          conversationId: conversation._id,
          sender: populatedMessage.sender,
          content: message.content,
          messageType: message.messageType,
          quotedStatus,
          createdAt: message.createdAt
        };

        conversation.lastMessage = message._id;
        conversation.updatedAt = new Date();

        if (conversation.participants) {
          const incObject = {};
          conversation.participants.forEach((p) => {
            if (String(p) !== String(userId)) {
              incObject[`unreadCount.${String(p)}`] = 1;
            }
          });
          if (Object.keys(incObject).length > 0) {
            await Conversation.findByIdAndUpdate(
              conversation._id,
              { $inc: incObject },
              { new: true }
            );
          }
        }

        await conversation.save();

        if (io) {
          io.to(String(conversation._id)).emit('message:received', outgoingMessage);
          conversation.participants.forEach((p) => {
            if (String(p) !== String(userId)) {
              io.to(String(p)).emit('conversation:unread-update', {
                conversationId: conversation._id,
                unreadCount: getUnreadCount(conversation, String(p))
              });
            }
          });
        }

        results.push({ conversationId: convId, success: true, message: outgoingMessage });
      } catch (err) {
        console.error('Error forwarding to conversation:', convId, err);
        results.push({ conversationId: convId, success: false, error: err.message });
      }
    }

    res.json({ success: true, status, results });
  } catch (err) {
    console.error('Forward status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
