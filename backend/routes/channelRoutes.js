const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Channel = require('../models/Channel');

// GET /api/channels - discover channels
router.get('/', protect, async (req, res) => {
  try {
    const { search, category, limit = 50 } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (category) query.category = category;
    const channels = await Channel.find(query)
      .sort({ followersCount: -1 })
      .limit(Number(limit))
      .populate('owner', 'username profilePicture');
    res.json({ success: true, channels });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/channels/following
router.get('/following', protect, async (req, res) => {
  try {
    const channels = await Channel.find({ followers: req.user._id })
      .populate('owner', 'username profilePicture');
    res.json({ success: true, channels });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/channels - create channel
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name required' });
    const channel = await Channel.create({
      name: name.trim(), description, category,
      owner: req.user._id, followers: [req.user._id], followersCount: 1
    });
    res.status(201).json({ success: true, channel });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/channels/:id/follow
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { followers: req.user._id }, $inc: { followersCount: 1 } },
      { new: true }
    );
    res.json({ success: true, channel });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/channels/:id/follow
router.delete('/:id/follow', protect, async (req, res) => {
  try {
    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      { $pull: { followers: req.user._id }, $inc: { followersCount: -1 } },
      { new: true }
    );
    res.json({ success: true, channel });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
