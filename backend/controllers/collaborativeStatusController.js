const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const defaultSettings = {
  collaborativeStatusEnabled: true,
  allowInvites: true,
  autoAccept: false,
  maxCollaborators: 2,
  requireApproval: true,
  notifyOnJoin: true,
  notifyOnLeave: true,
  allowRemix: true,
  creditCollaborators: true
};

const getUser = async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  return user;
};

const mergeSettings = (settings = {}) => ({
  ...defaultSettings,
  ...settings
});

// @desc    Get collaborative status settings
// @route   GET /api/collaborative-status/settings
// @access  Private
exports.getCollaborativeStatusSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.collaborativeStatusSettings?.toObject?.() || user.collaborativeStatusSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get collaborative status settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update collaborative status settings
// @route   POST /api/collaborative-status/settings
// @access  Private
exports.updateCollaborativeStatusSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.collaborativeStatusSettings?.toObject?.() || user.collaborativeStatusSettings || {};
    
    user.collaborativeStatusSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('collaborativeStatusSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.collaborativeStatusSettings });
  } catch (error) {
    console.error('Update collaborative status settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create collaborative status (duet)
// @route   POST /api/collaborative-status/create
// @access  Private
exports.createCollaborativeStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { originalStatusId, collaboratorIds, title, description } = req.body;

    if (!originalStatusId || !collaboratorIds || !Array.isArray(collaboratorIds)) {
      return res.status(400).json({ success: false, message: 'Original status ID and collaborator IDs are required' });
    }

    const settings = mergeSettings(user.collaborativeStatusSettings?.toObject?.() || user.collaborativeStatusSettings);
    
    if (!settings.collaborativeStatusEnabled) {
      return res.status(403).json({ success: false, message: 'Collaborative status is disabled' });
    }

    if (collaboratorIds.length > settings.maxCollaborators) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum ${settings.maxCollaborators} collaborators allowed` 
      });
    }

    // Verify original status exists and belongs to user
    const originalStatus = await Message.findById(originalStatusId);
    if (!originalStatus || originalStatus.sender.toString() !== user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Original status not found or not owned by you' });
    }

    // Verify collaborators exist
    const collaborators = await User.find({ _id: { $in: collaboratorIds } });
    if (collaborators.length !== collaboratorIds.length) {
      return res.status(400).json({ success: false, message: 'One or more collaborators not found' });
    }

    const collaborativeStatus = {
      _id: new (require('mongoose').Types.ObjectId)(),
      originalStatusId,
      ownerId: user._id,
      ownerName: user.username,
      collaboratorIds,
      collaboratorNames: collaborators.map(c => c.username),
      title: title || 'Collaborative Status',
      description: description || '',
      status: 'pending', // pending, active, completed
      approvals: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!user.collaborativeStatuses) user.collaborativeStatuses = [];
    user.collaborativeStatuses.push(collaborativeStatus);
    await user.save();

    // Send notifications to collaborators (mock)
    if (settings.notifyOnJoin) {
      collaborators.forEach(collab => {
        // Send notification to collaborator
        console.log(`Notification sent to ${collab.username} for collaborative status invitation`);
      });
    }

    res.status(200).json({ success: true, collaborativeStatus });
  } catch (error) {
    console.error('Create collaborative status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get collaborative statuses
// @route   GET /api/collaborative-status
// @access  Private
exports.getCollaborativeStatuses = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const statuses = user.collaborativeStatuses || [];
    
    // Also get statuses where user is a collaborator
    const collaboratorStatuses = await User.find({
      'collaborativeStatuses.collaboratorIds': user._id
    }).select('collaborativeStatuses username');

    const allStatuses = [...statuses];
    collaboratorStatuses.forEach(u => {
      u.collaborativeStatuses.forEach(cs => {
        if (cs.collaboratorIds.includes(user._id.toString())) {
          allStatuses.push({ ...cs.toObject(), isCollaborator: true, ownerName: u.username });
        }
      });
    });

    res.status(200).json({ success: true, statuses: allStatuses });
  } catch (error) {
    console.error('Get collaborative statuses error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single collaborative status
// @route   GET /api/collaborative-status/:id
// @access  Private
exports.getCollaborativeStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    // Check if user owns this status
    const status = (user.collaborativeStatuses || []).find(s => s._id.toString() === id);
    if (status) {
      return res.status(200).json({ success: true, status, isOwner: true });
    }

    // Check if user is a collaborator
    const ownerUser = await User.findOne({ 'collaborativeStatuses._id': id });
    if (ownerUser) {
      const collabStatus = ownerUser.collaborativeStatuses.find(s => s._id.toString() === id);
      if (collabStatus && collabStatus.collaboratorIds.includes(user._id.toString())) {
        return res.status(200).json({ success: true, status: collabStatus, isOwner: false });
      }
    }

    return res.status(404).json({ success: false, message: 'Collaborative status not found' });
  } catch (error) {
    console.error('Get collaborative status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Accept collaborative status invitation
// @route   POST /api/collaborative-status/:id/accept
// @access  Private
exports.acceptCollaborativeStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const ownerUser = await User.findOne({ 'collaborativeStatuses._id': id });
    if (!ownerUser) {
      return res.status(404).json({ success: false, message: 'Collaborative status not found' });
    }

    const status = ownerUser.collaborativeStatuses.find(s => s._id.toString() === id);
    if (!status || !status.collaboratorIds.includes(user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Not authorized for this status' });
    }

    if (!status.approvals) status.approvals = [];
    if (status.approvals.includes(user._id.toString())) {
      return res.status(400).json({ success: false, message: 'Already accepted' });
    }

    status.approvals.push(user._id.toString());
    status.updatedAt = new Date();

    // Check if all collaborators have approved
    const settings = mergeSettings(ownerUser.collaborativeStatusSettings?.toObject?.() || ownerUser.collaborativeStatusSettings);
    if (status.approvals.length >= status.collaboratorIds.length) {
      status.status = 'active';
    }

    await ownerUser.save();

    res.status(200).json({ success: true, status });
  } catch (error) {
    console.error('Accept collaborative status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Decline collaborative status invitation
// @route   POST /api/collaborative-status/:id/decline
// @access  Private
exports.declineCollaborativeStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const ownerUser = await User.findOne({ 'collaborativeStatuses._id': id });
    if (!ownerUser) {
      return res.status(404).json({ success: false, message: 'Collaborative status not found' });
    }

    const status = ownerUser.collaborativeStatuses.find(s => s._id.toString() === id);
    if (!status || !status.collaboratorIds.includes(user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Not authorized for this status' });
    }

    // Remove user from collaborators
    status.collaboratorIds = status.collaboratorIds.filter(id => id !== user._id.toString());
    status.collaboratorNames = status.collaboratorNames.filter(name => name !== user.username);
    status.updatedAt = new Date();

    await ownerUser.save();

    res.status(200).json({ success: true, message: 'Invitation declined' });
  } catch (error) {
    console.error('Decline collaborative status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update collaborative status
// @route   POST /api/collaborative-status/:id
// @access  Private
exports.updateCollaborativeStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const { title, description, status: newStatus } = req.body;

    const statuses = user.collaborativeStatuses || [];
    const index = statuses.findIndex(s => s._id.toString() === id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Collaborative status not found' });
    }

    statuses[index].title = title || statuses[index].title;
    statuses[index].description = description !== undefined ? description : statuses[index].description;
    statuses[index].status = newStatus || statuses[index].status;
    statuses[index].updatedAt = new Date();

    user.collaborativeStatuses = statuses;
    await user.save();

    res.status(200).json({ success: true, status: statuses[index] });
  } catch (error) {
    console.error('Update collaborative status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete collaborative status
// @route   DELETE /api/collaborative-status/:id
// @access  Private
exports.deleteCollaborativeStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const statuses = user.collaborativeStatuses || [];
    const index = statuses.findIndex(s => s._id.toString() === id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Collaborative status not found' });
    }

    statuses.splice(index, 1);
    user.collaborativeStatuses = statuses;
    await user.save();

    res.status(200).json({ success: true, message: 'Collaborative status deleted' });
  } catch (error) {
    console.error('Delete collaborative status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle collaborative status
// @route   POST /api/collaborative-status/toggle
// @access  Private
exports.toggleCollaborativeStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.collaborativeStatusSettings?.toObject?.() || user.collaborativeStatusSettings || {};
    
    user.collaborativeStatusSettings = mergeSettings({
      ...existing,
      collaborativeStatusEnabled: enabled !== undefined ? enabled : !existing.collaborativeStatusEnabled
    });
    user.markModified('collaborativeStatusSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.collaborativeStatusSettings });
  } catch (error) {
    console.error('Toggle collaborative status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset collaborative status settings to default
// @route   POST /api/collaborative-status/reset
// @access  Private
exports.resetCollaborativeStatusSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.collaborativeStatusSettings = mergeSettings({});
    user.markModified('collaborativeStatusSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.collaborativeStatusSettings });
  } catch (error) {
    console.error('Reset collaborative status settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
