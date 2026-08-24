const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const Status = require('../models/Status');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { createShareToken, verifyShareToken } = require('../utils/statusShareToken');
const { serializeOutgoingMessage } = require('../utils/messageSerializer');
const { getUnreadCount } = require('../utils/unreadCount');
const { isEitherUserBlocked } = require('../utils/messageSendHelpers');
const { getActiveMutedUserIds, getActiveStatusBlockedUserIds } = require('../utils/statusMuteHelpers');

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

const VALID_PRIVACY = new Set(['contacts', 'contacts_except', 'only_share_with', 'nobody', 'only_me']);
const MEDIA_STATUS_TYPES = new Set(['image', 'video', 'gif', 'boomerang', 'livePhoto', 'dualCamera']);

const idOf = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return String(value._id || value.id || value.user || value.userId || value.toString?.() || '');
  return String(value);
};

const compactIds = (items = []) => {
  if (!Array.isArray(items)) return [];
  return [...new Set(items.map((item) => idOf(item)).filter(Boolean))];
};

const contactIdsOf = (user = {}) => compactIds((user.contacts || []).map((contact) => contact?.user || contact?._id || contact));
const ownerIdOf = (status = {}) => idOf(status.userId || status.user);
const viewerIdOf = (view = {}) => idOf(view.userId || view.user);
const reactionUserIdOf = (reaction = {}) => idOf(reaction.userId || reaction.user);

const normalizePrivacy = (privacy) => {
  if (privacy === 'everyone') return 'contacts';
  if (privacy === 'only_me') return 'nobody';
  return VALID_PRIVACY.has(privacy) ? privacy : 'contacts';
};

const getStatusAudience = (status = {}) => ({
  included: compactIds([...(status.includedUsers || []), ...(status.includedViewers || [])]),
  excluded: compactIds([...(status.excludedUsers || []), ...(status.excludedViewers || [])])
});

const ownerMatchQuery = (ownerIds = []) => {
  const ids = compactIds(ownerIds);
  return { $or: [{ userId: { $in: ids } }, { user: { $in: ids } }] };
};

const getDefaultStatusPrivacy = (user = {}) => {
  const advanced = user.statusPrivacySettings || {};
  const settingsPrivacy = user.settings?.privacy?.status;
  const type = normalizePrivacy(advanced.type || settingsPrivacy || 'contacts');
  return {
    type,
    allowedUsers: compactIds(advanced.allowedUsers || []),
    exceptUsers: compactIds(advanced.exceptUsers || [])
  };
};

const normalizeStatusForClient = (status, viewerId, mutedUserIds = new Set()) => {
  const statusObj = status?.toObject ? status.toObject() : { ...(status || {}) };
  const ownerId = ownerIdOf(statusObj);

  if (MEDIA_STATUS_TYPES.has(statusObj.type) && statusObj.mediaUrl) {
    statusObj.content = statusObj.mediaUrl;
  }
  if (statusObj.type === 'text' && !statusObj.textStatus?.text && statusObj.content) {
    statusObj.textStatus = {
      ...(statusObj.textStatus || {}),
      text: statusObj.content,
      backgroundColor: statusObj.textStatus?.backgroundColor || statusObj.backgroundColor || '#128C7E',
      fontColor: statusObj.textStatus?.fontColor || statusObj.textColor || '#FFFFFF'
    };
  }

  if ((!statusObj.userId || typeof statusObj.userId !== 'object') && statusObj.user && typeof statusObj.user === 'object') {
    statusObj.userId = statusObj.user;
  } else {
    statusObj.userId = statusObj.userId || statusObj.user;
  }
  statusObj.user = statusObj.user || statusObj.userId;
  statusObj.viewCount = statusObj.viewCount || statusObj.viewsCount || (statusObj.views || []).length || 0;
  statusObj.viewsCount = statusObj.viewsCount || statusObj.viewCount;
  statusObj.isViewed = (statusObj.views || []).some((view) => viewerIdOf(view) === String(viewerId));
  statusObj.isMuted = mutedUserIds.has(ownerId) || (statusObj.mutedBy || []).some((id) => idOf(id) === String(viewerId));
  return statusObj;
};

const getStatusViewersForClient = (status = {}) => (status.views || [])
  .map((view) => {
    const viewObj = view?.toObject ? view.toObject() : { ...view };
    const user = viewObj.userId || viewObj.user;
    if (!user) return null;
    return { ...viewObj, userId: user, user };
  })
  .filter(Boolean);

