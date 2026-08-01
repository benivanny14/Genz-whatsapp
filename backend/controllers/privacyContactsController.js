const PrivacyExcludedContact = require('../models/PrivacyExcludedContact');
const PrivacyAllowedContact = require('../models/PrivacyAllowedContact');
const User = require('../models/User');

// @desc    Get excluded contacts for a privacy type
// @route   GET /api/privacy/excluded/:privacyType
// @access  Private
exports.getExcludedContacts = async (req, res) => {
  try {
    const { privacyType } = req.params;
    const userId = req.user._id;

    const excludedContacts = await PrivacyExcludedContact.find({
      ownerUserId: userId,
      privacyType
    }).sort({ excludedContactName: 1 });

    res.json({ success: true, excludedContacts });
  } catch (error) {
    console.error('Get excluded contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get allowed contacts for a privacy type
// @route   GET /api/privacy/allowed/:privacyType
// @access  Private
exports.getAllowedContacts = async (req, res) => {
  try {
    const { privacyType } = req.params;
    const userId = req.user._id;

    const allowedContacts = await PrivacyAllowedContact.find({
      ownerUserId: userId,
      privacyType
    }).sort({ allowedContactName: 1 });

    res.json({ success: true, allowedContacts });
  } catch (error) {
    console.error('Get allowed contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add contact to excluded list
// @route   POST /api/privacy/excluded
// @access  Private
exports.addExcludedContact = async (req, res) => {
  try {
    const { privacyType, contactId, contactName, contactPhone } = req.body;
    const userId = req.user._id;

    if (!privacyType || !contactId) {
      return res.status(400).json({ success: false, message: 'privacyType and contactId are required' });
    }

    // Check if already excluded
    const existing = await PrivacyExcludedContact.findOne({
      ownerUserId: userId,
      privacyType,
      excludedContactId: contactId
    });

    if (existing) {
      return res.json({ success: true, message: 'Already excluded', excludedContact: existing });
    }

    const excludedContact = await PrivacyExcludedContact.create({
      ownerUserId: userId,
      privacyType,
      excludedContactId: contactId,
      excludedContactName: contactName,
      excludedContactPhone: contactPhone
    });

    res.json({ success: true, excludedContact });
  } catch (error) {
    console.error('Add excluded contact error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove contact from excluded list
// @route   DELETE /api/privacy/excluded/:contactId
// @access  Private
exports.removeExcludedContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { privacyType } = req.query;
    const userId = req.user._id;

    await PrivacyExcludedContact.findOneAndDelete({
      ownerUserId: userId,
      privacyType,
      excludedContactId: contactId
    });

    res.json({ success: true, message: 'Contact removed from excluded list' });
  } catch (error) {
    console.error('Remove excluded contact error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk add excluded contacts
// @route   POST /api/privacy/excluded/bulk
// @access  Private
exports.bulkAddExcludedContacts = async (req, res) => {
  try {
    const { privacyType, contacts } = req.body; // contacts: [{ id, name, phone }]
    const userId = req.user._id;

    if (!privacyType || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'privacyType and a non-empty contacts array are required' });
    }

    const operations = contacts.map(contact => ({
      updateOne: {
        filter: {
          ownerUserId: userId,
          privacyType,
          excludedContactId: contact.id
        },
        update: {
          $setOnInsert: {
            ownerUserId: userId,
            privacyType,
            excludedContactId: contact.id,
            excludedContactName: contact.name,
            excludedContactPhone: contact.phone
          }
        },
        upsert: true
      }
    }));

    await PrivacyExcludedContact.bulkWrite(operations);

    const excludedContacts = await PrivacyExcludedContact.find({
      ownerUserId: userId,
      privacyType
    });

    res.json({ success: true, excludedContacts });
  } catch (error) {
    console.error('Bulk add excluded contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk remove excluded contacts
// @route   DELETE /api/privacy/excluded/bulk
// @access  Private
exports.bulkRemoveExcludedContacts = async (req, res) => {
  try {
    const { privacyType, contactIds } = req.body;
    const userId = req.user._id;

    await PrivacyExcludedContact.deleteMany({
      ownerUserId: userId,
      privacyType,
      excludedContactId: { $in: contactIds }
    });

    res.json({ success: true, message: 'Contacts removed from excluded list' });
  } catch (error) {
    console.error('Bulk remove excluded contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear all excluded contacts for a privacy type
// @route   DELETE /api/privacy/excluded/type/:privacyType
// @access  Private
exports.clearExcludedContacts = async (req, res) => {
  try {
    const { privacyType } = req.params;
    const userId = req.user._id;

    await PrivacyExcludedContact.deleteMany({
      ownerUserId: userId,
      privacyType
    });

    res.json({ success: true, message: 'All excluded contacts cleared' });
  } catch (error) {
    console.error('Clear excluded contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add contact to allowed list
// @route   POST /api/privacy/allowed
// @access  Private
exports.addAllowedContact = async (req, res) => {
  try {
    const { privacyType, contactId, contactName, contactPhone } = req.body;
    const userId = req.user._id;

    if (!privacyType || !contactId) {
      return res.status(400).json({ success: false, message: 'privacyType and contactId are required' });
    }

    // Check if already allowed
    const existing = await PrivacyAllowedContact.findOne({
      ownerUserId: userId,
      privacyType,
      allowedContactId: contactId
    });

    if (existing) {
      return res.json({ success: true, message: 'Already allowed', allowedContact: existing });
    }

    const allowedContact = await PrivacyAllowedContact.create({
      ownerUserId: userId,
      privacyType,
      allowedContactId: contactId,
      allowedContactName: contactName,
      allowedContactPhone: contactPhone
    });

    res.json({ success: true, allowedContact });
  } catch (error) {
    console.error('Add allowed contact error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove contact from allowed list
// @route   DELETE /api/privacy/allowed/:contactId
// @access  Private
exports.removeAllowedContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { privacyType } = req.query;
    const userId = req.user._id;

    await PrivacyAllowedContact.findOneAndDelete({
      ownerUserId: userId,
      privacyType,
      allowedContactId: contactId
    });

    res.json({ success: true, message: 'Contact removed from allowed list' });
  } catch (error) {
    console.error('Remove allowed contact error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk add allowed contacts
// @route   POST /api/privacy/allowed/bulk
// @access  Private
exports.bulkAddAllowedContacts = async (req, res) => {
  try {
    const { privacyType, contacts } = req.body; // contacts: [{ id, name, phone }]
    const userId = req.user._id;

    if (!privacyType || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'privacyType and a non-empty contacts array are required' });
    }

    const operations = contacts.map(contact => ({
      updateOne: {
        filter: {
          ownerUserId: userId,
          privacyType,
          allowedContactId: contact.id
        },
        update: {
          $setOnInsert: {
            ownerUserId: userId,
            privacyType,
            allowedContactId: contact.id,
            allowedContactName: contact.name,
            allowedContactPhone: contact.phone
          }
        },
        upsert: true
      }
    }));

    await PrivacyAllowedContact.bulkWrite(operations);

    const allowedContacts = await PrivacyAllowedContact.find({
      ownerUserId: userId,
      privacyType
    });

    res.json({ success: true, allowedContacts });
  } catch (error) {
    console.error('Bulk add allowed contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk remove allowed contacts
// @route   DELETE /api/privacy/allowed/bulk
// @access  Private
exports.bulkRemoveAllowedContacts = async (req, res) => {
  try {
    const { privacyType, contactIds } = req.body;
    const userId = req.user._id;

    await PrivacyAllowedContact.deleteMany({
      ownerUserId: userId,
      privacyType,
      allowedContactId: { $in: contactIds }
    });

    res.json({ success: true, message: 'Contacts removed from allowed list' });
  } catch (error) {
    console.error('Bulk remove allowed contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear all allowed contacts for a privacy type
// @route   DELETE /api/privacy/allowed/type/:privacyType
// @access  Private
exports.clearAllowedContacts = async (req, res) => {
  try {
    const { privacyType } = req.params;
    const userId = req.user._id;

    await PrivacyAllowedContact.deleteMany({
      ownerUserId: userId,
      privacyType
    });

    res.json({ success: true, message: 'All allowed contacts cleared' });
  } catch (error) {
    console.error('Clear allowed contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
