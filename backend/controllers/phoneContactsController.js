const User = require('../models/User');
const Conversation = require('../models/Conversation');

// @desc    Upload phone contacts for matching
// @route   POST /api/contacts/upload
// @access  Private
exports.uploadPhoneContacts = async (req, res) => {
  try {
    const { contacts } = req.body; // contacts: [{ name, phone }]
    const userId = req.user._id;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'Contacts array is required' });
    }

    // Normalize phone numbers (remove spaces, dashes, etc.)
    const normalizedContacts = contacts.map(contact => ({
      name: contact.name || '',
      phone: contact.phone ? contact.phone.replace(/[\s\-\(\)]/g, '') : ''
    }));

    // Find matching users on the server
    const phoneNumbers = normalizedContacts.map(c => c.phone).filter(p => p);

    const matchedUsers = await User.find({
      phoneNumber: { $in: phoneNumbers },
      _id: { $ne: userId }
    }).select('username phoneNumber profilePicture about isOnline lastSeen');

    // Create a map for quick lookup. Server numbers may be stored with or
    // without a leading '+' (legacy accounts vs newer registrations), and
    // contact-book entries may include it too — index both forms so matching
    // is resilient (same spirit as authController.phoneCandidates).
    const userMap = {};
    matchedUsers.forEach(user => {
      if (user.phoneNumber) {
        userMap[user.phoneNumber] = user;
        userMap[user.phoneNumber.replace(/^\+/, '')] = user;
      }
    });

    // Match contacts with server users
    const matchedContacts = normalizedContacts.map(contact => {
      const matchedUser = userMap[contact.phone] || userMap[contact.phone.replace(/^\+/, '')];
      if (matchedUser) {
        return {
          ...contact,
          matched: true,
          userId: matchedUser._id,
          username: matchedUser.username,
          profilePicture: matchedUser.profilePicture,
          isOnline: matchedUser.isOnline,
          lastSeen: matchedUser.lastSeen
        };
      }
      return {
        ...contact,
        matched: false
      };
    });

    // Update user's contacts list
    const user = await User.findById(userId);
    if (!user.contacts) user.contacts = [];
    
    // Add new contacts (avoid duplicates)
    const existingUserIds = user.contacts.map(c => String(c.user || c.userId));
    const newContacts = matchedContacts.filter(c => c.matched && !existingUserIds.includes(String(c.userId)));
    
    user.contacts = [
      ...user.contacts,
      ...newContacts.map(c => ({
        user: c.userId,
        savedName: c.name || c.username
      }))
    ];
    
    await user.save();

    res.json({
      success: true,
      matchedContacts,
      totalContacts: contacts.length,
      matchedCount: matchedContacts.filter(c => c.matched).length,
      newContactsCount: newContacts.length
    });
  } catch (error) {
    console.error('Upload phone contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get matched contacts
// @route   GET /api/contacts/matched
// @access  Private
exports.getMatchedContacts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate('contacts.user', 'username phoneNumber profilePicture about isOnline lastSeen');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      contacts: user.contacts || []
    });
  } catch (error) {
    console.error('Get matched contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Sync contacts (auto-sync trigger)
// @route   POST /api/contacts/sync
// @access  Private
exports.syncContacts = async (req, res) => {
  try {
    const { contacts } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(contacts)) {
      return res.status(400).json({ success: false, message: 'Contacts array is required' });
    }

    // Normalize and match contacts (same logic as upload)
    const normalizedContacts = contacts.map(contact => ({
      name: contact.name || '',
      phone: contact.phone ? contact.phone.replace(/[\s\-\(\)]/g, '') : ''
    }));

    const phoneNumbers = normalizedContacts.map(c => c.phone).filter(p => p);

    const matchedUsers = await User.find({
      phoneNumber: { $in: phoneNumbers },
      _id: { $ne: userId }
    }).select('username phoneNumber profilePicture about isOnline lastSeen');

    const userMap = {};
    matchedUsers.forEach(user => {
      if (user.phoneNumber) {
        userMap[user.phoneNumber] = user;
        userMap[user.phoneNumber.replace(/^\+/, '')] = user;
      }
    });

    const matchedContacts = normalizedContacts.map(contact => {
      const matchedUser = userMap[contact.phone] || userMap[contact.phone.replace(/^\+/, '')];
      if (matchedUser) {
        return {
          ...contact,
          matched: true,
          userId: matchedUser._id,
          username: matchedUser.username,
          profilePicture: matchedUser.profilePicture,
          isOnline: matchedUser.isOnline,
          lastSeen: matchedUser.lastSeen
        };
      }
      return {
        ...contact,
        matched: false
      };
    });

    // Update user's contacts
    const user = await User.findById(userId);
    if (!user.contacts) user.contacts = [];
    
    const existingUserIds = user.contacts.map(c => String(c.user || c.userId));
    const newContacts = matchedContacts.filter(c => c.matched && !existingUserIds.includes(String(c.userId)));
    
    user.contacts = [
      ...user.contacts,
      ...newContacts.map(c => ({
        user: c.userId,
        savedName: c.name || c.username
      }))
    ];
    
    user.lastSyncAt = new Date();
    await user.save();

    res.json({
      success: true,
      synced: true,
      newContactsCount: newContacts.length,
      totalContacts: user.contacts.length
    });
  } catch (error) {
    console.error('Sync contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove a contact
// @route   DELETE /api/contacts/:contactId
// @access  Private
exports.removeContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.contacts = user.contacts.filter(c => String(c.user || c.userId) !== contactId);
    await user.save();

    res.json({ success: true, message: 'Contact removed successfully' });
  } catch (error) {
    console.error('Remove contact error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update contact name
// @route   PUT /api/contacts/:contactId
// @access  Private
exports.updateContactName = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { name } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const contact = user.contacts.find(c => String(c.user || c.userId) === contactId);
    if (contact) {
      contact.savedName = name;
      await user.save();
    }

    res.json({ success: true, contact });
  } catch (error) {
    console.error('Update contact name error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get contact suggestions (users not in contacts)
// @route   GET /api/contacts/suggestions
// @access  Private
exports.getContactSuggestions = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const contactIds = (user.contacts || []).map(c => String(c.user || c.userId));

    // Get users who are not in contacts and not the current user
    const suggestions = await User.find({
      _id: { $ne: userId, $nin: contactIds },
      isBlocked: false
    })
    .select('username phoneNumber profilePicture about isOnline lastSeen')
    .limit(20);

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Get contact suggestions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
