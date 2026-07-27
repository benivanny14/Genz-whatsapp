const User = require('../models/User');

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

module.exports = { checkPremiumAccess };
