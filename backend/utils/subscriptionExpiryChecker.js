const Subscription = require('../models/Subscription');
const { logInfo, logError } = require('../config/winston');

// Check and update expired subscriptions
// This should be run periodically (e.g., every hour)
const checkExpiredSubscriptions = async () => {
  try {
    logInfo('Running subscription expiry check...');

    const now = new Date();

    // Check Subscription model
    const expiredSubscriptions = await Subscription.find({
      status: 'active',
      expiryDate: { $lt: now }
    });

    logInfo('Found expired subscriptions', { count: expiredSubscriptions.length });

    for (const subscription of expiredSubscriptions) {
      subscription.status = 'expired';
      subscription.paymentStatus = 'expired';
      await subscription.save();

      logInfo('Expired subscription', { userId: subscription.userId });
    }

    return expiredSubscriptions.length;
  } catch (error) {
    logError('Error checking expired subscriptions', { message: error.message });
    return 0;
  }
};

// Check subscriptions expiring soon (within 7 days)
const checkExpiringSubscriptions = async () => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringSubscriptions = await Subscription.find({
      status: 'active',
      expiryDate: { $gte: now, $lte: sevenDaysFromNow }
    });

    logInfo('Found subscriptions expiring soon', { count: expiringSubscriptions.length });
    return expiringSubscriptions;
  } catch (error) {
    logError('Error in checkExpiringSubscriptions', { message: error.message });
    return [];
  }
};

let expiryCheckerInterval = null;

// Start automatic expiry checker (runs every hour)
const startExpiryChecker = () => {
  if (expiryCheckerInterval) return expiryCheckerInterval;

  logInfo('Starting subscription expiry checker...');
  checkExpiredSubscriptions();

  expiryCheckerInterval = setInterval(() => {
    checkExpiredSubscriptions();
  }, 3600000);
  expiryCheckerInterval.unref?.();

  logInfo('Subscription expiry checker started. Will run every hour.');
  return expiryCheckerInterval;
};

const stopExpiryChecker = () => {
  if (expiryCheckerInterval) {
    clearInterval(expiryCheckerInterval);
    expiryCheckerInterval = null;
  }
};

// Run expiry check manually (for testing or on-demand)
const runManualExpiryCheck = async () => {
  return await checkExpiredSubscriptions();
};

module.exports = {
  checkExpiredSubscriptions,
  checkExpiringSubscriptions,
  startExpiryChecker,
  stopExpiryChecker,
  runManualExpiryCheck
};
