const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const { strictRateLimiter } = require('../middleware/security');
const {
  bootstrapAdmin,
  getOverview,
  getHealth,
  listUsers,
  updateUser,
  setUserBlock,
  setUserAdminRole,
  getAuditLogs,
  getSecurityReport
} = require('../controllers/adminController');

router.post('/bootstrap', protect, strictRateLimiter, bootstrapAdmin);

router.use(protect, isAdmin);
router.get('/overview', getOverview);
router.get('/health', getHealth);
router.get('/users', listUsers);
router.patch('/users/:userId', strictRateLimiter, updateUser);
router.post('/users/:userId/:action(block|unblock)', strictRateLimiter, setUserBlock);
router.post('/users/:userId/:action(promote|demote)', strictRateLimiter, setUserAdminRole);
router.get('/audit-logs', getAuditLogs);
router.get('/security', getSecurityReport);

module.exports = router;
