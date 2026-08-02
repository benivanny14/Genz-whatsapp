const express = require('express');
const router = express.Router();
const statusAdvancedController = require('../controllers/statusAdvancedController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

// Voice & Audio Features
router.post('/:id/voice-changer', statusAdvancedController.applyVoiceChanger);
router.post('/:id/text-to-speech', statusAdvancedController.textToSpeech);

// Collaboration
router.post('/:id/collaborate', statusAdvancedController.addCollaborator);

// Archive
router.post('/:id/archive', statusAdvancedController.archiveStatus);
router.get('/archived', statusAdvancedController.getArchivedStatuses);

// Reminder
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

// Live
router.post('/:id/live', statusAdvancedController.startLive);
router.post('/:id/live/end', statusAdvancedController.endLive);

// Backup & Restore
router.post('/backup', statusAdvancedController.backupStatuses);
router.post('/restore', statusAdvancedController.restoreStatuses);

// QR Code
router.post('/:id/qr', statusAdvancedController.generateQRCode);

// Mentions
router.post('/:id/mention', statusAdvancedController.addMention);

// Hashtags
router.post('/:id/hashtags', statusAdvancedController.addHashtags);

// Edit
router.put('/:id/edit', statusAdvancedController.editStatus);

// Duplicate
router.post('/:id/duplicate', statusAdvancedController.duplicateStatus);

// Pin
router.post('/:id/pin', statusAdvancedController.pinStatus);
router.get('/pinned', statusAdvancedController.getPinnedStatuses);

// Report
router.post('/:id/report', statusAdvancedController.reportStatus);

// Templates
router.post('/template', statusAdvancedController.createTemplate);
router.get('/templates', statusAdvancedController.getTemplates);

// Drafts
router.post('/:id/draft', statusAdvancedController.saveDraft);
router.get('/drafts', statusAdvancedController.getDrafts);

// Favorites
router.post('/:id/favorite', statusAdvancedController.favoriteStatus);
router.get('/favorites', statusAdvancedController.getFavorites);

// History
router.get('/history', statusAdvancedController.getHistory);

// Insights
router.get('/:id/insights', statusAdvancedController.getInsights);
router.get('/:id/analytics', statusAdvancedController.getAnalytics);

// Boost
router.post('/:id/boost', statusAdvancedController.boostStatus);

// Share
router.post('/:id/share', statusAdvancedController.shareStatus);

// Download
router.post('/:id/download', statusAdvancedController.downloadStatus);

// Mute
router.post('/:id/mute', statusAdvancedController.muteUserStatus);

// Block
router.post('/:id/block', statusAdvancedController.blockUserStatus);

// Save to Collection
router.post('/:id/save', statusAdvancedController.saveToCollection);

// Forward
router.post('/:id/forward', statusAdvancedController.forwardStatus);

module.exports = router;
