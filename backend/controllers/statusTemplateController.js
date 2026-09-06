const StatusTemplate = require('../models/StatusTemplate');

// @desc    Create a status template
// @route   POST /api/status-templates
// @access  Private
exports.createTemplate = async (req, res) => {
  try {
    const { name, type, textConfig, mediaConfig, stickers, drawings, isPublic } = req.body;
    const userId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Template name is required' });
    }

    const template = await StatusTemplate.create({
      userId,
      name: name.trim(),
      type: type || 'text',
      textConfig: textConfig || {},
      mediaConfig: mediaConfig || {},
      stickers: stickers || [],
      drawings: drawings || [],
      isPublic: isPublic || false
    });

    res.status(201).json({ success: true, template });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ success: false, message: 'Failed to create template' });
  }
};

// @desc    Get all templates for a user
// @route   GET /api/status-templates
// @access  Private
exports.getTemplates = async (req, res) => {
  try {
    const userId = req.user._id;
    const { includePublic } = req.query;

    const query = { userId };
    if (includePublic === 'true') {
      query.$or = [
        { userId },
        { isPublic: true }
      ];
    }

    const templates = await StatusTemplate.find(query)
      .sort({ isDefault: -1, usageCount: -1, createdAt: -1 });

    res.json({ success: true, templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
};

// @desc    Get a single template
// @route   GET /api/status-templates/:id
// @access  Private
exports.getTemplate = async (req, res) => {
  try {
    const template = await StatusTemplate.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user._id },
        { isPublic: true }
      ]
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Increment usage count
    await StatusTemplate.findByIdAndUpdate(template._id, { $inc: { usageCount: 1 } });

    res.json({ success: true, template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch template' });
  }
};

// @desc    Update a template
// @route   PUT /api/status-templates/:id
// @access  Private
exports.updateTemplate = async (req, res) => {
  try {
    const { name, type, textConfig, mediaConfig, stickers, drawings, isPublic } = req.body;
    const userId = req.user._id;

    const template = await StatusTemplate.findOne({
      _id: req.params.id,
      userId
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    if (name) template.name = name.trim();
    if (type) template.type = type;
    if (textConfig) template.textConfig = textConfig;
    if (mediaConfig) template.mediaConfig = mediaConfig;
    if (stickers) template.stickers = stickers;
    if (drawings) template.drawings = drawings;
    if (isPublic !== undefined) template.isPublic = isPublic;

    await template.save();

    res.json({ success: true, template });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ success: false, message: 'Failed to update template' });
  }
};

// @desc    Delete a template
// @route   DELETE /api/status-templates/:id
// @access  Private
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await StatusTemplate.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
};

// @desc    Get public templates (community templates)
// @route   GET /api/status-templates/public
// @access  Private
exports.getPublicTemplates = async (req, res) => {
  try {
    const { limit = 20, type } = req.query;

    const query = { isPublic: true };
    if (type) query.type = type;

    const templates = await StatusTemplate.find(query)
      .sort({ usageCount: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, templates });
  } catch (error) {
    console.error('Get public templates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch public templates' });
  }
};

// @desc    Duplicate a template
// @route   POST /api/status-templates/:id/duplicate
// @access  Private
exports.duplicateTemplate = async (req, res) => {
  try {
    const userId = req.user._id;

    const originalTemplate = await StatusTemplate.findById(req.params.id);
    if (!originalTemplate) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const newTemplate = await StatusTemplate.create({
      userId,
      name: `${originalTemplate.name} (Copy)`,
      type: originalTemplate.type,
      textConfig: originalTemplate.textConfig,
      mediaConfig: originalTemplate.mediaConfig,
      stickers: originalTemplate.stickers,
      drawings: originalTemplate.drawings,
      isPublic: false
    });

    res.status(201).json({ success: true, template: newTemplate });
  } catch (error) {
    console.error('Duplicate template error:', error);
    res.status(500).json({ success: false, message: 'Failed to duplicate template' });
  }
};
