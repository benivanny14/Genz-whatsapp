const express = require('express');
const router = express.Router();
const { superAdminAuth } = require('../middleware/superAdminAuth');
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

const {
  listPermissionOptions,
  listUsersWithPermissions,
  setUserPermissions,
  listDevices,
  revokeDevice,
  listUserSessions,
  revokeUserSession,
  revokeAllUserSessions
} = require('../controllers/adminAccessController');

const {
  listAbuseReports,
  getAbuseReport,
  updateAbuseReportStatus,
  deleteAbuseReport,
  getAbuseReportStats
} = require('../controllers/adminAbuseController');

const {
  listBroadcasts,
  deleteBroadcast,
  sendSystemAnnouncement,
  getNotificationOverview,
  sendPushNotification
} = require('../controllers/adminBroadcastController');

const {
  listCalls,
  getCallStats,
  deleteCallLog
} = require('../controllers/adminCallsController');

const {
  listConversations,
  getConversationMessages,
  deleteConversation,
  listGroups,
  getGroupMembers,
  removeGroupMember,
  deleteGroup,
  listChannels,
  toggleChannelVerified,
  deleteChannel,
  listChannelPosts,
  deleteChannelPost,
  listStatuses,
  listStoryHighlights,
  deleteStatus
} = require('../controllers/adminContentController');

const {
  getGrowthReport,
  getEngagementReport,
  getFraudSignals
} = require('../controllers/adminInsightsController');

const {
  listTickets,
  getTicket,
  replyToTicket,
  updateTicketStatus,
  listDirectChats,
  startDirectChat
} = require('../controllers/adminSupportController');

router.post('/bootstrap', strictRateLimiter, bootstrapAdmin);

router.use(superAdminAuth);

// --- Core: overview, users, audit, security ---
router.get('/overview', getOverview);
router.get('/health', getHealth);
router.get('/users', listUsers);
router.patch('/users/:userId', strictRateLimiter, updateUser);
router.post('/users/:userId/:action(block|unblock)', strictRateLimiter, setUserBlock);
router.post('/users/:userId/:action(promote|demote)', strictRateLimiter, setUserAdminRole);
router.get('/audit-logs', getAuditLogs);
router.get('/security', getSecurityReport);

// --- Roles & permissions (in-app), devices, sessions ---
router.get('/permissions/options', listPermissionOptions);
router.get('/permissions/users', listUsersWithPermissions);
router.patch('/permissions/users/:userId', strictRateLimiter, setUserPermissions);
router.get('/devices', listDevices);
router.delete('/devices/:id', strictRateLimiter, revokeDevice);
router.get('/sessions/:userId', listUserSessions);
router.delete('/sessions/:userId/all', strictRateLimiter, revokeAllUserSessions);
router.delete('/sessions/:userId/:sessionToken', strictRateLimiter, revokeUserSession);

// --- Abuse reports ---
router.get('/abuse-reports/stats', getAbuseReportStats);
router.get('/abuse-reports', listAbuseReports);
router.get('/abuse-reports/:id', getAbuseReport);
router.patch('/abuse-reports/:id/status', strictRateLimiter, updateAbuseReportStatus);
router.delete('/abuse-reports/:id', strictRateLimiter, deleteAbuseReport);

// --- Broadcasts & push notifications ---
router.get('/broadcasts', listBroadcasts);
router.post('/broadcasts/announce', strictRateLimiter, sendSystemAnnouncement);
router.delete('/broadcasts/:id', strictRateLimiter, deleteBroadcast);
router.get('/notifications/overview', getNotificationOverview);
router.post('/notifications/send', strictRateLimiter, sendPushNotification);

// --- Calls ---
router.get('/calls/stats', getCallStats);
router.get('/calls', listCalls);
router.delete('/calls/:id', strictRateLimiter, deleteCallLog);

// --- Chats / groups / channels / statuses (content moderation) ---
router.get('/chats', listConversations);
router.get('/chats/:id/messages', getConversationMessages);
router.delete('/chats/:id', strictRateLimiter, deleteConversation);

router.get('/groups', listGroups);
router.get('/groups/:id', getGroupMembers);
router.post('/groups/:id/members/:userId/remove', strictRateLimiter, removeGroupMember);
router.delete('/groups/:id', strictRateLimiter, deleteGroup);

router.get('/channels', listChannels);
router.patch('/channels/:id/verify', strictRateLimiter, toggleChannelVerified);
router.delete('/channels/:id', strictRateLimiter, deleteChannel);
router.get('/channels/:id/posts', listChannelPosts);
router.delete('/channels/:id/posts/:postId', strictRateLimiter, deleteChannelPost);

router.get('/statuses/highlights', listStoryHighlights);
router.get('/statuses', listStatuses);
router.delete('/statuses/:id', strictRateLimiter, deleteStatus);

// --- Reports & fraud insights ---
router.get('/reports/growth', getGrowthReport);
router.get('/reports/engagement', getEngagementReport);
router.get('/fraud/signals', getFraudSignals);

// --- Support tickets & admin-to-user direct chats ---
router.get('/tickets', listTickets);
router.get('/tickets/:id', getTicket);
router.post('/tickets/:id/reply', strictRateLimiter, replyToTicket);
router.patch('/tickets/:id/status', strictRateLimiter, updateTicketStatus);
router.get('/direct-chats', listDirectChats);
router.post('/direct-chats/start', strictRateLimiter, startDirectChat);

module.exports = router;
