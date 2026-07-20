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
  togglePinConversation,
  setConversationLanguage,
  toggleArchiveConversation,
  getArchivedConversations,
  searchMessages,
  getMediaGallery,
  getMessageInfo,
  markViewOnceViewed,
  updateGroupInfo,
  forwardMessage,
  reportMessage,
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
  pinMessage,
  getPinnedMessages,
  getSelfConversation,
  shareLiveLocation,
  stopLiveLocation,
  searchByUsername,
  updateWhatsappUsername,
} = require("../controllers/chatController");
const { validateMessage } = require("../middleware/validator");
const { protect } = require("../middleware/auth");

router.use(protect);

// Conversation routes
router.get("/conversations/archived", getArchivedConversations);
router.get("/conversations", getConversations);
router.get("/conversations/:id", getConversation);
router.post("/conversation", getOrCreateConversation);

// Group management
router.post("/groups", createGroup);
router.get("/groups/:groupId/info", getGroupInfo);
router.post("/groups/:groupId/invite/regenerate", regenerateGroupInvite);
router.put("/groups/:groupId/info", updateGroupInfo);
router.post("/groups/:id/participants", addParticipant);
router.delete("/groups/:id/participants/:userId", removeParticipant);
router.put("/groups/:id/admins/:userId", makeAdmin);
router.delete("/groups/:id/admins/:memberId", removeAdmin);
router.delete("/groups/:id/leave", leaveGroup);
router.post("/groups/:groupId/join", joinGroup);

// Group member management (ban, approve, ownership)
router.post("/groups/:id/ban/:userId", banMember);
router.delete("/groups/:id/ban/:userId", unbanMember);
router.get("/groups/:id/banned", getBannedMembers);
router.put("/groups/:id/transfer-ownership", transferOwnership);
router.get("/groups/:id/pending-requests", getPendingJoinRequests);
router.post("/groups/:id/pending-requests/:userId/approve", approveJoinRequest);
router.post("/groups/:id/pending-requests/:userId/reject", rejectJoinRequest);
router.put("/groups/:id/antispam", updateAntiSpam);
router.put("/groups/:id/join-approval", updateJoinApproval);
router.get("/groups/:id/qr", getGroupQRCode);

// Group events
router.get("/groups/:id/events", getGroupEvents);
router.post("/groups/:id/events", createGroupEvent);
router.post("/groups/:id/events/:eventId/rsvp", rsvpGroupEvent);

// Message routes
router.get("/conversations/:id/messages", getMessages);
router.get("/messages/starred", getStarredMessages);
router.get("/conversations/:conversationId/search", searchMessages);
router.get("/conversations/:conversationId/media", getMediaGallery);
router.post("/messages", validateMessage, sendMessage);
router.put("/messages/:id", editMessage);
router.delete("/messages/:id", deleteMessage);
router.delete("/messages/:id/delete-for-everyone", deleteMessage);
router.put("/messages/:id/read", markAsRead);
router.put("/messages/:id/star", toggleStarMessage);
router.put("/messages/:id/lock", toggleMessageLock);
router.get("/messages/:messageId/info", getMessageInfo);
router.put("/messages/:messageId/view-once-viewed", markViewOnceViewed);
router.post("/messages/:messageId/forward", forwardMessage);
router.post("/messages/:messageId/report", reportMessage);

// Message reactions
router.post("/messages/:id/reactions", addReaction);
router.delete("/messages/:id/reactions", removeReaction);

// Pin messages
router.put("/conversations/:conversationId/messages/:messageId/pin", pinMessage);
router.get("/conversations/:conversationId/pinned-messages", getPinnedMessages);

// Anti-screenshot
router.post("/messages/:messageId/screenshot-attempt", reportScreenshotAttempt);

// Chat settings
router.put("/conversations/:conversationId/pin", togglePinConversation);
router.put("/conversations/:conversationId/language", setConversationLanguage);
router.put("/conversations/:conversationId/archive", toggleArchiveConversation);

// Chat management
router.delete("/conversations/:chatId/clear", clearChat);
router.delete("/conversations/:chatId", deleteChat);

// Contact & user management
router.get("/users/search", searchUsers);
router.get("/users/search-by-username", searchByUsername);
router.post("/contacts/add", addContactByPhone);
router.post("/contacts", addContact);
router.get("/contacts", getContacts);
router.post("/users/:id/block", blockUser);
router.delete("/users/:id/block", unblockUser);

// Self-chat (Message Yourself)
router.get("/self-conversation", getSelfConversation);

// Live location
router.post("/conversations/:conversationId/live-location", shareLiveLocation);
router.delete("/conversations/:conversationId/live-location", stopLiveLocation);

// WhatsApp username
router.put("/users/whatsapp-username", updateWhatsappUsername);

module.exports = router;
