const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const fakeChatController = require('../controllers/fakeChatController');

router.use(protect);

router.post('/generate', fakeChatController.generateFakeChat);
router.delete('/clear-all', fakeChatController.clearAllChats);

module.exports = router;
