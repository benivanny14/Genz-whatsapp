const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addAccount,
  cloneAccount,
  disableMultiAccounts,
  enableMultiAccounts,
  getAccounts,
  getMultiAccountsSettings,
  removeAccount,
  resetMultiAccountsSettings,
  switchAccount,
  toggleUnifiedInbox,
  updateAccount,
  updateMultiAccountsSettings,
} = require('../controllers/multiAccountsController');

router.use(protect);

router.get('/settings', getMultiAccountsSettings);
router.post('/settings', updateMultiAccountsSettings);
router.post('/enable', enableMultiAccounts);
router.post('/disable', disableMultiAccounts);
router.post('/add', addAccount);
router.delete('/remove/:id', removeAccount);
router.post('/switch', switchAccount);
router.post('/clone', cloneAccount);
router.post('/update/:id', updateAccount);
router.get('/accounts', getAccounts);
router.post('/unified-inbox', toggleUnifiedInbox);
router.post('/reset', resetMultiAccountsSettings);

module.exports = router;
