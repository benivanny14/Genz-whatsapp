const Status = require('../models/Status');
const User = require('../models/User');
const mongoose = require('mongoose');
const { isEitherUserBlocked } = require('../utils/messageSendHelpers');

// POST /api/status - weka status mpya
exports.createStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { type, content, mediaUrl, duration, backgroundColor, fontStyle } = req.body;

    if (!type) return res.status(400).json({ success: false, message: 'Type inahitajika' });
    if (type === 'text' && !content) return res.status(400).json({ success: false, message: 'Content inahitajika kwa text status' });
    if (['image','video','voice'].includes(type) && !mediaUrl) return res.status(400).json({ success: false, message: 'MediaUrl inahitajika' });

    const status = await Status.create({
      user: userId,
      type,
      content: content || '',
      mediaUrl: mediaUrl || '',
      duration: duration || 0,
      backgroundColor: backgroundColor || '#075E54',
      fontStyle: fontStyle || 'sans'
    });

    const populated = await Status.findById(status._id).populate('user', 'username profilePicture');
    res.status(201).json({ success: true, status: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status - pata statuses za contacts wako
exports.getStatuses = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // Onyesha statuses za wote (kama WhatsApp)
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() }
    })
    .populate('user', 'username profilePicture')
    .populate('views.user', 'username profilePicture')
    .populate('reactions.user', 'username profilePicture')
    .sort({ createdAt: -1 });

    // Ficha statuses za watu waliomblock
    const filtered = [];
    for (const s of statuses) {
      const blocked = await isEitherUserBlocked(userId, s.user._id);
      if (!blocked) filtered.push(s);
    }

    // Gawanya: yangu na ya wengine
    const myStatuses = filtered.filter(s => String(s.user._id) === String(userId));
    const othersStatuses = filtered.filter(s => String(s.user._id) !== String(userId));

    // Panga kwa user - kila user awe na array ya statuses zake
    const grouped = {};
    othersStatuses.forEach(s => {
      const uid = String(s.user._id);
      if (!grouped[uid]) grouped[uid] = { user: s.user, statuses: [], hasUnviewed: false };
      grouped[uid].statuses.push(s);
      const viewed = s.views.some(v => String(v.user._id) === String(userId));
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

// POST /api/status/:id/view - rekodi view
exports.viewStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(200).json({ success: true, message: 'Invalid status ID format' });
    }
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    const alreadyViewed = status.views.some(v => String(v.user) === String(userId));
    if (!alreadyViewed && String(status.user) !== String(userId)) {
      status.views.push({ user: userId });
      await status.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/react - react kwa status
exports.reactToStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(200).json({ success: true, message: 'Invalid status ID format' });
    }
    const userId = req.user._id || req.user.id;
    const { emoji } = req.body;
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    // Ondoa reaction ya zamani kama ipo
    status.reactions = status.reactions.filter(r => String(r.user) !== String(userId));
    
    // Ongeza mpya
    if (emoji) status.reactions.push({ user: userId, emoji });
    await status.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/status/:id - futa status
exports.deleteStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (String(status.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa kufuta status hii' });
    }

    await status.deleteOne();
    res.json({ success: true, message: 'Status imefutwa' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/:id/viewers - watu walioona status yako
exports.getViewers = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(200).json({ success: true, message: 'Invalid status ID format' });
    }
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id)
      .populate('views.user', 'username profilePicture')
      .populate('reactions.user', 'username profilePicture');

    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (String(status.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    res.json({
      success: true,
      views: status.views,
      reactions: status.reactions,
      viewCount: status.views.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