const getStatusReactionsForClient = (status = {}) => (status.reactions || [])
  .map((reaction) => {
    const reactionObj = reaction?.toObject ? reaction.toObject() : { ...reaction };
    const user = reactionObj.userId || reactionObj.user;
    if (!user) return null;
    return { ...reactionObj, userId: user, user };
  })
  .filter(Boolean);

const canViewerSeeStatus = async (viewerId, status, viewer = null) => {
  const viewerIdStr = String(viewerId);
  const ownerId = ownerIdOf(status);
  if (!ownerId) return false;
  if (ownerId === viewerIdStr) return true;
  if (status.archived) return false;
  if (status.expiresAt && new Date(status.expiresAt).getTime() <= Date.now()) return false;

  const viewerDoc = viewer || await User.findById(viewerId).select('blockedStatusUsers');
  const blockedStatusUserIds = getActiveStatusBlockedUserIds(viewerDoc || {});
  if (blockedStatusUserIds.has(ownerId)) return false;
  if (await isEitherUserBlocked(viewerId, ownerId)) return false;

  const privacy = normalizePrivacy(status.privacy || 'contacts');
  if (privacy === 'nobody') return false;

  const { included, excluded } = getStatusAudience(status);
  if (privacy === 'only_share_with') {
    return included.includes(viewerIdStr);
  }

  const owner = await User.findById(ownerId).select('contacts');
  const ownerContacts = contactIdsOf(owner || {});
  if (!ownerContacts.includes(viewerIdStr)) return false;

  if (privacy === 'contacts_except') {
    return !excluded.includes(viewerIdStr);
  }

  return true;
};

const audienceIdsForStatus = async (status) => {
  const ownerId = ownerIdOf(status);
  const owner = await User.findById(ownerId).select('contacts');
  const { included, excluded } = getStatusAudience(status);
  const privacy = normalizePrivacy(status.privacy || 'contacts');

  if (privacy === 'nobody') return [];
  if (privacy === 'only_share_with') return included;

  return contactIdsOf(owner || {}).filter((id) => !excluded.includes(id));
};

const emitToUsers = (io, userIds, event, payload) => {
  if (!io) return;
  [...new Set((userIds || []).map(String).filter(Boolean))].forEach((userId) => {
    io.to(userId).emit(event, payload);
  });
};

const emitStatusCreated = async (req, status) => {
  const io = req.app.get('io');
  if (!io || !status) return;
  const populated = await Status.findById(status._id)
    .populate('userId', 'username profilePicture')
    .populate('user', 'username profilePicture');
  const payload = normalizeStatusForClient(populated || status, ownerIdOf(status), new Set());
  const recipients = await audienceIdsForStatus(status);
  emitToUsers(io, [...recipients, ownerIdOf(status)], 'status:created', payload);
};

const emitStatusDeleted = async (req, status) => {
  const io = req.app.get('io');
  if (!io || !status) return;
  const recipients = await audienceIdsForStatus(status);
  emitToUsers(io, [...recipients, ownerIdOf(status)], 'status:deleted', {
    statusId: String(status._id),
    userId: ownerIdOf(status)
  });
};

const emitStatusViewed = (req, status, viewerId) => {
  const io = req.app.get('io');
  if (!io || !status) return;
  emitToUsers(io, [ownerIdOf(status)], 'status:viewed', {
    _id: status._id,
    statusId: String(status._id),
    viewerId: String(viewerId),
    views: getStatusViewersForClient(status),
    viewCount: status.viewCount || status.viewsCount || (status.views || []).length,
    viewsCount: status.viewsCount || status.viewCount || (status.views || []).length
  });
};

const buildQuotedStatus = (status) => ({
  statusId: String(status._id),
  ownerName: status.userId?.username || status.user?.username || status.username || 'Status',
  preview: status.textStatus?.text || status.caption || status.content || status.mediaUrl || 'Status',
  type: status.type || 'text',
  mediaUrl: status.mediaUrl || (MEDIA_STATUS_TYPES.has(status.type) ? status.content : null) || null
});

