const express = require('express');
const router = express.Router();
const statusAdvancedController = require('../controllers/statusAdvancedController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

// ===== STATIC ROUTES (before /:id params to avoid conflicts) =====

// Backup & Restore
router.post('/backup', statusAdvancedController.backupStatuses);
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
router.post('/live', statusAdvancedController.startLiveStatus);

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
router.get('/:id/monetization', statusAdvancedController.getMonetization);
router.post('/:id/monetization', statusAdvancedController.updateMonetization);

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

// Live (per-status)
router.post('/:id/live', statusAdvancedController.startLive);
router.post('/:id/live/end', statusAdvancedController.endLive);

// QR Code (per-status)
router.post('/:id/qr', statusAdvancedController.generateQRCode);

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

// Insights
router.get('/:id/insights', statusAdvancedController.getInsights);
router.get('/:id/analytics', statusAdvancedController.getAnalytics);

// Boost
router.post('/:id/boost', statusAdvancedController.boostStatus);

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
