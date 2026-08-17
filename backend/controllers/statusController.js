const Status = require('../models/Status');
const User = require('../models/User');
const mongoose = require('mongoose');
const { isEitherUserBlocked } = require('../utils/messageSendHelpers');
const { normalizeLocationData } = require('../utils/locationData');
const { getActiveMutedUserIds, getActiveStatusBlockedUserIds } = require('../utils/statusMuteHelpers');
const { verifyShareToken } = require('../utils/statusShareToken');

// POST /api/status - weka status mpya
exports.createStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { 
      type, content, mediaUrl, mediaType, duration, backgroundColor, fontStyle,
      linkUrl, quizQuestion, quizOptions, quizCorrectAnswer,
      questionText, countdownDate, countdownTime, locationData,
      collageImages, timerSeconds, caption, collabUserId, collabUsername,
      textEffects, sticker, selectedSticker, subtitles, audio,
      privacy, excludedViewers, includedViewers
    } = req.body;

    const { containsProfanity } = require('../utils/contentFilter');
    const { content: c, caption: cap } = req.body;
    if (containsProfanity(`${c || ''} ${cap || ''}`)) {
      return res.status(400).json({ success: false, message: 'Status contains disallowed words. Please change it.' });
    }

    if (!type) return res.status(400).json({ success: false, message: 'Type is required' });
    if (type === 'text' && !content) return res.status(400).json({ success: false, message: 'Content is required for text status' });
    if (['image','video','voice','gif'].includes(type) && !mediaUrl) return res.status(400).json({ success: false, message: 'MediaUrl is required' });
    if (type === 'link' && !linkUrl) return res.status(400).json({ success: false, message: 'LinkUrl is required' });
    if (type === 'quiz' && !quizQuestion) return res.status(400).json({ success: false, message: 'QuizQuestion is required' });
    if (type === 'question' && !questionText) return res.status(400).json({ success: false, message: 'QuestionText is required' });
    if (type === 'countdown' && (!countdownDate || !countdownTime)) return res.status(400).json({ success: false, message: 'CountdownDate and CountdownTime are required' });
    if (type === 'location' && !locationData) return res.status(400).json({ success: false, message: 'LocationData is required' });
    if (type === 'collage' && (!collageImages || collageImages.length === 0)) return res.status(400).json({ success: false, message: 'CollageImages is required' });

    // Use the user's configured status duration (default 24h) for expiry
    let statusHours = 24;
    try {
      const currentUser = await User.findById(userId).select('statusFeaturesSettings');
      const configured = Number(currentUser?.statusFeaturesSettings?.statusDuration);
      if (Number.isFinite(configured) && configured >= 24 && configured <= 168) {
        statusHours = configured;
      }
    } catch (e) {
      // fall back to 24h default
    }
    const expiresAt = new Date(Date.now() + statusHours * 60 * 60 * 1000);

    // Persist the real privacy choice (previously dropped — every status was
    // silently stored as 'everyone'). Invalid values fall back to 'contacts',
    // and a deliberate 'everyone' is coerced to 'contacts' too: like WhatsApp,
    // new statuses are never public — legacy 'everyone' statuses still render
    // and remain viewable via the shared-status link.
    const validPrivacy = ['contacts', 'contacts_except', 'only_share_with', 'only_me', 'nobody'];
    const statusPrivacy = validPrivacy.includes(privacy) ? privacy : 'contacts';

    const status = await Status.create({
      user: userId,
      userId: String(userId),
      username: req.user?.username || req.user?.name || '',
      type,
      privacy: statusPrivacy,
      excludedViewers: (excludedViewers || []).filter((v) => mongoose.Types.ObjectId.isValid(v)),
      includedViewers: (includedViewers || []).filter((v) => mongoose.Types.ObjectId.isValid(v)),
      expiresAt,
      content: content || '',
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || '',
      duration: duration || 0,
      backgroundColor: backgroundColor || '#075E54',
      fontStyle: fontStyle || 'sans',
      caption: caption || '',
      collabUserId: collabUserId || '',
      collabUsername: collabUsername || '',
      // New status type fields
      linkUrl: linkUrl || '',
      quizQuestion: quizQuestion || '',
      quizOptions: quizOptions || [],
      quizCorrectAnswer: quizCorrectAnswer || 0,
      questionText: questionText || '',
      countdownDate: countdownDate || '',
      countdownTime: countdownTime || '',
      locationData: normalizeLocationData(locationData),
      collageImages: collageImages || [],
      timerSeconds: timerSeconds || 5,
      textEffects: textEffects || null,
      sticker: sticker || selectedSticker || null,
      subtitles: subtitles || null,
      audio: audio || null
    });

    const populated = await Status.findById(status._id).populate('user', 'username profilePicture');
    res.status(201).json({ success: true, status: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status - fetch statuses of your contacts
exports.getStatuses = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const viewerIdStr = String(userId);

    // Load the viewer's mute/block-from-status lists so the feed can enforce
    // them (muted groups still appear, flagged, at the bottom like WhatsApp;
    // status-blocked posters are hidden entirely).
    const viewerDoc = await User.findById(userId);
    const viewer = viewerDoc && typeof viewerDoc.select === 'function'
      ? await viewerDoc.select('mutedStatusUsers blockedStatusUsers')
      : viewerDoc;
    const mutedUserIds = getActiveMutedUserIds(viewer);
    const blockedStatusUserIds = getActiveStatusBlockedUserIds(viewer);

    // Onyesha statuses za wote (kama WhatsApp)
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() }
    })
    .populate('user', 'username profilePicture contacts')
    .populate('views.user', 'username profilePicture')
    .populate('reactions.user', 'username profilePicture')
    .sort({ createdAt: -1 });

    // Ficha statuses za watu waliomblock
    const filtered = [];
    for (const s of statuses) {
      // Orphaned status (poster account deleted) must never crash the feed.
      if (!s.user || !s.user._id) continue;

      const isOwn = String(s.user._id) === viewerIdStr;
      if (!isOwn) {
        const blocked = await isEitherUserBlocked(userId, s.user._id);
        if (blocked) continue;
        // "Block from status" is enforced independently of chat blocks.
        if (blockedStatusUserIds.has(String(s.user._id))) continue;

        // Read the per-status privacy choice (matches the advanced endpoint).
        // The status's own `privacy` field wins; fall back to contacts-only for
        // old statuses created before privacy was stored on the status itself.
        const statusPrivacy = s.privacy || 'contacts';
        if (statusPrivacy === 'only_me' || statusPrivacy === 'nobody') continue;

        if (statusPrivacy === 'only_share_with') {
          // Share only with a picked list — viewer must be in includedViewers.
          const isIncluded = (s.includedViewers || []).some((id) => String(id) === viewerIdStr);
          if (!isIncluded) continue;
        } else if (statusPrivacy !== 'everyone') {
          // Contacts-only or "my contacts except...": viewer must be one of the
          // poster's saved contacts. Contact entries are stored as { user,
          // savedName } subdocuments, so compare against the nested `user` field.
          const posterContacts = s.user?.contacts || [];
          const viewerIsContact = posterContacts.some((c) => {
            const contactUserId = c?.user ? String(c.user) : String(c);
            return contactUserId === viewerIdStr;
          });
          if (!viewerIsContact) continue;

          if (statusPrivacy === 'contacts_except') {
            // "My contacts except...": also skip explicitly excluded viewers.
            const isExcluded = (s.excludedViewers || []).some((id) => String(id) === viewerIdStr);
            if (isExcluded) continue;
          }
        }
      }
      filtered.push(s);
    }

    // Gawanya: yangu na ya wengine
    const myStatuses = filtered.filter(s => String(s.user._id) === String(userId));
    const othersStatuses = filtered.filter(s => String(s.user._id) !== String(userId));

    // Safisha siri za user zisirudi kwa client (contacts/settings zilihitajika
    // tu kwa privacy checks za server-side).
    const stripUserSecrets = (statuses) => {
      statuses.forEach(s => {
        if (s.user && typeof s.user === 'object') {
          delete s.user.contacts;
          delete s.user.settings;
          delete s.user.publicKey;
        }
      });
      return statuses;
    };

    // Panga kwa user - kila user awe na array ya statuses zake
    const grouped = {};
    othersStatuses.forEach(s => {
      const uid = String(s.user._id);
      if (!grouped[uid]) grouped[uid] = { user: s.user, statuses: [], hasUnviewed: false };
      grouped[uid].statuses.push(s);
      const viewed = s.views.some(v => String(v.user._id) === String(userId));
      if (!viewed) grouped[uid].hasUnviewed = true;
    });

    // Flag muted posters so the client can move them to the bottom of the feed.
    Object.values(grouped).forEach(g => {
      g.isMuted = mutedUserIds.has(String(g.user._id));
    });

    stripUserSecrets(myStatuses);
    Object.values(grouped).forEach(g => stripUserSecrets(g.statuses));

    res.json({
      success: true,
      myStatuses,
      others: Object.values(grouped)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/shared/:id - Public status viewer (QR / share link)
// Anonymous visitors can only see statuses whose privacy is 'everyone'.
// Logged-in visitors get the same contact/block/privacy checks as the feed.
exports.getSharedStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const status = await Status.findById(id)
      .populate('user', 'username profilePicture contacts')
      .populate('views.user', 'username profilePicture');

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    // Orphaned status (poster account deleted) is not viewable via a link
    if (!status.user && !status.userId) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    // Auto-expired (TTL index may not have run yet)
    if (status.expiresAt && new Date(status.expiresAt) < new Date()) {
      return res.status(404).json({ success: false, message: 'Status imeisha muda wake' });
    }

    const ownerId = String(status.user?._id || status.userId || '');
    const viewerId = req.user ? String(req.user._id || req.user.id) : '';
    const isOwn = Boolean(viewerId && ownerId && viewerId === ownerId);
    const statusPrivacy = status.privacy || 'contacts';

    let allowed = isOwn;
    if (!allowed) {
      if (statusPrivacy === 'everyone') {
        allowed = true;
      } else if (viewerId && ownerId) {
        const blocked = await isEitherUserBlocked(req.user._id || req.user.id, status.user?._id);
        if (blocked) {
          allowed = false;
        } else if (statusPrivacy === 'only_share_with') {
          allowed = (status.includedViewers || []).some((v) => String(v) === viewerId);
        } else if (statusPrivacy === 'only_me' || statusPrivacy === 'nobody') {
          allowed = false;
        } else {
          // contacts / contacts_except
          const posterContacts = status.user?.contacts || [];
          allowed = posterContacts.some((c) => {
            const contactUserId = c?.user ? String(c.user) : String(c);
            return contactUserId === viewerId;
          });
          if (allowed && statusPrivacy === 'contacts_except') {
            allowed = !(status.excludedViewers || []).some((v) => String(v) === viewerId);
          }
        }
      } else {
        allowed = false;
      }
    }

    if (!allowed) {
      return res.status(403).json({ success: false, message: 'This status has not been shared publicly' });
    }

    // Never leak contact lists / sensitive user fields
    if (status.user && typeof status.user === 'object') {
      delete status.user.contacts;
      delete status.user.settings;
      delete status.user.publicKey;
    }

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/view - rekodi view
// GET /api/status/share/:id — PUBLIC status view for QR / share links.
// No auth required: the QR code is generated by the status owner, so
// generating it is the consent to share that specific status. Privacy is
// still enforced: only 'everyone' statuses are visible anonymously (the
// owner can always see their own), blocked posters are denied, and
// expired statuses 404.
exports.getSharedStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = req.user?._id || req.user?.id || null;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const status = await Status.findById(id).populate('user').populate('user.contacts');
    if (!status || status.isArchived) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    // Auto-expired statuses are gone (TTL index would remove them anyway).
    if (status.expiresAt && new Date(status.expiresAt).getTime() <= Date.now()) {
      return res.status(404).json({ success: false, message: 'Status has expired' });
    }

    const ownerId = String(status.user?._id || status.userId || status.user || '');
    const isOwner = Boolean(viewerId) && String(viewerId) === ownerId;

    // A valid share token (minted by the owner for a QR/share link) grants
    // view access to this one status for its lifetime — even to anonymous
    // visitors — without making the status 'everyone'.
    const shareToken = verifyShareToken(req.query.share || req.query.token);
    const hasValidShareToken = Boolean(shareToken) && String(shareToken.statusId) === String(status._id);

    // Blocked posters are never shareable to the viewer (token included).
    if (viewerId && !isOwner && ownerId) {
      const blocked = await isEitherUserBlocked(viewerId, ownerId);
      if (blocked) {
        return res.status(403).json({ success: false, message: 'This status is not shared publicly' });
      }
    }

    // Public (legacy 'everyone') or a valid share token; the owner always sees
    // their own.
    if (!isOwner && status.privacy !== 'everyone' && !hasValidShareToken) {
      return res.status(403).json({ success: false, message: 'This status is not shared publicly' });
    }

    // Never leak the owner's contact list through the public share link.
    if (status.user && typeof status.user === 'object') {
      delete status.user.contacts;
    }

    res.json({
      success: true,
      status: {
        _id: status._id,
        type: status.type,
        content: status.content,
        mediaUrl: status.mediaUrl,
        caption: status.caption,
        backgroundColor: status.backgroundColor,
        textColor: status.textColor,
        fontStyle: status.fontStyle,
        username: status.username || status.user?.username || 'Someone',
        createdAt: status.createdAt,
        linkUrl: status.linkUrl || '',
        quizQuestion: status.quizQuestion || '',
        quizOptions: status.quizOptions || [],
        countdownDate: status.countdownDate || '',
        locationData: status.locationData || null,
        collageImages: status.collageImages || []
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.viewStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(200).json({ success: true, message: 'Invalid status ID format' });
    }
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });

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
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });

    // Remove a previous reaction from the same user if it exists
    status.reactions = status.reactions.filter(r => String(r.user) !== String(userId));
    
    // Add the new reaction
    if (emoji) status.reactions.push({ user: userId, emoji });
    await status.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/status/:id - delete a status
exports.deleteStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });
    if (String(status.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this status' });
    }

    await status.deleteOne();
    res.json({ success: true, message: 'Status deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/:id/viewers - people who viewed your status
exports.getViewers = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(200).json({ success: true, message: 'Invalid status ID format' });
    }
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id)
      .populate('views.user', 'username profilePicture')
      .populate('reactions.user', 'username profilePicture');

    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });
    if (String(status.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'You do not have permission' });
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

// POST /api/status/upload - upload media kwa status
exports.uploadStatusMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const mediaUrl = req.file.path || req.file.location || `/uploads/${req.file.filename}`;
    const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';

    res.json({
      success: true,
      fileUrl: mediaUrl,
      mediaType: mediaType
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/collage-upload - upload multiple images kwa collage
exports.uploadCollageImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const imageUrls = req.files.map(file => 
      file.path || file.location || `/uploads/${file.filename}`
    );

    res.json({
      success: true,
      imageUrls: imageUrls
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
