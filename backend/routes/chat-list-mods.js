const express = require('express');
const router = express.Router();
const chatListModsController = require('../controllers/chatListModsController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Settings routes
router.get('/settings', chatListModsController.getChatListModsSettings);
router.post('/settings', chatListModsController.updateChatListModsSettings);

// Toggle routes for individual features
router.post('/hide-chats', chatListModsController.toggleHideChats);
router.post('/lock-chats', chatListModsController.toggleLockChats);
router.post('/pin-unlimited', chatListModsController.togglePinUnlimited);
router.post('/mark-unread', chatListModsController.toggleMarkUnread);
router.post('/archive-unlimited', chatListModsController.toggleArchiveUnlimited);
router.post('/chat-backup', chatListModsController.toggleChatBackup);
router.post('/chat-restore', chatListModsController.toggleChatRestore);
router.post('/chat-export', chatListModsController.toggleChatExport);

module.exports = router;
