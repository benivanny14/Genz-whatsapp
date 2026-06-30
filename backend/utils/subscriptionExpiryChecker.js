const Subscription = require('../models/Subscription');

// Check and update expired subscriptions
// This should be run periodically (e.g., every hour)
const checkExpiredSubscriptions = async () => {
  try {
    console.log('Running subscription expiry check...');

    const now = new Date();

    // Check Subscription model
    const expiredSubscriptions = await Subscription.find({
      status: 'active',
      expiryDate: { $lt: now }
    });

    console.log(`Found ${expiredSubscriptions.length} expired subscriptions`);

    for (const subscription of expiredSubscriptions) {
      subscription.status = 'expired';
      subscription.paymentStatus = 'expired';
      await subscription.save();

      console.log(`Expired subscription for user ${subscription.userId}`);
    }

    return expiredSubscriptions.length;
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
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

    console.log(`Found ${expiringSubscriptions.length} subscriptions expiring soon.`);
    return expiringSubscriptions;
  } catch (error) {
    console.error('Error in checkExpiringSubscriptions:', error);
    return [];
  }
};

let expiryCheckerInterval = null;

// Start automatic expiry checker (runs every hour)
const startExpiryChecker = () => {
  if (expiryCheckerInterval) return expiryCheckerInterval;

  console.log('Starting subscription expiry checker...');
  checkExpiredSubscriptions();

  expiryCheckerInterval = setInterval(() => {
    checkExpiredSubscriptions();
  }, 3600000);
  expiryCheckerInterval.unref?.();

  console.log('Subscription expiry checker started. Will run every hour.');
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
