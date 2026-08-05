const express = require('express');
const router = express.Router();
const { chatCompletion } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(protect);

// AI chat completion
router.post('/chat', apiLimiter, chatCompletion);

module.exports = router;
