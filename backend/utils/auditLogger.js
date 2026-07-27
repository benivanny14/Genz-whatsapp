const AuditLog = require('../models/AuditLog');

// Audit logging utility for admin actions
const logAdminAction = async (adminId, action, details = {}, targetUserId = null, targetSubscriptionId = null, req = null) => {
  try {
    const logEntry = new AuditLog({
      adminId,
      action,
      targetUserId,
      targetSubscriptionId,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.headers['user-agent'] || null,
      timestamp: new Date()
    });

    await logEntry.save();
    
    // Console log for immediate visibility
    console.log(`[AUDIT] ${action} by admin ${adminId}`, {
      targetUserId,
      targetSubscriptionId,
      details,
      ipAddress: req?.ip,
      timestamp: new Date().toISOString()
    });
    
    return logEntry;
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw error - logging failure shouldn't break the main operation
    return null;
  }
};

// Helper function to log premium activation
const logPremiumActivation = async (adminId, targetUserId, targetSubscriptionId, req) => {
  return logAdminAction(
    adminId,
    'premium_activated',
    { type: 'manual_activation' },
    targetUserId,
    targetSubscriptionId,
    req
  );
};

// Helper function to log premium deactivation
const logPremiumDeactivation = async (adminId, targetUserId, targetSubscriptionId, req) => {
  return logAdminAction(
    adminId,
    'premium_deactivated',
    { type: 'manual_deactivation' },
    targetUserId,
    targetSubscriptionId,
    req
  );
};

// Helper function to log payment override
const logPaymentOverride = async (adminId, targetUserId, targetSubscriptionId, details, req) => {
  return logAdminAction(
    adminId,
    'payment_override',
    details,
    targetUserId,
    targetSubscriptionId,
    req
  );
};

module.exports = {
  logAdminAction,
  logPremiumActivation,
  logPremiumDeactivation,
  logPaymentOverride
};