const createStatusReplyMessage = async (req, status, content, conversationId = null) => {
  const senderId = req.user._id;
  const ownerId = ownerIdOf(status);
  if (!ownerId || ownerId === String(senderId)) return null;
  if (await isEitherUserBlocked(senderId, ownerId)) {
    const err = new Error('You cannot reply to this status');
    err.statusCode = 403;
    throw err;
  }

  let conversation = null;
  if (conversationId) {
    conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants?.some((p) => String(p) === String(senderId))) {
      const err = new Error('Not authorized for this conversation');
      err.statusCode = 403;
      throw err;
    }
  } else {
    conversation = await Conversation.findOne({
      participants: { $all: [senderId, ownerId] },
      isGroup: false
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, ownerId],
        isGroup: false
      });
    }
  }

  const quotedStatus = buildQuotedStatus(status);
  const message = await Message.create({
    conversationId: conversation._id,
    sender: senderId,
    content,
    messageType: 'text',
    replyTo: null,
    quotedStatus
  });

  const populatedMessage = await Message.findById(message._id).populate('sender', 'username profilePicture');
  const outgoingMessage = serializeOutgoingMessage(populatedMessage || message, { quotedStatus });

  conversation.lastMessage = message._id;
  conversation.updatedAt = new Date();
  await conversation.save();

  let updatedConversation = conversation;
  const incObject = {};
  (conversation.participants || []).forEach((participantId) => {
    if (String(participantId) !== String(senderId)) {
      incObject[`unreadCount.${String(participantId)}`] = 1;
    }
  });
  if (Object.keys(incObject).length > 0) {
    updatedConversation = await Conversation.findByIdAndUpdate(
      conversation._id,
      { $inc: incObject },
      { new: true }
    ) || conversation;
  }

  const io = req.app.get('io');
  if (io) {
    io.to(String(conversation._id)).emit('message:received', outgoingMessage);
    emitToUsers(io, conversation.participants, 'message:received', outgoingMessage);
    (conversation.participants || []).forEach((participantId) => {
      if (String(participantId) !== String(senderId)) {
        emitToUsers(io, [participantId], 'conversation:unread-update', {
          conversationId: conversation._id,
          unreadCount: getUnreadCount(updatedConversation, String(participantId))
        });
      }
    });
  }

  return outgoingMessage;
};

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

    const creator = await User.findById(req.user._id).select('username profilePicture statusPrivacySettings settings contacts');
    const defaultPrivacy = getDefaultStatusPrivacy(creator || {});
    const finalPrivacy = normalizePrivacy(privacy || defaultPrivacy.type);
    const finalExcludedUsers = compactIds(excludedUsers || req.body.excludedViewers || defaultPrivacy.exceptUsers);
    const finalIncludedUsers = compactIds(includedUsers || req.body.includedViewers || defaultPrivacy.allowedUsers);

    const status = await Status.create({
      user: req.user._id,
      userId: req.user._id,
      username: creator?.username || req.user.username || '',
      type,
      content: content || '',
      mediaUrl: type !== 'text' ? (content || '') : '',
      mediaType: type !== 'text' ? type : '',
      caption: caption || '',
      backgroundColor: textStatus?.backgroundColor || '#128C7E',
      textColor: textStatus?.fontColor || '#FFFFFF',
      textStatus: type === 'text' ? {
        text: textStatus?.text || '',
        backgroundColor: textStatus?.backgroundColor || '#128C7E',
        fontColor: textStatus?.fontColor || '#FFFFFF',
        fontStyle: textStatus?.fontStyle || 'normal'
      } : undefined,
      music: music || undefined,
      privacy: finalPrivacy,
      excludedUsers: finalExcludedUsers,
      includedUsers: finalIncludedUsers,
      excludedViewers: finalExcludedUsers,
      includedViewers: finalIncludedUsers,
      duration: duration || 0
    });

    // Populate userId for frontend
    const populated = await Status.findById(status._id)
      .populate('userId', 'username profilePicture')
      .populate('user', 'username profilePicture');

    await emitStatusCreated(req, status);

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
    const user = await User.findById(userId).select('contacts mutedStatusUsers blockedStatusUsers');
    const contactIds = contactIdsOf(user || {});
    const mutedUserIds = getActiveMutedUserIds(user || {});
    const blockedStatusUserIds = getActiveStatusBlockedUserIds(user || {});

    // Find statuses from contacts + self that aren't expired
    const statuses = await Status.find({
      ...ownerMatchQuery([...contactIds, userId]),
      expiresAt: { $gt: new Date() },
      archived: { $ne: true }
    })
    .populate('userId', 'username profilePicture')
    .populate('user', 'username profilePicture')
    .sort({ createdAt: -1 })
    .limit(100);

    const result = [];
    for (const status of statuses) {
      const ownerId = ownerIdOf(status);
      if (ownerId !== String(userId) && blockedStatusUserIds.has(ownerId)) continue;
      if (!(await canViewerSeeStatus(userId, status, user))) continue;
      result.push(normalizeStatusForClient(status, userId, mutedUserIds));
    }

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

    const viewer = await User.findById(req.user._id).select('blockedStatusUsers');
    if (!(await canViewerSeeStatus(req.user._id, status, viewer))) {
      return res.status(403).json({ success: false, message: 'You cannot view this status' });
    }

    const isOwner = ownerIdOf(status) === String(req.user._id);
    if (isOwner) {
      return res.json({ success: true, viewCount: status.viewCount || status.viewsCount || (status.views || []).length });
    }

    // Check if already viewed
    const alreadyViewed = status.views?.some(
      v => viewerIdOf(v) === String(req.user._id)
    );

    if (!alreadyViewed) {
      status.views.push({ userId: req.user._id, user: req.user._id, viewedAt: new Date() });
      status.viewCount = status.views.length;
      status.viewsCount = status.views.length;
      await status.save();
      emitStatusViewed(req, status, req.user._id);
    }

    res.json({ success: true, viewCount: status.viewCount || status.viewsCount || status.views.length });
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

    if (ownerIdOf(status) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Status.findByIdAndDelete(req.params.id);
    await emitStatusDeleted(req, status);
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
      .populate('views.userId', 'username profilePicture')
      .populate('views.user', 'username profilePicture')
      .populate('reactions.userId', 'username profilePicture')
      .populate('reactions.user', 'username profilePicture');

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    // Only the owner can see viewers
    if (ownerIdOf(status) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({
      success: true,
      viewers: getStatusViewersForClient(status),
      reactions: getStatusReactionsForClient(status),
      viewCount: status.viewCount || status.viewsCount || (status.views || []).length
    });
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

    const ownerId = ownerIdOf(status);
    if (!ownerId || ownerId === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Cannot mute this status' });
    }

    const user = await User.findById(req.user._id).select('mutedStatusUsers');
    const existingMutes = Array.isArray(user?.mutedStatusUsers) ? user.mutedStatusUsers : [];
    const alreadyMutedUser = existingMutes.some((mute) => idOf(mute?.user || mute) === ownerId);
    if (user && !alreadyMutedUser) {
      user.mutedStatusUsers = [...existingMutes, { user: ownerId, mutedAt: new Date() }];
      await user.save();
    }

    const alreadyMuted = status.mutedBy?.some(id => String(id) === String(req.user._id));
    if (!alreadyMuted) {
      status.mutedBy.push(req.user._id);
      await status.save();
    }

    await Status.updateMany(ownerMatchQuery([ownerId]), { $addToSet: { mutedBy: req.user._id } });

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

    const ownerId = ownerIdOf(status);
    const user = await User.findById(req.user._id).select('mutedStatusUsers');
    if (user) {
      user.mutedStatusUsers = (user.mutedStatusUsers || []).filter((mute) => idOf(mute?.user || mute) !== ownerId);
      await user.save();
    }

    status.mutedBy = (status.mutedBy || []).filter(id => String(id) !== String(req.user._id));
    await status.save();
    await Status.updateMany(ownerMatchQuery([ownerId]), { $pull: { mutedBy: req.user._id } });

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

    const viewer = await User.findById(req.user._id).select('blockedStatusUsers');
    if (!(await canViewerSeeStatus(req.user._id, status, viewer))) {
      return res.status(403).json({ success: false, message: 'You cannot react to this status' });
    }

    // Check if user already reacted with this emoji
    const existingIdx = status.reactions.findIndex(
      r => reactionUserIdOf(r) === String(req.user._id) && r.emoji === emoji
    );

    if (existingIdx >= 0) {
      // Toggle off (remove reaction)
      status.reactions.splice(existingIdx, 1);
    } else {
      // Remove any existing reaction from this user first, then add new
      status.reactions = status.reactions.filter(
        r => reactionUserIdOf(r) !== String(req.user._id)
      );
      status.reactions.push({ userId: req.user._id, user: req.user._id, emoji });
    }

    await status.save();

    const io = req.app.get('io');
    emitToUsers(io, [ownerIdOf(status)], 'status:reacted', {
      statusId: String(status._id),
      userId: String(req.user._id),
      emoji,
      reactions: getStatusReactionsForClient(status)
    });

    res.json({ success: true, reactions: getStatusReactionsForClient(status) });
  } catch (error) {
    console.error('React error:', error);
    res.status(500).json({ success: false, message: 'Failed to react' });
  }
});

