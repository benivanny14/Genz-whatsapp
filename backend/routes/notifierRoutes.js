const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const notifier = require('../controllers/onlineNotifierController');

router.use(protect);

router.post('/watch', notifier.watchUser);
router.post('/unwatch', notifier.unwatchUser);
router.post('/check', notifier.checkOnlineStatus);

module.exports = router;
