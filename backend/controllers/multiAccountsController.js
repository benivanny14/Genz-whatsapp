const User = require('../models/User');

const defaultSettings = {
  multiAccountsEnabled: false,
  maxAccounts: 5,
  currentAccounts: [],
  activeAccountId: null,
  syncSettings: false,
  syncChats: false,
  syncContacts: false,
  autoSwitch: false,
  switchInterval: 60, // minutes
  notificationsPerAccount: true,
  unifiedInbox: false
};

const getUser = async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  return user;
};

const mergeSettings = (settings = {}) => ({
  ...defaultSettings,
  ...settings
});

// @desc    Get multi accounts settings
// @route   GET /api/multi-accounts/settings
// @access  Private
exports.getMultiAccountsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get multi accounts settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update multi accounts settings
// @route   POST /api/multi-accounts/settings
// @access  Private
exports.updateMultiAccountsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    user.multiAccountsSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.multiAccountsSettings });
  } catch (error) {
    console.error('Update multi accounts settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Enable multi accounts
// @route   POST /api/multi-accounts/enable
// @access  Private
exports.enableMultiAccounts = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    user.multiAccountsSettings = mergeSettings({
      ...existing,
      multiAccountsEnabled: true,
      currentAccounts: [
        {
          _id: new (require('mongoose').Types.ObjectId)(),
          name: 'Primary Account',
          phoneNumber: user.phoneNumber || '',
          isActive: true,
          createdAt: new Date()
        }
      ],
      activeAccountId: new (require('mongoose').Types.ObjectId)()
    });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.multiAccountsSettings });
  } catch (error) {
    console.error('Enable multi accounts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Disable multi accounts
// @route   POST /api/multi-accounts/disable
// @access  Private
exports.disableMultiAccounts = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    user.multiAccountsSettings = mergeSettings({
      ...existing,
      multiAccountsEnabled: false,
      currentAccounts: [],
      activeAccountId: null
    });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.multiAccountsSettings });
  } catch (error) {
    console.error('Disable multi accounts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add account
// @route   POST /api/multi-accounts/add
// @access  Private
exports.addAccount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { name, phoneNumber, profilePicture } = req.body;

    if (!name || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'Name and phone number are required' });
    }

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    if (!existing.multiAccountsEnabled) {
      return res.status(403).json({ success: false, message: 'Multi accounts is not enabled' });
    }

    if (existing.currentAccounts && existing.currentAccounts.length >= existing.maxAccounts) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum ${existing.maxAccounts} accounts allowed` 
      });
    }

    if (!existing.currentAccounts) existing.currentAccounts = [];
    
    const newAccount = {
      _id: new (require('mongoose').Types.ObjectId)(),
      name,
      phoneNumber,
      profilePicture: profilePicture || '',
      isActive: false,
      createdAt: new Date()
    };

    existing.currentAccounts.push(newAccount);

    user.multiAccountsSettings = mergeSettings({ ...existing });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, accounts: user.multiAccountsSettings.currentAccounts });
  } catch (error) {
    console.error('Add account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove account
// @route   DELETE /api/multi-accounts/remove/:id
// @access  Private
exports.removeAccount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    if (!existing.currentAccounts) {
      return res.status(404).json({ success: false, message: 'No accounts found' });
    }

    const index = existing.currentAccounts.findIndex(acc => acc._id.toString() === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (existing.currentAccounts.length <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot remove the last account' });
    }

    existing.currentAccounts.splice(index, 1);

    // Reset active account if it was the removed one
    if (existing.activeAccountId?.toString() === id) {
      existing.activeAccountId = existing.currentAccounts[0]._id;
    }

    user.multiAccountsSettings = mergeSettings({ ...existing });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, accounts: user.multiAccountsSettings.currentAccounts });
  } catch (error) {
    console.error('Remove account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Switch active account
// @route   POST /api/multi-accounts/switch
// @access  Private
exports.switchAccount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { accountId } = req.body;

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    if (!existing.currentAccounts) {
      return res.status(404).json({ success: false, message: 'No accounts found' });
    }

    const account = existing.currentAccounts.find(acc => acc._id.toString() === accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // Update active status
    existing.currentAccounts.forEach(acc => {
      acc.isActive = acc._id.toString() === accountId;
    });

    existing.activeAccountId = accountId;

    user.multiAccountsSettings = mergeSettings({ ...existing });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ 
      success: true, 
      activeAccountId: user.multiAccountsSettings.activeAccountId,
      accounts: user.multiAccountsSettings.currentAccounts
    });
  } catch (error) {
    console.error('Switch account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update account
// @route   POST /api/multi-accounts/update/:id
// @access  Private
exports.updateAccount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const { name, phoneNumber, profilePicture } = req.body;

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    if (!existing.currentAccounts) {
      return res.status(404).json({ success: false, message: 'No accounts found' });
    }

    const account = existing.currentAccounts.find(acc => acc._id.toString() === id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    account.name = name || account.name;
    account.phoneNumber = phoneNumber || account.phoneNumber;
    account.profilePicture = profilePicture !== undefined ? profilePicture : account.profilePicture;

    user.multiAccountsSettings = mergeSettings({ ...existing });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, accounts: user.multiAccountsSettings.currentAccounts });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clone an existing account (account cloning)
// @route   POST /api/multi-accounts/clone
// @access  Private
exports.cloneAccount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { accountId, newName } = req.body;

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};

    if (!existing.multiAccountsEnabled) {
      return res.status(403).json({ success: false, message: 'Multi accounts is not enabled' });
    }

    if (!existing.currentAccounts || existing.currentAccounts.length === 0) {
      return res.status(404).json({ success: false, message: 'No accounts found to clone' });
    }

    const source = accountId
      ? existing.currentAccounts.find(acc => acc._id.toString() === accountId)
      : existing.currentAccounts[0];

    if (!source) {
      return res.status(404).json({ success: false, message: 'Source account not found' });
    }

    if (existing.currentAccounts.length >= existing.maxAccounts) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${existing.maxAccounts} accounts allowed`
      });
    }

    const clonedAccount = {
      _id: new (require('mongoose').Types.ObjectId)(),
      name: newName || `${source.name} (Clone)`,
      phoneNumber: source.phoneNumber,
      profilePicture: source.profilePicture || '',
      clonedFrom: source._id,
      isActive: false,
      createdAt: new Date()
    };

    existing.currentAccounts.push(clonedAccount);

    user.multiAccountsSettings = mergeSettings({ ...existing });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, account: clonedAccount, accounts: user.multiAccountsSettings.currentAccounts });
  } catch (error) {
    console.error('Clone account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all accounts
// @route   GET /api/multi-accounts/accounts
// @access  Private
exports.getAccounts = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings);
    res.status(200).json({ 
      success: true, 
      accounts: settings.currentAccounts || [],
      activeAccountId: settings.activeAccountId
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle unified inbox
// @route   POST /api/multi-accounts/unified-inbox
// @access  Private
exports.toggleUnifiedInbox = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    user.multiAccountsSettings = mergeSettings({
      ...existing,
      unifiedInbox: enabled !== undefined ? enabled : !existing.unifiedInbox
    });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.multiAccountsSettings });
  } catch (error) {
    console.error('Toggle unified inbox error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset multi accounts settings to default
// @route   POST /api/multi-accounts/reset
// @access  Private
exports.resetMultiAccountsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.multiAccountsSettings = mergeSettings({});
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.multiAccountsSettings });
  } catch (error) {
    console.error('Reset multi accounts settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
