const express = require('express');
const router = express.Router();
const {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  scheduleBackup,
  getBackupStatus
} = require('../controllers/backupController');
const { protect } = require('../middleware/auth');
const { checkPremiumAccess } = require('../middleware/premiumAccess');

router.use(protect);

router.post('/create', checkPremiumAccess, createBackup);
router.get('/list', listBackups);
router.post('/restore/:backupId', checkPremiumAccess, restoreBackup);
router.get('/restore/:backupId', checkPremiumAccess, restoreBackup);
router.delete('/:backupId', deleteBackup);
router.post('/schedule', scheduleBackup);
router.get('/status', getBackupStatus);

module.exports = router;
