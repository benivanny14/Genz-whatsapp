const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createGroupEvent,
  createGroupPoll,
  getGroupFeaturesSettings,
  resetGroupFeaturesSettings,
  rsvpGroupEvent,
  setGroupAnnouncementsMode,
  toggleAntiDeleteGroupMessages,
  toggleGroupAdminControl,
  toggleGroupAnnouncements,
  toggleGroupEvents,
  toggleGroupPolls,
  updateGroupFeaturesSettings,
  updateGroupMemberLimit,
  voteGroupPoll,
} = require('../controllers/groupFeaturesController');

router.use(protect);

router.get('/settings', getGroupFeaturesSettings);
router.post('/settings', updateGroupFeaturesSettings);
router.post('/member-limit', updateGroupMemberLimit);
router.post('/admin-control', toggleGroupAdminControl);
router.post('/polls', toggleGroupPolls);
router.post('/poll/create', createGroupPoll);
router.post('/poll/vote', voteGroupPoll);
router.post('/announcements', toggleGroupAnnouncements);
router.post('/announcements-mode', setGroupAnnouncementsMode);
router.post('/events', toggleGroupEvents);
router.post('/event/create', createGroupEvent);
router.post('/event/rsvp', rsvpGroupEvent);
router.post('/anti-delete', toggleAntiDeleteGroupMessages);
router.post('/reset', resetGroupFeaturesSettings);

module.exports = router;
