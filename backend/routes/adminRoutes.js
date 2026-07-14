const express = require('express');
const router = express.Router();
const { superAdminAuth } = require('../middleware/superAdminAuth');
const { strictRateLimiter } = require('../middleware/security');
const {
  getOverview,
  getHealth,
  listUsers,
  updateUser,
  setUserBlock,
  getAuditLogs,
  getSecurityReport
} = require('../controllers/adminController');
const content = require('../controllers/adminContentController');
const calls = require('../controllers/adminCallsController');
const broadcast = require('../controllers/adminBroadcastController');
const support = require('../controllers/adminSupportController');
const insights = require('../controllers/adminInsightsController');
const access = require('../controllers/adminAccessController');

// SECURITY NOTE:
// The old self-service "/bootstrap" + "promote/demote" routes have been
// REMOVED. Admin identity now lives exclusively in the AdminOwner
// collection (see models/AdminOwner.js) and can only be created via the
// backend/scripts/bootstrapAdminOwner.js CLI script, run on the server
// itself. No regular user account can ever become an admin through the API.

router.use(superAdminAuth);

// --- Msingi ---
router.get('/overview', getOverview);
router.get('/health', getHealth);
router.get('/users', listUsers);
router.patch('/users/:userId', strictRateLimiter, updateUser);
router.post('/users/:userId/:action(block|unblock)', strictRateLimiter, setUserBlock);
router.get('/audit-logs', getAuditLogs);
router.get('/security', getSecurityReport);

// --- Chat Management ---
router.get('/chats', content.listConversations);
router.get('/chats/:id/messages', content.getConversationMessages);
router.delete('/chats/:id', strictRateLimiter, content.deleteConversation);

// --- Group Management ---
router.get('/groups', content.listGroups);
router.get('/groups/:id', content.getGroupMembers);
router.post('/groups/:id/members/:userId/remove', strictRateLimiter, content.removeGroupMember);
router.delete('/groups/:id', strictRateLimiter, content.deleteGroup);

// --- Channel Management ---
router.get('/channels', content.listChannels);
router.patch('/channels/:id/verify', strictRateLimiter, content.toggleChannelVerified);
router.delete('/channels/:id', strictRateLimiter, content.deleteChannel);
router.get('/channels/:id/posts', content.listChannelPosts);
router.delete('/channels/:id/posts/:postId', strictRateLimiter, content.deleteChannelPost);

// --- Status / Stories Management ---
router.get('/statuses', content.listStatuses);
router.get('/statuses/highlights', content.listStoryHighlights);
router.delete('/statuses/:id', strictRateLimiter, content.deleteStatus);

// --- Calls Management ---
router.get('/calls', calls.listCalls);
router.get('/calls/stats', calls.getCallStats);
router.delete('/calls/:id', strictRateLimiter, calls.deleteCallLog);

// --- Broadcast System ---
router.get('/broadcasts', broadcast.listBroadcasts);
router.delete('/broadcasts/:id', strictRateLimiter, broadcast.deleteBroadcast);
router.post('/broadcasts/announce', strictRateLimiter, broadcast.sendSystemAnnouncement);

// --- Notification Center ---
router.get('/notifications/overview', broadcast.getNotificationOverview);
router.post('/notifications/send', strictRateLimiter, broadcast.sendPushNotification);

// --- Support Ticket System ---
router.get('/tickets', support.listTickets);
router.get('/tickets/:id', support.getTicket);
router.post('/tickets/:id/reply', strictRateLimiter, support.replyToTicket);
router.patch('/tickets/:id/status', strictRateLimiter, support.updateTicketStatus);

// --- Admin <-> User Chat ---
router.get('/direct-chats', support.listDirectChats);
router.post('/direct-chats/start', strictRateLimiter, support.startDirectChat);

// --- Reports & Analytics ---
router.get('/reports/growth', insights.getGrowthReport);
router.get('/reports/engagement', insights.getEngagementReport);

// --- Fraud Detection ---
router.get('/fraud/signals', insights.getFraudSignals);

// --- Roles & Permissions ---
router.get('/permissions/options', access.listPermissionOptions);
router.get('/permissions/users', access.listUsersWithPermissions);
router.patch('/permissions/users/:userId', strictRateLimiter, access.setUserPermissions);

// --- Device Management ---
router.get('/devices', access.listDevices);
router.delete('/devices/:id', strictRateLimiter, access.revokeDevice);

// --- Session Management ---
router.get('/sessions/:userId', access.listUserSessions);
router.delete('/sessions/:userId/all', strictRateLimiter, access.revokeAllUserSessions);
router.delete('/sessions/:userId/:sessionToken', strictRateLimiter, access.revokeUserSession);

module.exports = router;
