const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCommunities,
  createCommunity,
  joinCommunity,
  leaveCommunity,
  updateCommunity,
  deleteCommunity,
  addGroupToCommunity,
  removeGroupFromCommunity,
  createAnnouncementGroup
} = require('../controllers/communityController');

router.use(protect);

router.get('/', getCommunities);
router.post('/', createCommunity);
router.post('/:id/join', joinCommunity);
router.post('/:id/leave', leaveCommunity);
router.patch('/:id', updateCommunity);
router.delete('/:id', deleteCommunity);
router.post('/:id/groups', addGroupToCommunity);
router.delete('/:id/groups/:groupId', removeGroupFromCommunity);
router.post('/:id/announcement', createAnnouncementGroup);

module.exports = router;
