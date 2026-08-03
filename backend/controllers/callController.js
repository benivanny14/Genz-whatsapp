const CallLog = require('../models/CallLog');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

const formatCallLog = (log, currentUserId) => {
  const isOutgoing = log.callerId?._id?.toString() === currentUserId || log.callerId?.toString() === currentUserId;
  const otherUser = isOutgoing ? log.calleeId : log.callerId;
  const missed = log.status === 'missed' || log.status === 'rejected';

  return {
    _id: log._id,
    type: isOutgoing ? 'outgoing' : 'incoming',
    callType: log.callType,
    callerName: otherUser?.username || log.conversationId?.name || 'Unknown',
    callerId: otherUser?._id,
    conversationId: log.conversationId?._id || log.conversationId,
    duration: log.duration || 0,
    timestamp: (log.endedAt || log.startedAt || log.createdAt)?.toISOString(),
    missed,
    isGroup: log.isGroup,
    status: log.status
  };
};

exports.getCallLogs = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    const logs = await CallLog.find({
      $or: [
        { callerId: userId },
        { calleeId: userId },
        { participants: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('callerId', 'username profilePicture')
      .populate('calleeId', 'username profilePicture')
      .populate('conversationId', 'name isGroup');

    res.json({
      success: true,
      callLogs: logs.map((log) => formatCallLog(log, userId.toString()))
    });
  } catch (error) {
    console.error('getCallLogs error:', error);
    res.status(500).json({ success: false, message: 'Failed to load call history' });
  }
};

exports.createCallLog = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const {
      conversationId,
      calleeId,
      callType = 'voice',
      direction = 'outgoing',
      status = 'completed',
      duration = 0,
      startedAt,
      endedAt
    } = req.body;

    const log = await CallLog.create({
      conversationId: conversationId || undefined,
      callerId: direction === 'outgoing' ? userId : (calleeId || userId),
      calleeId: direction === 'incoming' ? userId : calleeId,
      participants: [userId, calleeId].filter(Boolean),
      callType,
      direction,
      status,
      duration,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      endedAt: endedAt ? new Date(endedAt) : new Date(),
      isGroup: false
    });

    const populated = await CallLog.findById(log._id)
      .populate('callerId', 'username profilePicture')
      .populate('calleeId', 'username profilePicture')
      .populate('conversationId', 'name isGroup');

    res.status(201).json({
      success: true,
      callLog: formatCallLog(populated, userId.toString())
    });
  } catch (error) {
    console.error('createCallLog error:', error);
    res.status(500).json({ success: false, message: 'Failed to save call log' });
  }
};

exports.deleteCallLog = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const log = await CallLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ success: false, message: 'Call log not found' });
    }

    const involved = [log.callerId?.toString(), log.calleeId?.toString(), ...(log.participants || []).map((p) => p.toString())];
    if (!involved.includes(userId.toString())) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await log.deleteOne();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete call log' });
  }
};

exports.clearCallLogs = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    await CallLog.deleteMany({
      $or: [{ callerId: userId }, { calleeId: userId }, { participants: userId }]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clear call history' });
  }
};

/** Helper used by socket layer */
exports.persistCallFromSocket = async ({
  callerId,
  calleeId,
  conversationId,
  callType = 'voice',
  status = 'completed',
  duration = 0,
  startedAt,
  isGroup = false
}) => {
  if (!callerId) return null;

  let resolvedCallee = calleeId;
  if (!resolvedCallee && conversationId) {
    const conv = await Conversation.findById(conversationId).select('participants isGroup name');
    if (conv && !conv.isGroup) {
      resolvedCallee = conv.participants.find((p) => p.toString() !== callerId.toString());
    }
  }

  const log = await CallLog.create({
    conversationId: conversationId || undefined,
    callerId,
    calleeId: resolvedCallee,
    participants: [callerId, resolvedCallee].filter(Boolean),
    callType,
    direction: 'outgoing',
    status,
    duration,
    startedAt: startedAt || new Date(),
    endedAt: new Date(),
    isGroup
  });

  const populated = await CallLog.findById(log._id)
    .populate('callerId', 'username profilePicture')
    .populate('calleeId', 'username profilePicture')
    .populate('conversationId', 'name isGroup');

  const formatForUser = (userId) => formatCallLog(populated, userId.toString());
  return { log: populated, formatForUser };
};

