const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const AbuseReport = require("../models/AbuseReport");
const { applyPermissionInheritance, notifyContactsUpdated } = require("../services/permissionInheritanceService");
const { isAllowed } = require("../services/privacyEngineService");
const crypto = require("crypto");
const { applyPrivacyFilter } = require("../utils/privacyHelper");
const { resolveMessageMentions } = require("../utils/mentions");
const {
  normalizeReplyToId,
  getSelfDestructExpiry,
  isConversationBlocked
} = require("../utils/messageSendHelpers");
const { serializeOutgoingMessage } = require("../utils/messageSerializer");
const { sendMentionNotification, sendNewMessageNotification } = require("../services/notificationService");
const { ensureUnreadMap, getUnreadCount } = require("../utils/unreadCount");
const { containsProfanity } = require("../utils/contentFilter");
const { scheduleHardDelete } = require("../utils/hardDelete");
const { getEffectiveGenzMods } = require('../utils/genzModsAccess');
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

const toFiniteNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toValidDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getCache = async (req, key) => {
  const redisClient = req.app.get("redisClient");
  if (!redisClient || !redisClient.isOpen) return null;
  try {
    return await redisClient.get(key);
  } catch (e) {
    return null;
  }
};
const setCache = async (req, key, value, ttl = 60) => {
  const redisClient = req.app.get("redisClient");
  if (!redisClient || !redisClient.isOpen) return;
  try {
    await redisClient.setEx(key, ttl, value);
  } catch (e) {}
};
const invalidateCachePattern = async (req, pattern) => {
  const redisClient = req.app.get("redisClient");
  if (!redisClient || !redisClient.isOpen) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (!keys.length) return;
    // Delete in batches â€” passing a huge array to del() can exceed the call stack
    const BATCH = 500;
    for (let i = 0; i < keys.length; i += BATCH) {
      await redisClient.del(keys.slice(i, i + BATCH));
    }
  } catch (e) {}
};

// Persist a group "system" notice (e.g. "Juma was added", "Asha left the
// group", "Group name changed") as a real Message document â€” exactly like
// WhatsApp does â€” so it survives refresh and shows up in chat history,
// instead of only firing an ephemeral socket event that disappears if
// nobody currently has the chat open.
const createSystemMessage = async (req, conversation, actorId, text) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(conversation?._id) || !mongoose.Types.ObjectId.isValid(actorId)) {
      return null;
    }

    const message = await Message.create({
      conversationId: conversation._id,
      sender: actorId,
      content: text,
      messageType: "system",
      status: "sent",
    });

    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    const io = req.app.get("io");
    if (io) {
      const populated = await Message.findById(message._id).populate(
        "sender",
        "username profilePicture",
      );
      const serialized = serializeOutgoingMessage(populated);
      io.to(String(conversation._id)).emit("message:received", serialized);
      // Kept for any UI still listening to the legacy live-only event.
      io.to(String(conversation._id)).emit("group:system_message", {
        groupId: String(conversation._id),
        text,
        createdAt: message.createdAt,
      });
    }

    return message;
  } catch (error) {
    console.error("[Group] Failed to create system message:", error);
    return null;
  }
};

const getUserDisplayName = async (userId, fallback = "A member") => {
  try {
    const query = User.findById(userId);
    const user = typeof query?.select === "function"
      ? await query.select("username")
      : await query;
    return user?.username || fallback;
  } catch (error) {
    return fallback;
  }
};

const notifyMentionedUsers = async ({ mentionedUserIds = [], message, senderName, text, mentionerId }) => {
  if (!mentionedUserIds.length || !message?._id) return;
  await Promise.allSettled(
    mentionedUserIds.map((userId) =>
      sendMentionNotification(userId, {
        mentionerName: senderName || "Someone",
        text,
        conversationId: message.conversationId?.toString(),
        messageId: message._id.toString(),
        mentionerId: mentionerId?.toString()
      })
    )
  );
};

const getMapValue = (mapObj, key) => {
  if (!mapObj) return undefined;
  if (mapObj instanceof Map) return mapObj.get(key);
  if (typeof mapObj === "object") return mapObj[key];
  return undefined;
};

const setMapValue = (obj, mapField, key, value) => {
  if (!obj[mapField]) obj[mapField] = {};
  if (obj[mapField] instanceof Map) {
    obj[mapField].set(key, value);
  } else {
    obj[mapField][key] = value;
  }
};

const transformConversationForUser = async (conversation, userId) => {
  const conv = conversation.toObject ? conversation.toObject() : conversation;

  // Transform Map values to user-specific booleans
  conv.isArchived = Boolean(getMapValue(conv.isArchived, userId));
  conv.archivedAt = getMapValue(conv.archivedAt, userId) || null;
  conv.isPinned = Boolean(getMapValue(conv.isPinned, userId));
  conv.isLocked = Boolean(getMapValue(conv.lockedBy, userId));
  conv.isMuted =
    Boolean(getMapValue(conv.mutedUntil, userId)) &&
    new Date(getMapValue(conv.mutedUntil, userId)) > new Date();
  
  // Include unread count for this specific user
  conv.unreadCount = conv.unreadCount ? (conv.unreadCount.get ? conv.unreadCount.get(userId) : conv.unreadCount[userId]) : 0;

  if (conv.participants && Array.isArray(conv.participants)) {
    conv.participants = await Promise.all(
      conv.participants.map(p => applyPrivacyFilter(p, userId)),
    );
  }

  // Don't leak a view-once message's content into the chat-list preview
  if (conv.lastMessage) {
    stripViewOnceContent(conv.lastMessage);
  }

  return conv;
};

const populateConversation = (query) =>
  query
    // settings + contacts are needed by applyPrivacyFilter when participants
    // are filtered (missing them would silently leak privacy-restricted fields).
    .populate(
      "participants",
      "username phoneNumber profilePicture isOnline lastSeen about settings contacts",
    )
    .populate("admins", "username profilePicture")
    .populate("lastMessage");

// View-once privacy: a view-once message's real content must never reach a
// client through list/feed APIs. It is only returned once through the explicit
// reveal endpoint, so the one-time-view guarantee is enforced server-side
// instead of being just a UI placeholder. This strips content/media from any
// serialized message (mongoose doc or plain object) in place.
const VIEW_ONCE_PLACEHOLDER = 'View Once message';
// View-once messages that are never opened must not stay on the server
// forever — even if no receiver ever taps to view, the content should be
// garbage-collected. 24h matches WhatsApp's retention for unopened
// view-once media; the Message TTL index (on disappearAt) handles deletion.
const VIEW_ONCE_TTL_MS = 24 * 60 * 60 * 1000;
const stripViewOnceContent = (msg) => {
  if (!msg || !msg.isViewOnce || msg.isConsumed) return msg;
  const placeholder = msg.isSelfDestruct ? '💥 Message self-destructed' : VIEW_ONCE_PLACEHOLDER;
  msg.content = placeholder;
  msg.caption = '';
  msg.mediaUrl = '';
  msg.fileName = '';
  msg.fileSize = 0;
  msg.duration = 0;
  return msg;
};

const ensureParticipant = (conversation, userId, res) => {
  if (!conversation) {
    res.status(404).json({ success: false, message: "Conversation not found" });
    return false;
  }

  if (!includesId(conversation.participants, userId)) {
    res.status(403).json({
      success: false,
      message: "Not authorized for this conversation",
    });
    return false;
  }

  return true;
};