// ============ GET REACTIONS ============
router.get('/:id/reactions', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id)
      .populate('reactions.userId', 'username profilePicture')
      .populate('reactions.user', 'username profilePicture');

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const viewer = await User.findById(req.user._id).select('blockedStatusUsers');
    if (!(await canViewerSeeStatus(req.user._id, status, viewer))) {
      return res.status(403).json({ success: false, message: 'You cannot view reactions for this status' });
    }

    res.json({ success: true, reactions: getStatusReactionsForClient(status) });
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reactions' });
  }
});

// ============ REPLY TO STATUS ============
router.post('/:id/reply', protect, async (req, res) => {
  try {
    const { message, content, conversationId } = req.body;
    const replyContent = String(message || content || '').trim();
    if (!replyContent) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const status = await Status.findById(req.params.id)
      .populate('userId', 'username profilePicture')
      .populate('user', 'username profilePicture');
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const viewer = await User.findById(req.user._id).select('blockedStatusUsers');
    if (!(await canViewerSeeStatus(req.user._id, status, viewer))) {
      return res.status(403).json({ success: false, message: 'You cannot reply to this status' });
    }

    if (!status.replies) status.replies = [];
    status.replies.push({
      senderId: req.user._id,
      userId: req.user._id,
      username: req.user.username || '',
      message: replyContent,
      content: replyContent,
      type: 'text',
      createdAt: new Date()
    });

    await status.save();
    const outgoingMessage = await createStatusReplyMessage(req, status, replyContent, conversationId);

    res.status(outgoingMessage ? 201 : 200).json({
      success: true,
      reply: status.replies[status.replies.length - 1],
      message: outgoingMessage
    });
  } catch (error) {
    console.error('Reply error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to reply' });
  }
});

