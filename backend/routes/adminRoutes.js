const express = require('express');
const router = express.Router();
const { superAdminAuth } = require('../middleware/superAdminAuth');
const { strictRateLimiter } = require('../middleware/security');
const { protect } = require('../middleware/auth');
const {
  bootstrapAdmin,
  getOverview,
  getHealth,
  listUsers,
  updateUser,
  setUserBlock,
  setUserAdminRole,
  deleteUser,
  getAuditLogs,
  getSecurityReport,
  getFrontendCrashes,
  getAppEventSummary,
  getNightlyStatus
} = require('../controllers/adminController');

const {
  listAbuseReports,
  getAbuseReport,
  updateAbuseReportStatus,
  deleteAbuseReport,
  getAbuseReportStats
} = require('../controllers/adminAbuseController');

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
  listBroadcasts,
  deleteBroadcast,
  sendSystemAnnouncement,
  getNotificationOverview,
  sendPushNotification
} = require('../controllers/adminBroadcastController');

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

const {
  listAllBackups,
  deleteBackupFile
} = require('../controllers/adminBackupController');

router.post('/bootstrap', strictRateLimiter, protect, bootstrapAdmin);

router.use(superAdminAuth);
router.get('/overview', getOverview);
router.get('/health', getHealth);
router.get('/users', listUsers);
router.patch('/users/:userId', strictRateLimiter, updateUser);
router.post('/users/:userId/:action(block|unblock)', strictRateLimiter, setUserBlock);
router.post('/users/:userId/:action(promote|demote)', strictRateLimiter, setUserAdminRole);
router.delete('/users/:userId', strictRateLimiter, deleteUser);
router.get('/audit-logs', getAuditLogs);
router.get('/security', getSecurityReport);

// ── Abuse reports ──
router.get('/abuse-reports', listAbuseReports);
router.get('/abuse-reports/stats', getAbuseReportStats);
router.get('/abuse-reports/:id', getAbuseReport);
router.patch('/abuse-reports/:id/status', strictRateLimiter, updateAbuseReportStatus);
router.delete('/abuse-reports/:id', strictRateLimiter, deleteAbuseReport);

// ── Access / permissions / devices / sessions ──
router.get('/permissions/options', listPermissionOptions);
router.get('/permissions/users', listUsersWithPermissions);
router.patch('/permissions/users/:userId', strictRateLimiter, setUserPermissions);
router.get('/devices', listDevices);
router.delete('/devices/:id', strictRateLimiter, revokeDevice);
router.get('/sessions/:userId', listUserSessions);
router.delete('/sessions/:userId/all', strictRateLimiter, revokeAllUserSessions);
router.delete('/sessions/:userId/:token', strictRateLimiter, revokeUserSession);

// ── Broadcasts / notifications ──
router.get('/broadcasts', listBroadcasts);
router.delete('/broadcasts/:id', strictRateLimiter, deleteBroadcast);
router.post('/broadcasts/announce', strictRateLimiter, sendSystemAnnouncement);
router.get('/notifications/overview', getNotificationOverview);
router.post('/notifications/send', strictRateLimiter, sendPushNotification);

// ── Content moderation: chats, groups, channels, statuses ──
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
router.delete('/channels/:channelId/posts/:postId', strictRateLimiter, deleteChannelPost);

router.get('/statuses', listStatuses);
router.get('/statuses/highlights', listStoryHighlights);
router.delete('/statuses/:id', strictRateLimiter, deleteStatus);

// ── Insights / analytics / fraud ──
router.get('/reports/growth', getGrowthReport);
router.get('/reports/engagement', getEngagementReport);
router.get('/fraud/signals', getFraudSignals);

// ── Frontend crash telemetry (opt-in) ──
router.get('/frontend-crashes', getFrontendCrashes);

// ── Anonymous update-banner analytics ──
router.get('/app-events', getAppEventSummary);

// ── Nightly production-health check status ──
router.get('/nightly-status', getNightlyStatus);

// ── Support tickets / direct chats ──
router.get('/tickets', listTickets);
router.get('/tickets/:id', getTicket);
router.post('/tickets/:id/reply', strictRateLimiter, replyToTicket);
router.patch('/tickets/:id/status', strictRateLimiter, updateTicketStatus);
router.get('/direct-chats', listDirectChats);
router.post('/direct-chats/start', strictRateLimiter, startDirectChat);
router.get('/backups', listAllBackups);
router.delete('/backups/:backupId', strictRateLimiter, deleteBackupFile);

module.exports = router;
