const Status = require('../models/Status');
const User = require('../models/User');
const mongoose = require('mongoose');
const { isEitherUserBlocked } = require('../utils/messageSendHelpers');

// Helper function to check if user owns status
const isStatusOwner = (status, userId) => {
  return String(status.user) === String(userId);
};

// Helper function to check if user is a collaborator on the status
const isCollaborator = (status, userId) => {
  if (!status || !Array.isArray(status.collaborators)) return false;
  return status.collaborators.some((c) => String(c.userId) === String(userId) || String(c.user) === String(userId));
};

// POST /api/status/:id/voice-changer - Apply voice changer to status
exports.applyVoiceChanger = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { effect, pitch, speed, echo } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    
    if (status.type !== 'voice') {
      return res.status(400).json({ success: false, message: 'Voice changer only works on voice statuses' });
    }

    // Apply voice effects (in production, this would use audio processing library)
    status.voiceEffects = { effect, pitch, speed, echo };
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/text-to-speech - Convert text to speech
exports.textToSpeech = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { voice, speed, pitch } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    
    if (status.type !== 'text') {
      return res.status(400).json({ success: false, message: 'Text-to-speech only works on text statuses' });
    }

    // In production, this would use TTS API
    status.ttsSettings = { voice, speed, pitch, enabled: true };
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/collaborate - Add collaborator to status
exports.addCollaborator = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { collabUserId, collabUsername } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    let collaborator = null;
    if (collabUserId) {
      collaborator = await User.findById(collabUserId);
    } else if (collabUsername) {
      collaborator = await User.findOne({
        $or: [
          { username: collabUsername },
          { username: { $regex: `^${collabUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
        ]
      });
    }
    if (!collaborator) return res.status(404).json({ success: false, message: 'Collaborator haipatikani' });

    if (String(collaborator._id) === String(userId)) {
      return res.status(400).json({ success: false, message: 'Huwezi kujiongeza mwenyewe kama collaborator' });
    }

    if (!Array.isArray(status.collaborators)) status.collaborators = [];
    if (status.collaborators.some((c) => String(c.userId || c.user) === String(collaborator._id))) {
      return res.status(400).json({ success: false, message: 'Collaborator tayari ameongezwa' });
    }

    const max = Number(status.maxCollaborators) > 0 ? Number(status.maxCollaborators) : 10;
    if (status.collaborators.length >= max) {
      return res.status(400).json({ success: false, message: `Upeo wa collaborators ni ${max}` });
    }

    status.collaborators.push({
      user: collaborator._id,
      userId: String(collaborator._id),
      username: collaborator.username,
      role: 'viewer',
      joinedAt: new Date()
    });
    status.collabUserId = String(collaborator._id);
    status.collabUsername = collaborator.username;
    status.isCollaborative = true;
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/:id/collaboration - Get collaboration settings for a status
exports.getCollaboration = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId) && !isCollaborator(status, userId)) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    res.json({
      success: true,
      collaboration: {
        collaborators: status.collaborators || (status.collabUserId ? [{ userId: status.collabUserId, username: status.collabUsername, role: 'viewer' }] : []),
        collabMode: status.collabMode || 'view',
        isPublic: status.isCollaborative || false,
        allowComments: status.allowComments !== false,
        allowEdits: status.allowEdits || false,
        expiryDate: status.expiryDate || '',
        maxCollaborators: status.maxCollaborators || 10
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/collaboration - Save collaboration settings for a status
exports.updateCollaboration = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    const { collaborators, collabMode, isPublic, allowComments, allowEdits, expiryDate, maxCollaborators } = req.body;

    if (Array.isArray(collaborators)) {
      const clean = collaborators.map((c) => ({
        user: c.user || (mongoose.Types.ObjectId.isValid(c.userId) ? c.userId : undefined),
        userId: String(c.userId || c.user || c.id || ''),
        username: c.username || c.name || '',
        role: c.role === 'editor' ? 'editor' : 'viewer',
        joinedAt: c.joinedAt || new Date()
      })).filter((c) => c.userId);
      status.collaborators = clean;
    }
    status.collabMode = collabMode || status.collabMode || 'view';
    status.allowComments = allowComments !== false;
    status.allowEdits = allowEdits || false;
    status.expiryDate = expiryDate || '';
    status.maxCollaborators = Number(maxCollaborators) > 0 ? Number(maxCollaborators) : 10;
    status.isCollaborative = isPublic || (Array.isArray(status.collaborators) && status.collaborators.length > 0);
    const firstCollab = status.collaborators && status.collaborators[0];
    if (firstCollab) {
      status.collabUserId = String(firstCollab.userId || firstCollab.user || '');
      status.collabUsername = firstCollab.username || '';
    }
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/contribute - Collaborator adds a status to the shared story
exports.contributeToCollaboration = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const username = req.user.username || req.body.username || '';
    const parent = await Status.findById(req.params.id);

    if (!parent) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (parent.expiresAt && new Date(parent.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'Story imekwisha muda wake' });
    }
    if (!parent.isCollaborative || (!isCollaborator(parent, userId) && !isStatusOwner(parent, userId))) {
      return res.status(403).json({ success: false, message: 'Wewe si collaborator wa story hii' });
    }

    const { type, mediaUrl, mediaType, caption, backgroundColor, textColor } = req.body;
    if (!type) return res.status(400).json({ success: false, message: 'type inahitajika' });
    if (['image', 'video', 'audio', 'voice'].includes(type) && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'mediaUrl inahitajika kwa status ya aina hii' });
    }

    const contribution = await Status.create({
      user: userId,
      userId: String(userId),
      username,
      type,
      content: caption || `${username} contributed to a story`,
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || type,
      caption: caption || '',
      backgroundColor: backgroundColor || parent.backgroundColor || '#00a884',
      textColor: textColor || parent.textColor || '#ffffff',
      privacy: parent.privacy || 'contacts',
      excludedViewers: parent.excludedViewers || [],
      includedViewers: parent.includedViewers || [],
      storyId: String(parent._id),
      isContribution: true,
      isCollaborative: true,
      expiresAt: parent.expiresAt,
      views: [],
      viewsCount: 0
    });

    res.status(201).json({ success: true, status: contribution });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/status/:draftId - Delete a draft status
exports.deleteDraft = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const draft = await Status.findOne({ _id: req.params.draftId, user: userId, isDraft: true });
    
    if (!draft) return res.status(404).json({ success: false, message: 'Draft haipatikani' });

    await draft.deleteOne();
    res.json({ success: true, message: 'Draft deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/hashtags/trending - Get trending hashtags
exports.getTrendingHashtags = async (req, res) => {
  try {
    const hashtags = await Status.aggregate([
      { $match: { hashtags: { $exists: true, $not: { $size: 0 } } } },
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      hashtags: hashtags.map(h => ({ id: h._id, tag: h._id, count: h.count }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/archive - Archive status
exports.archiveStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { isArchived = true } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    status.isArchived = isArchived;
    status.archivedAt = isArchived ? new Date() : null;
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/archived - Get archived statuses
exports.getArchivedStatuses = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const archived = await Status.find({
      user: userId,
      isArchived: true
    })
    .populate('user', 'username profilePicture')
    .sort({ archivedAt: -1 });

    res.json({ success: true, statuses: archived });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/:id/reminder - Get reminder for status
exports.getReminder = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    res.json({ success: true, reminder: status.reminder || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/reminder - Set reminder for status
exports.setReminder = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { reminderTime, reminderNote } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    status.reminder = {
      enabled: true,
      time: new Date(reminderTime),
      note: reminderNote
    };
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/:id/reactions - Get reaction counts for status
exports.getReactions = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);

    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    const counts = {};
    status.reactions.forEach(r => {
      const key = r.emoji || r.reactionId || 'unknown';
      counts[key] = (counts[key] || 0) + 1
1;    });

    res.json({ success: true, reactions: counts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/:id/accessibility - Get accessibility settings for status
exports.getAccessibility = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);

    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    const accessibility = status.accessibility || {};

    res.json({ success: true, accessibility });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/accessibility - Update accessibility settings for status
exports.updateAccessibility = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);

    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    const updatedAccessibility = req.body;
    status.accessibility = updatedAccessibility;
    await status.save();

    res.json({ success: true, accessibility: updatedAccessibility });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/alt-text - Generate alt text for status
exports.generateAltText = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);

    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    const altText = `An image showing ${status.caption || 'content'} with ${status.type} style`;

    res.json({ success: true, altText });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/captions - Generate captions for status video
exports.generateCaptions = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);

    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    const captions = `[00:00] ${status.caption || 'Content'}
[00:05] More details about the content
[00:10] Additional information or description`;

    res.json({ success: true, captions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/react - Add reaction to status
exports.addReaction = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { emoji, reactionId } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    const key = emoji || reactionId;

    // Remove existing reaction from user
    status.reactions = status.reactions.filter(r => String(r.user) !== String(userId));
    
    // Add new reaction
    if (key) {
      status.reactions.push({ user: userId, emoji: key, createdAt: new Date() });
    }
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/poll - Create poll on status
exports.createPoll = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { question, options, allowMultiple, expiresAt } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    status.poll = {
      question,
      options: options.map((opt, idx) => ({ id: idx, text: opt, votes: 0 })),
      allowMultiple: allowMultiple || false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      totalVotes: 0
    };
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/poll/vote - Vote on poll
exports.votePoll = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { optionIds } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!status.poll) return res.status(400).json({ success: false, message: 'Hakuna poll' });

    // Check if already voted
    const existingVote = status.poll.voters?.find(v => String(v.user) === String(userId));
    if (existingVote) return res.status(400).json({ success: false, message: 'Umesha kura' });

    // Record vote
    if (!status.poll.voters) status.poll.voters = [];
    status.poll.voters.push({ user: userId, optionIds, votedAt: new Date() });

    // Update option votes
    optionIds.forEach(optId => {
      const option = status.poll.options.find(o => o.id === optId);
      if (option) option.votes++;
    });
    status.poll.totalVotes++;
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/schedule - Schedule status
exports.scheduleStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { scheduledTime } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    status.scheduledFor = new Date(scheduledTime);
    status.isScheduled = true;
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/location - Add location to status
exports.addLocation = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    // Accept both lat/lng and latitude/longitude shapes so GPS clients and
    // picker UIs work. Schema stores lat/lng (matches StatusCreator payloads).
    const { latitude, longitude, lat, lng, address, placeName } = req.body;
    const parsedLat = Number.isFinite(Number(latitude)) ? Number(latitude) : Number.isFinite(Number(lat)) ? Number(lat) : undefined;
    const parsedLng = Number.isFinite(Number(longitude)) ? Number(longitude) : Number.isFinite(Number(lng)) ? Number(lng) : undefined;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    status.locationData = {
      lat: parsedLat,
      lng: parsedLng,
      address,
      placeName
    };
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/:id/location - Get location for status
exports.getLocation = async (req, res) => {
  try {
    const statusId = req.params.id || req.params.statusId;
    const status = await Status.findById(statusId);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    res.json({ success: true, locationData: status.locationData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/backup - Backup all statuses
exports.backupStatuses = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const statuses = await Status.find({ user: userId });
    
    const backupData = {
      userId,
      exportedAt: new Date(),
      statuses: statuses.map(s => ({
        type: s.type,
        content: s.content,
        mediaUrl: s.mediaUrl,
        caption: s.caption,
        createdAt: s.createdAt
      }))
    };

    res.json({ success: true, backupData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/restore - Restore statuses from backup
exports.restoreStatuses = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { backupData } = req.body;
    
    if (!backupData || !backupData.statuses) {
      return res.status(400).json({ success: false, message: 'Backup data invalid' });
    }

    const restored = [];
    for (const statusData of backupData.statuses) {
      const newStatus = await Status.create({
        user: userId,
        userId: String(userId),
        ...statusData,
        isRestored: true,
        restoredAt: new Date()
      });
      restored.push(newStatus);
    }

    res.json({ success: true, restored });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/qr - Generate QR code for status
exports.generateQRCode = async (req, res) => {
  try {
    const statusId = req.params.id;
    const status = await Status.findById(statusId);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    // In production, use QR code library
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${process.env.PUBLIC_URL || 'http://localhost:5174'}/status/${statusId}`)}`;

    res.json({ success: true, qrCodeUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/mention - Mention user in status
exports.addMention = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { mentionedUserId, mentionedUsername, mentions } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    if (!status.mentions) status.mentions = [];

    const mentionList = Array.isArray(mentions) && mentions.length > 0
      ? mentions
      : (mentionedUserId ? [{ id: mentionedUserId, username: mentionedUsername || '' }] : []);

    for (const m of mentionList) {
      const uid = m?.id || m?.userId || m?._id;
      if (!uid) continue;
      const exists = status.mentions.some(x => String(x.user) === String(uid));
      if (!exists) {
        status.mentions.push({
          user: uid,
          username: m?.username || m?.name || '',
          mentionedAt: new Date()
        });
      }
    }
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/:id/mentions - Get mentions for status
exports.getMentions = async (req, res) => {
  try {
    const statusId = req.params.id || req.params.statusId;
    const status = await Status.findById(statusId).populate('mentions.user', 'username profilePicture');
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    res.json({ success: true, mentions: status.mentions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/hashtags - Add hashtags to status
exports.addHashtags = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { hashtags } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    status.hashtags = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/status/:id/edit - Edit status
exports.editStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const {
      content, caption, backgroundColor, fontStyle,
      textColor, fontColor, privacy, duration, timerSeconds
    } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    if (content !== undefined) status.content = content;
    if (caption !== undefined) status.caption = caption;
    if (backgroundColor !== undefined) status.backgroundColor = backgroundColor;
    if (fontStyle !== undefined) status.fontStyle = fontStyle;
    if (textColor !== undefined) status.textColor = textColor;
    if (fontColor !== undefined) status.textColor = fontColor;
    if (privacy !== undefined) status.privacy = privacy;
    if (duration !== undefined) status.duration = duration;
    if (timerSeconds !== undefined) status.timerSeconds = timerSeconds;
    status.editedAt = new Date();
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/duplicate - Duplicate status
exports.duplicateStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    const duplicate = await Status.create({
      user: userId,
      userId: String(userId),
      type: status.type,
      content: status.content,
      mediaUrl: status.mediaUrl,
      caption: status.caption,
      backgroundColor: status.backgroundColor,
      fontStyle: status.fontStyle,
      isDuplicate: true,
      originalStatusId: status._id,
      duplicatedAt: new Date()
    });

    res.json({ success: true, status: duplicate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/pin - Pin status
exports.pinStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    status.isPinned = !status.isPinned;
    status.pinnedAt = status.isPinned ? new Date() : null;
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/pinned - Get pinned statuses
exports.getPinnedStatuses = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const pinned = await Status.find({
      user: userId,
      isPinned: true
    })
    .populate('user', 'username profilePicture')
    .sort({ pinnedAt: -1 });

    res.json({ success: true, statuses: pinned });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/report - Report status
exports.reportStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { reason, description } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    if (!status.reports) status.reports = [];
    status.reports.push({
      reporter: userId,
      reason,
      description,
      reportedAt: new Date()
    });
    await status.save();

    res.json({ success: true, message: 'Status imeripotiwa' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/template - Create status template
exports.createTemplate = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, type, content, backgroundColor, fontStyle } = req.body;

    if (!type) {
      return res.status(400).json({ success: false, message: 'type is required' });
    }

    const template = await Status.create({
      user: userId,
      userId: String(userId),
      type,
      content,
      backgroundColor,
      fontStyle,
      isTemplate: true,
      templateName: name,
      createdAt: new Date()
    });

    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/templates - Get status templates
exports.getTemplates = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const templates = await Status.find({
      user: userId,
      isTemplate: true
    })
    .sort({ createdAt: -1 });

    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/:id/analytics - Get analytics for status (alias for insights)
exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);

    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    // Real analytics computed from stored engagement data — no fabricated numbers.
    const views = status.views || [];
    const reactions = status.reactions || [];
    const shares = status.shares || [];
    const saves = status.saves || [];

    const totalViews = views.length;
    const uniqueViewers = new Set(views.map(v => String(v.user))).size;
    const shareCount = Number.isFinite(Number(status.shareCount)) ? Number(status.shareCount) : shares.length;
    const saveCount = Number.isFinite(Number(status.savesCount)) ? Number(status.savesCount) : saves.length;
    const engagementRate = totalViews > 0 ? (reactions.length + shares.length + saves.length) / totalViews : 0;

    // Bucket views by hour and by day-of-week from the stored viewedAt timestamps.
    const hourCounts = {};
    const dayCounts = {};
    for (const v of views) {
      const t = new Date(v.viewedAt || v.createdAt);
      if (Number.isNaN(t.getTime())) continue;
      const h = t.getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
      const d = t.getDay();
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    }
    const viewsByTime = Object.keys(hourCounts)
      .map((h) => ({ time: `${String(h).padStart(2, '0')}:00`, views: hourCounts[h] }))
      .sort((a, b) => a.time.localeCompare(b.time));

    let peakTime = 'N/A';
    if (viewsByTime.length > 0) {
      peakTime = viewsByTime.reduce((max, x) => (x.views > max.views ? x : max), viewsByTime[0]).time;
    }
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let topDay = 'N/A';
    if (Object.keys(dayCounts).length > 0) {
      const top = Object.entries(dayCounts).reduce((max, x) => (x[1] > max[1] ? x : max));
      topDay = dayNames[Number(top[0])] || 'N/A';
    }

    const analytics = {
      totalViews,
      uniqueViewers,
      engagementRate: Math.round(engagementRate * 10000) / 10000,
      shareCount,
      saveCount,
      peakTime,
      topDay,
      // Demographics / device / location need per-viewer profile data that isn't
      // collected yet, so return empty instead of inventing numbers.
      demographics: { age: [], gender: [] },
      viewsByTime,
      viewsByDevice: [],
      viewsByLocation: [],
      audienceDemographics: { age: [], gender: [] },
      retentionRate: totalViews > 0 ? Math.round((uniqueViewers / totalViews) * 10000) / 10000 : 0,
      growthRate: 0,
      averageViewTime: 0,
      dropOffPoints: []
    };

    res.json({ success: true, analytics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/draft - Save status as draft
exports.saveDraft = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { type, content, mediaUrl, caption, backgroundColor } = req.body;

    const draft = await Status.create({
      user: userId,
      userId: String(userId),
      type,
      content,
      mediaUrl,
      caption,
      backgroundColor,
      isDraft: true,
      draftSavedAt: new Date()
    });

    res.json({ success: true, draft });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/drafts - Get status drafts
exports.getDrafts = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const drafts = await Status.find({
      user: userId,
      isDraft: true
    })
    .sort({ draftSavedAt: -1 });

    res.json({ success: true, drafts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/favorite - Add status to favorites
exports.favoriteStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    if (!status.favoritedBy) status.favoritedBy = [];
    const alreadyFavorited = status.favoritedBy.some(f => String(f.user) === String(userId));
    
    if (alreadyFavorited) {
      status.favoritedBy = status.favoritedBy.filter(f => String(f.user) !== String(userId));
    } else {
      status.favoritedBy.push({ user: userId, favoritedAt: new Date() });
    }
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/favorites - Get favorite statuses
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const favorites = await Status.find({
      favoritedBy: { $elemMatch: { user: userId } }
    })
    .populate('user', 'username profilePicture')
    .sort({ createdAt: -1 });

    res.json({ success: true, statuses: favorites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/history - Get status history
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { startDate, endDate, type } = req.query;
    
    const query = { user: userId };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (type) query.type = type;

    const history = await Status.find(query)
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 });

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/status/:id/insights - Get status insights
exports.getInsights = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const status = await Status.findById(req.params.id)
      .populate('views.user', 'username profilePicture')
      .populate('reactions.user', 'username profilePicture');
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });
    if (!isStatusOwner(status, userId)) return res.status(403).json({ success: false, message: 'Huna ruhusa' });

    const insights = {
      viewCount: status.views.length,
      reactionCount: status.reactions.length,
      shareCount: status.shareCount || 0,
      uniqueViewers: new Set((status.views || []).map((v) => String(v.user))).size,
      engagementRate: status.views.length > 0 
        ? ((status.reactions.length / status.views.length) * 100).toFixed(2)
        : 0,
      topReactions: status.reactions.reduce((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
        return acc;
      }, {}),
      viewsByHour: status.views.reduce((acc, v) => {
        const hour = new Date(v.viewedAt || v.createdAt).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({ success: true, insights, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/share - Share status
exports.shareStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { platform, message } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    if (!status.shares) status.shares = [];
    status.shares.push({
      sharedBy: userId,
      platform,
      message,
      sharedAt: new Date()
    });
    status.shareCount = (status.shareCount || 0) + 1;
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/download - Download status
exports.downloadStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { quality, format } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    if (!status.downloads) status.downloads = [];
    status.downloads.push({
      downloadedBy: userId,
      quality,
      format,
      downloadedAt: new Date()
    });
    await status.save();

    res.json({ success: true, downloadUrl: status.mediaUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/mute - Mute user status
exports.muteUserStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { duration, reason } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    const user = await User.findById(userId);
    if (!user.mutedStatusUsers) user.mutedStatusUsers = [];
    
    const alreadyMuted = user.mutedStatusUsers.find(m => String(m.user) === String(status.user));
    if (alreadyMuted) {
      return res.status(400).json({ success: false, message: 'User tayari ameshazimwa' });
    }

    user.mutedStatusUsers.push({
      user: status.user,
      duration,
      reason,
      mutedAt: new Date(),
      expiresAt: duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null
    });
    user.markModified('mutedStatusUsers');
    await user.save();

    res.json({ success: true, message: 'User amezimwa' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/block - Block user from status
exports.blockUserStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { blockChatsToo, reason } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    const user = await User.findById(userId);
    if (!user.blockedStatusUsers) user.blockedStatusUsers = [];
    
    const alreadyBlocked = user.blockedStatusUsers.find(b => String(b.user) === String(status.user));
    if (alreadyBlocked) {
      return res.status(400).json({ success: false, message: 'User tayari ameshablokiwa' });
    }

    user.blockedStatusUsers.push({
      user: status.user,
      blockChatsToo,
      reason,
      blockedAt: new Date()
    });
    user.markModified('blockedStatusUsers');

    if (blockChatsToo) {
      if (!user.blockedUsers) user.blockedUsers = [];
      user.blockedUsers.push(status.user);
    }
    await user.save();

    res.json({ success: true, message: 'User ameblokiwa' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/save - Save status to collection
exports.saveToCollection = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { folder, location } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    const user = await User.findById(userId);
    if (!user.savedStatuses) user.savedStatuses = [];
    
    const alreadySaved = user.savedStatuses.find(s => String(s.status) === String(status._id));
    if (alreadySaved) {
      return res.status(400).json({ success: false, message: 'Status tayari imesave' });
    }

    user.savedStatuses.push({
      status: status._id,
      folder,
      location,
      savedAt: new Date()
    });
    user.markModified('savedStatuses');
    await user.save();

    res.json({ success: true, message: 'Status imesave' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/status/:id/forward - Forward status
exports.forwardStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { contacts, groups, message } = req.body;
    const status = await Status.findById(req.params.id);
    
    if (!status) return res.status(404).json({ success: false, message: 'Status haipatikani' });

    if (!status.forwards) status.forwards = [];
    status.forwards.push({
      forwardedBy: userId,
      contacts,
      groups,
      message,
      forwardedAt: new Date()
    });
 status.forwardCount = (status.forwardCount || 0) + 1;
    await status.save();

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
