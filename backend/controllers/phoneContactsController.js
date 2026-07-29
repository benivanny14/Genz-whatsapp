const User = require('../models/User');
const Conversation = require('../models/Conversation');

// @desc    Upload phone contacts for matching
// @route   POST /api/contacts/upload
// @access  Private
exports.uploadPhoneContacts = async (req, res) => {
  try {
    const { contacts } = req.body; // contacts: [{ name, phone, email }]
    const userId = req.user._id;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'Contacts array is required' });
    }

    // Normalize phone numbers (remove spaces, dashes, etc.)
    const normalizedContacts = contacts.map(contact => ({
      name: contact.name || '',
      phone: contact.phone ? contact.phone.replace(/[\s\-\(\)]/g, '') : '',
      email: contact.email || ''
    }));

    // Find matching users on the server
    const phoneNumbers = normalizedContacts.map(c => c.phone).filter(p => p);
    const emails = normalizedContacts.map(c => c.email).filter(e => e);

    const matchedUsers = await User.find({
      $or: [
        { phoneNumber: { $in: phoneNumbers } },
        { email: { $in: emails } }
      ],
      _id: { $ne: userId }
    }).select('username phoneNumber email profilePicture about isOnline lastSeen');

    // Create a map for quick lookup
    const userMap = {};
    matchedUsers.forEach(user => {
      if (user.phoneNumber) userMap[user.phoneNumber] = user;
      if (user.email) userMap[user.email] = user;
    });

    // Match contacts with server users
    const matchedContacts = normalizedContacts.map(contact => {
      const matchedUser = userMap[contact.phone] || userMap[contact.email];
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
    const existingPhoneNumbers = user.contacts.map(c => c.phone);
    const newContacts = matchedContacts.filter(c => c.matched && !existingPhoneNumbers.includes(c.phone));
    
    user.contacts = [
      ...user.contacts,
      ...newContacts.map(c => ({
        userId: c.userId,
        name: c.name,
        phone: c.phone,
        email: c.email,
        addedAt: new Date()
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
    const user = await User.findById(userId).populate('contacts.userId', 'username phoneNumber email profilePicture about isOnline lastSeen');

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
      phone: contact.phone ? contact.phone.replace(/[\s\-\(\)]/g, '') : '',
      email: contact.email || ''
    }));

    const phoneNumbers = normalizedContacts.map(c => c.phone).filter(p => p);
    const emails = normalizedContacts.map(c => c.email).filter(e => e);

    const matchedUsers = await User.find({
      $or: [
        { phoneNumber: { $in: phoneNumbers } },
        { email: { $in: emails } }
      ],
      _id: { $ne: userId }
    }).select('username phoneNumber email profilePicture about isOnline lastSeen');

    const userMap = {};
    matchedUsers.forEach(user => {
      if (user.phoneNumber) userMap[user.phoneNumber] = user;
      if (user.email) userMap[user.email] = user;
    });

    const matchedContacts = normalizedContacts.map(contact => {
      const matchedUser = userMap[contact.phone] || userMap[contact.email];
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
    
    const existingPhoneNumbers = user.contacts.map(c => c.phone);
    const newContacts = matchedContacts.filter(c => c.matched && !existingPhoneNumbers.includes(c.phone));
    
    user.contacts = [
      ...user.contacts,
      ...newContacts.map(c => ({
        userId: c.userId,
        name: c.name,
        phone: c.phone,
        email: c.email,
        addedAt: new Date()
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

    user.contacts = user.contacts.filter(c => c.userId.toString() !== contactId);
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

    const contact = user.contacts.find(c => c.userId.toString() === contactId);
    if (contact) {
      contact.name = name;
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

    const contactIds = (user.contacts || []).map(c => c.userId.toString());

    // Get users who are not in contacts and not the current user
    const suggestions = await User.find({
      _id: { $ne: userId, $nin: contactIds },
      isBlocked: false
    })
    .select('username phoneNumber email profilePicture about isOnline lastSeen')
    .limit(20);

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Get contact suggestions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
