const express = require('express');
const router = express.Router();
const {
  recordProfileView,
  getMyProfileViewers,
  clearProfileViews
} = require('../controllers/profileViewController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/viewers', getMyProfileViewers);
router.post('/view/:userId', recordProfileView);
router.delete('/viewers', clearProfileViews);

module.exports = router;
