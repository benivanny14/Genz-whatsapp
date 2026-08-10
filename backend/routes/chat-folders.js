const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addChatToFolder,
  autoOrganizeChats,
  createChatFolder,
  deleteChatFolder,
  getChatFolder,
  getChatFolders,
  getChatFoldersSettings,
  removeChatFromFolder,
  resetChatFoldersSettings,
  toggleChatFolders,
  updateChatFolder,
  updateChatFoldersSettings,
} = require('../controllers/chatListController');

router.use(protect);

router.get('/settings', getChatFoldersSettings);
router.post('/settings', updateChatFoldersSettings);
router.post('/create', createChatFolder);
router.get('/', getChatFolders);
router.post('/auto-organize', autoOrganizeChats);
router.post('/toggle', toggleChatFolders);
router.post('/reset', resetChatFoldersSettings);
router.get('/:id', getChatFolder);
router.post('/:id', updateChatFolder);
router.delete('/:id', deleteChatFolder);
router.post('/:folderId/chat', addChatToFolder);
router.delete('/:folderId/chat/:chatId', removeChatFromFolder);

module.exports = router;
