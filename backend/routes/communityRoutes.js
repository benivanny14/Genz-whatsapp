const express = require('express');
const router = express.Router();
const {
  createCommunity,
  getUserCommunities,
  getCommunity,
  addGroupToCommunity,
  removeGroupFromCommunity,
  addMemberToCommunity,
  updateCommunity
} = require('../controllers/communityController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createCommunity);
router.get('/', getUserCommunities);
router.get('/:communityId', getCommunity);
router.put('/:communityId', updateCommunity);
router.post('/:communityId/groups', addGroupToCommunity);
router.delete('/:communityId/groups/:groupId', removeGroupFromCommunity);
router.post('/:communityId/members', addMemberToCommunity);

module.exports = router;