// ── Call Link (Shareable link to join group/video call) ──

// @desc    Generate a shareable call link for a group or individual call
// @route   POST /api/calls/link
// @access  Private
exports.generateCallLink = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { conversationId, callType = 'video', isGroup = false, expiresInHours = 24 } = req.body;

    const crypto = require('crypto');
    const linkToken = crypto.randomBytes(16).toString('hex');

    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const callLink = {
      token: linkToken,
      creatorId: userId,
      conversationId: conversationId || undefined,
      callType,
      isGroup,
      expiresAt,
      createdAt: new Date()
    };

    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.callLinkSettings = user.callLinkSettings || { links: [] };
    user.callLinkSettings.links.push(callLink);
    await user.save();

    const { resolvePublicBaseUrl } = require('../utils/publicBaseUrl');
    const baseUrl = resolvePublicBaseUrl(req);

    res.json({
      success: true,
      callLink: {
        token: linkToken,
        url: `${baseUrl}/join-call/${linkToken}`,
        callType,
        isGroup,
        expiresAt,
        creatorId: userId
      }
    });
  } catch (error) {
    console.error('generateCallLink error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate call link' });
  }
};

// @desc    Get call link info by token (public endpoint - for joining)
// @route   GET /api/calls/link/:token
// @access  Public
exports.getCallLink = async (req, res) => {
  try {
    const { token } = req.params;

    const User = require('../models/User');
    const users = await User.find({ 'callLinkSettings.links.token': token });
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'Call link not found or expired' });
    }

    let foundLink = null;
    let foundUser = null;
    for (const user of users) {
      const link = user.callLinkSettings.links.find(l => l.token === token);
      if (link) {
        foundLink = link;
        foundUser = user;
        break;
      }
    }

    if (!foundLink) {
      return res.status(404).json({ success: false, message: 'Call link not found' });
    }

    if (new Date() > new Date(foundLink.expiresAt)) {
      return res.status(410).json({ success: false, message: 'Call link has expired' });
    }

    const Conversation = require('../models/Conversation');
    let conversation = null;
    if (foundLink.conversationId) {
      conversation = await Conversation.findById(foundLink.conversationId)
        .select('name isGroup participants')
        .populate('participants', 'username profilePicture isOnline');
    }

    const creator = {
      _id: foundUser._id,
      username: foundUser.username,
      profilePicture: foundUser.profilePicture
    };

    res.json({
      success: true,
      callLink: {
        token,
        callType: foundLink.callType,
        isGroup: foundLink.isGroup,
        expiresAt: foundLink.expiresAt,
        creator,
        conversation
      }
    });
  } catch (error) {
    console.error('getCallLink error:', error);
    res.status(500).json({ success: false, message: 'Failed to get call link' });
  }
};

// @desc    Get all active call links for the current user
// @route   GET /api/calls/links
// @access  Private
exports.getCallLinks = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const User = require('../models/User');
    const user = await User.findById(userId).select('callLinkSettings');

    const links = (user?.callLinkSettings?.links || [])
      .filter(l => new Date(l.expiresAt) > new Date())
      .map(l => ({
        token: l.token,
        url: `/join-call/${l.token}`,
        callType: l.callType,
        isGroup: l.isGroup,
        expiresAt: l.expiresAt,
        createdAt: l.createdAt
      }));

    res.json({
      success: true,
      callLinks: links
    });
  } catch (error) {
    console.error('getCallLinks error:', error);
    res.status(500).json({ success: false, message: 'Failed to load call links' });
  }
};

// @desc    Delete (invalidate) a call link
// @route   DELETE /api/calls/link/:token
// @access  Private
exports.deleteCallLink = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user._id || req.user.id;
    const User = require('../models/User');
    const user = await User.findById(userId);

    const initialLength = user.callLinkSettings?.links?.length || 0;
    user.callLinkSettings.links = (user.callLinkSettings.links || [])
      .filter(l => l.token !== token);

    if (user.callLinkSettings.links.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Call link not found' });
    }

    await user.save();
    res.json({ success: true, message: 'Call link deleted' });
  } catch (error) {
    console.error('deleteCallLink error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete call link' });
  }
};
