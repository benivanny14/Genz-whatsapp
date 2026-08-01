const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getLocationSharingSettings,
  updateLocationSharingSettings,
  shareLocation,
  startLiveLocation,
  updateLiveLocation,
  stopLiveLocation,
  getActiveLiveLocations,
  getNearbyFriends,
  updateLastLocation,
  toggleLocationSharing,
  resetLocationSharingSettings
} = require('../controllers/locationSharingController');

router.use(protect);

router.get('/settings', getLocationSharingSettings);
router.post('/settings', updateLocationSharingSettings);
router.get('/active', getActiveLiveLocations);
router.get('/nearby', getNearbyFriends);
router.post('/share', shareLocation);
router.post('/live/start', startLiveLocation);
router.post('/live/update', updateLiveLocation);
router.post('/stop/:shareId', stopLiveLocation);
router.post('/location', updateLastLocation);
router.post('/toggle', toggleLocationSharing);
router.post('/reset', resetLocationSharingSettings);

module.exports = router;