// ============ FAVORITE / SAVE STATUS ============
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const viewer = await User.findById(req.user._id).select('blockedStatusUsers savedStatuses');
    if (!(await canViewerSeeStatus(req.user._id, status, viewer))) {
      return res.status(403).json({ success: false, message: 'You cannot save this status' });
    }

    const savedStatuses = Array.isArray(viewer.savedStatuses) ? viewer.savedStatuses : [];
    const statusId = String(status._id);
    const existingIndex = savedStatuses.findIndex((saved) => idOf(saved?.statusId || saved?._id || saved) === statusId);
    const saved = existingIndex < 0;

    if (saved) {
      viewer.savedStatuses = [...savedStatuses, { statusId, savedAt: new Date() }];
    } else {
      viewer.savedStatuses = savedStatuses.filter((_, index) => index !== existingIndex);
    }

    await viewer.save();
    res.json({ success: true, saved, savedStatuses: viewer.savedStatuses });
  } catch (error) {
    console.error('Favorite status error:', error);
    res.status(500).json({ success: false, message: 'Failed to save status' });
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
      ...ownerMatchQuery([userId]),
      expiresAt: { $gt: new Date() }
    })
      .populate('userId', 'username profilePicture')
      .populate('user', 'username profilePicture')
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
    const user = await User.findById(userId).select('contacts mutedStatusUsers blockedStatusUsers');
    const contactIds = contactIdsOf(user || {});
    const mutedUserIds = getActiveMutedUserIds(user || {});
    const blockedStatusUserIds = getActiveStatusBlockedUserIds(user || {});

    const statuses = await Status.find({
      ...ownerMatchQuery([...contactIds, userId]),
      expiresAt: { $gt: new Date() },
      archived: { $ne: true }
    })
      .populate('userId', 'username profilePicture')
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(100);

    // Group by user
    const userMap = new Map();
    for (const status of statuses) {
      const uid = ownerIdOf(status);
      if (!uid) continue;
      if (uid !== String(userId) && blockedStatusUserIds.has(uid)) continue;
      if (!(await canViewerSeeStatus(userId, status, user))) continue;

      const statusObj = normalizeStatusForClient(status, userId, mutedUserIds);
      const isViewed = statusObj.isViewed;

      if (!userMap.has(uid)) {
        userMap.set(uid, {
          user: {
            _id: uid,
            username: statusObj.userId?.username || statusObj.user?.username || 'Unknown',
            profilePic: statusObj.userId?.profilePicture || statusObj.user?.profilePicture || ''
          },
          statuses: [],
          hasUnviewed: false
        });
      }

      const group = userMap.get(uid);
      group.statuses.push(statusObj);
      group.isMuted = Boolean(statusObj.isMuted);
      if (!isViewed) group.hasUnviewed = true;
    }

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
      ...ownerMatchQuery([userId]),
      archived: true
    })
      .populate('userId', 'username profilePicture')
      .populate('user', 'username profilePicture')
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
    if (ownerIdOf(status) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    status.archived = true;
    await status.save();
    await emitStatusDeleted(req, status);
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
    if (ownerIdOf(status) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    status.archived = false;
    await status.save();
    if (!status.expiresAt || new Date(status.expiresAt).getTime() > Date.now()) {
      await emitStatusCreated(req, status);
    }
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
    if (ownerIdOf(status) !== String(userId)) return res.status(403).json({ success: false, message: 'You do not have permission' });

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
    const viewer = await User.findById(req.user._id).select('blockedStatusUsers');
    if (!(await canViewerSeeStatus(req.user._id, status, viewer))) {
      return res.status(403).json({ success: false, message: 'You cannot vote on this status' });
    }

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

// PUBLIC: View a shared status via share token (no auth required)
router.get('/shared/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }
    const status = await Status.findById(id)
      .populate('userId', 'username profilePicture')
      .populate('user', 'username profilePicture');
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
        content: status.content || status.mediaUrl || '',
        textStatus: status.textStatus?.text ? status.textStatus : {
          text: status.content || '',
          backgroundColor: status.backgroundColor || '#128C7E',
          fontColor: status.textColor || '#FFFFFF'
        },
        caption: status.caption,
        username: status.userId?.username || status.user?.username || 'Someone',
        profilePicture: status.userId?.profilePicture || status.user?.profilePicture || '',
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
    if (ownerIdOf(status) !== String(req.user._id)) {
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
    const status = await Status.findById(req.params.id)
      .populate('userId', 'username profilePicture')
      .populate('user', 'username profilePicture');
    
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });
    const viewer = await User.findById(userId).select('blockedStatusUsers');
    if (!(await canViewerSeeStatus(userId, status, viewer))) {
      return res.status(403).json({ success: false, message: 'You cannot forward this status' });
    }

    const targetConversationIds = compactIds([...(contacts || []), ...(groups || [])]);
    if (targetConversationIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one conversation' });
    }

    if (!status.forwards) status.forwards = [];
    status.forwards.push({
      forwardedBy: userId,
      contacts: compactIds(contacts || []),
      groups: compactIds(groups || []),
      message: customMessage || '',
      forwardedAt: new Date()
    });
    status.forwardCount = (status.forwardCount || 0) + 1;
    await status.save();

    const io = req.app.get('io');

    const quotedStatus = buildQuotedStatus(status);
    const content = String(customMessage || status.textStatus?.text || status.caption || 'Forwarded a status').trim();

    const results = [];
    for (const convId of targetConversationIds) {
      try {
        const conversation = await Conversation.findById(convId);
        if (!conversation) {
          results.push({ conversationId: convId, success: false, error: 'Conversation not found' });
          continue;
        }

        if (!conversation.participants.some(p => String(p) === String(userId))) {
          results.push({ conversationId: convId, success: false, error: 'Not a participant' });
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

        const outgoingMessage = serializeOutgoingMessage(populatedMessage || message, { quotedStatus });

        conversation.lastMessage = message._id;
        conversation.updatedAt = new Date();

        let updatedConversation = conversation;
        if (conversation.participants) {
          const incObject = {};
          conversation.participants.forEach((p) => {
            if (String(p) !== String(userId)) {
              incObject[`unreadCount.${String(p)}`] = 1;
            }
          });
          if (Object.keys(incObject).length > 0) {
            updatedConversation = await Conversation.findByIdAndUpdate(
              conversation._id,
              { $inc: incObject },
              { new: true }
            ) || conversation;
          }
        }

        await conversation.save();

        if (io) {
          io.to(String(conversation._id)).emit('message:received', outgoingMessage);
          emitToUsers(io, conversation.participants, 'message:received', outgoingMessage);
          conversation.participants.forEach((p) => {
            if (String(p) !== String(userId)) {
              emitToUsers(io, [p], 'conversation:unread-update', {
                conversationId: conversation._id,
                unreadCount: getUnreadCount(updatedConversation, String(p))
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
