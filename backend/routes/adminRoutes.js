const express = require('express');
const router = express.Router();
const { superAdminAuth } = require('../middleware/superAdminAuth');
const { strictRateLimiter, adminReadRateLimiter } = require('../middleware/security');
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
  bulkUserAction,
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
  deleteStatus,
  deleteMessage
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
router.get('/overview', adminReadRateLimiter, getOverview);
router.get('/health', adminReadRateLimiter, getHealth);
router.get('/users', adminReadRateLimiter, listUsers);
router.patch('/users/:userId', strictRateLimiter, updateUser);
router.post('/users/:userId/:action(block|unblock)', strictRateLimiter, setUserBlock);
router.post('/users/:userId/:action(promote|demote)', strictRateLimiter, setUserAdminRole);
router.delete('/users/:userId', strictRateLimiter, deleteUser);
router.post('/users/bulk', strictRateLimiter, bulkUserAction);
router.get('/audit-logs', adminReadRateLimiter, getAuditLogs);
router.get('/security', adminReadRateLimiter, getSecurityReport);

// ── Abuse reports ──
router.get('/abuse-reports', adminReadRateLimiter, listAbuseReports);
router.get('/abuse-reports/stats', adminReadRateLimiter, getAbuseReportStats);
router.get('/abuse-reports/:id', adminReadRateLimiter, getAbuseReport);
router.patch('/abuse-reports/:id/status', strictRateLimiter, updateAbuseReportStatus);
router.delete('/abuse-reports/:id', strictRateLimiter, deleteAbuseReport);

// ── Access / permissions / devices / sessions ──
router.get('/permissions/options', adminReadRateLimiter, listPermissionOptions);
router.get('/permissions/users', adminReadRateLimiter, listUsersWithPermissions);
router.patch('/permissions/users/:userId', strictRateLimiter, setUserPermissions);
router.get('/devices', adminReadRateLimiter, listDevices);
router.delete('/devices/:id', strictRateLimiter, revokeDevice);
router.get('/sessions/:userId', adminReadRateLimiter, listUserSessions);
router.delete('/sessions/:userId/all', strictRateLimiter, revokeAllUserSessions);
router.delete('/sessions/:userId/:token', strictRateLimiter, revokeUserSession);

// ── Broadcasts / notifications ──
router.get('/broadcasts', adminReadRateLimiter, listBroadcasts);
router.delete('/broadcasts/:id', strictRateLimiter, deleteBroadcast);
router.post('/broadcasts/announce', strictRateLimiter, sendSystemAnnouncement);
router.get('/notifications/overview', adminReadRateLimiter, getNotificationOverview);
router.post('/notifications/send', strictRateLimiter, sendPushNotification);

// ── Content moderation: chats, groups, channels, statuses ──
router.get('/chats', adminReadRateLimiter, listConversations);
router.get('/chats/:id/messages', adminReadRateLimiter, getConversationMessages);
router.delete('/chats/:id', strictRateLimiter, deleteConversation);

router.get('/groups', adminReadRateLimiter, listGroups);
router.get('/groups/:id', adminReadRateLimiter, getGroupMembers);
router.post('/groups/:id/members/:userId/remove', strictRateLimiter, removeGroupMember);
router.delete('/groups/:id', strictRateLimiter, deleteGroup);

router.get('/channels', adminReadRateLimiter, listChannels);
router.patch('/channels/:id/verify', strictRateLimiter, toggleChannelVerified);
router.delete('/channels/:id', strictRateLimiter, deleteChannel);
router.get('/channels/:id/posts', adminReadRateLimiter, listChannelPosts);
router.delete('/channels/:channelId/posts/:postId', strictRateLimiter, deleteChannelPost);

router.get('/statuses', adminReadRateLimiter, listStatuses);
router.get('/statuses/highlights', adminReadRateLimiter, listStoryHighlights);
router.delete('/statuses/:id', strictRateLimiter, deleteStatus);
router.delete('/message/:id', strictRateLimiter, deleteMessage);

// ── Insights / analytics / fraud ──
router.get('/reports/growth', adminReadRateLimiter, getGrowthReport);
router.get('/reports/engagement', adminReadRateLimiter, getEngagementReport);
router.get('/fraud/signals', adminReadRateLimiter, getFraudSignals);

// ── Frontend crash telemetry (opt-in) ──
router.get('/frontend-crashes', adminReadRateLimiter, getFrontendCrashes);

// ── Anonymous update-banner analytics ──
router.get('/app-events', adminReadRateLimiter, getAppEventSummary);

// ── Nightly production-health check status ──
router.get('/nightly-status', adminReadRateLimiter, getNightlyStatus);

// ── Winga & Communities (was forgotten) ──
const { listWingaListings, deleteWingaListing } = require('../controllers/adminWingaController');
const { listCommunities, deleteCommunity } = require('../controllers/adminCommunityController');
router.get('/winga', adminReadRateLimiter, listWingaListings);
router.delete('/winga/:id', strictRateLimiter, deleteWingaListing);
router.get('/communities', adminReadRateLimiter, listCommunities);
router.delete('/communities/:id', strictRateLimiter, deleteCommunity);

// ── Support tickets / direct chats ──
router.get('/tickets', adminReadRateLimiter, listTickets);
router.get('/tickets/:id', adminReadRateLimiter, getTicket);
router.post('/tickets/:id/reply', strictRateLimiter, replyToTicket);
router.patch('/tickets/:id/status', strictRateLimiter, updateTicketStatus);
router.get('/direct-chats', adminReadRateLimiter, listDirectChats);
router.post('/direct-chats/start', strictRateLimiter, startDirectChat);
router.get('/backups', adminReadRateLimiter, listAllBackups);
router.delete('/backups/:backupId', strictRateLimiter, deleteBackupFile);

module.exports = router;
