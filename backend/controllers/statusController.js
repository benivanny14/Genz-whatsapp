const Status = require('../models/Status');
const User = require('../models/User');
const mongoose = require('mongoose');
const { isEitherUserBlocked } = require('../utils/messageSendHelpers');
const { sendNewStatusNotification } = require('../services/notificationService');

const ownerId = (status) => status?.user?._id || status?.user || status?.userId;

const canViewStatus = (status, viewer, owner) => {
  const privacy = status.privacy || owner?.settings?.privacy?.status || 'everyone';
  if (privacy === 'only_me' || privacy === 'nobody' || privacy === 'private') {
    return String(ownerId(status)) === String(viewer._id || viewer);
  }
  if (privacy === 'contacts' || privacy === 'contacts_except') {
    const contacts = owner?.contacts || [];
    return contacts.some((id) => String(id) === String(viewer._id || viewer))
      || String(ownerId(status)) === String(viewer._id || viewer);
  }
  return true;
};

const assertCanViewStatus = async (status, viewer) => {
  if (String(ownerId(status)) === String(viewer._id || viewer)) return true;
  const owner = await User.findById(ownerId(status)).select('contacts settings.privacy');
  if (!owner || !canViewStatus(status, viewer, owner)) {
    const error = new Error('Huna ruhusa kuona status hii');
    error.statusCode = 403;
    throw error;
  }
  return true;
};

const handleStatusError = (res, err) => {
  if (err.statusCode === 403) {
    return res.status(403).json({ success: false, message: err.message });
  }
  return res.status(500).json({ success: false, message: err.message });
};

const notifyAudience = async (status, creator) => {
  try {
    const privacy = status.privacy || 'everyone';
    if (privacy === 'only_me' || privacy === 'nobody' || privacy === 'private') return;
    let audience = [];
    if (privacy === 'contacts' || privacy === 'contacts_except') {
      audience = creator?.contacts || [];
    } else {
      audience = creator?.contacts || [];
    }
    const recipientIds = audience
      .map((id) => String(id))
      .filter((id) => id && id !== String(creator._id));
    const recipients = await User.find({ _id: { $in: recipientIds } }).select('settings.notifications');
    const tasks = recipients
      .filter((user) => user?.settings?.notifications?.status !== false)
      .map((user) => sendNewStatusNotification(String(user._id), {
        userName: creator.username || 'Contact',
        statusId: String(status._id),
        userId: String(creator._id),
        type: status.type
      }));
    await Promise.allSettled(tasks);
  } catch (error) {
    console.warn('[Status] notification failed', error?.message || error);
  }
};

exports.createStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { type, content, mediaUrl, duration, backgroundColor, fontStyle, privacy, caption } = req.body;

    if (!type) return res.status(400).json({ success: false, message: 'Type inahitajika' });
    if (type === 'text' && !content && !caption) return res.status(400).json({ success: false, message: 'Content inahitajika kwa text status' });
    if (['image', 'video', 'voice', 'audio'].includes(type) && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'MediaUrl inahitajika' });
    }

    const status = await Status.create({
      user: userId,
      userId: String(userId),
      username: req.user.username,
      type,
      content: content || caption || '',
      caption: caption || '',
      mediaUrl: mediaUrl || '',
      duration: duration || 0,
      backgroundColor: backgroundColor || '#075E54',
      fontStyle: fontStyle || 'sans',
      privacy: privacy || 'everyone'
    });

    const populated = await Status.findById(status._id).populate('user', 'username profilePicture contacts');
    notifyAudience(status, populated.user || req.user).catch(() => {});
    res.status(201).json({ success: true, status: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStatuses = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() }
    })
      .populate('user', 'username profilePicture contacts settings.privacy')
      .populate('views.user', 'username profilePicture')
      .populate('reactions.user', 'username profilePicture')
      .sort({ createdAt: -1 });

    const filtered = [];
    for (const s of statuses) {
      const owner = s.user;
      if (!owner || !owner._id) continue;
      const blocked = await isEitherUserBlocked(userId, owner._id);
      if (blocked) continue;
      if (!canViewStatus(s, req.user, owner)) continue;
      filtered.push(s);
    }

    const myStatuses = filtered.filter((s) => String(s.user._id) === String(userId));
    const othersStatuses = filtered.filter((s) => String(s.user._id) !== String(userId));
    const grouped = {};
    othersStatuses.forEach((s) => {
      const uid = String(s.user._id);
      if (!grouped[uid]) grouped[uid] = { user: s.user, statuses: [], hasUnviewed: false };
      grouped[uid].statuses.push(s);
      const viewed = (s.views || []).some((v) => String(v.user?._id || v.user) === String(userId));
      if (!viewed) grouped[uid].hasUnviewed = true;
    });

    res.json({
      success: true,
      myStatuses,
      others: Object.values(grouped)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.viewStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid status ID format' });
    }
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    await assertCanViewStatus(status, req.user);

    const alreadyViewed = (status.views || []).some((v) => String(v.user) === String(userId));
    if (!alreadyViewed && String(status.user || status.userId) !== String(userId)) {
      status.views.push({ user: userId });
      status.viewsCount = (status.viewsCount || 0) + 1;
      await status.save();
    }

    res.json({ success: true });
  } catch (err) {
    handleStatusError(res, err);
  }
};

exports.reactToStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid status ID format' });
    }
    const userId = req.user._id || req.user.id;
    const { emoji } = req.body;
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    await assertCanViewStatus(status, req.user);

    status.reactions = (status.reactions || []).filter((r) => String(r.user) !== String(userId));
    if (emoji) status.reactions.push({ user: userId, emoji });
    await status.save();

    res.json({ success: true, reactions: status.reactions });
  } catch (err) {
    handleStatusError(res, err);
  }
};

exports.replyToStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid status ID format' });
    }
    const userId = req.user._id || req.user.id;
    const { content, type, mediaUrl } = req.body;
    if (!content && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Reply content inahitajika' });
    }
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    await assertCanViewStatus(status, req.user);

    status.replies = status.replies || [];
    status.replies.push({
      userId: String(userId),
      username: req.user.username || 'User',
      content: content || '',
      type: type || 'text',
      mediaUrl: mediaUrl || ''
    });
    await status.save();
    res.json({ success: true, replies: status.replies });
  } catch (err) {
    handleStatusError(res, err);
  }
};

exports.deleteStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid status ID format' });
    }
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (String(status.user || status.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa kufuta status hii' });
    }

    await status.deleteOne();
    res.json({ success: true, message: 'Status imefutwa' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getViewers = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid status ID format' });
    }
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id)
      .populate('views.user', 'username profilePicture')
      .populate('reactions.user', 'username profilePicture');

    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (String(status.user || status.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    res.json({
      success: true,
      views: status.views || [],
      reactions: status.reactions || [],
      replies: status.replies || [],
      viewCount: (status.views || []).length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
