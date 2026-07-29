const Conversation = require('../models/Conversation');
const crypto = require('crypto');

// @desc    Generate group invite link
// @route   POST /api/groups/:groupId/invite-link
// @access  Private
exports.generateInviteLink = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is admin
    if (!conversation.admins.includes(userId.toString())) {
      return res.status(403).json({ success: false, message: 'Only admins can generate invite links' });
    }

    // Generate unique invite code
    const inviteCode = crypto.randomBytes(16).toString('hex');
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${inviteCode}`;

    // Save invite link to conversation
    conversation.inviteLink = {
      code: inviteCode,
      url: inviteLink,
      createdBy: userId,
      createdAt: new Date(),
      expiresAt: req.body.expiresAt || null, // Optional expiration
      maxUses: req.body.maxUses || null, // Optional max uses
      uses: 0
    };

    await conversation.save();

    res.json({
      success: true,
      inviteLink: conversation.inviteLink
    });
  } catch (error) {
    console.error('Generate invite link error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get group invite link
// @route   GET /api/groups/:groupId/invite-link
// @access  Private
exports.getInviteLink = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is member
    if (!conversation.participants.includes(userId.toString())) {
      return res.status(403).json({ success: false, message: 'Not a group member' });
    }

    res.json({
      success: true,
      inviteLink: conversation.inviteLink
    });
  } catch (error) {
    console.error('Get invite link error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Revoke group invite link
// @route   DELETE /api/groups/:groupId/invite-link
// @access  Private
exports.revokeInviteLink = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is admin
    if (!conversation.admins.includes(userId.toString())) {
      return res.status(403).json({ success: false, message: 'Only admins can revoke invite links' });
    }

    conversation.inviteLink = null;
    await conversation.save();

    res.json({
      success: true,
      message: 'Invite link revoked successfully'
    });
  } catch (error) {
    console.error('Revoke invite link error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Join group via invite link
// @route   POST /api/groups/join/:inviteCode
// @access  Private
exports.joinViaInviteLink = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user._id;

    // Find conversation with this invite code
    const conversation = await Conversation.findOne({
      'inviteLink.code': inviteCode,
      isGroup: true
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Invalid or expired invite link' });
    }

    // Check if invite link is expired
    if (conversation.inviteLink.expiresAt && new Date() > conversation.inviteLink.expiresAt) {
      return res.status(400).json({ success: false, message: 'Invite link has expired' });
    }

    // Check if max uses reached
    if (conversation.inviteLink.maxUses && conversation.inviteLink.uses >= conversation.inviteLink.maxUses) {
      return res.status(400).json({ success: false, message: 'Invite link has reached maximum uses' });
    }

    // Check if user is already a member
    if (conversation.participants.includes(userId.toString())) {
      return res.status(400).json({ success: false, message: 'You are already a member of this group' });
    }

    // Check if group requires approval
    if (conversation.inviteApprovalRequired) {
      // Add to pending requests
      if (!conversation.joinRequests) conversation.joinRequests = [];
      conversation.joinRequests.push({
        userId,
        requestedAt: new Date()
      });
      await conversation.save();

      return res.json({
        success: true,
        message: 'Join request sent for approval',
        requiresApproval: true
      });
    }

    // Add user to group
    conversation.participants.push(userId);
    conversation.inviteLink.uses = (conversation.inviteLink.uses || 0) + 1;
    await conversation.save();

    res.json({
      success: true,
      message: 'Successfully joined the group',
      conversationId: conversation._id
    });
  } catch (error) {
    console.error('Join via invite link error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset invite link (generate new one)
// @route   POST /api/groups/:groupId/invite-link/reset
// @access  Private
exports.resetInviteLink = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is admin
    if (!conversation.admins.includes(userId.toString())) {
      return res.status(403).json({ success: false, message: 'Only admins can reset invite links' });
    }

    // Generate new invite code
    const inviteCode = crypto.randomBytes(16).toString('hex');
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${inviteCode}`;

    conversation.inviteLink = {
      code: inviteCode,
      url: inviteLink,
      createdBy: userId,
      createdAt: new Date(),
      expiresAt: req.body.expiresAt || null,
      maxUses: req.body.maxUses || null,
      uses: 0
    };

    await conversation.save();

    res.json({
      success: true,
      inviteLink: conversation.inviteLink,
      message: 'Invite link reset successfully'
    });
  } catch (error) {
    console.error('Reset invite link error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
