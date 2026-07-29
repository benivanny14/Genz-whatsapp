const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  uploadPhoneContacts,
  getMatchedContacts,
  syncContacts,
  removeContact,
  updateContactName,
  getContactSuggestions
} = require('../controllers/phoneContactsController');

router.use(protect);

router.post('/upload', uploadPhoneContacts);
router.get('/matched', getMatchedContacts);
router.post('/sync', syncContacts);
router.delete('/:contactId', removeContact);
router.put('/:contactId', updateContactName);
router.get('/suggestions', getContactSuggestions);

module.exports = router;
