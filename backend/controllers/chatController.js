const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const crypto = require("crypto");
const { applyPrivacyFilter } = require("../utils/privacyHelper");
const { resolveMessageMentions } = require("../utils/mentions");
const {
  normalizeReplyToId,
  getSelfDestructExpiry,
  isConversationBlocked,
  isEitherUserBlocked
} = require("../utils/messageSendHelpers");
const { serializeOutgoingMessage } = require("../utils/messageSerializer");
const { sendMentionNotification, sendNewMessageNotification } = require("../services/notificationService");
const { ensureUnreadMap, getUnreadCount, setUnreadCount } = require("../utils/unreadCount");

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || "60d5ecb8b392cb371c664c12";

const getCurrentUserId = (req) => req.user?._id?.toString() || LOCAL_USER_ID;

const includesId = (items = [], id) => {
  if (!Array.isArray(items)) return false;
  const target = id?._id ? id._id.toString() : id?.toString();
  return items.some(item => (item?._id ? item._id.toString() : item?.toString()) === target);
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
    // Delete in batches — passing a huge array to del() can exceed the call stack
    const BATCH = 500;
    for (let i = 0; i < keys.length; i += BATCH) {
      await redisClient.del(keys.slice(i, i + BATCH));
    }
  } catch (e) {}
};

// Persist a group "system" notice (e.g. "Juma was added", "Asha left the
// group", "Group name changed") as a real Message document — exactly like
// WhatsApp does — so it survives refresh and shows up in chat history,
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

const transformConversationForUser = (conversation, userId) => {
  const conv = conversation.toObject ? conversation.toObject() : conversation;

  // Transform Map values to user-specific booleans
  conv.isArchived = Boolean(getMapValue(conv.isArchived, userId));
  conv.isPinned = Boolean(getMapValue(conv.isPinned, userId));
  conv.isLocked = Boolean(getMapValue(conv.lockedBy, userId));
  conv.isMuted =
    Boolean(getMapValue(conv.mutedUntil, userId)) &&
    new Date(getMapValue(conv.mutedUntil, userId)) > new Date();
  
  // Include unread count for this specific user
  conv.unreadCount = conv.unreadCount ? (conv.unreadCount.get ? conv.unreadCount.get(userId) : conv.unreadCount[userId]) : 0;

  if (conv.participants && Array.isArray(conv.participants)) {
    conv.participants = conv.participants.map(p => applyPrivacyFilter(p, userId));
  }

  return conv;
};

