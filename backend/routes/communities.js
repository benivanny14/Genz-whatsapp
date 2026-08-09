const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCommunities,
  createCommunity,
  joinCommunity,
  leaveCommunity,
  updateCommunity,
  deleteCommunity
} = require('../controllers/communityController');

router.use(protect);

router.get('/', getCommunities);
router.post('/', createCommunity);
router.post('/:id/join', joinCommunity);
router.post('/:id/leave', leaveCommunity);
router.patch('/:id', updateCommunity);
router.delete('/:id', deleteCommunity);

module.exports = router;
