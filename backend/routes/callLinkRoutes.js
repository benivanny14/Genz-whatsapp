const express = require('express');
const router = express.Router();
const {
  createCallLink,
  resolveCallLink,
  joinCallLink,
  revokeCallLink
} = require('../controllers/callLinkController');
const { protect } = require('../middleware/auth');

// All call-link actions require a logged-in WhatsApp account (private app, not public calling)
router.use(protect);

router.post('/', createCallLink);
router.get('/:token', resolveCallLink);
router.post('/:token/join', joinCallLink);
router.delete('/:token', revokeCallLink);

module.exports = router;
