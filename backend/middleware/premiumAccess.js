const User = require('../models/User');

const hasActivePremium = (user) => Boolean(
  user?.premium &&
  user?.subscriptionExpiresAt &&
  new Date() <= new Date(user.subscriptionExpiresAt)
);

const stripPremiumFields = (value, fields) => {
  const target = value?.settings && typeof value.settings === 'object' ? value.settings : value;
  if (!target || typeof target !== 'object') return;
  for (const field of fields) delete target[field];
};

// Field-level gate for mixed settings endpoints that also contain free options.
const stripPremiumSettingsFields = (fields) => async (req, res, next) => {
  try {
    const user = await User.findById(req.user?._id || req.user?.id).select('premium subscriptionExpiresAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!hasActivePremium(user)) stripPremiumFields(req.body, fields);
    next();
  } catch (error) {
    console.error('Error in stripPremiumSettingsFields:', error);
    res.status(500).json({ success: false, message: 'Failed to verify premium access' });
  }
};

// Middleware to check if user has active premium subscription
const checkPremiumAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Fetch fresh user data to ensure we have current premium status
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Validate subscription status on every feature access
    if (user.premium && user.subscriptionExpiresAt) {
      const now = new Date();
      const expiryDate = new Date(user.subscriptionExpiresAt);
      
      if (now > expiryDate) {
        // Subscription has expired, revoke premium status immediately
        user.premium = false;
        user.subscriptionExpiresAt = null;
        await user.save();
        
        console.log(`Subscription expired for user ${user.username} (${user._id}). Premium revoked on feature access.`);
        
        return res.status(403).json({ 
          success: false, 
          message: 'Your subscription has expired. Please renew to access premium features.' 
        });
      }
    }

    // Check if user has premium access
    if (!user.premium) {
      return res.status(403).json({ 
        success: false, 
        message: 'Premium subscription required to access this feature' 
      });
    }

    // User has valid premium access
    req.premiumUser = user;
    next();
  } catch (error) {
    console.error('Error in checkPremiumAccess:', error);
    res.status(500).json({ success: false, message: 'Failed to verify premium access' });
  }
};

module.exports = { checkPremiumAccess, stripPremiumSettingsFields };
