const express = require('express');
const router = express.Router();
const { adminLoginLimiter } = require('../middleware/adminLoginLimiter');
const { loginStep1, loginStep2, refreshSession, logout } = require('../controllers/adminAuthController');
const { bootstrapAdmin } = require('../controllers/adminController');

// NOTE: this router is mounted at an obscure, configurable base path
// (see ADMIN_BASE_PATH in server.js) — NOT at a guessable /api/admin/auth.

// Bootstrap endpoint - allows creating admin account via API with valid token
// This is the only way to create admin account without shell access
router.post('/bootstrap', bootstrapAdmin);

router.post('/login', adminLoginLimiter, loginStep1);
router.post('/verify-2fa', adminLoginLimiter, loginStep2);
router.post('/refresh', adminLoginLimiter, refreshSession);
router.post('/logout', logout);

module.exports = router;
