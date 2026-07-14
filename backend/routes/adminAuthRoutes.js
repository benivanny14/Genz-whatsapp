const express = require('express');
const router = express.Router();
const { adminLoginLimiter } = require('../middleware/adminLoginLimiter');
const { loginStep1, loginStep2, refreshSession, logout } = require('../controllers/adminAuthController');

// NOTE: this router is mounted at an obscure, configurable base path
// (see ADMIN_BASE_PATH in server.js) — NOT at a guessable /api/admin/auth.
router.post('/login', adminLoginLimiter, loginStep1);
router.post('/verify-2fa', adminLoginLimiter, loginStep2);
router.post('/refresh', adminLoginLimiter, refreshSession);
router.post('/logout', logout);

module.exports = router;
