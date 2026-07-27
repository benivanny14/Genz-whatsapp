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
