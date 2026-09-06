const StatusHighlight = require('../models/StatusHighlight');
const Status = require('../models/Status');

// @desc    Create a status highlight
// @route   POST /api/status-highlights
// @access  Private
exports.createHighlight = async (req, res) => {
  try {
    const { title, statusIds, color, icon } = req.body;
    const userId = req.user._id;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    if (!Array.isArray(statusIds) || statusIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one status is required' });
    }

    // Verify all statuses belong to the user
    const statuses = await Status.find({ _id: { $in: statusIds }, userId });
    if (statuses.length !== statusIds.length) {
      return res.status(400).json({ success: false, message: 'Some statuses do not belong to you' });
    }

    const coverStatusId = statusIds[0];

    const highlight = await StatusHighlight.create({
      userId,
      title: title.trim(),
      coverStatusId,
      statusIds,
      color: color || '#00a884',
      icon: icon || ''
    });

    const populated = await StatusHighlight.findById(highlight._id)
      .populate('coverStatusId')
      .populate('statusIds');

    res.status(201).json({ success: true, highlight: populated });
  } catch (error) {
    console.error('Create highlight error:', error);
    res.status(500).json({ success: false, message: 'Failed to create highlight' });
  }
};

// @desc    Get all highlights for a user
// @route   GET /api/status-highlights
// @access  Private
exports.getHighlights = async (req, res) => {
  try {
    const userId = req.user._id;
    const highlights = await StatusHighlight.find({ userId, isArchived: false })
      .populate('coverStatusId')
      .populate('statusIds')
      .sort({ createdAt: -1 });

    res.json({ success: true, highlights });
  } catch (error) {
    console.error('Get highlights error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch highlights' });
  }
};

// @desc    Get a single highlight
// @route   GET /api/status-highlights/:id
// @access  Private
exports.getHighlight = async (req, res) => {
  try {
    const highlight = await StatusHighlight.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('coverStatusId')
      .populate('statusIds');

    if (!highlight) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    res.json({ success: true, highlight });
  } catch (error) {
    console.error('Get highlight error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch highlight' });
  }
};

// @desc    Update a highlight
// @route   PUT /api/status-highlights/:id
// @access  Private
exports.updateHighlight = async (req, res) => {
  try {
    const { title, statusIds, color, icon, coverStatusId } = req.body;
    const userId = req.user._id;

    const highlight = await StatusHighlight.findOne({
      _id: req.params.id,
      userId
    });

    if (!highlight) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    if (statusIds && Array.isArray(statusIds)) {
      // Verify all statuses belong to the user
      const statuses = await Status.find({ _id: { $in: statusIds }, userId });
      if (statuses.length !== statusIds.length) {
        return res.status(400).json({ success: false, message: 'Some statuses do not belong to you' });
      }
      highlight.statusIds = statusIds;
    }

    if (title) highlight.title = title.trim();
    if (color) highlight.color = color;
    if (icon !== undefined) highlight.icon = icon;
    if (coverStatusId) highlight.coverStatusId = coverStatusId;

    await highlight.save();

    const populated = await StatusHighlight.findById(highlight._id)
      .populate('coverStatusId')
      .populate('statusIds');

    res.json({ success: true, highlight: populated });
  } catch (error) {
    console.error('Update highlight error:', error);
    res.status(500).json({ success: false, message: 'Failed to update highlight' });
  }
};

// @desc    Delete a highlight
// @route   DELETE /api/status-highlights/:id
// @access  Private
exports.deleteHighlight = async (req, res) => {
  try {
    const highlight = await StatusHighlight.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!highlight) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    res.json({ success: true, message: 'Highlight deleted' });
  } catch (error) {
    console.error('Delete highlight error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete highlight' });
  }
};

// @desc    Archive a highlight
// @route   PUT /api/status-highlights/:id/archive
// @access  Private
exports.archiveHighlight = async (req, res) => {
  try {
    const highlight = await StatusHighlight.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!highlight) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    highlight.isArchived = true;
    await highlight.save();

    res.json({ success: true, message: 'Highlight archived' });
  } catch (error) {
    console.error('Archive highlight error:', error);
    res.status(500).json({ success: false, message: 'Failed to archive highlight' });
  }
};

// @desc    Unarchive a highlight
// @route   PUT /api/status-highlights/:id/unarchive
// @access  Private
exports.unarchiveHighlight = async (req, res) => {
  try {
    const highlight = await StatusHighlight.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!highlight) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    highlight.isArchived = false;
    await highlight.save();

    res.json({ success: true, message: 'Highlight unarchived' });
  } catch (error) {
    console.error('Unarchive highlight error:', error);
    res.status(500).json({ success: false, message: 'Failed to unarchive highlight' });
  }
};

// @desc    Add status to highlight
// @route   POST /api/status-highlights/:id/statuses
// @access  Private
exports.addStatusToHighlight = async (req, res) => {
  try {
    const { statusIds } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(statusIds) || statusIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Status IDs are required' });
    }

    const highlight = await StatusHighlight.findOne({
      _id: req.params.id,
      userId
    });

    if (!highlight) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    // Verify all statuses belong to the user
    const statuses = await Status.find({ _id: { $in: statusIds }, userId });
    if (statuses.length !== statusIds.length) {
      return res.status(400).json({ success: false, message: 'Some statuses do not belong to you' });
    }

    // Add new status IDs without duplicates
    const existingIds = highlight.statusIds.map(id => String(id));
    const newIds = statusIds.filter(id => !existingIds.includes(String(id)));
    highlight.statusIds.push(...newIds);

    await highlight.save();

    const populated = await StatusHighlight.findById(highlight._id)
      .populate('coverStatusId')
      .populate('statusIds');

    res.json({ success: true, highlight: populated });
  } catch (error) {
    console.error('Add status to highlight error:', error);
    res.status(500).json({ success: false, message: 'Failed to add status to highlight' });
  }
};

// @desc    Remove status from highlight
// @route   DELETE /api/status-highlights/:id/statuses/:statusId
// @access  Private
exports.removeStatusFromHighlight = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user._id;

    const highlight = await StatusHighlight.findOne({
      _id: req.params.id,
      userId
    });

    if (!highlight) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    highlight.statusIds = highlight.statusIds.filter(id => String(id) !== statusId);

    // Update cover if removed status was the cover
    if (String(highlight.coverStatusId) === statusId && highlight.statusIds.length > 0) {
      highlight.coverStatusId = highlight.statusIds[0];
    }

    await highlight.save();

    const populated = await StatusHighlight.findById(highlight._id)
      .populate('coverStatusId')
      .populate('statusIds');

    res.json({ success: true, highlight: populated });
  } catch (error) {
    console.error('Remove status from highlight error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove status from highlight' });
  }
};