const populateConversation = (query) =>
  query
    .populate(
      "participants",
      "username phoneNumber email profilePicture isOnline lastSeen about settings contacts",
    )
    .populate("admins", "username profilePicture")
    .populate("lastMessage");

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

    let conversations = await populateConversation(
      Conversation.find({ participants: userId, deletedFor: { $ne: userId } }),
    );

    // Transform conversations for current user
    conversations = conversations.map((conv) =>
      transformConversationForUser(conv, userId),
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
    const transformed = transformConversationForUser(populated, userId);

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

    if (userId === localUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot create conversation with yourself",
      });
    }

    const targetUser = await User.findById(userId).select("_id settings");
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let conversation = await Conversation.findOne({
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
        participants: [localUserId, userId],
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
    if (memberIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Group must have at least 2 other participants",
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

    // Check group privacy settings for all participants
    for (const user of existingUsers) {
      const groupPrivacy = user?.settings?.privacy?.groups || 'everyone';
      if (groupPrivacy === 'contacts' || groupPrivacy === 'contacts_except') {
        const isContact = (user.contacts || []).some(c => c.toString() === localUserId);
        if (!isContact) {
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
      const isContact = (targetUser.contacts || []).some(c => c.toString() === localUserId);
      if (!isContact) {
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
      messageType,
      mediaUrl,
      fileName,
      fileSize,
      duration,
      replyTo,
      isViewOnce,
      isSelfDestruct,
      mentions,
      messageId,
      selfDestructTimer,
    } = req.body;
    
    // 1. Frontend inaweza kuwa inatuma 'conversationId' au 'chatId', tunasoma zote mbili kulinda usalama
    const finalConversationId = conversationId || chatId;
    
    if (!finalConversationId || !mongoose.Types.ObjectId.isValid(finalConversationId)) {
      console.warn('[ChatController] sendMessage 400: Invalid conversation ID', { finalConversationId });
      return res.status(400).json({ success: false, message: "A valid Conversation ID is required" });
    }

    const conversation = await Conversation.findById(finalConversationId);

    if (!ensureParticipant(conversation, localUserId, res)) return;

    // ✅ Angalia kama mpokeaji amemzuia mtumaji
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
      
      if (isSelfDestruct && !disappearAt) {
        disappearAt = getSelfDestructExpiry({ isSelfDestruct, selfDestructTimer });
      }
    } catch (disappearErr) {
      console.warn('[ChatController] Disappearing timer skipped:', disappearErr?.message || disappearErr);
    }

    // 2. Hifadhi ujumbe rasmi kwenye MongoDB Database
    const message = await Message.create({
      conversationId: finalConversationId,
      sender: localUserId,
      content: String(safeContent),
      messageType: messageType || "text",
      mediaUrl: mediaUrl || "",
      fileName: fileName || "",
      fileSize: fileSize || 0,
      duration: duration || 0,
      replyTo: replyToId,
      isViewOnce: Boolean(isViewOnce),
      isSelfDestruct: Boolean(isSelfDestruct),
      mentions: mentionData.mentions || [],
      disappearAt,
      clientMessageId: messageId ? String(messageId) : '',
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

    // 3. Update mazungumzo (Conversation) ili iweke ujumbe huu kama ujumbe wa mwisho (Last Message)
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
    
    // 4. Rudisha ujumbe uliosavewa kwenda Frontend (respond before socket/cache side effects)
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
            String(safeContent || 'New message').slice(0, 120);
          for (const participantId of conversation.participants) {
            if (String(participantId) === String(localUserId)) continue;
            const blocked = await isEitherUserBlocked(localUserId, participantId);
            if (blocked) continue;
            const recipientId = String(participantId);
            io.to(recipientId).emit("message:received", plainMessage);
            if (updatedConversation) {
              io.to(recipientId).emit("conversation:unread-update", {
                conversationId: finalConversationId,
                unreadCount: getUnreadCount(updatedConversation, recipientId)
              });
            }
            notificationTasks.push(sendNewMessageNotification(recipientId, {
              senderName: populatedMessage?.sender?.username || 'GENZ',
              text: notificationText,
              conversationId: finalConversationId.toString(),
              senderId: localUserId.toString(),
              type: messageType || 'text'
            }));
          }
          if (notificationTasks.length) {
            Promise.allSettled(notificationTasks).catch((notifyErr) => {
              console.warn("[ChatController] Push notification failed:", notifyErr?.message || notifyErr);
            });
          }
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
        text: safeContent,
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
    const { content } = req.body;
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
    if (message.messageType !== "text") {
      return res
        .status(400)
        .json({ success: false, message: "Can only edit text messages" });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "username profilePicture")
      .populate({ path: "replyTo", populate: { path: "sender", select: "username profilePicture" } })
      .populate("mentions.user", "username profilePicture");

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
      if (message.sender.toString() !== localUserId) {
        return res.status(403).json({
          success: false,
          message: "Only sender can delete for everyone",
        });
      }
      message.deletedForEveryone = true;
      message.wasDeletedBySender = true;
      message.deletedAt = new Date();
      message.originalContent = message.originalContent || message.content;
    } else if (!includesId(message.deletedFor, localUserId)) {
      message.deletedFor.push(localUserId);
    }

    await message.save();

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit("message:deleted", {
        messageId: message._id,
        forEveryone: Boolean(forEveryone),
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

    if (!message.readBy.some((r) => r.user.toString() === localUserId)) {
      message.readBy.push({ user: localUserId, readAt: new Date() });
      if (readReceiptsEnabled) {
        message.status = "read";
      }
      await message.save();
    }

    const currentCount = getUnreadCount(conversation, localUserId);
    if (currentCount > 0) {
      setUnreadCount(conversation, localUserId, currentCount - 1);
    }
    await conversation.save();

    const io = req.app.get("io");
    if (io) {
      io.to(localUserId).emit("conversation:unread-update", {
        conversationId: conversation._id,
        unreadCount: getUnreadCount(conversation, localUserId)
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

exports.addReaction = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!ensureParticipant(conversation, localUserId, res)) return;

    const existingReaction = message.reactions.find(
      (r) => r.user.toString() === localUserId,
    );
    if (existingReaction) {
      existingReaction.emoji = emoji;
    } else {
      message.reactions.push({ user: localUserId, emoji });
    }
    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "username profilePicture")
      .populate({ path: "replyTo", populate: { path: "sender", select: "username profilePicture" } })
      .populate("mentions.user", "username profilePicture")
      .populate("reactions.user", "username profilePicture");

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit(
        "reaction:added",
        updatedMessage,
      );
    }

    res.status(200).json({ success: true, message: updatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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

    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== localUserId,
    );
    await message.save();

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
      $or: [{ username: regex }, { phoneNumber: regex }, { email: regex }],
    })
      .select(
        "username phoneNumber email profilePicture about isOnline lastSeen settings contacts",
      )
      .limit(25);

    const filteredUsers = users.map(user => applyPrivacyFilter(user, localUserId));

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
      User.findById(userId).select(
        "username phoneNumber email profilePicture about isOnline lastSeen settings contacts",
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
    }

    const filteredContact = applyPrivacyFilter(contact, localUserId);

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
      return res.status(400).json({ success: false, message: 'Tafadhali jaza jina na namba ya simu' });
    }

    const contactUser = await User.findOne({ phoneNumber: phone });
    if (!contactUser) {
      return res.status(404).json({ success: false, message: 'Namba hii bado haijasajiliwa kwenye GENZ WhatsApp' });
    }

    if (contactUser._id.toString() === localUserId.toString()) {
      return res.status(400).json({ success: false, message: 'Huwezi kujisave namba yako mwenyewe' });
    }

    const currentUser = await User.findById(localUserId);
    const alreadyExists = currentUser.contacts.some(
      (c) => c.user && c.user.toString() === contactUser._id.toString()
    );

    if (alreadyExists) {
      return res.status(400).json({ success: false, message: 'Mwasiliano huyu tayari yupo kwenye orodha yako' });
    }

    currentUser.contacts.push({ user: contactUser._id, savedName });
    await currentUser.save();

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
      message: 'Contact imeongezwa kikamilifu!',
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
    const user = await User.findById(localUserId).populate(
      "contacts.user",
      "username phoneNumber email profilePicture about isOnline lastSeen settings contacts",
    );

    const filteredContacts = (user?.contacts || []).map(contact => {
      if (!contact.user) return null;
      return {
        user: applyPrivacyFilter(contact.user, localUserId),
        savedName: contact.savedName
      };
    }).filter(Boolean);

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

    const io = req.app.get("io");
    if (io) {
      io.emit("user:blocked", { blockerId: localUserId, userId: targetId });
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

    // ✅ Futa block kwa PANDE ZOTE MBILI kama WhatsApp
    await User.updateOne(
      { _id: localUserId },
      { $pull: { blockedUsers: targetId } }
    );
    await User.updateOne(
      { _id: targetId },
      { $pull: { blockedUsers: localUserId } }
    );

    const io = req.app.get("io");
    if (io) {
      io.emit("user:unblocked", { blockerId: localUserId, userId: targetId });
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
    setMapValue(conversation, "isArchived", userId, !currentValue);

    await conversation.save();

    res.json({ success: true, isArchived: !currentValue, conversation });
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
    conversations = conversations
      .map((conv) => transformConversationForUser(conv, userId))
      .filter((c) => c.isArchived);

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

    res.json({ success: true, media: messages });
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
    };

    res.json({ success: true, messageInfo: info });
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
    message.content = message.isSelfDestruct ? '💥 Message self-destructed' : 'View Once message opened';
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
    // admin — these are the group-wide rules, not the content itself.
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
    const transformed = transformConversationForUser(updated, userId);

    // Notify every other participant in real time, the same way WhatsApp
    // pushes group setting changes to all members instantly — both to the
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
    const { targetConversationIds } = req.body;

    if (
      !Array.isArray(targetConversationIds) ||
      !targetConversationIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "targetConversationIds must be a non-empty array",
      });
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    const sourceConversation = await Conversation.findById(
      originalMessage.conversationId,
    );
    if (!ensureParticipant(sourceConversation, userId, res)) return;

    const forwardedMessages = [];
    const io = req.app.get("io");

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
        messageType: originalMessage.messageType,
        mediaUrl: originalMessage.mediaUrl,
        fileName: originalMessage.fileName,
        fileSize: originalMessage.fileSize,
        duration: originalMessage.duration,
        isForwarded: true,
        forwardedFrom: messageId,
        originalMessageId: messageId,
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

    // Create report (you might want to save this to a separate collection)
    const report = {
      messageId,
      conversationId: message.conversationId,
      reportedBy: userId,
      reportedUser: message.sender,
      reason,
      details,
      reportedAt: new Date(),
      status: "pending",
    };

    // For now, just log it and return success
    console.log("Message report:", report);

    res.json({ success: true, message: "Message reported successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    await conversation.save();

    res.json({
      success: true,
      groupInviteCode: conversation.groupInviteCode,
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
      // Already a member — just return the conversation so the frontend can open it
      const populated = await populateConversation(Conversation.findById(groupId));
      return res.status(200).json({ success: true, alreadyMember: true, conversation: populated });
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


// ─── BAN / KICK MEMBER ───────────────────────────────────────────────────────
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

// ─── UNBAN MEMBER ────────────────────────────────────────────────────────────
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

// ─── GET BANNED MEMBERS ──────────────────────────────────────────────────────
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

// ─── TRANSFER OWNERSHIP ──────────────────────────────────────────────────────
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

// ─── GET PENDING JOIN REQUESTS ───────────────────────────────────────────────
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

// ─── APPROVE JOIN REQUEST ────────────────────────────────────────────────────
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

// ─── REJECT JOIN REQUEST ─────────────────────────────────────────────────────
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

// ─── UPDATE ANTI-SPAM SETTINGS ───────────────────────────────────────────────
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

// ─── GROUP QR CODE ───────────────────────────────────────────────────────────
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

// ─── CREATE GROUP EVENT ──────────────────────────────────────────────────────
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

    const io = req.app.get('io');
    if (io) {
      io.to(String(groupId)).emit('group:event_created', { groupId, event });
    }

    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── RSVP GROUP EVENT ────────────────────────────────────────────────────────
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

// ─── GET GROUP EVENTS ────────────────────────────────────────────────────────
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

// ─── UPDATE JOIN APPROVAL REQUIREMENT ───────────────────────────────────────
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
