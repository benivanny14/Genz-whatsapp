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
  searchUsers,
  addContact,
  addContactByPhone,
  getContacts,
  blockUser,
  unblockUser,
  toggleStarMessage,
  toggleMessageLock,
  togglePinConversation,
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

// Chat settings
router.put("/conversations/:conversationId/pin", togglePinConversation);
router.put("/conversations/:conversationId/archive", toggleArchiveConversation);

// Chat management
router.delete("/conversations/:chatId/clear", clearChat);
router.delete("/conversations/:chatId", deleteChat);

// Contact & user management
router.get("/users/search", searchUsers);
router.post("/contacts/add", addContactByPhone);
router.post("/contacts", addContact);
router.get("/contacts", getContacts);
router.post("/users/:id/block", blockUser);
router.delete("/users/:id/block", unblockUser);

module.exports = router;
