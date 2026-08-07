const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Status = require('../models/Status');
const Broadcast = require('../models/Broadcast');
const axios = require('axios');
const fs = require('fs').promises;
const {
  uploadFile: uploadToMediaStorage,
  getFileType,
  isConfigured: isCloudinaryConfigured
} = require('../config/cloudinary');
const { assertSafeExternalUrl } = require('../utils/networkGuard');
const { serializeOutgoingMessage } = require('../utils/messageSerializer');
const { isEitherUserBlocked } = require('../utils/messageSendHelpers');
const { sendNewMessageNotification } = require('../services/notificationService');
const { normalizeLocationData } = require('../utils/locationData');
const getCurrentUserId = (req) => {
  if (!req.user?._id) {
    throw new Error('Authentication required');
  }
  return req.user._id.toString();
};

const includesId = (items = [], id) => {
  if (!Array.isArray(items)) return false;
  const target = id?._id ? id._id.toString() : id?.toString();
  return items.some(item => (item?._id ? item._id.toString() : item?.toString()) === target);
};
const getCurrentUsername = (req) => req.user?.username || req.user?.name || 'GENZ User';
const getPublicBaseUrl = (req) => (
  process.env.PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  `${req.protocol}://${req.get('host')}`
).replace(/\/$/, '');

const normalizeBroadcastRecipients = (recipients = [], currentUserId = '') => {
  if (!Array.isArray(recipients)) return [];
  return [
    ...new Set(
      recipients
        .map((recipient) => {
          if (!recipient) return '';
          if (typeof recipient === 'object') return String(recipient._id || recipient.id || recipient.user || '');
          return String(recipient);
        })
        .map((id) => id.trim())
        .filter((id) => id && id !== String(currentUserId))
    )
  ];
};


