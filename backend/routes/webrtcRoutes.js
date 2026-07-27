const express = require('express');
const router = express.Router();
const { getConfig } = require('../controllers/webrtcController');
const { protect } = require('../middleware/auth');

router.get('/config', protect, getConfig);

module.exports = router;
