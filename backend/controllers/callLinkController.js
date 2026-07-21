const CallLink = require('../models/CallLink');
const User = require('../models/User');

// POST /api/calls/link  { conversationId?, callType }
exports.createCallLink = async (req, res) => {
  try {
    const { conversationId = null, callType = 'voice' } = req.body || {};

    const link = await CallLink.create({
      createdBy: req.user._id,
      conversationId,
      callType: callType === 'video' ? 'video' : 'voice',
      participants: [req.user._id]
    });

    const shareUrl = `${process.env.FRONTEND_URL || ''}/call/join/${link.token}`.replace(/^\/\//, '/');

    res.status(201).json({
      success: true,
      link: {
        token: link.token,
        callType: link.callType,
        conversationId: link.conversationId,
        expiresAt: link.expiresAt,
        shareUrl
      }
    });
  } catch (error) {
    console.error('createCallLink error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/calls/link/:token — resolve a link before joining (no auth requirement leak of PII)
exports.resolveCallLink = async (req, res) => {
  try {
    const link = await CallLink.findOne({ token: req.params.token, active: true })
      .populate('createdBy', 'name username profilePicture');

    if (!link || link.expiresAt < new Date()) {
      return res.status(404).json({ success: false, message: 'Call link haipo tena au imeisha muda' });
    }

    res.status(200).json({
      success: true,
      link: {
        token: link.token,
        callType: link.callType,
        conversationId: link.conversationId,
        createdBy: link.createdBy,
        participantCount: link.participants.length,
        expiresAt: link.expiresAt
      }
    });
  } catch (error) {
    console.error('resolveCallLink error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/calls/link/:token/join — authenticated user joins, returns info the client
// needs to start the WebRTC session (existing call socket flow takes it from here).
exports.joinCallLink = async (req, res) => {
  try {
    const link = await CallLink.findOne({ token: req.params.token, active: true });

    if (!link || link.expiresAt < new Date()) {
      return res.status(404).json({ success: false, message: 'Call link haipo tena au imeisha muda' });
    }

    if (!link.participants.some(p => p.toString() === req.user._id.toString())) {
      link.participants.push(req.user._id);
      await link.save();
    }

    const user = await User.findById(req.user._id).select('name username profilePicture');

    res.status(200).json({
      success: true,
      token: link.token,
      callType: link.callType,
      conversationId: link.conversationId,
      joinedAs: user
    });
  } catch (error) {
    console.error('joinCallLink error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/calls/link/:token — creator can revoke early
exports.revokeCallLink = async (req, res) => {
  try {
    const link = await CallLink.findOne({ token: req.params.token });
    if (!link) return res.status(404).json({ success: false, message: 'Not found' });
    if (link.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Huna ruhusa ya kufuta link hii' });
    }
    link.active = false;
    await link.save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('revokeCallLink error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
