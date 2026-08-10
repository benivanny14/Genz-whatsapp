const express = require('express');
const router = express.Router();
const messageModsController = require('../controllers/messageToolsController');
const { protect } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(protect);

// Settings routes
router.get('/settings', messageModsController.getMessageModsSettings);
router.post('/settings', messageModsController.updateMessageModsSettings);

// Toggle routes for individual features
router.post('/send-any-file', messageModsController.toggleSendAnyFile);
router.post('/file-size-limit', messageModsController.toggleFileSizeLimit);
router.post('/edit-sent', messageModsController.toggleEditSent);
router.post('/delete-bypass', messageModsController.toggleDeleteBypass);
router.post('/encryption', messageModsController.toggleEncryption);
router.post('/translation', messageModsController.toggleTranslation);
router.post('/transcription', messageModsController.toggleTranscription);
router.post('/blank-messages', messageModsController.toggleBlankMessages);
router.post('/send-blank', messageModsController.sendBlankMessage);

module.exports = router;
