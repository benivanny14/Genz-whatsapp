const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getExcludedContacts,
  getAllowedContacts,
  addExcludedContact,
  removeExcludedContact,
  bulkAddExcludedContacts,
  bulkRemoveExcludedContacts,
  clearExcludedContacts,
  addAllowedContact,
  removeAllowedContact,
  bulkAddAllowedContacts,
  bulkRemoveAllowedContacts,
  clearAllowedContacts
} = require('../controllers/privacyContactsController');

// Excluded contacts routes
router.get('/excluded/:privacyType', protect, getExcludedContacts);
router.post('/excluded', protect, addExcludedContact);
router.delete('/excluded/:contactId', protect, removeExcludedContact);
router.post('/excluded/bulk', protect, bulkAddExcludedContacts);
router.delete('/excluded/bulk', protect, bulkRemoveExcludedContacts);
router.delete('/excluded/type/:privacyType', protect, clearExcludedContacts);

// Allowed contacts routes
router.get('/allowed/:privacyType', protect, getAllowedContacts);
router.post('/allowed', protect, addAllowedContact);
router.delete('/allowed/:contactId', protect, removeAllowedContact);
router.post('/allowed/bulk', protect, bulkAddAllowedContacts);
router.delete('/allowed/bulk', protect, bulkRemoveAllowedContacts);
router.delete('/allowed/type/:privacyType', protect, clearAllowedContacts);

module.exports = router;
