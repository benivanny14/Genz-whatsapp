const express = require("express");
const router = express.Router();
const {
  getConversations,
  getConversation,
  getOrCreateConversation,
  createGroup,
  addParticipant,
  removeParticipant,
  makeAdmin,
  removeAdmin,
  leaveGroup,
  joinGroup,
  getMessages,
  getStarredMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
  addReaction,
  removeReaction,
  reportScreenshotAttempt,
  searchUsers,
  addContact,
  addContactByPhone,
  getContacts,
  blockUser,
  unblockUser,
  toggleStarMessage,
  toggleMessageLock,
  toggleKeepMessage,
  togglePinConversation,
  toggleArchiveConversation,
  getArchivedConversations,
  searchMessages,
  getMediaGallery,
  getMessageInfo,
  getMessageEditHistory,
  markViewOnceViewed,
  updateGroupInfo,
  forwardMessage,
   reportMessage,
   reportUser,
  getGroupInfo,
  regenerateGroupInvite,
  clearChat,
  deleteChat,
  // New group management
  banMember,
  unbanMember,
  getBannedMembers,
  transferOwnership,
  getPendingJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  updateAntiSpam,
  getGroupQRCode,
  createGroupEvent,
  rsvpGroupEvent,
  getGroupEvents,
  updateJoinApproval,
} = require("../controllers/chatController");
const { validateMessage } = require("../middleware/validator");
const { protect, requirePhoneVerified } = require("../middleware/auth");
const { privacyMiddleware } = require("../middleware/privacy");
const { messageSenderLimiter } = require("../middleware/rateLimiters");

router.use(protect);

// Conversation routes
router.get("/conversations/archived", getArchivedConversations);
router.get("/conversations", getConversations);
router.get("/conversations/:id", getConversation);
router.post("/conversation", requirePhoneVerified, getOrCreateConversation);

// Group management
router.post("/groups", requirePhoneVerified, createGroup);
router.get("/groups/:groupId/info", getGroupInfo);
router.post("/groups/:groupId/invite/regenerate", requirePhoneVerified, regenerateGroupInvite);
router.put("/groups/:groupId/info", requirePhoneVerified, updateGroupInfo);
router.post("/groups/:id/participants", requirePhoneVerified, addParticipant);
router.delete("/groups/:id/participants/:userId", requirePhoneVerified, removeParticipant);
router.put("/groups/:id/admins/:userId", requirePhoneVerified, makeAdmin);
router.delete("/groups/:id/admins/:memberId", requirePhoneVerified, removeAdmin);
router.delete("/groups/:id/leave", requirePhoneVerified, leaveGroup);
router.post("/groups/:groupId/join", requirePhoneVerified, joinGroup);

// Group member management (ban, approve, ownership)
router.post("/groups/:id/ban/:userId", requirePhoneVerified, banMember);
router.delete("/groups/:id/ban/:userId", requirePhoneVerified, unbanMember);
router.get("/groups/:id/banned", getBannedMembers);
router.put("/groups/:id/transfer-ownership", requirePhoneVerified, transferOwnership);
router.get("/groups/:id/pending-requests", getPendingJoinRequests);
router.post("/groups/:id/pending-requests/:userId/approve", requirePhoneVerified, approveJoinRequest);
router.post("/groups/:id/pending-requests/:userId/reject", requirePhoneVerified, rejectJoinRequest);
router.put("/groups/:id/antispam", requirePhoneVerified, updateAntiSpam);
router.put("/groups/:id/join-approval", requirePhoneVerified, updateJoinApproval);
router.get("/groups/:id/qr", getGroupQRCode);

// Group events
router.get("/groups/:id/events", getGroupEvents);
router.post("/groups/:id/events", requirePhoneVerified, createGroupEvent);
router.post("/groups/:id/events/:eventId/rsvp", requirePhoneVerified, rsvpGroupEvent);

// Message routes
router.get("/conversations/:id/messages", getMessages);
router.get("/messages/starred", getStarredMessages);
router.get("/conversations/:conversationId/search", searchMessages);
router.get("/conversations/:conversationId/media", getMediaGallery);
router.post("/messages", requirePhoneVerified, messageSenderLimiter, validateMessage, sendMessage);
router.put("/messages/:id", requirePhoneVerified, editMessage);
router.delete("/messages/:id", requirePhoneVerified, deleteMessage);
router.delete("/messages/:id/delete-for-everyone", requirePhoneVerified, deleteMessage);
router.delete("/messages/:id/admin-delete-for-everyone", requirePhoneVerified, (req, res, next) => {
  req.body.forEveryone = true;
  req.body.adminDelete = true;
  next();
}, deleteMessage);
router.put("/messages/:id/read", markAsRead);
router.put("/messages/:id/star", toggleStarMessage);
router.put("/messages/:id/lock", toggleMessageLock);
router.put("/messages/:id/keep", toggleKeepMessage);
router.get("/messages/:messageId/info", getMessageInfo);
router.get("/messages/:messageId/edit-history", getMessageEditHistory);
router.put("/messages/:messageId/view-once-viewed", markViewOnceViewed);
router.post("/messages/:messageId/forward", requirePhoneVerified, forwardMessage);
router.post("/messages/:messageId/report", requirePhoneVerified, reportMessage);

// Message reactions
router.post("/messages/:id/reactions", requirePhoneVerified, addReaction);
router.delete("/messages/:id/reactions", requirePhoneVerified, removeReaction);

// Anti-screenshot
router.post("/messages/:messageId/screenshot-attempt", reportScreenshotAttempt);

// Chat settings
router.put("/conversations/:conversationId/pin", togglePinConversation);
router.put("/conversations/:conversationId/archive", toggleArchiveConversation);

// Chat management
router.delete("/conversations/:chatId/clear", clearChat);
router.delete("/conversations/:chatId", deleteChat);

// Contact & user management
router.get("/users/search", privacyMiddleware, searchUsers);
router.post("/contacts/add", addContactByPhone);
router.post("/contacts", addContact);
router.get("/contacts", privacyMiddleware, getContacts);
router.post("/users/:id/block", blockUser);
router.delete("/users/:id/block", unblockUser);
router.post("/users/:id/report", reportUser);

module.exports = router;