exports.getConversations = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { includeArchived } = req.query;
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    // SECURITY (3.2): fetch the conversation list in a single aggregation
    // (match + lookups) instead of populate + in-JS filtering, so the query
    // is fully server-side and scales. Per-user privacy filtering of
    // participants still runs below via transformConversationForUser.
    let conversations = await Conversation.aggregate([
      {
        $match: {
          participants: userIdObj,
          deletedFor: { $ne: userIdObj }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          pipeline: [
            { $project: { username: 1, phoneNumber: 1, profilePicture: 1, isOnline: 1, lastSeen: 1, about: 1 } }
          ],
          as: 'participants'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'admins',
          foreignField: '_id',
          pipeline: [
            { $project: { username: 1, profilePicture: 1 } }
          ],
          as: 'admins'
        }
      },
      {
        $lookup: {
          from: 'messages',
          localField: 'lastMessage',
          foreignField: '_id',
          as: 'lastMessage'
        }
      },
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ['$lastMessage', 0] }
        }
      }
    ]);

    // WhatsApp behavior: 1:1 chats with blocked users are hidden from the list
    // until they are unblocked. Group chats stay visible — you simply stop
    // receiving that user's messages.
    const currentUser = await User.findById(userId).select('blockedUsers').lean();
    const blockedSet = new Set((currentUser?.blockedUsers || []).map((id) => String(id)));
    if (blockedSet.size > 0) {
      conversations = conversations.filter((conv) => {
        if (conv.isGroup) return true;
        const others = (conv.participants || [])
          .map((p) => String(p?._id || p))
          .filter((id) => id && id !== String(userId));
        return !others.some((id) => blockedSet.has(id));
      });
    }

    // Transform conversations for current user
    conversations = await Promise.all(
      conversations.map((conv) => transformConversationForUser(conv, userId)),
    );

    // Filter archived unless specifically requested
    if (includeArchived !== "true") {
      conversations = conversations.filter((c) => !c.isArchived);
    }

    // Sort: pinned first, then by updatedAt
    conversations.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    const responseData = { success: true, conversations };

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const conversation = await Conversation.findById(req.params.id);

    if (!ensureParticipant(conversation, userId, res)) return;

    const populated = await populateConversation(
      Conversation.findById(conversation._id),
    );
    const transformed = await transformConversationForUser(populated, userId);

    res.json({ success: true, conversation: transformed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrCreateConversation = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    // "Message yourself" — WhatsApp-style self-chat allowed (single-participant conversation)
    const isSelfChat = String(userId) === String(localUserId);

    const targetUser = isSelfChat ? null : await User.findById(userId).select("_id settings");
    if (!isSelfChat && !targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let conversation = isSelfChat
      ? await Conversation.findOne({
          participants: { $size: 1, $all: [localUserId] },
          isGroup: false,
        })
      : await Conversation.findOne({
          participants: { $all: [localUserId, userId] },
          isGroup: false,
        });

    if (!conversation) {
      const localUser = await User.findById(localUserId).select("settings");
      const defaultTimer = localUser?.settings?.privacy?.defaultMessageTimer || "off";
      let disappearingMessages = { enabled: false };
      if (defaultTimer && defaultTimer !== "off") {
        // Convert duration string to timer number (hours)
        let timer = 24; // default 24 hours
        if (typeof defaultTimer === 'string') {
          if (defaultTimer === '5s') timer = 5/3600;
          else if (defaultTimer === '10s') timer = 10/3600;
          else if (defaultTimer === '30s') timer = 30/3600;
          else if (defaultTimer === '1m') timer = 1/60;
          else if (defaultTimer === '5m') timer = 5/60;
          else if (defaultTimer === '30m') timer = 30/60;
          else if (defaultTimer === '1h') timer = 1;
          else if (defaultTimer === '6h') timer = 6;
          else if (defaultTimer === '12h') timer = 12;
          else if (defaultTimer === '24h') timer = 24;
          else if (defaultTimer === '7d') timer = 24*7;
          else if (defaultTimer === '90d') timer = 24*90;
        }
        disappearingMessages = {
          enabled: true,
          duration: defaultTimer,
          timer: timer,
          startedAt: new Date(),
          startedBy: localUserId
        };
      }

      conversation = await Conversation.create({
        participants: isSelfChat ? [localUserId] : [localUserId, userId],
        isGroup: false,
        disappearingMessages
      });
    } else if (includesId(conversation.deletedFor, localUserId)) {
      conversation.deletedFor = conversation.deletedFor.filter(
        (id) => id.toString() !== localUserId,
      );
      await conversation.save();
    }

    const populated = await populateConversation(
      Conversation.findById(conversation._id),
    );
    res.status(200).json({ success: true, conversation: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createGroup = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const { name, description, participants = [] } = req.body;

    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Group name is required" });
    }

    const memberIds = [
      ...new Set(
        participants.map(String).filter((id) => id && id !== localUserId),
      ),
    ];
    if (memberIds.length < 1) {
      return res.status(400).json({
        success: false,
        message: "Group must have at least 1 other participant",
      });
    }

    const existingUsers = await User.find({ _id: { $in: memberIds } }).select(
      "_id settings contacts",
    );
    if (existingUsers.length !== memberIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more participants were not found",
      });
    }

    // Check group privacy settings for all participants. Delegates to the
    // shared privacy engine: subdoc-aware contact checks AND the
    // contacts_except exclusion list (previously exclusions were ignored, so
    // an excluded contact could still be added to a group).
    for (const user of existingUsers) {
      const groupPrivacy = user?.settings?.privacy?.groups || 'everyone';
      if (groupPrivacy === 'contacts' || groupPrivacy === 'contacts_except') {
        const allowed = await isAllowed(user, localUserId, groupPrivacy, 'groups');
        if (!allowed) {
          return res.status(403).json({
            success: false,
            message: "Privacy settings of one or more users prevent you from adding them to groups",
          });
        }
      }
    }

    const group = await Conversation.create({
      participants: [localUserId, ...memberIds],
      isGroup: true,
      groupName: name.trim(),
      groupDescription: description || "",
      admins: [localUserId],
      createdBy: localUserId,
      owner: localUserId,
      groupInviteCode: crypto.randomBytes(16).toString("hex"),
      // SECURITY (3.3): invite codes expire after 7 days.
      groupInviteCodeExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    try {
      const creator = await User.findById(localUserId).select("username");
      await createSystemMessage(req, group, localUserId, `${creator?.username || "Someone"} created the group "${group.groupName}"`);
    } catch (sysErr) { console.error('[Group] system message error:', sysErr); }

    const populatedGroup = await populateConversation(
      Conversation.findById(group._id),
    );
    res.status(201).json({ success: true, conversation: populatedGroup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addParticipant = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const { userId } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!ensureParticipant(conversation, localUserId, res)) return;
    if (!conversation.isGroup) {
      return res.status(400).json({ success: false, message: "Not a group conversation" });
    }
    if (!includesId(conversation.admins, localUserId) && !conversation.canAddMembers) {
      return res.status(403).json({ success: false, message: "Only admins can add participants" });
    }
    if (includesId(conversation.participants, userId)) {
      return res.status(400).json({ success: false, message: "User already in group" });
    }

    const targetUser = await User.findById(userId).select("_id username profilePicture settings contacts");
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const groupPrivacy = targetUser?.settings?.privacy?.groups || 'everyone';
    if (groupPrivacy === 'contacts' || groupPrivacy === 'contacts_except') {
      // Shared engine: contact membership + contacts_except exclusions.
      const allowed = await isAllowed(targetUser, localUserId, groupPrivacy, 'groups');
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "User's privacy settings do not allow you to add them to groups",
        });
      }
    }

    conversation.participants.push(userId);
    await conversation.save();

    const updatedConversation = await populateConversation(Conversation.findById(conversation._id));

    // Notify all group members in real time
    const io = req.app.get("io");
    if (io) {
      io.to(String(conversation._id)).emit("group:participant_added", {
        groupId: String(conversation._id),
        userId: String(userId),
        user: { _id: targetUser._id, username: targetUser.username, profilePicture: targetUser.profilePicture },
        addedBy: localUserId,
      });
      // Tell the added person so they can fetch & join the group
      io.to(String(userId)).emit("group:you_were_added", {
        groupId: String(conversation._id),
        addedBy: localUserId,
      });
    }
    await createSystemMessage(req, conversation, localUserId, `${targetUser.username} was added`);

    res.status(200).json({ success: true, conversation: updatedConversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeParticipant = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const conversation = await Conversation.findById(req.params.id);

    if (!ensureParticipant(conversation, localUserId, res)) return;
    if (!conversation.isGroup) {
      return res.status(400).json({ success: false, message: "Not a group conversation" });
    }
    if (!includesId(conversation.admins, localUserId)) {
      return res.status(403).json({ success: false, message: "Only admins can remove participants" });
    }

    const targetUserId = req.params.userId;
    const removedUser = await User.findById(targetUserId).select("username");

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== targetUserId,
    );
    conversation.admins = conversation.admins.filter(
      (a) => a.toString() !== targetUserId,
    );
    await conversation.save();

    const updatedConversation = await populateConversation(Conversation.findById(conversation._id));

    // Notify all members + the removed person in real time
    const io = req.app.get("io");
    if (io) {
      io.to(String(conversation._id)).emit("group:participant_removed", {
        groupId: String(conversation._id),
        userId: String(targetUserId),
        removedBy: localUserId,
      });
      io.to(String(targetUserId)).emit("group:you_were_removed", {
        groupId: String(conversation._id),
        removedBy: localUserId,
      });
    }
    await createSystemMessage(req, conversation, localUserId, `${removedUser?.username || "A member"} was removed`);

    res.status(200).json({ success: true, conversation: updatedConversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.makeAdmin = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const conversation = await Conversation.findById(req.params.id);

    if (!ensureParticipant(conversation, localUserId, res)) return;
    if (!conversation.isGroup) {
      return res.status(400).json({ success: false, message: "Not a group conversation" });
    }
    if (!includesId(conversation.admins, localUserId)) {
      return res.status(403).json({ success: false, message: "Only admins can make other participants admin" });
    }
    if (!includesId(conversation.participants, req.params.userId)) {
      return res.status(400).json({ success: false, message: "User not in group" });
    }

    if (!includesId(conversation.admins, req.params.userId)) {
      conversation.admins.push(req.params.userId);
      await conversation.save();
    }

    const promotedUser = await User.findById(req.params.userId).select("username");
    const updatedConversation = await populateConversation(Conversation.findById(conversation._id));

    const io = req.app.get("io");
    if (io) {
      io.to(String(conversation._id)).emit("group:admin_added", {
        groupId: String(conversation._id),
        userId: String(req.params.userId),
        promotedBy: localUserId,
      });
      io.to(String(req.params.userId)).emit("group:you_are_admin", {
        groupId: String(conversation._id),
        promotedBy: localUserId,
      });
    }
    await createSystemMessage(req, conversation, localUserId, `${promotedUser?.username || "A member"} is now an admin`);

    res.status(200).json({ success: true, conversation: updatedConversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.leaveGroup = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const conversation = await Conversation.findById(req.params.id);

    if (!ensureParticipant(conversation, localUserId, res)) return;
    if (!conversation.isGroup) {
      return res.status(400).json({ success: false, message: "Not a group conversation" });
    }

    const wasAdmin = includesId(conversation.admins, localUserId);
    const leavingUser = await User.findById(localUserId).select("username");

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== localUserId,
    );
    conversation.admins = conversation.admins.filter(
      (a) => a.toString() !== localUserId,
    );

    // If the group still has members but no admins, auto-promote the longest-standing member
    if (conversation.participants.length > 0 && conversation.admins.length === 0) {
      conversation.admins.push(conversation.participants[0]);
    }

    await conversation.save();

    const io = req.app.get("io");
    if (io) {
      io.to(String(conversation._id)).emit("group:member_left", {
        groupId: String(conversation._id),
        userId: String(localUserId),
        username: leavingUser?.username,
      });
      // Notify if a new admin was auto-assigned
      if (wasAdmin && conversation.admins.length > 0) {
        io.to(String(conversation._id)).emit("group:admin_added", {
          groupId: String(conversation._id),
          userId: String(conversation.admins[0]),
          promotedBy: null,
          autoPromoted: true,
        });
      }
    }
    try {
      await createSystemMessage(req, conversation, localUserId, `${leavingUser?.username || "A member"} left the group`);
      if (wasAdmin && conversation.admins.length > 0) {
        const autoPromotedUser = await User.findById(conversation.admins[0]).select("username");
        await createSystemMessage(req, conversation, conversation.admins[0], `${autoPromotedUser?.username || "A member"} is now an admin`);
      }
    } catch (sysErr) { console.error('[Group] system message error:', sysErr); }

    res.status(200).json({ success: true, message: "Left group successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStarredMessages = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    // Find conversations the user is in
    const userConversations = await Conversation.find({
      participants: localUserId,
      deletedFor: { $ne: localUserId },
    });
    const conversationIds = userConversations.map((c) => c._id);

    const filter = {
      conversationId: { $in: conversationIds },
      isStarred: true,
      deletedFor: { $ne: localUserId },
      deletedForEveryone: false,
    };

    const messages = await Message.find(filter)
      .populate("sender", "username profilePicture")
      .populate({
        path: "replyTo",
        select: "_id content messageType sender",
        populate: {
          path: "sender",
          select: "username profilePicture"
        }
      })
      .populate("mentions.user", "username profilePicture")
      .sort({ createdAt: -1 });

    messages.forEach(stripViewOnceContent);

    res.json(messages);
  } catch (error) {
    console.error("Get starred messages error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching starred messages",
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const { page = 1, limit = 50 } = req.query;
    const conversationId = req.params.id;
    const conversation = await Conversation.findById(conversationId);

    if (!ensureParticipant(conversation, localUserId, res)) return;

    const filter = {
      conversationId: conversationId,
      deletedFor: { $ne: localUserId },
      deletedForEveryone: false,
      // Filter out any expired ephemeral messages before MongoDB TTL catches up.
      $or: [
        { disappearAt: { $exists: false } },
        { disappearAt: null },
        { disappearAt: { $gt: new Date() } }
      ]
    };

    const messages = await Message.find(filter)
      .populate("sender", "username profilePicture")
      .populate({ path: "replyTo", populate: { path: "sender", select: "username profilePicture" } })
      .populate("mentions.user", "username profilePicture")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    // View-once privacy: never send real content through the feed API —
    // receivers (and the sender) only see a placeholder until the message
    // is consumed, and the content is served once via the reveal endpoint.
    messages.forEach(stripViewOnceContent);

    const total = await Message.countDocuments(filter);

    const responseData = {
      success: true,
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    };

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const {
      conversationId,
      chatId,
      content,
      caption,
      messageType,
      mediaUrl,
      fileName,
      fileSize,
      duration,
      replyTo,
      isViewOnce,
      isVideoNote,
      isSelfDestruct,
      mentions,
      messageId,
      selfDestructTimer,
      allowScreenshot,
      font,
      latitude,
      longitude,
      isLiveLocation,
      liveLocationExpiresAt,
    } = req.body;
    
    // 1. The frontend may send 'conversationId' or 'chatId'; read both for safety
    const finalConversationId = conversationId || chatId;
    
    if (!finalConversationId || !mongoose.Types.ObjectId.isValid(finalConversationId)) {
      console.warn('[ChatController] sendMessage 400: Invalid conversation ID', { finalConversationId });
      return res.status(400).json({ success: false, message: "A valid Conversation ID is required" });
    }

    const conversation = await Conversation.findById(finalConversationId);

    if (!ensureParticipant(conversation, localUserId, res)) return;

    // PREMIUM GATE: self-destruct, view-once, and custom fonts require an active subscription
    let enforceSelfDestruct = isSelfDestruct;
    let enforceViewOnce = isViewOnce;
    let enforceFont = font;
    if ((isSelfDestruct || isViewOnce || font) && localUserId) {
      const sender = await User.findById(localUserId).select('premium subscriptionExpiresAt');
      const hasPremium = sender && sender.premium && sender.subscriptionExpiresAt && new Date() <= new Date(sender.subscriptionExpiresAt);
      if (!hasPremium) {
        enforceSelfDestruct = false;
        enforceViewOnce = false;
        enforceFont = null;
      }
    }

    // Content moderation: block clearly harmful language before it is stored
    const textToCheck = `${content || ''} ${caption || ''}`;
    if (containsProfanity(textToCheck)) {
      return res.status(400).json({ success: false, message: 'Your message contains disallowed words. Please change your message.' });
    }

    // Check if the receiver has blocked the sender
    const receiverId = conversation.participants.find(p => String(p) !== String(localUserId));
    if (receiverId) {
      const receiver = await User.findById(receiverId).select('blockedUsers');
      if (receiver && receiver.blockedUsers && receiver.blockedUsers.some(id => String(id) === String(localUserId))) {
        return res.status(403).json({ success: false, message: "Cannot message this user" });
      }
    }

    if (await isConversationBlocked(conversation, localUserId)) {
      return res.status(403).json({ success: false, message: "Cannot message this user" });
    }

    if (conversation.isGroup) {
      const isAdmin = conversation.admins?.some((a) => String(a) === String(localUserId));
      const mediaTypes = ['image', 'video', 'audio', 'voice', 'file', 'document', 'gif', 'sticker'];
      if (conversation.adminOnlyMessaging && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Only admins can send messages in this group' });
      }
      if (conversation.canSendMedia === false && mediaTypes.includes(messageType || 'text')) {
        return res.status(403).json({ success: false, message: 'Media is disabled in this group' });
      }
      if (conversation.canCreatePolls === false && messageType === 'poll') {
        return res.status(403).json({ success: false, message: 'Polls are disabled in this group' });
      }
    }

    const replyToId = normalizeReplyToId(replyTo);

    const safeContent =
      content ||
      fileName ||
      (mediaUrl ? `${messageType || "media"} message` : "");
    if (!safeContent) {
      console.warn('[ChatController] sendMessage 400: Missing content', { content, fileName, mediaUrl, messageType });
      return res.status(400).json({
        success: false,
        message: "Message content or media is required",
      });
    }

    let mentionData = { mentions: [], mentionedUserIds: [], mentionedUsers: [] };
    try {
      mentionData = await resolveMessageMentions({
        conversation,
        senderId: localUserId,
        content: safeContent,
        mentions
      });
    } catch (mentionErr) {
      console.warn('[ChatController] Mentions resolve failed, continuing without mentions:', mentionErr?.message || mentionErr);
    }

    let disappearAt = null;
    try {
      if (conversation.disappearingMessages?.enabled) {
        const timer = Number(conversation.disappearingMessages.timer) || 24;
        disappearAt = new Date(Date.now() + timer * 60 * 60 * 1000);
      }
      
      if (enforceSelfDestruct && !disappearAt) {
        disappearAt = getSelfDestructExpiry({ isSelfDestruct: enforceSelfDestruct, selfDestructTimer });
      }

      // View-once safety net: even if never opened, the content must not
      // live on the server indefinitely — TTL cleans it up after 24h.
      if (enforceViewOnce && !disappearAt) {
        disappearAt = new Date(Date.now() + VIEW_ONCE_TTL_MS);
      }
    } catch (disappearErr) {
      console.warn('[ChatController] Disappearing timer skipped:', disappearErr?.message || disappearErr);
    }

    // 2. Persist the official message to MongoDB
    // Dedup: if a message with this clientMessageId already exists for sender+conversation,
    // return the existing one (instead of letting E11000 become a 500 on network retry).
    if (messageId) {
      const existing = await Message.findOne({
        clientMessageId: String(messageId),
        sender: localUserId,
        conversationId: finalConversationId
      }).select('_id');
      if (existing) {
        const alreadySent = await Message.findById(existing._id)
          .populate("sender", "username profilePicture");
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: alreadySent,
        });
      }
    }

    const messageLatitude = toFiniteNumberOrNull(latitude);
    const messageLongitude = toFiniteNumberOrNull(longitude);
    const messageLiveLocationExpiresAt = toValidDateOrNull(liveLocationExpiresAt);

    const message = await Message.create({
      conversationId: finalConversationId,
      sender: localUserId,
      content: String(safeContent),
      caption: typeof caption === 'string' ? caption.slice(0, 1000) : '',
      messageType: messageType || "text",
      mediaUrl: mediaUrl || "",
      fileName: fileName || "",
      fileSize: fileSize || 0,
      duration: duration || 0,
      replyTo: replyToId,
      isViewOnce: Boolean(enforceViewOnce),
      isVideoNote: Boolean(isVideoNote),
      isSelfDestruct: Boolean(enforceSelfDestruct),
      mentions: mentionData.mentions || [],
      // Anti-screenshot: the sender opts OUT of screenshot protection by
      // allowing screenshots (default true). Persisting the toggle is what
      // makes POST /messages/:id/screenshot-attempt + the socket event work.
      ...(typeof allowScreenshot === 'boolean' ? { allowScreenshot } : {}),
      disappearAt,
      clientMessageId: messageId ? String(messageId) : undefined,
      latitude: messageLatitude,
      longitude: messageLongitude,
      isLiveLocation: Boolean(isLiveLocation),
      liveLocationExpiresAt: messageLiveLocationExpiresAt,
      font: typeof enforceFont === 'string' && enforceFont ? enforceFont : null,
    });

    let populatedMessage = null;
    try {
      populatedMessage = await Message.findById(message._id)
        .populate("sender", "username profilePicture")
        .populate({
          path: "replyTo",
          select: "_id content messageType sender",
          populate: {
            path: "sender",
            select: "username profilePicture"
          }
        })
        .populate("mentions.user", "username profilePicture")
        .lean();
    } catch (popErr) {
      console.warn('[ChatController] Message population failed, falling back to raw message:', popErr?.message || popErr);
      populatedMessage = {
        _id: message._id,
        conversationId: message.conversationId,
        sender: message.sender,
        content: message.content,
        messageType: message.messageType,
        status: message.status || 'sent',
        createdAt: message.createdAt
      };
    }

    const incObject = {};
    if (conversation && conversation.participants) {
      conversation.participants.forEach(p => {
        if (p.toString() !== localUserId.toString()) {
          incObject[`unreadCount.${p.toString()}`] = 1;
        }
      });
    }

    const updateQuery = {
      $set: {
        lastMessage: message._id,
        updatedAt: new Date(),
        deletedFor: []
      }
    };
    if (Object.keys(incObject).length > 0) {
      updateQuery.$inc = incObject;
    }

    // 3. Update the Conversation to set this as the last message
    await Conversation.findByIdAndUpdate(
      finalConversationId,
      updateQuery,
      { new: true, runValidators: false }
    );

    const io = req.app.get("io");
    const plainMessage = serializeOutgoingMessage(
      populatedMessage || message,
      messageId ? { clientMessageId: messageId } : {}
    );
    
    // 4. Return the saved message to the frontend (respond before socket/cache side effects)
    res.status(201).json({ success: true, message: plainMessage });

    try {
      if (io) {
        if (messageId) {
          plainMessage.clientMessageId = messageId;
        }

        let senderSocketId = null;
        if (global.onlineUsers && global.onlineUsers.get(localUserId.toString())) {
          senderSocketId = global.onlineUsers.get(localUserId.toString());
        }

        if (conversation.participants && Array.isArray(conversation.participants)) {
          const updatedConversation = await Conversation.findById(finalConversationId);
          const notificationTasks = [];
          const notificationText =
            messageType === 'image' ? 'Photo' :
            messageType === 'video' ? 'Video' :
            messageType === 'audio' || messageType === 'voice' ? 'Voice note' :
            messageType === 'sticker' ? 'Sticker' :
            messageType === 'gif' ? 'GIF' :
            message.isViewOnce ? 'View once message' :
            String(safeContent || 'New message').slice(0, 120);
          for (const participantId of conversation.participants) {
            if (String(participantId) === String(localUserId)) continue;
            // WhatsApp: the blocker's message IS delivered to the blocked user;
            // only the reverse direction (recipient blocked the sender) is
            // rejected, and that case already returned 403 above.
            const recipientId = String(participantId);
            // View-once privacy: participants receive a placeholder over the
            // socket too — the real content is only served once via the
            // reveal endpoint, so it can't be scraped from the live feed.
            let recipientMessage = plainMessage;
            if (plainMessage.isViewOnce && !plainMessage.isConsumed) {
              recipientMessage = {
                ...plainMessage,
                content: plainMessage.isSelfDestruct ? '💥 Message self-destructed' : VIEW_ONCE_PLACEHOLDER,
                caption: '',
                mediaUrl: '',
                fileName: '',
                fileSize: 0,
                duration: 0,
              };
            }
            io.to(recipientId).emit("message:received", recipientMessage);
            if (updatedConversation) {
              io.to(recipientId).emit("conversation:unread-update", {
                conversationId: finalConversationId,
                unreadCount: getUnreadCount(updatedConversation, recipientId)
              });
            }
            notificationTasks.push((async () => {
              // FIX: previously every participant got a push notification for
              // every message, even if they had muted the chat or already had
              // it open on screen (double-ping). Match WhatsApp: skip push
              // when muted, and skip when the recipient's socket is actively
              // in this conversation's room (join:conversation).
              try {
                const mutedUntil = updatedConversation?.mutedUntil?.get?.(recipientId);
                const isMuted = mutedUntil && new Date(mutedUntil) > new Date();
                if (isMuted) return { success: false, skipped: 'muted' };

                const recipientSocketId = global.onlineUsers && global.onlineUsers.get(recipientId);
                const roomMembers = io.sockets.adapter.rooms.get(String(finalConversationId));
                const isActivelyViewing = Boolean(
                  recipientSocketId && roomMembers && roomMembers.has(recipientSocketId)
                );
                if (isActivelyViewing) return { success: false, skipped: 'active_viewer' };
              } catch (_) { /* if the check fails, fall through and still notify */ }

              return sendNewMessageNotification(recipientId, {
                senderName: populatedMessage?.sender?.username || 'GENZ',
                text: notificationText,
                conversationId: finalConversationId.toString(),
                senderId: localUserId.toString(),
                type: messageType || 'text'
              });
            })());
          }
          if (notificationTasks.length) {
            Promise.allSettled(notificationTasks).catch((notifyErr) => {
              console.warn("[ChatController] Push notification failed:", notifyErr?.message || notifyErr);
            });
          }
        }

        // HTTP-fallback path must mirror the socket path's delivered ack
        // (socket/index.js message:mark_delivered -> message:delivered) so the
        // sender's ticks don't stay stuck on 'sent' after a socket failure.
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:delivered', {
            messageId: messageId || populatedMessage?._id?.toString(),
            serverMessageId: populatedMessage?._id?.toString()
          });
        }
      }
    } catch (emitErr) {
      console.warn("[ChatController] Socket emit failed:", emitErr?.message || emitErr);
    }

    try {
      await notifyMentionedUsers({
        mentionedUserIds: mentionData.mentionedUserIds,
        message: populatedMessage,
        senderName: populatedMessage?.sender?.username,
        text: message.isViewOnce ? 'View once message' : safeContent,
        mentionerId: localUserId
      });
    } catch (notifyErr) {
      console.warn("[ChatController] Mention notify failed:", notifyErr?.message || notifyErr);
    }

    // Only invalidate this chat's message cache; avoid conversations:* (bulk KEYS/DEL caused stack overflows)
    try {
      await invalidateCachePattern(req, `messages:${finalConversationId}:*`);
    } catch (cacheErr) {
      console.warn("[ChatController] Cache invalidation failed:", cacheErr?.message || cacheErr);
    }
  } catch (error) {
    console.error("Database Error - Kushindwa kusave meseji:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const { content, caption } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }
    if (message.sender.toString() !== localUserId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Allow editing text messages and captions on media
    if (message.messageType !== "text" && message.messageType !== "image" && message.messageType !== "video" && message.messageType !== "audio" && message.messageType !== "file") {
      return res
        .status(400)
        .json({ success: false, message: "Can only edit text messages and media captions" });
    }

    // Save current content to edit history before modifying
    if (!message.editHistory) message.editHistory = [];
    message.editHistory.push({
      content: message.content || '',
      caption: message.caption || '',
      editedAt: new Date(),
      editedBy: localUserId
    });

    // Update content if provided
    if (content !== undefined) {
      message.content = content;
    }
    // Update caption if provided (for media messages)
    if (caption !== undefined) {
      message.caption = caption;
    }
    
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "username profilePicture")
      .populate({ path: "replyTo", populate: { path: "sender", select: "username profilePicture" } })
      .populate("mentions.user", "username profilePicture")
      .populate("editHistory.editedBy", "username");

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit(
        "message:edited",
        updatedMessage,
      );
    }

    res.status(200).json({ success: true, message: updatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const forEveryone =
      req.path.includes("delete-for-everyone") || req.body.forEveryone;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, localUserId, res)) return;

    // Prevent deletion of locked messages
    if (message.isLocked) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete locked message. Unlock it first."
      });
    }

    if (forEveryone) {
      const isAdmin = conversation.isGroup &&
        (conversation.admins || []).some(adminId => adminId.toString() === localUserId.toString()) ||
        conversation.createdBy?.toString() === localUserId.toString();

      if (message.sender.toString() !== localUserId && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only sender or group admin can delete for everyone",
        });
      }
      // ENFORCE anti-delete: check if any receiver has antiDeleteMessages enabled.
      // If so, preserve the content so the anti-revoke mod can surface it.
      const participants = conversation.participants || [];
      let anyReceiverHasAntiDelete = false;
      try {
        for (const pid of participants) {
          const pIdStr = String(pid?._id || pid);
          if (pIdStr === String(localUserId)) continue;
          const receiverQuery = User.findById(pIdStr);
          if (receiverQuery && typeof receiverQuery.select === 'function') {
            const receiver = await receiverQuery.select('genzMods premium subscriptionExpiresAt').lean();
            const rMods = getEffectiveGenzMods(receiver?.genzMods || {}, receiver);
            if (rMods.antiDeleteMessages || rMods.antiDelete) {
              anyReceiverHasAntiDelete = true;
              break;
            }
          }
        }
      } catch (_) { /* anti-delete check is best-effort */ }
      // SECURITY (1.6): scrub the message content immediately so it can never
      // be re-read from the database, then schedule a hard delete after 30
      // days (the server-side sweep in startExpiredMessageCleanup is the
      // backstop for any timer that is lost on restart).
      message.deletedForEveryone = true;
      message.wasDeletedBySender = message.sender.toString() === localUserId.toString();
      message.deletedByAdmin = !message.wasDeletedBySender;
      message.deletedAt = new Date();
      // Keep the pre-delete content so the anti-revoke mod can still list
      // and restore it (GET/POST /genz-mods/deleted-messages). Must be set
      // BEFORE the content is scrubbed below.
      message.originalContent = message.originalContent || message.content;
      // ENFORCE anti-delete: if receiver has anti-delete on, preserve content
      if (anyReceiverHasAntiDelete) {
        await message.save();
        const io = req.app.get('io');
        if (io) {
          io.to(message.conversationId.toString()).emit('message:deleted', {
            messageId: message._id,
            forEveryone: true,
            deletedBy: localUserId,
            antiDeleteBlocked: true
          });
        }
        return res.status(200).json({ success: true, message: 'Message deleted (anti-delete preserved for recipients)' });
      }
      message.content = '[deleted]';
      message.caption = '';
      message.mediaUrl = '';
      message.fileName = '';
      message.fileSize = 0;
      message.duration = 0;
      scheduleHardDelete(message, localUserId);
    } else if (!includesId(message.deletedFor, localUserId)) {
      message.deletedFor.push(localUserId);
    }

    await message.save();

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit("message:deleted", {
        messageId: message._id,
        forEveryone: Boolean(forEveryone),
        deletedBy: localUserId,
      });
    }

    res.status(200).json({ success: true, message: "Message deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }
    if (message.sender.toString() === localUserId) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot mark own message as read" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, localUserId, res)) return;

    const reader = await User.findById(localUserId).select('settings.privacy.readReceipts');
    const readReceiptsEnabled = reader?.settings?.privacy?.readReceipts !== false;

    // FIX: the previous read â†’ decrement-in-JS â†’ save pattern was a classic
    // lost-update race. Opening a chat with several unread messages fires
    // markAsRead once per message, often concurrently â€” two requests could
    // both read the same unreadCount value before either saved, so one
    // decrement silently vanished and the badge stayed stuck too high.
    // Same issue existed for the readBy duplicate-check. Both are now
    // atomic single-document MongoDB operations, which Mongo serializes
    // per-document, so concurrent calls can no longer race each other.
    await Message.findOneAndUpdate(
      { _id: message._id, 'readBy.user': { $ne: localUserId } },
      {
        $push: { readBy: { user: localUserId, readAt: new Date() } },
        ...(readReceiptsEnabled ? { $set: { status: 'read' } } : {})
      }
    );

    const unreadKey = `unreadCount.${localUserId}`;
    await Conversation.findOneAndUpdate(
      { _id: conversation._id, [unreadKey]: { $gt: 0 } },
      { $inc: { [unreadKey]: -1 } }
    );
    const freshConversation = await Conversation.findById(conversation._id).select('unreadCount');
    const newUnreadCount = getUnreadCount(freshConversation, localUserId);

    const io = req.app.get("io");
    if (io) {
      io.to(localUserId).emit("conversation:unread-update", {
        conversationId: conversation._id,
        unreadCount: newUnreadCount
      });
      if (readReceiptsEnabled) {
        io.to(message.conversationId.toString()).emit("message:read_receipt", {
          messageId: message._id,
          readerId: localUserId,
        });
      }
    }

    res.status(200).json({ success: true, message: "Message marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// NOTE: addReaction is defined later in this file (the atomic implementation).
// The old fetch-modify-save version was removed — it was dead code (overridden
// by the atomic one) and had a read-modify-write race on the reactions array.

exports.removeReaction = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, localUserId, res)) return;

    // SECURITY (3.1): atomic removal of this user's reaction.
    await Message.updateOne(
      { _id: message._id, 'reactions.user': localUserId },
      { $pull: { reactions: { user: localUserId } } }
    );

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "username profilePicture")
      .populate({ path: "replyTo", populate: { path: "sender", select: "username profilePicture" } })
      .populate("mentions.user", "username profilePicture")
      .populate("reactions.user", "username profilePicture");

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit(
        "reaction:removed",
        updatedMessage,
      );
    }

    res.status(200).json({ success: true, message: updatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Report screenshot attempt on message
exports.reportScreenshotAttempt = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const messageId = req.params.messageId || req.params.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    // Only allow screenshot notification if sender enabled it
    if (!message.allowScreenshot) {
      // Add screenshot attempt
      if (!message.screenshotAttempts) {
        message.screenshotAttempts = [];
      }
      
      message.screenshotAttempts.push({
        attemptedBy: userId,
        attemptedAt: new Date()
      });
      
      await message.save();

      const io = req.app.get("io");
      if (io) {
        // Notify sender about screenshot attempt
        io.to(message.sender.toString()).emit("message:screenshot-attempted", {
          messageId: message._id,
          conversationId: message.conversationId,
          attemptedBy: userId,
          attemptedAt: new Date()
        });
      }

      res.json({ success: true, message: "Screenshot attempt reported" });
    } else {
      res.status(403).json({
        success: false,
        message: "Screenshot protection is not enabled for this message"
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required" });
    }

    const currentUser = await User.findById(localUserId).select("blockedUsers");
    const excludedIds = [
      localUserId,
      ...(currentUser?.blockedUsers || []).map((id) => id.toString()),
    ];
    const regex = new RegExp(
      query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );

    const users = await User.find({
      _id: { $nin: excludedIds },
      isBlocked: { $ne: true },
      $or: [{ username: regex }, { phoneNumber: regex }],
    })
      // SECURITY (3.6): never expose phone numbers in search results. settings
      // + contacts are selected so applyPrivacyFilter can enforce each user's
      // privacy rules instead of leaking restricted fields.
      .select(
        "username profilePicture about isOnline lastSeen settings contacts",
      )
      .limit(25);

    const filteredUsers = await Promise.all(
      users.map(user => applyPrivacyFilter(user, localUserId)),
    );

    res.status(200).json({ success: true, users: filteredUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addContact = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const { userId, savedName } = req.body;

    if (!userId || userId === localUserId) {
      return res
        .status(400)
        .json({ success: false, message: "Valid contact user ID is required" });
    }

    const [user, contact] = await Promise.all([
      User.findById(localUserId),
      // settings + contacts so the privacy filter below can enforce the
      // contact's rules (contacts_except / nobody) instead of leaking fields.
      User.findById(userId).select(
        "username phoneNumber profilePicture about isOnline lastSeen settings contacts",
      ),
    ]);

    if (!user || !contact) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (includesId(user.blockedUsers, userId)) {
      return res.status(400).json({
        success: false,
        message: "Unblock this user before adding as contact",
      });
    }

    const alreadyExists = user.contacts.some(c => c.user && c.user.toString() === userId.toString());

    if (!alreadyExists) {
      user.contacts.push({ user: userId, savedName: savedName || contact.username });
      await user.save();
      
      // Apply permission inheritance for new contact
      await applyPermissionInheritance(localUserId, userId, contact.username, contact.phoneNumber);
      notifyContactsUpdated(req, localUserId);
    }

    const filteredContact = await applyPrivacyFilter(contact, localUserId);

    res.status(200).json({ success: true, contact: { user: filteredContact, savedName: savedName || contact.username }, message: "Contact added" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addContactByPhone = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const { phone, savedName } = req.body;

    if (!phone || !savedName) {
      return res.status(400).json({ success: false, message: 'Please provide a name and phone number' });
    }

    const contactUser = await User.findOne({ phoneNumber: phone });
    if (!contactUser) {
      return res.status(404).json({ success: false, message: 'This number is not yet registered on Genz Messenger' });
    }

    if (contactUser._id.toString() === localUserId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot save your own number' });
    }

    const currentUser = await User.findById(localUserId);
    const alreadyExists = currentUser.contacts.some(
      (c) => c.user && c.user.toString() === contactUser._id.toString()
    );

    if (alreadyExists) {
      return res.status(400).json({ success: false, message: 'This contact is already in your list' });
    }

    currentUser.contacts.push({ user: contactUser._id, savedName });
    await currentUser.save();
    
    // Apply permission inheritance for new contact
    await applyPermissionInheritance(localUserId, contactUser._id, contactUser.username, contactUser.phoneNumber);
    notifyContactsUpdated(req, localUserId);

    let conversation = await Conversation.findOne({
      participants: { $all: [localUserId, contactUser._id] },
      isGroup: false,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [localUserId, contactUser._id],
        isGroup: false,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact added successfully!',
      contact: { user: contactUser, savedName },
      conversationId: conversation._id,
      conversation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    // SECURITY: populate settings + contacts so applyPrivacyFilter can enforce
    // the owner's privacy rules (contacts_except / nobody) on each contact — a
    // limited-field populate would leave privacySettings empty and leak data.
    const user = await User.findById(localUserId).populate(
      "contacts.user",
      "username phoneNumber profilePicture about bio isOnline lastSeen settings contacts",
    );

    const filteredContacts = (
      await Promise.all(
        (user?.contacts || []).map(async (contact) => {
          if (!contact.user) return null;
          return {
            user: await applyPrivacyFilter(contact.user, localUserId),
            savedName: contact.savedName
          };
        }),
      )
    ).filter(Boolean);

    res.status(200).json({ success: true, contacts: filteredContacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const targetId = req.params.id;

    if (targetId === localUserId) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot block yourself" });
    }

    const target = await User.findById(targetId).select("_id");
    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const user = await User.findById(localUserId);
    if (!includesId(user.blockedUsers, targetId)) {
      user.blockedUsers.push(targetId);
    }
    user.contacts = user.contacts.filter((c) => c.user && c.user.toString() !== targetId);
    await user.save();

    // Block alert kwa user aliyeblockiwa (ikiwa amewasha feature)
    try {
      await User.updateOne(
        { _id: targetId },
        {
          $push: {
            blockAlerts: {
              $each: [{
                actorId: localUserId,
                actorName: user.username || 'Someone',
                action: 'blocked',
                timestamp: new Date()
              }],
              $slice: -100
            }
          }
        }
      );
    } catch (alertErr) {
      console.warn('[ChatController] Failed to record block alert:', alertErr?.message || alertErr);
    }

    const io = req.app.get("io");
    if (io) {
      // Target only the blocker and the blocked user — never a global broadcast.
      const blockerSocket = global.onlineUsers && global.onlineUsers.get(String(localUserId));
      const targetSocket = global.onlineUsers && global.onlineUsers.get(String(targetId));
      const payload = { blockerId: localUserId, userId: targetId };

      if (blockerSocket) {
        io.to(blockerSocket).emit("user:blocked", payload);
      }
      if (targetSocket) {
        io.to(targetSocket).emit("user:blocked", payload);
      }
    }

    res.status(200).json({ success: true, message: "User blocked" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const targetId = req.params.id;

    // Remove the block only from the blocker's list
    await User.updateOne(
      { _id: localUserId },
      { $pull: { blockedUsers: targetId } }
    );

    // Unblock alert kwa user aliyeachiwa
    try {
      const blocker = await User.findById(localUserId).select('username');
      await User.updateOne(
        { _id: targetId },
        {
          $push: {
            blockAlerts: {
              $each: [{
                actorId: localUserId,
                actorName: blocker?.username || 'Someone',
                action: 'unblocked',
                timestamp: new Date()
              }],
              $slice: -100
            }
          }
        }
      );
    } catch (alertErr) {
      console.warn('[ChatController] Failed to record unblock alert:', alertErr?.message || alertErr);
    }

    const io = req.app.get("io");
    if (io) {
      // Target only the blocker and the unblocked user — never a global broadcast.
      const blockerSocket = global.onlineUsers && global.onlineUsers.get(String(localUserId));
      const targetSocket = global.onlineUsers && global.onlineUsers.get(String(targetId));
      const payload = { blockerId: localUserId, userId: targetId };

      if (blockerSocket) {
        io.to(blockerSocket).emit("user:unblocked", payload);
      }
      if (targetSocket) {
        io.to(targetSocket).emit("user:unblocked", payload);
      }
    }

    res.status(200).json({ success: true, message: "User unblocked" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle star on message
exports.toggleStarMessage = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const messageId = req.params.messageId || req.params.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    // Verify user is in the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    // Toggle star, or set an explicit state when the client sends one.
    message.isStarred =
      typeof req.body?.isStarred === "boolean"
        ? req.body.isStarred
        : !message.isStarred;
    await message.save();

    const updated = await Message.findById(message._id)
      .populate("sender", "username profilePicture")
      .populate({ path: "replyTo", populate: { path: "sender", select: "username profilePicture" } })
      .populate("mentions.user", "username profilePicture");

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit("message:starred", updated);
    }

    res.json({ success: true, message: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle lock on message (prevent accidental deletion)
exports.toggleMessageLock = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const messageId = req.params.messageId || req.params.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    // Verify user is in the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    // Toggle lock, or set an explicit state when the client sends one.
    message.isLocked =
      typeof req.body?.isLocked === "boolean"
        ? req.body.isLocked
        : !message.isLocked;
    await message.save();

    const updated = await Message.findById(message._id)
      .populate("sender", "username profilePicture")
      .populate({ path: "replyTo", populate: { path: "sender", select: "username profilePicture" } })
      .populate("mentions.user", "username profilePicture");

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit("message:locked", updated);
    }

    res.json({ success: true, message: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle keep in chat for disappearing messages
exports.toggleKeepMessage = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const messageId = req.params.messageId || req.params.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    // Only allow keeping messages that have disappearAt set
    if (!message.disappearAt) {
      return res
        .status(400)
        .json({ success: false, message: "This message is not set to disappear" });
    }

    // Verify user is in the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    // Only the sender can keep/unqueep the message
    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Only the sender can keep this message" });
    }

    // Initialize keptBy if not exists
    if (!message.keptBy) message.keptBy = [];

    // Check if already kept by this user
    const alreadyKept = message.keptBy.some(k => k.user.toString() === userId);

    if (alreadyKept) {
      // Unkeep
      message.keptBy = message.keptBy.filter(k => k.user.toString() !== userId);
    } else {
      // Keep
      message.keptBy.push({ user: userId, keptAt: new Date() });
    }

    await message.save();

    const updated = await Message.findById(message._id)
      .populate("sender", "username profilePicture")
      .populate({ path: "replyTo", populate: { path: "sender", select: "username profilePicture" } })
      .populate("mentions.user", "username profilePicture")
      .populate("keptBy.user", "username profilePicture");

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit("message:kept", updated);
    }

    res.json({ success: true, message: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle pin on conversation
exports.togglePinConversation = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    // Get current value and toggle
    const currentValue = Boolean(getMapValue(conversation.isPinned, userId));
    setMapValue(conversation, "isPinned", userId, !currentValue);

    await conversation.save();

    res.json({ success: true, isPinned: !currentValue, conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle archive on conversation
exports.toggleArchiveConversation = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    // Get current value and toggle
    const currentValue = Boolean(getMapValue(conversation.isArchived, userId));
    const nextValue = !currentValue;
    setMapValue(conversation, "isArchived", userId, nextValue);

    // Stamp when this user archived the chat; clear it on unarchive.
    if (nextValue) {
      setMapValue(conversation, "archivedAt", userId, new Date());
    } else if (conversation.archivedAt) {
      if (conversation.archivedAt instanceof Map) {
        conversation.archivedAt.delete(userId);
      } else {
        delete conversation.archivedAt[userId];
      }
    }

    await conversation.save();

    res.json({ success: true, isArchived: nextValue, conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle mute conversation
exports.toggleMuteConversation = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { conversationId } = req.params;
    const { mutedUntil } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    // Check if currently muted
    const currentMutedUntil = getMapValue(conversation.mutedUntil, userId);
    const isCurrentlyMuted = currentMutedUntil && new Date(currentMutedUntil) > new Date();

    if (isCurrentlyMuted) {
      // Unmute
      if (conversation.mutedUntil instanceof Map) {
        conversation.mutedUntil.delete(userId);
      } else {
        delete conversation.mutedUntil[userId];
      }
      await conversation.save();
      return res.json({ success: true, isMuted: false, conversation });
    }

    // Mute - default 1 year if no mutedUntil provided
    const muteDuration = mutedUntil ? new Date(mutedUntil) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    setMapValue(conversation, 'mutedUntil', userId, muteDuration);
    await conversation.save();

    res.json({ success: true, isMuted: true, mutedUntil: muteDuration, conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get archived conversations
exports.getArchivedConversations = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    let conversations = await populateConversation(
      Conversation.find({ participants: userId }),
    );

    // Transform and filter archived only
    conversations = (
      await Promise.all(
        conversations.map((conv) => transformConversationForUser(conv, userId)),
      )
    ).filter((c) => c.isArchived);

    // Sort by updatedAt
    conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Search messages in a conversation
exports.searchMessages = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const conversationId = req.params.conversationId || req.query.conversationId;
    const { query } = req.query;

    if (!conversationId || !query) {
      return res.status(400).json({
        success: false,
        message: "conversationId and query are required",
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    const regex = new RegExp(
      query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );

    const messages = await Message.find({
      conversationId,
      content: regex,
      deletedFor: { $ne: userId },
      deletedForEveryone: false,
    })
      .populate("sender", "username profilePicture")
      .populate({ path: "replyTo", populate: { path: "sender", select: "username profilePicture" } })
      .populate("mentions.user", "username profilePicture")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get media gallery from conversation
exports.getMediaGallery = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { conversationId } = req.params;
    const mediaType = req.query.mediaType || req.query.type || "all";

    // Guard: status/virtual conversation IDs are not valid ObjectIds
    if (!/^[0-9a-fA-F]{24}$/.test(conversationId)) {
      return res.json({ success: true, media: [] });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    const mediaTypes =
      mediaType === "all"
        ? ["image", "video", "audio", "document", "file"]
        : mediaType === "document"
          ? ["document", "file"]
        : [mediaType];

    const messages = await Message.find({
      conversationId,
      messageType: { $in: mediaTypes },
      $or: [
        { mediaUrl: { $exists: true, $ne: "" } },
        { content: { $exists: true, $ne: "" } }
      ],
      deletedFor: { $ne: userId },
      deletedForEveryone: false,
    })
      .populate("sender", "username profilePicture")
      .sort({ createdAt: -1 });

    // View-once media must not appear in the gallery — its URL is only
    // served once via the reveal endpoint.
    const media = messages.filter((m) => !(m.isViewOnce && !m.isConsumed));

    res.json({ success: true, media });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get message info/details (delivery status, read times, etc)
exports.getMessageInfo = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { messageId } = req.params;

    const message = await Message.findById(messageId)
      .populate("sender", "username profilePicture isOnline")
      .populate("readBy.user", "username profilePicture isOnline")
      .populate("reactions.user", "username profilePicture");

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    const info = {
      _id: message._id,
      content: message.content,
      sender: message.sender,
      messageType: message.messageType,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      isEdited: message.isEdited,
      status: message.status,
      readBy: message.readBy,
      reactions: message.reactions,
      forwards: message.forwards || 0,
      isFavorite: message.isStarred,
      isPinned: conversation.pinnedMessages?.includes(message._id),
      isViewOnce: message.isViewOnce,
      isConsumed: Boolean(message.isConsumed),
      revealedAt: message.revealedAt || null,
    };

    // View-once privacy: only the sender gets the real content here.
    if (!(message.isViewOnce && String(message.sender?._id || message.sender) === String(userId))) {
      stripViewOnceContent(info);
    }

    res.json({ success: true, messageInfo: info });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get message edit history
exports.getMessageEditHistory = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { messageId } = req.params;

    const message = await Message.findById(messageId)
      .populate("editHistory.editedBy", "username profilePicture")
      // keep conversationId — it is needed below for the participant check
      .select("conversationId editHistory isEdited editedAt content caption");

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    res.json({ 
      success: true, 
      editHistory: message.editHistory || [],
      currentContent: message.content,
      currentCaption: message.caption,
      isEdited: message.isEdited,
      editedAt: message.editedAt
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark message as view once viewed
exports.markViewOnceViewed = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    if (message.sender?.toString() === userId) {
      return res.status(403).json({
        success: false,
        message: "Sender cannot mark their own view-once message as viewed",
      });
    }

    if (!message.isViewOnce && !message.isSelfDestruct) {
      return res.status(400).json({
        success: false,
        message: "Message is not a view-once or self-destruct message",
      });
    }

    // Mark the message as consumed
    message.isConsumed = true;
    message.content = message.isSelfDestruct ? 'ðŸ’¥ Message self-destructed' : 'View Once message opened';
    message.mediaUrl = '';
    message.fileName = '';
    
    // For self-destruct messages, set disappearAt to immediate deletion
    if (message.isSelfDestruct) {
      message.disappearAt = new Date();
    }
    
    await message.save();

    const io = req.app.get("io");
    if (io) {
      // Notify sender that message was viewed/consumed
      io.to(message.sender.toString()).emit("message:viewed", {
        messageId: message._id,
        conversationId: message.conversationId,
        viewedBy: userId,
        viewedAt: new Date(),
        isViewOnce: message.isViewOnce,
        isSelfDestruct: message.isSelfDestruct
      });

      // Broadcast consumption to conversation
      io.to(message.conversationId.toString()).emit("message:consumed", {
        messageId: message._id,
        conversationId: message.conversationId,
        isViewOnce: message.isViewOnce,
        isSelfDestruct: message.isSelfDestruct,
        consumedBy: userId
      });
    }

    res.json({ success: true, message: "Message marked as viewed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reveal a view-once message's real content. This is the ONLY endpoint that
// returns the content to a receiver — the feed/gallery APIs strip it — so a
// message's one-time-view guarantee is enforced server-side. Consumption
// still happens via markViewOnceViewed when the receiver finishes viewing.
exports.revealViewOnceMessage = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    if (String(message.sender?._id || message.sender) === String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Sender cannot view their own view-once message",
      });
    }

    if (!message.isViewOnce && !message.isSelfDestruct) {
      return res.status(400).json({
        success: false,
        message: "Message is not a view-once or self-destruct message",
      });
    }

    if (message.isConsumed) {
      return res.status(400).json({
        success: false,
        message: "View once message already opened",
      });
    }

    // Each receiver gets exactly one reveal — replaying the endpoint does
    // not keep returning the content, while other group members are still
    // free to use their own single reveal.
    if ((message.revealedBy || []).some((id) => String(id) === String(userId))) {
      return res.status(400).json({
        success: false,
        message: "You have already opened this view-once message",
      });
    }

    // Audit trail: record the FIRST reveal so the sender can see the
    // message was opened even before consumption completes. Subsequent
    // reveals by other participants keep the original timestamp.
    if (!message.revealedAt) {
      message.revealedAt = new Date();
    }
    message.revealedBy = [...(message.revealedBy || []), userId];
    try {
      await message.save();
    } catch (saveErr) {
      console.warn('[ChatController] Failed to persist reveal audit:', saveErr?.message || saveErr);
    }

    // Live notify the sender that someone opened the view-once message,
    // before consumption completes (WhatsApp-style "opened" feedback).
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(String(message.sender?._id || message.sender)).emit("message:revealed", {
          messageId: message._id,
          conversationId: message.conversationId,
          revealedBy: userId,
          revealedAt: message.revealedAt,
          isViewOnce: message.isViewOnce,
          isSelfDestruct: message.isSelfDestruct
        });
      }
    } catch (emitErr) {
      console.warn('[ChatController] message:revealed emit failed:', emitErr?.message || emitErr);
    }

    res.json({
      success: true,
      content: message.content,
      caption: message.caption || '',
      mediaUrl: message.mediaUrl || '',
      fileName: message.fileName || '',
      fileSize: message.fileSize || 0,
      duration: message.duration || 0,
      messageType: message.messageType,
      isViewOnce: Boolean(message.isViewOnce),
      isSelfDestruct: Boolean(message.isSelfDestruct),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update group info (name, description, photo)
exports.updateGroupInfo = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { groupId } = req.params;
    const {
      groupName,
      groupDescription,
      groupPhoto,
      adminOnlyMessaging,
      canSendMedia,
      canCreatePolls,
      canChangeGroupInfo,
      canAddMembers,
    } = req.body;

    const conversation = await Conversation.findById(groupId);
    if (!ensureParticipant(conversation, userId, res)) return;

    if (!conversation.isGroup) {
      return res
        .status(400)
        .json({ success: false, message: "Not a group conversation" });
    }

    const isAdmin = includesId(conversation.admins, userId);

    // Permission toggles (adminOnlyMessaging, canSendMedia, canCreatePolls,
    // canChangeGroupInfo, canAddMembers) can only ever be changed by an
    // admin â€” these are the group-wide rules, not the content itself.
    const wantsPermissionChange =
      adminOnlyMessaging !== undefined ||
      canSendMedia !== undefined ||
      canCreatePolls !== undefined ||
      canChangeGroupInfo !== undefined ||
      canAddMembers !== undefined;

    if (wantsPermissionChange && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only admins can change group permissions",
      });
    }

    // Content edits (name/description/photo) are allowed for admins always,
    // and for regular members only when the group has "Edit group settings"
    // open to everyone (canChangeGroupInfo === true), exactly like WhatsApp.
    const wantsContentChange =
      groupName !== undefined ||
      groupDescription !== undefined ||
      groupPhoto !== undefined;

    if (wantsContentChange && !isAdmin && conversation.canChangeGroupInfo === false) {
      return res.status(403).json({
        success: false,
        message: "Only admins can update group info",
      });
    }

    const oldGroupName = conversation.groupName;
    const oldGroupPhoto = conversation.groupPhoto;
    const oldGroupDescription = conversation.groupDescription;

    if (groupName) conversation.groupName = groupName.trim();
    if (groupDescription !== undefined)
      conversation.groupDescription = groupDescription;
    if (groupPhoto) conversation.groupPhoto = groupPhoto;
    if (adminOnlyMessaging !== undefined)
      conversation.adminOnlyMessaging = Boolean(adminOnlyMessaging);
    if (canSendMedia !== undefined)
      conversation.canSendMedia = Boolean(canSendMedia);
    if (canCreatePolls !== undefined)
      conversation.canCreatePolls = Boolean(canCreatePolls);
    if (canChangeGroupInfo !== undefined)
      conversation.canChangeGroupInfo = Boolean(canChangeGroupInfo);
    if (canAddMembers !== undefined)
      conversation.canAddMembers = Boolean(canAddMembers);

    conversation.updatedAt = new Date();
    await conversation.save();

    try {
      const actor = await User.findById(userId).select("username");
      const actorName = actor?.username || "Someone";
      if (groupName && conversation.groupName !== oldGroupName) {
        await createSystemMessage(req, conversation, userId, `${actorName} changed the group name to "${conversation.groupName}"`);
      }
      if (groupPhoto && conversation.groupPhoto !== oldGroupPhoto) {
        await createSystemMessage(req, conversation, userId, `${actorName} changed the group icon`);
      }
      if (groupDescription !== undefined && conversation.groupDescription !== oldGroupDescription) {
        await createSystemMessage(req, conversation, userId, `${actorName} changed the group description`);
      }
    } catch (sysErr) { console.error('[Group] system message error:', sysErr); }

    const updated = await populateConversation(Conversation.findById(groupId));
    const transformed = await transformConversationForUser(updated, userId);

    // Notify every other participant in real time, the same way WhatsApp
    // pushes group setting changes to all members instantly â€” both to the
    // conversation room (for anyone with the chat open) and to each
    // participant's personal room (so it lands even if the chat is closed).
    const io = req.app.get("io");
    if (io) {
      const payload = {
        groupId: String(groupId),
        groupName: conversation.groupName,
        groupDescription: conversation.groupDescription,
        groupPhoto: conversation.groupPhoto,
        adminOnlyMessaging: conversation.adminOnlyMessaging,
        canSendMedia: conversation.canSendMedia,
        canCreatePolls: conversation.canCreatePolls,
        canChangeGroupInfo: conversation.canChangeGroupInfo,
        canAddMembers: conversation.canAddMembers,
        updatedBy: userId,
      };
      io.to(String(groupId)).emit("group:settings:updated", payload);
      (conversation.participants || []).forEach((participantId) => {
        io.to(String(participantId)).emit("group:settings:updated", payload);
      });
    }

    res.json({ success: true, conversation: transformed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Forward message to other conversations
exports.forwardMessage = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { messageId } = req.params;
    let { targetConversationIds } = req.body;

    // Accept both string and array for targetConversationIds
    if (typeof targetConversationIds === 'string' && targetConversationIds.trim()) {
      targetConversationIds = [targetConversationIds.trim()];
    }

    if (
      !Array.isArray(targetConversationIds) ||
      !targetConversationIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "targetConversationIds must be a non-empty string or array",
      });
    }

    // Forwarding limits (WhatsApp-style fake-news control)
    const MAX_FORWARD_BATCH = 5; // max chats per forward action
    const FORWARD_MANY_LIMIT = 5; // after N forwards the chain is "forwarded many times"
    if (targetConversationIds.length > MAX_FORWARD_BATCH) {
      return res.status(400).json({
        success: false,
        message: `Unaweza kupeleka mbele hadi chats ${MAX_FORWARD_BATCH} kwa wakati mmoja`,
      });
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    // WhatsApp semantics: view-once messages can never be forwarded — their
    // content is meant for one viewer in the original conversation only.
    if (originalMessage.isViewOnce) {
      return res.status(400).json({
        success: false,
        message: "View once messages cannot be forwarded",
      });
    }

    const chainForwardCount = originalMessage.forwardCount || 0;
    if (chainForwardCount >= FORWARD_MANY_LIMIT && targetConversationIds.length > 1) {
      return res.status(400).json({
        success: false,
        message: "This message has been forwarded many times — you can only forward it to one chat",
      });
    }

    const sourceConversation = await Conversation.findById(
      originalMessage.conversationId,
    );
    if (!ensureParticipant(sourceConversation, userId, res)) return;

    const forwardedMessages = [];
    const io = req.app.get("io");
    const forwardedLatitude = toFiniteNumberOrNull(originalMessage.latitude);
    const forwardedLongitude = toFiniteNumberOrNull(originalMessage.longitude);

    for (const targetConvId of targetConversationIds) {
      const targetConversation = await Conversation.findById(targetConvId);

      if (
        !targetConversation ||
        !includesId(targetConversation.participants, userId)
      ) {
        continue;
      }

      const forwardedMessage = await Message.create({
        conversationId: targetConvId,
        sender: userId,
        content: originalMessage.content,
        caption: originalMessage.caption || '',
        messageType: originalMessage.messageType,
        mediaUrl: originalMessage.mediaUrl,
        fileName: originalMessage.fileName,
        fileSize: originalMessage.fileSize,
        duration: originalMessage.duration,
        latitude: forwardedLatitude,
        longitude: forwardedLongitude,
        isLiveLocation: false,
        liveLocationExpiresAt: null,
        liveLocationStoppedAt: null,
        isForwarded: true,
        forwardedFrom: messageId,
        originalMessageId: messageId,
        forwardCount: chainForwardCount + 1,
        // Preserve the sender's chosen font so the forwarded copy renders identically.
        font: typeof originalMessage.font === 'string' && originalMessage.font ? originalMessage.font : null,
      });

      const populated = await Message.findById(forwardedMessage._id)
        .populate("sender", "username profilePicture")
        .populate({ path: "replyTo", populate: { path: "sender", select: "username profilePicture" } });

      forwardedMessages.push(populated);

      if (io) {
        io.to(targetConvId).emit("message:received", populated);
      }

      targetConversation.lastMessage = forwardedMessage._id;
      targetConversation.updatedAt = new Date();
      await targetConversation.save();
    }

    // Bump the chain counter so repeated forwarding eventually hits the limit
    if (forwardedMessages.length > 0) {
      originalMessage.forwardCount = chainForwardCount + forwardedMessages.length;
      await originalMessage.save();
    }

    res.json({ success: true, forwardedMessages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Report message
exports.reportMessage = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { messageId } = req.params;
    const { reason, details } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    // SECURITY (2.7): persist the report instead of only logging it.
    const validCategories = ['spam', 'harassment', 'inappropriate_content', 'fake_account', 'scam', 'violence', 'hate_speech', 'csam', 'child_abuse', 'other'];
    const category = validCategories.includes(reason) ? reason : 'other';

    // CSAM / child-abuse reports are an urgent, legally-required escalation.
    const isChildSafety = ['csam', 'child_abuse', 'child exploitation'].includes(String(reason || '').toLowerCase());
    const priority = isChildSafety ? 'urgent' : 'medium';

    const report = new AbuseReport({
      reporterId: userId,
      reportedUserId: message.sender,
      reportedContentId: messageId,
      contentType: 'message',
      category,
      description: typeof details === 'string' ? details.slice(0, 1000) : '',
      priority,
      status: 'pending',
      metadata: {
        conversationId: message.conversationId,
        reason,
        reportedAt: new Date()
      }
    });
    await report.save();

    // Notify admins (if any admin sockets are joined to the admin room).
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('new:abuse-report', report);
    }

    res.status(201).json({ success: true, message: "Message reported successfully", reportId: report._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.reportUser = async (req, res) => {
  try {
    const reporterId = getCurrentUserId(req);
    // Route uses /users/:id/report — accept both param names for safety
    const reportedUserId = req.params.reportedUserId || req.params.id;
    const { category, description, contentType } = req.body;

    if (!reportedUserId) {
      return res.status(400).json({ success: false, message: 'reportedUserId is required' });
    }
    if (String(reporterId) === String(reportedUserId)) {
      return res.status(400).json({ success: false, message: 'You cannot report yourself' });
    }

    const validCategories = ['spam', 'harassment', 'inappropriate_content', 'fake_account', 'scam', 'violence', 'hate_speech', 'csam', 'child_abuse', 'other'];
    if (!validCategories.includes(category || 'other')) {
      return res.status(400).json({ success: false, message: 'Invalid report category' });
    }
    if (typeof description !== 'string' || description.trim().length === 0 || description.length > 1000) {
      return res.status(400).json({ success: false, message: 'A valid description (1-1000 chars) is required' });
    }

    const reportedUser = await User.findById(reportedUserId).select('_id');
    if (!reportedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // CSAM is an urgent, legally-required escalation path
    const isChildSafety = ['csam', 'child_abuse', 'child exploitation'].includes(String(category || '').toLowerCase());
    const highPriority = ['violence', 'hate_speech', 'scam'].includes(category);
    const report = new AbuseReport({
      reporterId,
      reportedUserId,
      contentType: contentType || 'user_profile',
      category: category || 'other',
      description: description.trim(),
      priority: isChildSafety ? 'urgent' : highPriority ? 'high' : 'medium'
    });
    await report.save();

    res.status(201).json({ success: true, message: 'User reported successfully', reportId: report._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add reaction to message
exports.addReaction = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const messageId = req.body.messageId || req.params.id || req.params.messageId;
    const { emoji } = req.body;

    if (!messageId || !emoji) {
      return res.status(400).json({ success: false, message: "Message ID and emoji are required" });
    }

    // 1. Ensure message exists and user is a participant
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !includesId(conversation.participants, userId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const io = req.app.get("io");

    // 2. Try adding a new reaction first (atomic — $ne guard prevents
    //    double-push race when two users react at the same time).
    const newReactionResult = await Message.findOneAndUpdate(
      {
        _id: messageId,
        "reactions.user": { $ne: userId }
      },
      {
        $push: { reactions: { user: userId, emoji, createdAt: new Date() } }
      },
      { new: true }
    );

    if (newReactionResult) {
      // Successfully added new reaction
      if (io) {
        io.to(message.conversationId.toString()).emit("message:reaction", {
          messageId,
          conversationId: message.conversationId,
          reactions: newReactionResult.reactions || []
        });
      }
      return res.json({ success: true, message: "Reaction added", reactions: newReactionResult.reactions || [] });
    }

    // 3. If adding failed (reaction already exists), update the emoji (atomic)
    const updatedResult = await Message.findOneAndUpdate(
      {
        _id: messageId,
        "reactions.user": userId
      },
      {
        $set: { "reactions.$.emoji": emoji }
      },
      { new: true }
    );

    if (updatedResult) {
      if (io) {
        io.to(message.conversationId.toString()).emit("message:reaction", {
          messageId,
          conversationId: message.conversationId,
          reactions: updatedResult.reactions || []
        });
      }
      return res.json({ success: true, message: "Reaction updated", reactions: updatedResult.reactions || [] });
    }

    return res.status(404).json({ success: false, message: "Message not found" });
  } catch (error) {
    console.error("Error adding reaction:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Remove admin role
exports.removeAdmin = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const groupId = req.params.id;
    const memberId = req.params.memberId;

    const conversation = await Conversation.findById(groupId);
    if (!ensureParticipant(conversation, userId, res)) return;

    if (!conversation.isGroup) {
      return res
        .status(400)
        .json({ success: false, message: "Not a group conversation" });
    }

    if (!includesId(conversation.admins, userId)) {
      return res
        .status(403)
        .json({ success: false, message: "Only admins can remove admins" });
    }

    const ownerStr = String(conversation.owner || conversation.createdBy || '');
    if (memberId === ownerStr) {
      return res
        .status(403)
        .json({ success: false, message: "Cannot remove the group owner's admin role" });
    }

    conversation.admins = conversation.admins.filter(
      (a) => a.toString() !== memberId,
    );
    await conversation.save();

    const updated = await populateConversation(Conversation.findById(groupId));

    const io = req.app.get("io");
    if (io) {
      io.to(String(groupId)).emit("group:admin_removed", {
        groupId: String(groupId),
        userId: String(memberId),
        removedBy: userId,
      });
      io.to(String(memberId)).emit("group:your_admin_removed", {
        groupId: String(groupId),
        removedBy: userId,
      });
    }
    try {
      const demotedUser = await User.findById(memberId).select("username");
      await createSystemMessage(req, conversation, userId, `${demotedUser?.username || "A member"} is no longer an admin`);
    } catch (sysErr) { console.error('[Group] system message error:', sysErr); }

    res.json({ success: true, conversation: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get group info
exports.getGroupInfo = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { groupId } = req.params;

    const conversation = await Conversation.findById(groupId)
      // groupInviteCode is select:false — include it so the "missing" check
      // below is accurate. Without this, the code looked missing on every call
      // and got REGENERATED each time getGroupInfo ran (breaking outstanding
      // invite links the moment any admin viewed group info).
      .select('+groupInviteCode')
      .populate(
        "participants",
        "username profilePicture isOnline lastSeen about",
      )
      .populate("admins", "username profilePicture");

    if (!ensureParticipant(conversation, userId, res)) return;

    if (!conversation.isGroup) {
      return res
        .status(400)
        .json({ success: false, message: "Not a group conversation" });
    }

    const isAdmin = includesId(conversation.admins, userId);
    let groupWithInvite = conversation;
    if (isAdmin && !conversation.groupInviteCode) {
      groupWithInvite = await Conversation.findByIdAndUpdate(
        groupId,
        { $set: { groupInviteCode: crypto.randomBytes(16).toString('hex') } },
        { new: true }
      ).select('+groupInviteCode');
    } else if (isAdmin) {
      groupWithInvite = await Conversation.findById(groupId).select('+groupInviteCode');
    }

    const info = {
      _id: conversation._id,
      groupName: conversation.groupName,
      groupDescription: conversation.groupDescription,
      groupPhoto: conversation.groupPhoto,
      participants: conversation.participants,
      admins: conversation.admins,
      createdBy: conversation.createdBy,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      totalMembers: conversation.participants.length,
      isPinned: Boolean(getMapValue(conversation.isPinned, userId)),
      isMuted: Boolean(getMapValue(conversation.mutedUntil, userId)),
      canSendMedia: conversation.canSendMedia,
      canCreatePolls: conversation.canCreatePolls,
      canChangeGroupInfo: conversation.canChangeGroupInfo,
      canAddMembers: conversation.canAddMembers,
      adminOnlyMessaging: conversation.adminOnlyMessaging,
      disappearingMessages: conversation.disappearingMessages,
      isAdmin,
      ...(isAdmin ? { groupInviteCode: groupWithInvite?.groupInviteCode || '' } : {}),
    };

    res.json({ success: true, groupInfo: info, data: info });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Regenerate group invite code (admins only)
exports.regenerateGroupInvite = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { groupId } = req.params;

    const conversation = await Conversation.findById(groupId).select('+groupInviteCode');
    if (!ensureParticipant(conversation, userId, res)) return;

    if (!conversation.isGroup) {
      return res.status(400).json({ success: false, message: 'Not a group conversation' });
    }

    if (!includesId(conversation.admins, userId)) {
      return res.status(403).json({ success: false, message: 'Only admins can regenerate invite codes' });
    }

    conversation.groupInviteCode = crypto.randomBytes(16).toString('hex');
    // SECURITY (3.3): refreshed invite codes expire after 7 days.
    conversation.groupInviteCodeExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await conversation.save();

    res.json({
      success: true,
      groupInviteCode: conversation.groupInviteCode,
      inviteCode: conversation.groupInviteCode,
      message: 'Invite code regenerated'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clear chat (delete all messages for current user)
exports.clearChat = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { chatId } = req.params;

    const conversation = await Conversation.findById(chatId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    if (!ensureParticipant(conversation, userId, res)) return;

    // Mark all messages as deleted for this user
    await Message.updateMany(
      { conversationId: chatId },
      { $addToSet: { deletedFor: userId } }
    );

    await invalidateCachePattern(req, `messages:${chatId}:*`);
    await invalidateCachePattern(req, `conversations:*`);

    res.json({ success: true, message: "Chat cleared successfully" });
  } catch (error) {
    console.error("Clear chat error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete chat (delete conversation and all messages)
exports.deleteChat = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { chatId } = req.params;

    const conversation = await Conversation.findById(chatId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    if (!ensureParticipant(conversation, userId, res)) return;

    // For group chats, only remove the user from participants
    if (conversation.isGroup) {
      await Conversation.findByIdAndUpdate(
        chatId,
        { $pull: { participants: userId, admins: userId } }
      );
    } else {
      // For individual chats, mark all messages as deleted for this user
      await Message.updateMany(
        { conversationId: chatId },
        { $addToSet: { deletedFor: userId } }
      );
      await Conversation.findByIdAndUpdate(
        chatId,
        { $addToSet: { deletedFor: userId } }
      );
    }

    await invalidateCachePattern(req, `messages:${chatId}:*`);
    await invalidateCachePattern(req, `conversations:*`);

    res.json({ success: true, message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Delete chat error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { inviteCode } = req.body;
    const conversation = await Conversation.findOne({ _id: groupId, isGroup: true })
      .select("+groupInviteCode");

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const userId = getCurrentUserId(req);

    // Check if banned
    const isBanned = (conversation.bannedMembers || []).some(b => b.user?.toString() === userId);
    if (isBanned) {
      return res.status(403).json({ success: false, message: 'You have been banned from this group' });
    }

    const isMember = conversation.participants.some((p) => p.toString() === userId);
    if (isMember) {
      // Already a member â€” just return the conversation so the frontend can open it
      const populated = await populateConversation(Conversation.findById(groupId));
      return res.status(200).json({ success: true, alreadyMember: true, conversation: populated });
    }

    // SECURITY (3.3): reject expired invite codes.
    if (conversation.groupInviteCodeExpiry && new Date() > conversation.groupInviteCodeExpiry) {
      return res.status(403).json({ success: false, message: 'Invite code expired' });
    }

    if (!conversation.groupInviteCode || inviteCode !== conversation.groupInviteCode) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired invite link',
      });
    }

    // If admin approval required, add to pending requests
    if (conversation.requireJoinApproval) {
      const alreadyPending = (conversation.pendingJoinRequests || []).some(r => r.user?.toString() === userId);
      if (!alreadyPending) {
        conversation.pendingJoinRequests = conversation.pendingJoinRequests || [];
        conversation.pendingJoinRequests.push({ user: userId, inviteCode, requestedAt: new Date() });
        await conversation.save();

        // Notify admins
        const io = req.app.get("io");
        if (io) {
          (conversation.admins || []).forEach(adminId => {
            io.to(String(adminId)).emit("group:join_request", {
              groupId: String(groupId),
              userId,
              groupName: conversation.groupName,
            });
          });
        }

        return res.status(202).json({ success: true, pending: true, message: 'Join request sent. Waiting for admin approval.' });
      }
      return res.status(200).json({ success: true, pending: true, message: 'Join request already pending' });
    }

    const joiningUser = await User.findById(userId).select("username profilePicture");
    conversation.participants.push(userId);
    await conversation.save();

    const populated = await populateConversation(Conversation.findById(groupId));

    // Notify existing members in real time
    const io = req.app.get("io");
    if (io) {
      io.to(String(groupId)).emit("group:participant_added", {
        groupId: String(groupId),
        userId: String(userId),
        user: { _id: userId, username: joiningUser?.username, profilePicture: joiningUser?.profilePicture },
        viaLink: true,
      });
    }
    await createSystemMessage(req, conversation, userId, `${joiningUser?.username || "A user"} joined via invite link`);

    res.status(200).json({ success: true, message: 'Joined group successfully', conversation: populated });
  } catch (error) {
    console.error("Error joining group:", error);
    res.status(500).json({ success: false, message: 'Failed to join group' });
  }
};


// â”€â”€â”€ BAN / KICK MEMBER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.banMember = async (req, res) => {
  try {
    const { id: groupId, userId: targetUserId } = req.params;
    const { reason = '' } = req.body;
    const requesterId = getCurrentUserId(req);

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (!includesId(conversation.participants, requesterId))
      return res.status(403).json({ success: false, message: 'Not a member' });
    if (!includesId(conversation.admins, requesterId))
      return res.status(403).json({ success: false, message: 'Only admins can ban members' });

    const ownerStr = String(conversation.owner || conversation.createdBy || '');
    if (targetUserId === ownerStr)
      return res.status(403).json({ success: false, message: 'Cannot ban the group owner' });

    // Remove from participants
    conversation.participants = conversation.participants.filter(p => p.toString() !== targetUserId);
    conversation.admins = conversation.admins.filter(a => a.toString() !== targetUserId);

    // Add to banned list (avoid duplicates)
    const alreadyBanned = conversation.bannedMembers?.some(b => b.user?.toString() === targetUserId);
    if (!alreadyBanned) {
      conversation.bannedMembers = conversation.bannedMembers || [];
      conversation.bannedMembers.push({ user: targetUserId, bannedBy: requesterId, reason, bannedAt: new Date() });
    }

    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(String(groupId)).emit('group:member_banned', { groupId, userId: targetUserId, bannedBy: requesterId, reason });
      io.to(String(targetUserId)).emit('group:you_were_banned', { groupId, reason });
    }
    try {
      const bannedUserName = await getUserDisplayName(targetUserId);
      await createSystemMessage(req, conversation, requesterId, `${bannedUserName} was removed and banned`);
    } catch (sysErr) { console.error('[Group] system message error:', sysErr); }

    res.json({ success: true, message: 'Member banned successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€ UNBAN MEMBER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.unbanMember = async (req, res) => {
  try {
    const { id: groupId, userId: targetUserId } = req.params;
    const requesterId = getCurrentUserId(req);

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (!includesId(conversation.admins, requesterId))
      return res.status(403).json({ success: false, message: 'Only admins can unban members' });

    conversation.bannedMembers = (conversation.bannedMembers || []).filter(b => b.user?.toString() !== targetUserId);
    await conversation.save();

    res.json({ success: true, message: 'Member unbanned' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€ GET BANNED MEMBERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.getBannedMembers = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const requesterId = getCurrentUserId(req);

    const conversation = await Conversation.findById(groupId)
      .populate('bannedMembers.user', 'username profilePicture phoneNumber')
      .populate('bannedMembers.bannedBy', 'username profilePicture');

    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (!includesId(conversation.admins, requesterId))
      return res.status(403).json({ success: false, message: 'Only admins can view banned list' });

    res.json({ success: true, bannedMembers: conversation.bannedMembers || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€ TRANSFER OWNERSHIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.transferOwnership = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { newOwnerId } = req.body;
    const requesterId = getCurrentUserId(req);

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });

    const ownerStr = String(conversation.owner || conversation.createdBy || '');
    if (requesterId !== ownerStr)
      return res.status(403).json({ success: false, message: 'Only the group owner can transfer ownership' });

    if (!includesId(conversation.participants, newOwnerId))
      return res.status(400).json({ success: false, message: 'New owner must be a group member' });

    conversation.owner = newOwnerId;
    conversation.createdBy = newOwnerId;
    if (!includesId(conversation.admins, newOwnerId)) {
      conversation.admins.push(newOwnerId);
    }
    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(String(groupId)).emit('group:ownership_transferred', {
        groupId,
        newOwnerId,
        previousOwnerId: requesterId,
      });
    }
    try {
      const newOwnerUserName = await getUserDisplayName(newOwnerId);
      await createSystemMessage(req, conversation, requesterId, `${newOwnerUserName} is now the group owner`);
    } catch (sysErr) { console.error('[Group] system message error:', sysErr); }

    res.json({ success: true, message: 'Ownership transferred successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€ GET PENDING JOIN REQUESTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.getPendingJoinRequests = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const requesterId = getCurrentUserId(req);

    const conversation = await Conversation.findById(groupId)
      .populate('pendingJoinRequests.user', 'username profilePicture phoneNumber');

    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (!includesId(conversation.admins, requesterId))
      return res.status(403).json({ success: false, message: 'Only admins can view join requests' });

    res.json({ success: true, requests: conversation.pendingJoinRequests || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€ APPROVE JOIN REQUEST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.approveJoinRequest = async (req, res) => {
  try {
    const { id: groupId, userId: targetUserId } = req.params;
    const requesterId = getCurrentUserId(req);

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (!includesId(conversation.admins, requesterId))
      return res.status(403).json({ success: false, message: 'Only admins can approve join requests' });

    const reqIdx = (conversation.pendingJoinRequests || []).findIndex(r => r.user?.toString() === targetUserId);
    if (reqIdx === -1)
      return res.status(404).json({ success: false, message: 'Join request not found' });

    // SECURITY: approving a join request still adds the user to the group,
    // so the target's privacy.groups rule applies (contacts / contacts_except
    // exclusions) before they are admitted.
    const targetUser = await User.findById(targetUserId).select('settings contacts');
    const targetGroupPrivacy = targetUser?.settings?.privacy?.groups || 'everyone';
    if (targetGroupPrivacy === 'contacts' || targetGroupPrivacy === 'contacts_except') {
      const allowed = await isAllowed(targetUser, requesterId, targetGroupPrivacy, 'groups');
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "User's privacy settings do not allow you to add them to groups",
        });
      }
    }

    // Remove from pending and add to participants
    conversation.pendingJoinRequests.splice(reqIdx, 1);
    if (!includesId(conversation.participants, targetUserId)) {
      conversation.participants.push(targetUserId);
    }
    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(String(groupId)).emit('group:participant_added', { groupId, userId: targetUserId, approvedBy: requesterId });
      io.to(String(targetUserId)).emit('group:join_approved', { groupId, groupName: conversation.groupName });
    }
    try {
      const approvedUserName = await getUserDisplayName(targetUserId);
      await createSystemMessage(req, conversation, requesterId, `${approvedUserName} was added`);
    } catch (sysErr) { console.error('[Group] system message error:', sysErr); }

    res.json({ success: true, message: 'Join request approved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€ REJECT JOIN REQUEST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.rejectJoinRequest = async (req, res) => {
  try {
    const { id: groupId, userId: targetUserId } = req.params;
    const requesterId = getCurrentUserId(req);

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (!includesId(conversation.admins, requesterId))
      return res.status(403).json({ success: false, message: 'Only admins can reject join requests' });

    conversation.pendingJoinRequests = (conversation.pendingJoinRequests || []).filter(
      r => r.user?.toString() !== targetUserId
    );
    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(String(targetUserId)).emit('group:join_rejected', { groupId, groupName: conversation.groupName });
    }

    res.json({ success: true, message: 'Join request rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€ UPDATE ANTI-SPAM SETTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.updateAntiSpam = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { enabled, maxMessagesPerMinute, slowModeSeconds } = req.body;
    const requesterId = getCurrentUserId(req);

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (!includesId(conversation.admins, requesterId))
      return res.status(403).json({ success: false, message: 'Only admins can change anti-spam settings' });

    conversation.antiSpam = {
      enabled: enabled !== undefined ? Boolean(enabled) : conversation.antiSpam?.enabled,
      maxMessagesPerMinute: maxMessagesPerMinute || conversation.antiSpam?.maxMessagesPerMinute || 20,
      slowModeSeconds: slowModeSeconds !== undefined ? Number(slowModeSeconds) : conversation.antiSpam?.slowModeSeconds || 0,
    };
    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(String(groupId)).emit('group:antispam_updated', { groupId, antiSpam: conversation.antiSpam });
    }

    res.json({ success: true, antiSpam: conversation.antiSpam });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€ GROUP QR CODE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.getGroupQRCode = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const requesterId = getCurrentUserId(req);
    const QRCode = require('qrcode');

    const conversation = await Conversation.findById(groupId).select('+groupInviteCode');
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (!includesId(conversation.participants, requesterId))
      return res.status(403).json({ success: false, message: 'Not a member' });

    if (!conversation.groupInviteCode) {
      const crypto = require('crypto');
      conversation.groupInviteCode = crypto.randomBytes(16).toString('hex');
      await conversation.save();
    }

    const baseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_API_URL || 'http://localhost:5174';
    const inviteUrl = `${baseUrl}/join/${groupId}/${conversation.groupInviteCode}`;
    const qrDataUrl = await QRCode.toDataURL(inviteUrl, { width: 300, margin: 2 });

    res.json({ success: true, qrCode: qrDataUrl, inviteUrl, inviteCode: conversation.groupInviteCode });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€ CREATE GROUP EVENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.createGroupEvent = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { title, description, startTime, endTime } = req.body;
    const requesterId = getCurrentUserId(req);

    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Event title is required' });

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (!includesId(conversation.participants, requesterId))
      return res.status(403).json({ success: false, message: 'Not a member' });
    if (!includesId(conversation.admins, requesterId))
      return res.status(403).json({ success: false, message: 'Only admins can create events' });

    const event = {
      title: title.trim(),
      description: description?.trim() || '',
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      createdBy: requesterId,
      createdAt: new Date(),
      rsvp: [{ user: requesterId, status: 'going' }],
    };

    conversation.events = conversation.events || [];
    conversation.events.push(event);
    await conversation.save();

    // Return the saved subdocument (with its generated _id) so the client can
    // RSVP to it immediately without refetching.
    const savedEvent = conversation.events[conversation.events.length - 1];

    const io = req.app.get('io');
    if (io) {
      io.to(String(groupId)).emit('group:event_created', { groupId, event: savedEvent });
    }

    res.status(201).json({ success: true, event: savedEvent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€ RSVP GROUP EVENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.rsvpGroupEvent = async (req, res) => {
  try {
    const { id: groupId, eventId } = req.params;
    const { status } = req.body;
    const requesterId = getCurrentUserId(req);

    if (!['going', 'maybe', 'notgoing'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (!includesId(conversation.participants, requesterId))
      return res.status(403).json({ success: false, message: 'Not a member' });

    const event = (conversation.events || []).id(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const existing = event.rsvp?.find(r => r.user?.toString() === requesterId);
    if (existing) {
      existing.status = status;
    } else {
      event.rsvp = event.rsvp || [];
      event.rsvp.push({ user: requesterId, status });
    }

    await conversation.save();
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€ GET GROUP EVENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.getGroupEvents = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const requesterId = getCurrentUserId(req);

    const conversation = await Conversation.findById(groupId)
      .populate('events.createdBy', 'username profilePicture')
      .populate('events.rsvp.user', 'username profilePicture');

    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (!includesId(conversation.participants, requesterId))
      return res.status(403).json({ success: false, message: 'Not a member' });

    res.json({ success: true, events: conversation.events || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€ UPDATE JOIN APPROVAL REQUIREMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.updateJoinApproval = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { requireApproval } = req.body;
    const requesterId = getCurrentUserId(req);

    const conversation = await Conversation.findById(groupId);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (!includesId(conversation.admins, requesterId))
      return res.status(403).json({ success: false, message: 'Only admins can change join settings' });

    conversation.requireJoinApproval = Boolean(requireApproval);
    await conversation.save();

    res.json({ success: true, requireJoinApproval: conversation.requireJoinApproval });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
