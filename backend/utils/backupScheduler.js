// Automated backup scheduler (P4).
//
// Runs on node-cron and executes backups for users who enabled scheduled
// backups via POST /api/backup/schedule. Interval is stored on the user's
// backupSettings; users are only processed when their lastBackupAt is due.
//
// Guarded so it only starts when MongoDB is connected and never crashes the
// process — failures are logged, not thrown.

const cron = require('node-cron');
const User = require('../models/User');

const INTERVAL_MS = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000
};

let cronTask = null;
let running = false;

const isDue = (settings) => {
  if (!settings?.enabled) return false;
  if (!settings.lastBackupAt) return true;
  const intervalMs = INTERVAL_MS[settings.interval] || INTERVAL_MS.daily;
  return Date.now() - new Date(settings.lastBackupAt).getTime() >= intervalMs;
};

const processDueBackups = async () => {
  if (running) return;
  running = true;
  const { logInfo, logError, logDebug } = require('../config/winston');
  try {
    const dueUsers = await User.find({
      'backupSettings.enabled': true
    }).select('_id username backupSettings').lean();

    let processed = 0;
    let failed = 0;

    for (const user of dueUsers) {
      if (!isDue(user.backupSettings)) continue;
      try {
        const backupController = require('../controllers/backupController');
        const backupData = await backupController.generateBackupData(user._id);
        const encryptedBackup = backupController.encryptBackup(backupData);
        const backupId = `backup_${user._id}_${Date.now()}.json`;
        await backupController.saveBackup(backupId, encryptedBackup, backupData);
        await User.findByIdAndUpdate(user._id, { 'backupSettings.lastBackupAt': new Date() });
        processed++;
        logDebug('Scheduled backup completed', { userId: user._id, storage: backupController.s3Enabled ? 's3' : 'local' });
      } catch (error) {
        failed++;
        logError('Scheduled backup failed for user', { userId: user._id, error: error.message });
      }
    }

    if (processed || failed) {
      logInfo('Scheduled backup run finished', { processed, failed, dueChecked: dueUsers.length });
    }
  } catch (error) {
    logError('Scheduled backup run error', { error: error.message });
  } finally {
    running = false;
  }
};

// Start the scheduler. Cron expression is configurable via env and defaults to
// every hour; the per-user interval check decides who is actually due.
const startBackupScheduler = (schedule = process.env.BACKUP_SCHEDULE || '0 * * * *') => {
  if (cronTask) return cronTask;
  try {
    cronTask = cron.schedule(schedule, processDueBackups, { scheduled: false });
    cronTask.start();
    return cronTask;
  } catch (error) {
    console.error('[BackupScheduler] Failed to start:', error.message);
    return null;
  }
};

const stopBackupScheduler = () => {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
};

module.exports = { startBackupScheduler, stopBackupScheduler, processDueBackups, isDue, INTERVAL_MS };
