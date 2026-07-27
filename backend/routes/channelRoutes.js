const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Channel = require('../models/Channel');
const ChannelPost = require('../models/ChannelPost');

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
    // FIX: $addToSet is a no-op if the user already follows this channel,
    // but the old code always ran $inc: { followersCount: 1 } regardless —
    // so calling follow twice (double-tap, retry after a slow network,
    // etc.) inflated followersCount even though nothing changed.
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
    const alreadyFollowing = channel.followers.some(
      (f) => String(f) === String(req.user._id)
    );
    if (!alreadyFollowing) {
      channel.followers.push(req.user._id);
      channel.followersCount = channel.followers.length;
      await channel.save();
    }
    res.json({ success: true, channel });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/channels/:id/follow
router.delete('/:id/follow', protect, async (req, res) => {
  try {
    // FIX: same issue in reverse — unfollowing when not actually a follower
    // (e.g. duplicate request) used to decrement followersCount below the
    // real value, eventually going negative.
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
    const wasFollowing = channel.followers.some(
      (f) => String(f) === String(req.user._id)
    );
    if (wasFollowing) {
      channel.followers = channel.followers.filter(
        (f) => String(f) !== String(req.user._id)
      );
      channel.followersCount = channel.followers.length;
      await channel.save();
    }
    res.json({ success: true, channel });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── FEATURE ADD: Channel feed ────────────────────────────────────────────
// The Channels feature previously only supported discover/create/follow —
// there was no way for an owner to post an update or for followers to see
// one, which is the entire point of "Channels" in real WhatsApp. Adding
// that here: GET single channel, list/create/delete posts, view tracking,
// and reactions.

// GET /api/channels/:id - single channel details
router.get('/:id', protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id).populate('owner', 'username profilePicture');
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
    const isFollowing = channel.followers.some((f) => String(f) === String(req.user._id));
    const isOwner = String(channel.owner?._id || channel.owner) === String(req.user._id);
    res.json({ success: true, channel, isFollowing, isOwner });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/channels/:id/posts - the channel's feed
router.get('/:id/posts', protect, async (req, res) => {
  try {
    const { before, limit = 30 } = req.query;
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });

    // Private channels are only visible to followers (and the owner);
    // public channels' posts can be browsed by anyone signed in, matching
    // how public WhatsApp channels work.
    const isFollower = channel.followers.some((f) => String(f) === String(req.user._id));
    const isOwner = String(channel.owner) === String(req.user._id);
    if (!channel.isPublic && !isFollower && !isOwner) {
      return res.status(403).json({ success: false, message: 'Follow this channel to see its posts' });
    }

    const query = { channel: channel._id, deletedAt: null };
    if (before) query.createdAt = { $lt: new Date(before) };

    const posts = await ChannelPost.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(Math.min(Number(limit) || 30, 100))
      .populate('author', 'username profilePicture');

    res.json({ success: true, posts, channel: { _id: channel._id, name: channel.name, avatar: channel.avatar } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/channels/:id/posts - owner posts an update to the channel
router.post('/:id/posts', protect, async (req, res) => {
  try {
    const { content, mediaUrl, mediaType } = req.body;
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });

    // Only the channel owner can post — matches WhatsApp Channels, where
    // followers can view and react but never post to someone else's channel.
    if (String(channel.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the channel owner can post' });
    }
    if (!content?.trim() && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Post needs text or media' });
    }

    const post = await ChannelPost.create({
      channel: channel._id,
      author: req.user._id,
      content: content?.trim() || '',
      mediaUrl: mediaUrl || '',
      mediaType: mediaUrl ? (mediaType || 'image') : 'none'
    });

    const populatedPost = await ChannelPost.findById(post._id).populate('author', 'username profilePicture');

    // Push it live to any follower currently viewing this channel.
    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${channel._id}`).emit('channel:newPost', {
        channelId: String(channel._id),
        post: populatedPost
      });
      // Also notify followers who aren't actively viewing, so their channel
      // list shows an unread badge — mirrors the message push-notification
      // pattern used elsewhere in the app.
      for (const followerId of channel.followers) {
        if (String(followerId) === String(req.user._id)) continue;
        io.to(String(followerId)).emit('channel:update', {
          channelId: String(channel._id),
          channelName: channel.name,
          preview: content?.trim()?.slice(0, 120) || (mediaUrl ? 'Sent media' : '')
        });
      }
    }

    res.status(201).json({ success: true, post: populatedPost });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/channels/:id/posts/:postId - owner removes a post
router.delete('/:id/posts/:postId', protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
    if (String(channel.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the channel owner can delete posts' });
    }
    const post = await ChannelPost.findOneAndUpdate(
      { _id: req.params.postId, channel: channel._id },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${channel._id}`).emit('channel:postDeleted', {
        channelId: String(channel._id),
        postId: String(post._id)
      });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/channels/:id/posts/:postId/view - mark a post viewed (once per user)
router.post('/:id/posts/:postId/view', protect, async (req, res) => {
  try {
    const post = await ChannelPost.findOne({ _id: req.params.postId, channel: req.params.id });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    const alreadyViewed = post.viewedBy.some((v) => String(v) === String(req.user._id));
    if (!alreadyViewed) {
      post.viewedBy.push(req.user._id);
      post.viewsCount = post.viewedBy.length;
      await post.save();
    }
    res.json({ success: true, viewsCount: post.viewsCount });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/channels/:id/posts/:postId/react - toggle a reaction
router.post('/:id/posts/:postId/react', protect, async (req, res) => {
  try {
    const { emoji = '❤️' } = req.body;
    const post = await ChannelPost.findOne({ _id: req.params.postId, channel: req.params.id });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const existingIndex = post.reactions.findIndex((r) => String(r.user) === String(req.user._id));
    let reacted;
    if (existingIndex >= 0 && post.reactions[existingIndex].emoji === emoji) {
      // Same emoji tapped again — remove it (toggle off).
      post.reactions.splice(existingIndex, 1);
      reacted = false;
    } else if (existingIndex >= 0) {
      post.reactions[existingIndex].emoji = emoji;
      reacted = true;
    } else {
      post.reactions.push({ user: req.user._id, emoji });
      reacted = true;
    }
    await post.save();
    res.json({ success: true, reacted, reactionsCount: post.reactions.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
