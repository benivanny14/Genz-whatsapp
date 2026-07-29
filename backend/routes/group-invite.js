const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  generateInviteLink,
  getInviteLink,
  revokeInviteLink,
  joinViaInviteLink,
  resetInviteLink
} = require('../controllers/groupInviteController');

router.use(protect);

router.post('/:groupId/invite-link', generateInviteLink);
router.get('/:groupId/invite-link', getInviteLink);
router.delete('/:groupId/invite-link', revokeInviteLink);
router.post('/:groupId/invite-link/reset', resetInviteLink);
router.post('/join/:inviteCode', joinViaInviteLink);

module.exports = router;
