const fs = require('fs/promises');
const path = require('path');
const User = require('../models/User');

const BACKUP_DIR = path.resolve(__dirname, '..', 'backups');

const fmtBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

/**
 * Admin: list every backup across all users (local-file storage).
 * Grouped per user with username + phone resolution and totals.
 */
exports.listAllBackups = async (req, res) => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter((f) => f.startsWith('backup_') && f.endsWith('.json'));

    const stats = await Promise.all(
      backupFiles.map(async (file) => {
        try {
          const stat = await fs.stat(path.join(BACKUP_DIR, file));
          return {
            backupId: file,
            size: stat.size,
            sizeHuman: fmtBytes(stat.size),
            lastModified: stat.mtime
          };
        } catch {
          return null;
        }
      })
    );

    const valid = stats.filter(Boolean).sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    // Group by user id encoded in `backup_<userId>_<timestamp>.json`
    const userIds = [...new Set(valid.map((b) => b.backupId.split('_')[1] || '').filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('username phoneNumber')
      .lean();

    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const groups = [];
    for (const userId of userIds) {
      const userBackups = valid.filter((b) => b.backupId.startsWith(`backup_${userId}_`));
      if (!userBackups.length) continue;
      const u = userMap.get(userId);
      groups.push({
        userId,
        username: u?.username || `deleted-user-${userId.slice(0, 6)}`,
        phoneNumber: u?.phoneNumber || '',
        backupCount: userBackups.length,
        totalSize: userBackups.reduce((sum, b) => sum + b.size, 0),
        totalSizeHuman: fmtBytes(userBackups.reduce((sum, b) => sum + b.size, 0)),
        latest: userBackups[0].lastModified,
        backups: userBackups
      });
    }

    groups.sort((a, b) => new Date(b.latest) - new Date(a.latest));

    return res.status(200).json({
      success: true,
      groups,
      total: valid.length,
      totalSize: valid.reduce((sum, b) => sum + b.size, 0),
      totalSizeHuman: fmtBytes(valid.reduce((sum, b) => sum + b.size, 0)),
      usersWithBackups: groups.length,
      storage: 'local'
    });
  } catch (error) {
    console.error('[AdminBackup] list error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list backups' });
  }
};

/**
 * Admin: delete a single backup file (basename sanitized).
 */
exports.deleteBackupFile = async (req, res) => {
  try {
    const backupId = String(req.params.backupId || '').trim();
    const safeName = path.basename(backupId);
    if (!safeName.startsWith('backup_') || !safeName.endsWith('.json')) {
      return res.status(400).json({ success: false, message: 'Invalid backup file name' });
    }

    const filePath = path.join(BACKUP_DIR, safeName);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ success: false, message: 'Backup file not found' });
      }
      throw err;
    }

    return res.status(200).json({ success: true, message: 'Backup deleted', backupId: safeName });
  } catch (error) {
    console.error('[AdminBackup] delete error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete backup' });
  }
};
