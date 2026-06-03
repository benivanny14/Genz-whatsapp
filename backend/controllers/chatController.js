const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const crypto = require("crypto");
const { applyPrivacyFilter } = require("../utils/privacyHelper");
const { resolveMessageMentions } = require("../utils/mentions");
const { sendMentionNotification } = require("../services/notificationService");
const { getUserPublicKeys } = require('../services/encryptionService');

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || "60d5ecb8b392cb371c664c12";

const getCurrentUserId = (req) => req.user?._id?.toString() || LOCAL_USER_ID;
const includesId = (items = [], id) =>
  items.some((item) => item?.toString() === id?.toString());

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
    if (keys.length > 0) await redisClient.del(keys);
  } catch (e) {}
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
      groupInviteCode: crypto.randomBytes(16).toString("hex"),
    });

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
      return res
        .status(400)
        .json({ success: false, message: "Not a group conversation" });
    }
    if (!includesId(conversation.admins, localUserId)) {
      return res
        .status(403)
        .json({ success: false, message: "Only admins can add participants" });
    }
    if (includesId(conversation.participants, userId)) {
      return res
        .status(400)
        .json({ success: false, message: "User already in group" });
    }

    const targetUser = await User.findById(userId).select("_id settings contacts");
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
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

    const updatedConversation = await populateConversation(
      Conversation.findById(conversation._id),
    );
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
      return res
        .status(400)
        .json({ success: false, message: "Not a group conversation" });
    }
    if (!includesId(conversation.admins, localUserId)) {
      return res.status(403).json({
        success: false,
        message: "Only admins can remove participants",
      });
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== req.params.userId,
    );
    conversation.admins = conversation.admins.filter(
      (a) => a.toString() !== req.params.userId,
    );
    await conversation.save();

    const updatedConversation = await populateConversation(
      Conversation.findById(conversation._id),
    );
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
      return res
        .status(400)
        .json({ success: false, message: "Not a group conversation" });
    }
    if (!includesId(conversation.admins, localUserId)) {
      return res.status(403).json({
        success: false,
        message: "Only admins can make other participants admin",
      });
    }
    if (!includesId(conversation.participants, req.params.userId)) {
      return res
        .status(400)
        .json({ success: false, message: "User not in group" });
    }

    if (!includesId(conversation.admins, req.params.userId)) {
      conversation.admins.push(req.params.userId);
      await conversation.save();
    }

    const updatedConversation = await populateConversation(
      Conversation.findById(conversation._id),
    );
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
      return res
        .status(400)
        .json({ success: false, message: "Not a group conversation" });
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== localUserId,
    );
    conversation.admins = conversation.admins.filter(
      (a) => a.toString() !== localUserId,
    );
    await conversation.save();

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
      .populate("replyTo")
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
    };

    const messages = await Message.find(filter)
      .populate("sender", "username profilePicture")
      .populate("replyTo")
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
      mentions,
    } = req.body;
    
    // 1. Frontend inaweza kuwa inatuma 'conversationId' au 'chatId', tunasoma zote mbili kulinda usalama
    const finalConversationId = conversationId || chatId;
    
    if (!finalConversationId || !mongoose.Types.ObjectId.isValid(finalConversationId)) {
      return res.status(400).json({ success: false, message: "A valid Conversation ID is required" });
    }

    const conversation = await Conversation.findById(finalConversationId);

    if (!ensureParticipant(conversation, localUserId, res)) return;
    const safeContent =
      content ||
      fileName ||
      (mediaUrl ? `${messageType || "media"} message` : "");
    if (!safeContent) {
      return res.status(400).json({
        success: false,
        message: "Message content or media is required",
      });
    }

    // If this is a direct 1:1 chat and the recipient has registered public keys,
    // require the client to send an encrypted payload (to avoid leaking plaintext).
    try {
      if (!conversation.isGroup) {
        const recipientId = conversation.participants.find(p => String(p) !== String(localUserId));
        if (recipientId) {
          let recipientKeys = null;
          try {
            recipientKeys = await getUserPublicKeys(recipientId);
          } catch (e) { recipientKeys = null; }

          const looksEncrypted = (typeof safeContent === 'string' && safeContent.trim().startsWith('{') && (() => {
            try {
              const parsed = JSON.parse(safeContent);
              return parsed && (parsed.ciphertext || parsed.encryptedData || parsed.algorithm);
            } catch (e) { return false; }
          })());

          if (recipientKeys && recipientKeys.publicKey && !looksEncrypted && messageType === 'text') {
            return res.status(400).json({
              success: false,
              message: 'Recipient supports end-to-end encryption. Send an encrypted payload or register your public key before sending plaintext.'
            });
          }
        }
      }
    } catch (e) {
      // If anything goes wrong with key checks, continue without enforcement
      console.warn('[ChatController] E2EE enforcement check failed:', e?.message || e);
    }

    const mentionData = await resolveMessageMentions({
      conversation,
      senderId: localUserId,
      content: safeContent,
      mentions
    });

    // Calculate disappearAt if disappearing messages are enabled
    let disappearAt = null;
    if (conversation.disappearingMessages && conversation.disappearingMessages.enabled) {
      const timer = conversation.disappearingMessages.timer || 24; // default 24 hours
      const durationMs = timer * 60 * 60 * 1000; // convert hours to milliseconds
      disappearAt = new Date(Date.now() + durationMs);
    }

    // 2. Hifadhi ujumbe rasmi kwenye MongoDB Database
    const message = await Message.create({
      conversationId: finalConversationId,
      sender: localUserId,
      content: safeContent,
      messageType: messageType || "text",
      mediaUrl: mediaUrl || "",
      fileName: fileName || "",
      fileSize: fileSize || 0,
      duration: duration || 0,
      replyTo: replyTo || null,
      isViewOnce: isViewOnce || false,
      mentions: mentionData.mentions,
      disappearAt,
    });

    let populatedMessage = null;
    try {
      populatedMessage = await Message.findById(message._id)
        .populate("sender", "username profilePicture")
        .populate("replyTo")
        .populate("mentions.user", "username profilePicture");
    } catch (popErr) {
      console.warn('[ChatController] Message population failed, falling back to raw message:', popErr?.message || popErr);
      populatedMessage = message;
    }

    // 3. Update mazungumzo (Conversation) ili iweke ujumbe huu kama ujumbe wa mwisho (Last Message)
    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();
    if (conversation.deletedFor?.length) {
      conversation.deletedFor = [];
    }
    await conversation.save();

    const io = req.app.get("io");
    if (io) {
      io.to(finalConversationId).emit("message:received", populatedMessage);
      
      // Emit directly to participants to ensure delivery even if they haven't opened the chat
      if (conversation.participants && Array.isArray(conversation.participants)) {
        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== localUserId.toString()) {
            io.to(participantId.toString()).emit("message:received", populatedMessage);
          }
        });
      }
    }

    await notifyMentionedUsers({
      mentionedUserIds: mentionData.mentionedUserIds,
      message: populatedMessage,
      senderName: populatedMessage.sender?.username,
      text: safeContent,
      mentionerId: localUserId
    });

    // Invalidate caches
    await invalidateCachePattern(req, `messages:${finalConversationId}:*`);
    await invalidateCachePattern(req, `conversations:*`); // Simplest way to refresh latest message in list

    // 4. Rudisha ujumbe uliosavewa kwenda Frontend
    res.status(201).json({ success: true, message: populatedMessage, ...populatedMessage.toObject() });
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
      .populate("replyTo")
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

    if (!message.readBy.some((r) => r.user.toString() === localUserId)) {
      message.readBy.push({ user: localUserId, readAt: new Date() });
      message.status = "read";
      await message.save();
    }

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit("message:read_receipt", {
        messageId: message._id,
        readerId: localUserId,
      });
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
      .populate("replyTo")
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
      .populate("replyTo")
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

    res.status(200).json({ 
      success: true,
      message: 'Contact imeongezwa kikamilifu!', 
      contact: { user: contactUser, savedName } 
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

    res.status(200).json({ success: true, message: "User blocked" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const localUserId = getCurrentUserId(req);
    const targetId = req.params.id;
    const user = await User.findById(localUserId);

    user.blockedUsers = user.blockedUsers.filter(
      (id) => id.toString() !== targetId,
    );
    await user.save();

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
      .populate("replyTo")
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
      .populate("replyTo")
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
      .populate("replyTo")
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

    if (!message.isViewOnce) {
      return res.status(400).json({
        success: false,
        message: "Message is not a view-once message",
      });
    }

    // Delete the message after viewing
    message.deletedForEveryone = true;
    message.deletedAt = new Date();
    await message.save();

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit("message:deleted", {
        messageId: message._id,
        forEveryone: true,
        reason: "view_once_viewed",
      });
    }

    res.json({ success: true, message: "View-once message deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update group info (name, description, photo)
exports.updateGroupInfo = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { groupId } = req.params;
    const { groupName, groupDescription, groupPhoto } = req.body;

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
        .json({ success: false, message: "Only admins can update group info" });
    }

    if (groupName) conversation.groupName = groupName.trim();
    if (groupDescription !== undefined)
      conversation.groupDescription = groupDescription;
    if (groupPhoto) conversation.groupPhoto = groupPhoto;

    await conversation.save();

    const updated = await populateConversation(Conversation.findById(groupId));
    const transformed = transformConversationForUser(updated, userId);

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
        forwardedFrom: messageId,
      });

      const populated = await Message.findById(forwardedMessage._id)
        .populate("sender", "username profilePicture")
        .populate("replyTo");

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
    const { groupId, memberId } = req.params;

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

    conversation.admins = conversation.admins.filter(
      (a) => a.toString() !== memberId,
    );
    await conversation.save();

    const updated = await populateConversation(Conversation.findById(groupId));
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
      adminOnlyMessaging: conversation.adminOnlyMessaging,
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

    const userId = req.user._id?.toString() || req.user.id?.toString();
    const isMember = conversation.participants.some((p) => p.toString() === userId);
    if (isMember) {
      return res.status(400).json({ success: false, message: 'Already a member' });
    }

    if (!conversation.groupInviteCode || inviteCode !== conversation.groupInviteCode) {
      return res.status(403).json({
        success: false,
        message: 'Valid invite code required to join this group'
      });
    }

    conversation.participants.push(userId);
    await conversation.save();

    res.status(200).json({ success: true, message: 'Joined group successfully', data: conversation });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ success: false, message: 'Failed to join group' });
  }
};