// @desc    Translate message
// @route   POST /api/advanced/translate
// @access  Private
exports.translateMessage = async (req, res) => {
  try {
    const { messageId, targetLanguage, text, target } = req.body;

    // Support both call styles:
    // 1. { text, target } — direct text translation (used by ChatArea)
    // 2. { messageId, targetLanguage } — translate by message ID
    let contentToTranslate = text;
    const targetLang = target || targetLanguage || 'en';

    if (!contentToTranslate && messageId) {
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      contentToTranslate = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    }

    if (!contentToTranslate) {
      return res.status(400).json({ message: 'Text or messageId is required' });
    }

    // Try LibreTranslate (free, no API key)
    try {
      const libreRes = await axios.post('https://libretranslate.de/translate', {
        q: contentToTranslate,
        source: 'auto',
        target: targetLang,
        format: 'text'
      }, { timeout: 5000, headers: { 'Content-Type': 'application/json' } });

      if (libreRes.data && libreRes.data.translatedText) {
        return res.status(200).json({
          success: true,
          translatedText: libreRes.data.translatedText,
          translatedContent: libreRes.data.translatedText,
          targetLanguage: targetLang
        });
      }
    } catch (libreErr) {
      // LibreTranslate failed, fallback below
    }

    // Fallback: prefix translation simulation
    const langNames = { en: 'English', sw: 'Swahili', fr: 'French', es: 'Spanish', de: 'German', ar: 'Arabic', zh: 'Chinese' };
    const langName = langNames[targetLang] || targetLang.toUpperCase();
    const translatedContent = `[${langName}] ${contentToTranslate}`;

    res.status(200).json({
      success: true,
      translatedText: translatedContent,
      translatedContent,
      targetLanguage: targetLang
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/advanced/dashboard/stats
// @access  Public (no auth)
exports.getDashboardStats = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    // Messages sent today by user
    const messagesToday = await Message.countDocuments({
      sender: currentUserId,
      createdAt: { $gte: todayStart }
    });

    // Total messages sent
    const totalMessages = await Message.countDocuments({ sender: currentUserId });

    // Conversations (chats) user is part of
    const conversations = await Conversation.find({
      participants: currentUserId
    }).populate('participants', 'username isOnline lastSeen');

    // Unique users chatted with today
    const todayMessages = await Message.find({
      sender: currentUserId,
      createdAt: { $gte: todayStart }
    }).distinct('conversationId');

    // Active statuses count
    const activeStatuses = await Status.countDocuments({
      expiresAt: { $gt: now }
    });

    // Messages this week
    const messagesThisWeek = await Message.countDocuments({
      sender: currentUserId,
      createdAt: { $gte: weekStart }
    });

    // Online users among contacts
    const onlineContacts = conversations
      .flatMap(c => c.participants || [])
      .filter(p => p && p._id?.toString() !== currentUserId && p.isOnline === true);

    // Most active conversations (by message count)
    const conversationStats = await Promise.all(
      conversations.slice(0, 10).map(async (conv) => {
        const count = await Message.countDocuments({ conversationId: conv._id });
        const todayCount = await Message.countDocuments({
          conversationId: conv._id,
          createdAt: { $gte: todayStart }
        });
        const otherParticipant = (conv.participants || []).find(
          p => p?._id?.toString() !== currentUserId
        );
        return {
          conversationId: conv._id,
          name: conv.isGroup ? conv.name : (otherParticipant?.username || 'Unknown'),
          totalMessages: count,
          todayMessages: todayCount,
          isOnline: otherParticipant?.isOnline || false,
          lastSeen: otherParticipant?.lastSeen || null
        };
      })
    );

    // Daily message chart (last 7 days)
    const dailyChart = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const count = await Message.countDocuments({
        sender: currentUserId,
        createdAt: { $gte: dayStart, $lte: dayEnd }
      });
      dailyChart.push({
        date: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        messages: count
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        messagesToday,
        totalMessages,
        messagesThisWeek,
        chatsCount: conversations.length,
        chatsTodayCount: todayMessages.length,
        activeStatuses,
        onlineContactsCount: onlineContacts.length,
        onlineContacts: onlineContacts.slice(0, 20).map(u => ({
          userId: u._id,
          username: u.username,
          isOnline: u.isOnline,
          lastSeen: u.lastSeen
        })),
        topConversations: conversationStats.sort((a, b) => b.todayMessages - a.todayMessages).slice(0, 5),
        dailyChart
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get status reel (all GENZ users' statuses for global reel)
// @route   GET /api/advanced/status/reel
// @access  Public (no auth)
exports.getStatusReel = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const now = new Date();

    const statuses = await Status.find({
      expiresAt: { $gt: now },
      $or: [
        { privacy: 'everyone' },
        { userId: currentUserId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(100);

    // Group by user for reel display
    const userMap = new Map();
    statuses.forEach(s => {
      const uid = String(s.userId);
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          userId: uid,
          username: s.username,
          statuses: [],
          latestAt: s.createdAt
        });
      }
      userMap.get(uid).statuses.push(s);
    });

    const reel = Array.from(userMap.values())
      .sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));

    res.status(200).json({ success: true, reel, total: reel.length });
  } catch (error) {
    console.error('Status reel error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get online ranking (users by online time today)
// @route   GET /api/advanced/dashboard/online-ranking
// @access  Public (no auth)
exports.getOnlineRanking = async (req, res) => {
  try {
    const User = require('../models/User');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const users = await User.find({})
      .select('username isOnline lastSeen profilePicture status')
      .sort({ lastSeen: -1 })
      .limit(50);

    const ranked = users.map((u, idx) => ({
      rank: idx + 1,
      userId: u._id,
      username: u.username,
      isOnline: u.isOnline || u.status === 'online',
      lastSeen: u.lastSeen,
      profilePicture: u.profilePicture,
      status: u.status
    }));

    // Put online users first
    ranked.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return new Date(b.lastSeen) - new Date(a.lastSeen);
    });

    ranked.forEach((u, idx) => { u.rank = idx + 1; });

    res.status(200).json({ success: true, ranking: ranked });
  } catch (error) {
    console.error('Online ranking error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Schedule message
// @route   POST /api/advanced/schedule-message
// @access  Public (no auth)
exports.scheduleMessage = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { conversationId, content, scheduledFor, messageType, mediaUrl } = req.body;

    // Message scheduling is stored against the authenticated device/user.

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!includesId(conversation.participants, currentUserId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ message: 'Scheduled time must be in the future' });
    }

    const message = await Message.create({
      conversationId,
      sender: currentUserId,
      content,
      messageType: messageType || 'text',
      mediaUrl: mediaUrl || '',
      isScheduled: true,
      scheduledFor: scheduledDate
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username profilePicture');

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error('Schedule message error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get scheduled messages
// @route   GET /api/advanced/scheduled-messages
// @access  Public (no auth)
exports.getScheduledMessages = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const messages = await Message.find({
      sender: currentUserId,
      isScheduled: true,
      scheduledFor: { $gt: new Date() }
    })
      .populate('conversationId')
      .sort({ scheduledFor: 1 });

    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('Get scheduled messages error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel scheduled message
// @route   DELETE /api/advanced/scheduled-messages/:id
// @access  Public (no auth)
exports.cancelScheduledMessage = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Message.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Scheduled message cancelled' });
  } catch (error) {
    console.error('Cancel scheduled message error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create status
// @route   POST /api/advanced/status
// @access  Public (no auth)
exports.createStatus = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const {
      type, content, mediaUrl, mediaType, caption, backgroundColor, textColor, font,
      privacy, collabUserId, collabUsername, excludedViewers, includedViewers,
      linkUrl, quizQuestion, quizOptions, quizCorrectAnswer, questionText,
      countdownDate, countdownTime, locationData, collageImages, timerSeconds,
      musicUrl, gifUrl, duration
    } = req.body;

    // Validate status type
    const validTypes = ['text', 'image', 'video', 'voice', 'audio', 'gif', 'link', 'music', 'quiz', 'question', 'countdown', 'location', 'collage', 'boomerang', 'livePhoto', 'dualCamera', 'timer'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid status type' });
    }

    // For media statuses, mediaUrl is required. gif/music may come as a URL
    // field (gifUrl/musicUrl) instead of an uploaded file.
    const mediaFileTypes = ['image', 'video', 'voice', 'audio', 'boomerang', 'livePhoto', 'dualCamera'];
    const resolvedMediaUrl = mediaUrl
      || (type === 'gif' ? gifUrl : '')
      || (type === 'music' ? musicUrl : '');

    if (mediaFileTypes.includes(type) && !resolvedMediaUrl) {
      return res.status(400).json({ message: 'Media URL is required for this status type' });
    }

    // Type-specific content requirements
    if (type === 'link' && !linkUrl) {
      return res.status(400).json({ message: 'Link URL is required for a link status' });
    }
    if (type === 'quiz' && !quizQuestion) {
      return res.status(400).json({ message: 'Quiz question is required for a quiz status' });
    }
    if (type === 'question' && !questionText) {
      return res.status(400).json({ message: 'Question text is required for a question status' });
    }
    if (type === 'countdown' && !countdownDate) {
      return res.status(400).json({ message: 'Countdown date is required for a countdown status' });
    }
    if (type === 'collage' && (!Array.isArray(collageImages) || collageImages.length === 0)) {
      return res.status(400).json({ message: 'At least one image is required for a collage status' });
    }

    // Set expiration to the user's configured status duration (default 24 hours)
    let statusHours = 24;
    let userDefaultPrivacy = 'contacts';
    try {
      const currentUser = await User.findById(currentUserId).select('statusFeaturesSettings settings');
      const configured = Number(currentUser?.statusFeaturesSettings?.statusDuration);
      if (Number.isFinite(configured) && configured >= 24 && configured <= 168) {
        statusHours = configured;
      }
      const savedPrivacy = currentUser?.settings?.privacy?.status;
      if (savedPrivacy && ['everyone', 'contacts', 'contacts_except', 'only_share_with', 'only_me', 'nobody'].includes(savedPrivacy)) {
        userDefaultPrivacy = savedPrivacy;
      }
    } catch (e) {
      // fall back to 24h default and contacts privacy
    }
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + statusHours);

    const status = await Status.create({
      user: currentUserId,
      userId: String(currentUserId),
      username: getCurrentUsername(req),
      type,
      content: content || caption || linkUrl || questionText || `${type} status`,
      mediaUrl: resolvedMediaUrl || '',
      mediaType: mediaType || (type === 'music' ? 'audio' : type),
      caption: caption || '',
      backgroundColor: backgroundColor || '#00a884',
      textColor: textColor || '#ffffff',
      font: font || 'sans-serif',
      privacy: privacy || userDefaultPrivacy,
      excludedViewers: Array.isArray(excludedViewers) ? excludedViewers : [],
      includedViewers: Array.isArray(includedViewers) ? includedViewers : [],
      collabUserId: collabUserId || '',
      collabUsername: collabUsername || '',
      linkUrl: linkUrl || '',
      quizQuestion: quizQuestion || '',
      quizOptions: Array.isArray(quizOptions) ? quizOptions : [],
      quizCorrectAnswer: quizCorrectAnswer || 0,
      questionText: questionText || '',
      countdownDate: countdownDate || '',
      countdownTime: countdownTime || '',
      locationData: normalizeLocationData(locationData),
      collageImages: Array.isArray(collageImages) ? collageImages : [],
      timerSeconds: timerSeconds || 5,
      duration: Number.isFinite(Number(duration)) ? Number(duration) : 0,
      expiresAt,
      views: [],
      viewsCount: 0
    });

    const io = req.app.get('io');
    if (io) {
      const statusObj = status.toObject ? status.toObject() : status;
      const onlineUsers = global.onlineUsers || new Map();

      if (status.privacy === 'everyone') {
        io.emit('status:created', statusObj);
      } else if (status.privacy !== 'only_me' && status.privacy !== 'nobody') {
        // contacts-only (the default): only push to the poster's own
        // contacts who are currently online, not the whole platform.
        const User = require('../models/User');
        const poster = await User.findById(currentUserId).select('contacts');
        (poster?.contacts || []).forEach((c) => {
          const contactUserId = c?.user ? String(c.user) : String(c);
          const sid = onlineUsers.get(contactUserId);
          if (sid) io.to(sid).emit('status:created', statusObj);
        });
      }
      // Always let the poster's own other sessions/devices see it immediately.
      const ownSid = onlineUsers.get(String(currentUserId));
      if (ownSid) io.to(ownSid).emit('status:created', statusObj);
    }

    res.status(201).json({ success: true, status });
  } catch (error) {
    console.error('Error creating status:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all statuses
// @route   GET /api/advanced/status
// @access  Public (no auth)
exports.getStatuses = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const User = require('../models/User');
    const { isEitherUserBlocked } = require('../utils/messageSendHelpers');

    const statuses = await Status.find({
      expiresAt: { $gt: new Date() }
    })
      .populate('views.user', 'username profilePicture')
      .sort({ createdAt: -1 });

    // FIX: this used to show every non-expired status to every registered
    // user (`privacy: 'everyone' or 'contacts'` both passed, and 'everyone'
    // was even the default for new statuses) — a real privacy leak, and the
    // opposite of WhatsApp, where a status only reaches people who have
    // your number saved as a contact unless you deliberately widen it.
    const filtered = [];
    for (const s of statuses) {
      const isOwn = String(s.userId || s.user) === String(currentUserId);
      if (!isOwn) {
        const posterId = s.userId || s.user;
        if (await isEitherUserBlocked(currentUserId, posterId)) continue;

        const statusPrivacy = s.privacy || 'contacts';
        if (statusPrivacy === 'only_me' || statusPrivacy === 'nobody') continue;

        // FEATURE ADD: real "hide status from..." / "share only with..."
        // support, matching WhatsApp's My Contacts Except.../Only Share
        // With... options - previously only everyone/contacts/only_me existed.
        if (statusPrivacy === 'only_share_with') {
          const isIncluded = (s.includedViewers || []).some((id) => String(id) === String(currentUserId));
          if (!isIncluded) continue;
        } else if (statusPrivacy !== 'everyone') {
          const poster = await User.findById(posterId).select('contacts');
          const posterContacts = poster?.contacts || [];
          const viewerIsContact = posterContacts.some((c) => {
            const contactUserId = c?.user ? String(c.user) : String(c);
            return contactUserId === String(currentUserId);
          });
          if (!viewerIsContact) continue;

          if (statusPrivacy === 'contacts_except') {
            const isExcluded = (s.excludedViewers || []).some((id) => String(id) === String(currentUserId));
            if (isExcluded) continue;
          }
        }
      }
      filtered.push(s);
    }

    res.status(200).json({ success: true, statuses: groupCollaborativeStories(filtered) });
  } catch (error) {
    console.error('Error fetching statuses:', error);
    res.status(500).json({ message: error.message });
  }
};

// Merge collaborative contributions into their parent story so the shared
// ring shows as one story with the owner + each contributor's items.
function groupCollaborativeStories(statuses) {
  const parents = [];
  const byParentId = new Map();
  const childrenByStory = new Map();

  for (const s of statuses) {
    if (s.storyId) {
      const key = String(s.storyId);
      if (!childrenByStory.has(key)) childrenByStory.set(key, []);
      childrenByStory.get(key).push(s);
    } else {
      const key = String(s._id || s.id);
      if (!byParentId.has(key)) byParentId.set(key, s);
      parents.push(s);
    }
  }

  const result = [];
  for (const parent of parents) {
    const plain = parent.toObject ? parent.toObject() : parent;
    const children = childrenByStory.get(String(parent._id || parent.id));
    if (children && children.length > 0) {
      plain._contributions = children.map((c) => (c.toObject ? c.toObject() : c));
      plain._collaboratorCount = plain._contributions.length;
    }
    result.push(plain);
  }
  return result;
}

// @desc    View status
// @route   POST /api/advanced/status/:id/view
// @access  Public (no auth)
exports.viewStatus = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const statusId = req.params.id;

    // Try to find by _id first, if that fails try by a custom field if needed
    let status;
    try {
      status = await Status.findById(statusId);
    } catch (err) {
      // If ObjectId cast fails, try finding by a different field if needed
      status = await Status.findOne({ _id: statusId });
    }

    if (!status) {
      return res.status(404).json({ message: 'Status not found or expired' });
    }

    if (status.expiresAt < new Date()) {
      return res.status(404).json({ message: 'Status has expired' });
    }

    if (status.privacy === 'only_me' && status.userId.toString() !== currentUserId) {
      return res.status(403).json({ message: 'You cannot view this status' });
    }

    const alreadyViewed = status.views.some(v => v.user?.toString() === currentUserId);
    const isOwner = status.userId.toString() === currentUserId;
    // FIX: previously the owner opening their own status counted as a "view"
    // (they'd show up in their own viewers list), and even for real viewers
    // there was no realtime push to the owner — the view only showed up once
    // the owner manually reopened the status and refetched. WhatsApp updates
    // the eye-icon count and viewers list live while the owner is looking at
    // their own status.
    if (!alreadyViewed && !isOwner) {
      const viewEntry = { user: currentUserId, viewedAt: new Date() };
      status.views.push(viewEntry);
      status.viewsCount = status.views.length;
      await status.save();

      try {
        const io = req.app.get('io');
        const onlineUsers = global.onlineUsers || new Map();
        const ownerSid = onlineUsers.get(String(status.userId));
        if (io && ownerSid) {
          const populatedStatus = await Status.findById(status._id).populate('views.user', 'username profilePicture');
          io.to(ownerSid).emit('status:viewed', {
            _id: status._id,
            views: populatedStatus.views,
            viewsCount: populatedStatus.viewsCount
          });
        }
      } catch (notifyErr) {
        console.error('Error pushing realtime status view:', notifyErr.message);
      }
    }

    const updatedStatus = await Status.findById(status._id);

    res.status(200).json({ success: true, status: updatedStatus });
  } catch (error) {
    console.error('Error viewing status:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get status viewers
// @route   GET /api/advanced/status/:id/viewers
// @access  Private
exports.getStatusDetails = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const status = await Status.findById(req.params.id)
      .populate('user', 'username profilePicture');

    if (!status) {
      return res.status(404).json({ message: 'Status not found or expired' });
    }

    const isOwn = String(status.userId || status.user) === String(currentUserId);
    if (!isOwn) {
      const statusPrivacy = status.privacy || 'contacts';
      if (statusPrivacy === 'only_me' || statusPrivacy === 'nobody') {
        return res.status(403).json({ message: 'You cannot view this status' });
      }
      const posterId = status.userId || status.user;
      if (await isEitherUserBlocked(currentUserId, posterId)) {
        return res.status(403).json({ message: 'You cannot view this status' });
      }
      if (statusPrivacy === 'only_share_with') {
        const isIncluded = (status.includedViewers || []).some((id) => String(id) === String(currentUserId));
        if (!isIncluded) {
          return res.status(403).json({ message: 'You cannot view this status' });
        }
      } else if (statusPrivacy !== 'everyone') {
        const poster = await User.findById(posterId).select('contacts');
        const posterContacts = poster?.contacts || [];
        const viewerIsContact = posterContacts.some((c) => {
          const contactUserId = c?.user ? String(c.user) : String(c);
          return contactUserId === String(currentUserId);
        });
        if (!viewerIsContact) {
          return res.status(403).json({ message: 'You cannot view this status' });
        }
        if (statusPrivacy === 'contacts_except') {
          const isExcluded = (status.excludedViewers || []).some((id) => String(id) === String(currentUserId));
          if (isExcluded) {
            return res.status(403).json({ message: 'You cannot view this status' });
          }
        }
      }
    }

    res.status(200).json({ success: true, status });
  } catch (error) {
    console.error('Error fetching status details:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get status replies
// @route   GET /api/advanced/status/:id/replies
// @access  Private
exports.getStatusReplies = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const status = await Status.findById(req.params.id).select('replies userId user');
    if (!status) {
      return res.status(404).json({ success: true, replies: [] });
    }
    const isOwn = String(status.userId || status.user) === String(currentUserId);
    if (!isOwn) {
      return res.status(403).json({ message: 'You can only view replies on your own statuses' });
    }
    res.status(200).json({ success: true, replies: status.replies || [] });
  } catch (error) {
    console.error('Error fetching status replies:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a single status's privacy
// @route   PATCH /api/advanced/status/:id/privacy
// @access  Private
exports.updateStatusPrivacy = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { privacy, excludedViewers, includedViewers } = req.body;

    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ message: 'Status not found or expired' });
    }

    const isOwn = String(status.userId || status.user) === String(currentUserId);
    if (!isOwn) {
      return res.status(403).json({ message: 'You can only update your own statuses' });
    }

    const allowed = ['everyone', 'contacts', 'contacts_except', 'only_share_with', 'only_me', 'nobody'];
    if (privacy && allowed.includes(privacy)) {
      status.privacy = privacy;
    }
    if (Array.isArray(excludedViewers)) status.excludedViewers = excludedViewers;
    if (Array.isArray(includedViewers)) status.includedViewers = includedViewers;
    await status.save();

    res.status(200).json({ success: true, status });
  } catch (error) {
    console.error('Error updating status privacy:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get status stats for the current user
// @route   GET /api/advanced/status/stats
// @access  Private
exports.getStatusStats = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const match = { userId: currentUserId };

    const [total, active, totalViews, totalReplies, expired] = await Promise.all([
      Status.countDocuments(match),
      Status.countDocuments({ ...match, expiresAt: { $gt: new Date() } }),
      Status.aggregate([
        { $match: match },
        { $group: { _id: null, views: { $sum: '$viewsCount' }, replies: { $sum: { $size: { $ifNull: ['$replies', []] } } } } }
      ]),
      Status.aggregate([{ $match: match }, { $group: { _id: null, replies: { $sum: { $size: { $ifNull: ['$replies', []] } } } } }]),
      Status.countDocuments({ ...match, expiresAt: { $lte: new Date() } })
    ]);

    const agg = totalViews[0] || { views: 0, replies: 0 };
    res.status(200).json({
      success: true,
      stats: {
        total,
        active,
        expired,
        totalViews: agg.views || 0,
        totalReplies: (totalReplies[0]?.replies || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching status stats:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get status viewers
// @route   GET /api/advanced/status/:id/viewers
// @access  Private
exports.getStatusViewers = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const statusId = req.params.id;

    const status = await Status.findById(statusId)
      .populate('views.user', 'username profilePicture')
      .populate('reactions.user', 'username profilePicture');

    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }

    const isOwn = String(status.userId || status.user) === String(currentUserId);
    if (!isOwn) {
      return res.status(403).json({ message: 'You can only view viewers on your own statuses' });
    }

    res.json({
      success: true,
      // Drop views/reactions whose author was deleted so the frontend never
      // crashes trying to read fields off a null populated user.
      viewers: (status.views || []).filter((v) => v.user),
      reactions: (status.reactions || []).filter((r) => r.user),
      viewCount: (status.views || []).filter((v) => v.user).length
    });
  } catch (error) {
    console.error('Error fetching status viewers:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload media for status
// @route   POST /api/advanced/status/upload
// @access  Public (no auth)
exports.uploadStatusMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Determine media type based on file mime type
    const mimeType = req.file.mimetype;
    let mediaType = 'image';
    
    if (mimeType.startsWith('video/')) {
      mediaType = 'video';
    } else if (mimeType.startsWith('audio/')) {
      mediaType = 'audio';
    }

    let fileUrl = `${getPublicBaseUrl(req)}/uploads/${req.file.filename}`;
    let publicId = req.file.filename;
    let storageProvider = 'local';
    let thumbnailUrl = null;

    if (isCloudinaryConfigured() && req.file.path) {
      const fileType = getFileType(req.file.originalname, req.file.mimetype) || mediaType;
      const uploadResult = await uploadToMediaStorage(req.file.path, fileType, {
        folder: 'genz-whatsapp/status'
      });

      fileUrl = uploadResult.url;
      publicId = uploadResult.publicId;
      storageProvider = uploadResult.storageProvider || 'cloudinary';
      thumbnailUrl = uploadResult.thumbnailUrl || null;
      fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(200).json({
      success: true,
      fileUrl,
      publicId,
      storageProvider,
      mediaType,
      originalName: req.file.originalname,
      size: req.file.size,
      thumbnailUrl
    });
  } catch (error) {
    console.error('Error uploading status media:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete status
// @route   DELETE /api/advanced/status/:id
// @access  Public (no auth)
exports.deleteStatus = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const status = await Status.findById(req.params.id);

    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }

    if (String(status.userId) !== currentUserId) {
      return res.status(403).json({ message: 'You can only delete your own status' });
    }

    await Status.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('status:deleted', {
        statusId: String(req.params.id),
        userId: String(currentUserId)
      });
    }

    res.status(200).json({ success: true, message: 'Status deleted successfully' });
  } catch (error) {
    console.error('Error deleting status:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reply to status
// @route   POST /api/advanced/status/:id/reply
// @access  Public (no auth)
exports.replyToStatus = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { content, type, mediaUrl } = req.body;
    const status = await Status.findById(req.params.id);

    if (!status) {
      return res.status(404).json({ message: 'Status not found or expired' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Reply content is required' });
    }

    // Add reply to status
    status.replies.push({
      userId: currentUserId,
      username: getCurrentUsername(req),
      content,
      type: type || 'text',
      mediaUrl: mediaUrl || '',
      createdAt: new Date()
    });

    await status.save();

    let conversation;

    if (req.body.conversationId) {
      conversation = await Conversation.findById(req.body.conversationId);
      if (!conversation || !includesId(conversation.participants, currentUserId)) {
        return res.status(403).json({ message: 'Not authorized for this conversation' });
      }
    } else if (String(status.userId) !== currentUserId) {
      const recipientId = String(status.userId);
      conversation = await Conversation.findOne({
        participants: { $all: [currentUserId, recipientId] },
        isGroup: false
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [currentUserId, recipientId],
          isGroup: false
        });
      }
    } else {
      return res.status(201).json({
        success: true,
        reply: status.replies[status.replies.length - 1]
      });
    }

    const quotedStatus = {
      statusId: status._id.toString(),
      ownerName: status.username || 'Status',
      preview: status.content || status.caption || 'Status',
      type: status.type || 'text',
      mediaUrl: status.mediaUrl || null
    };

    // FIX: quotedStatus used to be attached only to the in-memory
    // `outgoingMessage` object sent over the socket, never saved on the
    // Message document itself. The recipient would briefly see it rendered
    // as a reply to the status when the socket event arrived live, but the
    // moment the conversation was reloaded from the REST history endpoint
    // (app restart, scrollback, other device) that link was gone and the
    // reply showed up as a bare, disconnected text message. Saving it on
    // the message itself makes the "reply to status" quote permanent.
    const message = await Message.create({
      conversationId: conversation._id,
      sender: currentUserId,
      content: content,
      messageType: 'text',
      replyTo: null,
      quotedStatus
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username profilePicture');

    const outgoingMessage = {
      ...serializeOutgoingMessage(populatedMessage),
      quotedStatus
    };

    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    // FIX: a status reply created a real chat message but never touched the
    // conversation's per-participant unreadCount map (unlike normal messages
    // in chatController), so the reply landed silently — no unread badge, no
    // bold conversation row — making it indistinguishable from an already
    // read chat until the recipient happened to open it.
    const { getUnreadCount } = require('../utils/unreadCount');
    let updatedConversation = conversation;
    if (conversation.participants) {
      const incObject = {};
      conversation.participants.forEach((p) => {
        if (String(p) !== String(currentUserId)) {
          incObject[`unreadCount.${String(p)}`] = 1;
        }
      });
      if (Object.keys(incObject).length > 0) {
        updatedConversation = await Conversation.findByIdAndUpdate(
          conversation._id,
          { $inc: incObject },
          { new: true }
        );
      }
    }

    // Tuma socket event mara moja
    const io = req.app.get('io');
    if (io) {
      // Tuma kwa owner wa status
      if (status.userId) {
        io.to(String(status.userId)).emit('message:received', outgoingMessage);
        io.to(String(status.userId)).emit('conversation:unread-update', {
          conversationId: conversation._id,
          unreadCount: getUnreadCount(updatedConversation, String(status.userId))
        });
      }
      // Tuma kwenye conversation room
      io.to(String(conversation._id)).emit('message:received', outgoingMessage);
    }

    res.status(201).json({ 
      success: true, 
      message: outgoingMessage,
      reply: status.replies[status.replies.length - 1]
    });
  } catch (error) {
    console.error('Error replying to status:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like/Unlike status
// @route   POST /api/advanced/status/:id/like
// @access  Public (no auth)
exports.likeStatus = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const status = await Status.findById(req.params.id);

    if (!status) {
      return res.status(404).json({ message: 'Status not found or expired' });
    }

    const userIdToUse = currentUserId;
    const likeIndex = status.likes.findIndex(l => String(l.user) === String(userIdToUse));

    if (likeIndex > -1) {
      // Unlike
      status.likes.splice(likeIndex, 1);
    } else {
      // Like
      status.likes.push({ user: userIdToUse, likedAt: new Date() });
    }

    status.likesCount = status.likes.length;
    await status.save();

    res.status(200).json({ 
      success: true, 
      liked: likeIndex === -1,
      likesCount: status.likesCount
    });
  } catch (error) {
    console.error('Error liking status:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save/Unsave status
// @route   POST /api/advanced/status/:id/save
// @access  Public (no auth)
exports.saveStatus = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const status = await Status.findById(req.params.id);

    if (!status) {
      return res.status(404).json({ message: 'Status not found or expired' });
    }

    const userIdToUse = currentUserId;
    const saveIndex = status.saves.findIndex(s => String(s.user) === String(userIdToUse));

    if (saveIndex > -1) {
      // Unsave
      status.saves.splice(saveIndex, 1);
    } else {
      // Save
      status.saves.push({ user: userIdToUse, savedAt: new Date() });
    }

    status.savesCount = status.saves.length;
    await status.save();

    res.status(200).json({ 
      success: true, 
      saved: saveIndex === -1,
      savesCount: status.savesCount
    });
  } catch (error) {
    console.error('Error saving status:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Share status
// @route   POST /api/advanced/status/:id/share
// @access  Public (no auth)
exports.shareStatus = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const status = await Status.findById(req.params.id);

    if (!status) {
      return res.status(404).json({ message: 'Status not found or expired' });
    }

    const userIdToUse = currentUserId;
    
    // Add to shares (track who shared)
    if (!status.shares.some(s => String(s.sharedBy) === String(userIdToUse))) {
      status.shares.push({ sharedBy: userIdToUse, platform: 'status', sharedAt: new Date() });
    }
    status.shareCount = status.shares.length;
    await status.save();

    res.status(200).json({ 
      success: true, 
      sharesCount: status.shareCount,
      status
    });
  } catch (error) {
    console.error('Error sharing status:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reshare status
// @route   POST /api/advanced/status/:id/reshare
// @access  Public (no auth)
exports.reshareStatus = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const username = getCurrentUsername(req);
    const originalStatus = await Status.findById(req.params.id);

    if (!originalStatus) {
      return res.status(404).json({ message: 'Status not found or expired' });
    }

    // Create new status as reshare
    const resharedStatus = await Status.create({
      user: currentUserId,
      userId: String(currentUserId),
      username,
      type: originalStatus.type,
      content: originalStatus.content || originalStatus.caption || 'Reshared status',
      mediaUrl: originalStatus.mediaUrl,
      mediaType: originalStatus.mediaType,
      caption: `Reshared from ${originalStatus.username}`,
      backgroundColor: originalStatus.backgroundColor,
      textColor: originalStatus.textColor,
      font: originalStatus.font,
      privacy: 'everyone',
      reshares: [{
        userId: currentUserId,
        username,
        originalStatusId: originalStatus._id,
        resharedAt: new Date()
      }],
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date()
    });

    // Add to original status reshares
    originalStatus.reshares.push({
      userId: currentUserId,
      username,
      originalStatusId: originalStatus._id,
      resharedAt: new Date()
    });
    await originalStatus.save();

    res.status(201).json({ 
      success: true, 
      status: resharedStatus 
    });
  } catch (error) {
    console.error('Error resharng status:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create broadcast list
// @route   POST /api/advanced/broadcast
// @access  Public (no auth)
exports.createBroadcast = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { name, description = '' } = req.body;
    const recipients = normalizeBroadcastRecipients(req.body.recipients, currentUserId);

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Broadcast name is required' });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one recipient' });
    }

    if (recipients.length > 256) {
      return res.status(400).json({ success: false, message: 'Maximum 256 recipients allowed' });
    }

    const broadcast = await Broadcast.create({
      name: name.trim(),
      description: String(description || '').trim(),
      sender: getCurrentUsername(req),
      createdBy: currentUserId,
      recipients,
      message: 'Broadcast list created',
      status: 'active',
      createdAt: new Date()
    });

    const populatedBroadcast = await Broadcast.findById(broadcast._id);

    res.status(201).json({ success: true, broadcast: populatedBroadcast });
  } catch (error) {
    console.error('Error creating broadcast:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all broadcasts
// @route   GET /api/advanced/broadcast
// @access  Public (no auth)
exports.getBroadcasts = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const broadcasts = await Broadcast.find({ createdBy: currentUserId })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, broadcasts });
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update broadcast
// @route   PUT /api/advanced/broadcast/:id
// @access  Public (no auth)
exports.updateBroadcast = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { name, description, status } = req.body;
    const broadcast = await Broadcast.findById(req.params.id);

    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Broadcast not found' });
    }

    if (broadcast.createdBy.toString() !== currentUserId) {
      return res.status(403).json({ success: false, message: 'You can only update your own broadcast' });
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Broadcast name is required' });
      }
      broadcast.name = String(name).trim();
    }
    if (description !== undefined) broadcast.description = String(description || '').trim();
    if (status !== undefined && ['active', 'scheduled', 'inactive'].includes(status)) {
      broadcast.status = status;
    }
    if (req.body.recipients !== undefined) {
      const recipients = normalizeBroadcastRecipients(req.body.recipients, currentUserId);
      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: 'Select at least one recipient' });
      }
      if (recipients.length > 256) {
        return res.status(400).json({ success: false, message: 'Maximum 256 recipients allowed' });
      }
      broadcast.recipients = recipients;
    }

    await broadcast.save();

    const updatedBroadcast = await Broadcast.findById(broadcast._id);

    res.status(200).json({ success: true, broadcast: updatedBroadcast });
  } catch (error) {
    console.error('Error updating broadcast:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete broadcast
// @route   DELETE /api/advanced/broadcast/:id
// @access  Public (no auth)
exports.deleteBroadcast = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const broadcast = await Broadcast.findById(req.params.id);

    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Broadcast not found' });
    }

    if (broadcast.createdBy.toString() !== currentUserId) {
      return res.status(403).json({ success: false, message: 'You can only delete your own broadcast' });
    }

    await Broadcast.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Broadcast deleted successfully' });
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send broadcast message
// @route   POST /api/advanced/broadcast/:id/send
// @access  Public (no auth)
exports.sendBroadcastMessage = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { content, message, messageType, type, mediaUrl, fileName, fileSize, duration } = req.body;
    const textContent = String(content ?? message ?? '').trim();
    const broadcast = await Broadcast.findById(req.params.id);

    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Broadcast not found' });
    }

    if (broadcast.createdBy.toString() !== currentUserId) {
      return res.status(403).json({ success: false, message: 'You can only send messages to your own broadcast' });
    }

    if (!textContent) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const io = req.app.get('io');
    let messageCount = 0;
    let deliveryResults = [];

    for (const recipientId of broadcast.recipients) {
      try {
        // FIX: unlike regular sendMessage, broadcast delivery never checked
        // the block relationship — a user could message someone through a
        // Broadcast List even after that person blocked them, completely
        // bypassing the block feature.
        const blocked = await isEitherUserBlocked(currentUserId, recipientId);
        if (blocked) {
          deliveryResults.push({ recipientId, success: false, error: 'blocked' });
          continue;
        }

        let conversation = await Conversation.findOne({
          participants: { $all: [currentUserId, recipientId] },
          isGroup: false
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [currentUserId, recipientId],
            isGroup: false
          });
        }

        const message = await Message.create({
          conversationId: conversation._id,
          sender: currentUserId,
          content: textContent,
          messageType: messageType || type || 'text',
          mediaUrl: mediaUrl || '',
          fileName: fileName || '',
          fileSize: fileSize || 0,
          duration: duration || 0
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username profilePicture');

        conversation.lastMessage = message._id;
        conversation.updatedAt = new Date();
        await conversation.save();

        if (io) {
          io.to(recipientId).emit('newMessage', populatedMessage);
          io.to(conversation._id.toString()).emit('message:received', populatedMessage);
        }

        // FIX: broadcast sends never notified offline recipients — a message
        // could sit unseen indefinitely since only the live socket event was
        // emitted. Match regular sendMessage's push-notification behavior,
        // skipping anyone currently viewing this conversation.
        try {
          const mutedUntil = conversation?.mutedUntil?.get?.(String(recipientId));
          const isMuted = mutedUntil && new Date(mutedUntil) > new Date();
          const recipientSocketId = global.onlineUsers && global.onlineUsers.get(String(recipientId));
          const roomMembers = io?.sockets?.adapter?.rooms?.get(String(conversation._id));
          const isActivelyViewing = Boolean(
            recipientSocketId && roomMembers && roomMembers.has(recipientSocketId)
          );
          if (!isMuted && !isActivelyViewing) {
            await sendNewMessageNotification(recipientId, {
              senderName: populatedMessage?.sender?.username || 'GENZ',
              text: textContent,
              conversationId: conversation._id.toString(),
              senderId: currentUserId.toString(),
              type: messageType || type || 'text'
            });
          }
        } catch (_) { /* push notification is best-effort, never block delivery */ }

        messageCount++;
        deliveryResults.push({ recipientId, success: true });
      } catch (error) {
        console.error(`Error sending message to recipient ${recipientId}:`, error);
        deliveryResults.push({ recipientId, success: false, error: error.message });
      }
    }

    broadcast.message = textContent;
    broadcast.messageCount = (broadcast.messageCount || 0) + 1;
    broadcast.deliveredCount = (broadcast.deliveredCount || 0) + messageCount;
    broadcast.lastSent = new Date();
    broadcast.sentAt = broadcast.lastSent;
    await broadcast.save();

    res.status(200).json({
      success: true,
      message: `Broadcast sent to ${messageCount} recipients`,
      messageCount,
      deliveryResults
    });
  } catch (error) {
    console.error('Error sending broadcast message:', error);
    res.status(500).json({ message: error.message });
  }
};

const normalizeDisappearingMessages = ({ enabled, duration, timer } = {}) => {
  const raw = duration ?? timer ?? enabled;
  const text = String(raw ?? '').trim();
  if (!text || /^(false|off|none|0)$/i.test(text)) {
    return { enabled: false, duration: 'Off', timer: 0 };
  }

  if (/^\d+$/.test(text)) {
    const hours = Math.max(1, Number(text));
    return { enabled: true, duration: `${hours}h`, timer: hours };
  }

  const match = text.match(/^(\d+)\s*([hd])$/i);
  if (match) {
    const amount = Math.max(1, Number(match[1]));
    const unit = match[2].toLowerCase();
    return {
      enabled: true,
      duration: `${amount}${unit}`,
      timer: unit === 'd' ? amount * 24 : amount
    };
  }

  const hours = Number(timer) || 24;
  return { enabled: Boolean(enabled ?? true), duration: text || `${hours}h`, timer: hours };
};

// @desc    Set disappearing messages
// @route   PUT /api/advanced/conversations/:id/disappearing-messages
// @access  Public (no auth)
exports.setDisappearingMessages = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const settings = normalizeDisappearingMessages(req.body || {});
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!includesId(conversation.participants, currentUserId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    conversation.disappearingMessages = settings;
    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(conversation._id.toString()).emit('disappearing_messages:set', {
        chatId: conversation._id.toString(),
        disappearingMessages: conversation.disappearingMessages,
        ...conversation.disappearingMessages
      });
    }

    res.status(200).json({
      success: true,
      message: 'Disappearing messages settings updated',
      disappearingMessages: conversation.disappearingMessages
    });
  } catch (error) {
    console.error('Error setting disappearing messages:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search messages
// @route   GET /api/advanced/search-messages
// @access  Public (no auth)
exports.searchMessages = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { query, conversationId } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Escape regex special characters to prevent ReDoS and regex injection
    const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchFilter = {
      content: { $regex: escapedQuery, $options: 'i' },
      deletedFor: { $ne: currentUserId },
      deletedForEveryone: false
    };

    if (conversationId) {
      const conversation = await Conversation.findById(conversationId).select('participants');
      if (!conversation || !includesId(conversation.participants, currentUserId)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      searchFilter.conversationId = conversationId;
    } else {
      const conversations = await Conversation.find({
        participants: currentUserId
      }).select('_id');
      searchFilter.conversationId = { $in: conversations.map(c => c._id) };
    }

    const messages = await Message.find(searchFilter)
      .populate('sender', 'username profilePicture')
      .populate('conversationId')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, messages, count: messages.length });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get link preview metadata (Open Graph)
// @route   GET /api/advanced/link-preview?url=...
// @access  Public
exports.getLinkPreview = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ message: 'URL is required' });

    const parsedUrl = await assertSafeExternalUrl(url);

    // Fetch the HTML page
    const response = await axios.get(parsedUrl.toString(), {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GENZBot/1.0)' },
      maxRedirects: 0,
      maxContentLength: 500000 // 500KB max
    });

    const html = response.data || '';

    // Extract Open Graph meta tags using regex (no cheerio needed)
    const getMeta = (name) => {
      const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, 'i'));
      return match ? match[1] : null;
    };

    const getTitleFromHtml = () => {
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return match ? match[1].trim() : null;
    };

    const title = getMeta('og:title') || getMeta('twitter:title') || getTitleFromHtml() || parsedUrl.hostname;
    const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description') || '';
    const image = getMeta('og:image') || getMeta('twitter:image') || '';
    const siteName = getMeta('og:site_name') || parsedUrl.hostname;

    res.status(200).json({
      success: true,
      preview: { url, title, description, image, siteName, domain: parsedUrl.hostname }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    // Return a graceful failure with just the URL
    const { url } = req.query;
    let domain = url;
    try { domain = new URL(url).hostname; } catch {}
    res.status(200).json({
      success: true,
      preview: { url, title: domain, description: '', image: '', siteName: domain, domain }
    });
  }
};

// Curated GIFs (Giphy CDN) when API key is missing or Giphy fails — keeps picker functional
const STATIC_FALLBACK_GIFS = [
  { id: 'fb-wave', title: 'Wave', images: { fixed_height: { url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif' } } },
  { id: 'fb-thumbs', title: 'Thumbs up', images: { fixed_height: { url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' } } },
  { id: 'fb-lol', title: 'LOL', images: { fixed_height: { url: 'https://media.giphy.com/media/l0MYd5y1pUqEZilGE/giphy.gif' } } },
  { id: 'fb-party', title: 'Party', images: { fixed_height: { url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif' } } },
  { id: 'fb-love', title: 'Love', images: { fixed_height: { url: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif' } } },
  { id: 'fb-clap', title: 'Clap', images: { fixed_height: { url: 'https://media.giphy.com/media/Is1O1TWV0LEla/giphy.gif' } } },
  { id: 'fb-nice', title: 'Nice', images: { fixed_height: { url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' } } },
  { id: 'fb-cool', title: 'Cool', images: { fixed_height: { url: 'https://media.giphy.com/media/d2Z9QYzB2pQ5ieHQY/giphy.gif' } } }
];

const sliceFallback = (limit) => STATIC_FALLBACK_GIFS.slice(0, Math.min(Math.max(limit, 1), STATIC_FALLBACK_GIFS.length));

// @desc    Proxy Giphy search/trending (hides API key; stable fallback)
// @route   GET /api/advanced/gifs
// @access  Public
exports.getGifs = async (req, res) => {
  try {
    const type = (req.query.type || 'trending').toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const key = process.env.GIPHY_API_KEY;
    const mapItem = (g) => ({
      id: g.id,
      title: g.title || 'GIF',
      images: g.images || { fixed_height: { url: '' } }
    });

    if (!key) {
      return res.status(200).json({
        success: true,
        gifs: sliceFallback(limit),
        fallback: true,
        message: 'Set GIPHY_API_KEY in backend .env for full GIF search'
      });
    }

    let giphyUrl;
    if (type === 'search') {
      const q = (req.query.q || '').trim() || 'funny';
      giphyUrl = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&rating=g`;
    } else {
      giphyUrl = `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(key)}&limit=${limit}&offset=${offset}&rating=g`;
    }

    const { data } = await axios.get(giphyUrl, { timeout: 10000 });
    const list = (data && data.data) || [];
    if (!list.length) {
      return res.status(200).json({ success: true, gifs: sliceFallback(limit), fallback: true });
    }

    return res.status(200).json({
      success: true,
      gifs: list.map(mapItem),
      pagination: data.pagination,
      fallback: false
    });
  } catch (error) {
    console.error('Giphy proxy error:', error.message);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 50);
    return res.status(200).json({
      success: true,
      gifs: sliceFallback(limit),
      fallback: true
    });
  }
};

// @desc    AI Assistant - Process /ai command
// @route   POST /api/advanced/ai-assistant
// @access  Private
exports.aiAssistant = async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = getCurrentUserId(req);

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    // Remove /ai prefix if present
    const cleanPrompt = prompt.replace(/^\/ai\s*/i, '').trim();

    if (!cleanPrompt) {
      return res.status(400).json({ success: false, message: 'Please provide a question or command' });
    }

    // Simple AI response logic (can be enhanced with actual AI API)
    let response = '';
    const lowerPrompt = cleanPrompt.toLowerCase();

    // Basic pattern matching for common queries
    if (lowerPrompt.includes('help') || lowerPrompt.includes('assist')) {
      response = "I'm your GENZ AI Assistant! I can help you with:\n- General questions\n- Quick information\n- Chat tips\n\nTry asking me anything!";
    } else if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      response = "Hello! 👋 How can I help you today?";
    } else if (lowerPrompt.includes('time')) {
      response = `The current time is ${new Date().toLocaleString()}`;
    } else if (lowerPrompt.includes('date')) {
      response = `Today is ${new Date().toLocaleDateString()}`;
    } else if (lowerPrompt.includes('weather')) {
      response = "I don't have access to real-time weather data yet, but you can check your local weather app!";
    } else if (lowerPrompt.includes('joke')) {
      const jokes = [
        "Why don't scientists trust atoms? Because they make up everything! 😄",
        "I told my computer I needed a break, and now it won't stop sending me vacation ads. 🏖️",
        "Why did the developer go broke? Because he used up all his cache. 💰"
      ];
      response = jokes[Math.floor(Math.random() * jokes.length)];
    } else {
      response = "I received your message! For now, I'm a basic AI assistant. More advanced features coming soon! 🤖";
    }

    res.status(200).json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI Assistant error:', error);
    res.status(500).json({ success: false, message: 'AI Assistant failed' });
  }
};
