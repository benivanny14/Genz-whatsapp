const express = require('express');
const router = express.Router();
const statusAdvancedController = require('../controllers/statusAdvancedController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

// ===== STATIC ROUTES (before /:id params to avoid conflicts) =====

// Backup & Restore
router.post('/backup', statusAdvancedController.backupStatuses);
router.get('/backup', statusAdvancedController.backupStatuses);
router.post('/restore', statusAdvancedController.restoreStatuses);

// Templates
router.post('/template', statusAdvancedController.createTemplate);
router.get('/templates', statusAdvancedController.getTemplates);

// Drafts
router.post('/draft', statusAdvancedController.saveDraft);
router.get('/drafts', statusAdvancedController.getDrafts);
router.delete('/drafts/:draftId', statusAdvancedController.deleteDraft);

// Favorites
router.post('/favorite', statusAdvancedController.favoriteStatus);
router.get('/favorites', statusAdvancedController.getFavorites);

// History
router.get('/history', statusAdvancedController.getHistory);

// Pinned
router.get('/pinned', statusAdvancedController.getPinnedStatuses);

// Hashtags
router.get('/hashtags/trending', statusAdvancedController.getTrendingHashtags);

// Live
// (removed: live status streaming was a placeholder with no RTMP/WebRTC infra)

// QR Code
router.post('/qr', statusAdvancedController.generateQRCode);

// ===== PARAMETERIZED ROUTES =====

// Archive
router.post('/:id/archive', statusAdvancedController.archiveStatus);
router.get('/archived', statusAdvancedController.getArchivedStatuses);

// Reminder
router.get('/:id/reminder', statusAdvancedController.getReminder);
router.post('/:id/reminder', statusAdvancedController.setReminder);

// Reactions
router.get('/:id/reactions', statusAdvancedController.getReactions);
router.post('/:id/react', statusAdvancedController.addReaction);

// Monetization
// (removed: no real ads/payment system, earnings were always 0)

// Accessibility
router.get('/:id/accessibility', statusAdvancedController.getAccessibility);
router.post('/:id/accessibility', statusAdvancedController.updateAccessibility);
router.post('/:id/alt-text', statusAdvancedController.generateAltText);
router.post('/:id/captions', statusAdvancedController.generateCaptions);

// Polls
router.post('/:id/poll', statusAdvancedController.createPoll);
router.post('/:id/poll/vote', statusAdvancedController.votePoll);

// Scheduler
router.post('/:id/schedule', statusAdvancedController.scheduleStatus);

// Location
router.post('/:id/location', statusAdvancedController.addLocation);

// Mentions
router.post('/:id/mention', statusAdvancedController.addMention);

// Hashtags (per-status)
router.post('/:id/hashtags', statusAdvancedController.addHashtags);

// Edit
router.put('/:id/edit', statusAdvancedController.editStatus);

// Duplicate
router.post('/:id/duplicate', statusAdvancedController.duplicateStatus);

// Pin
router.post('/:id/pin', statusAdvancedController.pinStatus);

// Report
router.post('/:id/report', statusAdvancedController.reportStatus);

// Drafts (per-status)
router.post('/:id/draft', statusAdvancedController.saveDraft);

// Favorites (per-status)
router.post('/:id/favorite', statusAdvancedController.favoriteStatus);

// Share / Download / Save to collection
router.post('/:id/share', statusAdvancedController.shareStatus);
router.post('/:id/download', statusAdvancedController.downloadStatus);
router.post('/:id/save', statusAdvancedController.saveToCollection);
router.post('/:id/forward', statusAdvancedController.forwardStatus);

// Mute / Block status users
router.post('/:id/mute', statusAdvancedController.muteUserStatus);
router.post('/:id/block', statusAdvancedController.blockUserStatus);

// Insights
router.get('/:id/insights', statusAdvancedController.getInsights);
router.get('/:id/analytics', statusAdvancedController.getAnalytics);

// Voice & Audio
router.post('/:id/voice-changer', statusAdvancedController.applyVoiceChanger);
router.post('/:id/text-to-speech', statusAdvancedController.textToSpeech);

// Collaboration
router.post('/:id/collaborate', statusAdvancedController.addCollaborator);
router.get('/:id/collaboration', statusAdvancedController.getCollaboration);
router.post('/:id/collaboration', statusAdvancedController.updateCollaboration);
router.post('/:id/contribute', statusAdvancedController.contributeToCollaboration);

// Mentions (read)
router.get('/:id/mentions', statusAdvancedController.getMentions);

// Location (read)
router.get('/:id/location', statusAdvancedController.getLocation);

module.exports = router;
