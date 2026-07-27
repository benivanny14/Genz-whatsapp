const AWS = require('aws-sdk');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Status = require('../models/Status');
const Broadcast = require('../models/Broadcast');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
const BACKUP_DIR = path.resolve(__dirname, '..', 'backups');
const S3_PREFIX = 'backups';
const s3Enabled = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && BUCKET_NAME);

const s3 = s3Enabled ? new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
}) : null;

const getCurrentUserId = (req) => req.user?._id?.toString() || LOCAL_USER_ID;
const backupKeyFor = (backupId) => `${S3_PREFIX}/${path.basename(backupId)}`;
const backupPathFor = (backupId) => path.join(BACKUP_DIR, path.basename(backupId));

const getEncryptionKey = () => crypto.scryptSync(
  process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'genz-development-backup-key',
  'genz-backup-salt',
  32
);

const stripDoc = (doc) => {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  delete plain.__v;
  return plain;
};

const withoutImmutableId = (doc) => {
  const copy = { ...doc };
  delete copy._id;
  delete copy.__v;
  return copy;
};

const encryptBackup = (data) => {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, getEncryptionKey(), iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    algorithm,
    encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex')
  };
};

const decryptBackup = (payload) => {
  const decipher = crypto.createDecipheriv(
    payload.algorithm || 'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(payload.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
  let decrypted = decipher.update(payload.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

const generateBackupData = async (userId) => {
  const [user, conversations, statuses, broadcasts, subscription] = await Promise.all([
    User.findById(userId).select('-passwordHash -emailVerificationToken -passwordResetToken -twoFactorSecret'),
    Conversation.find({ participants: userId }).sort({ updatedAt: -1 }),
    Status.find({ userId }).sort({ createdAt: -1 }),
    Broadcast.find({ createdBy: userId }).sort({ createdAt: -1 }),
    Subscription.findOne({ userId })
  ]);

  const conversationIds = conversations.map((conversation) => conversation._id);
  const messages = await Message.find({ conversationId: { $in: conversationIds } }).sort({ createdAt: 1 });

  return {
    version: '2.0',
    timestamp: new Date().toISOString(),
    userId,
    data: {
      user: user ? stripDoc(user) : null,
      conversations: conversations.map(stripDoc),
      messages: messages.map(stripDoc),
      statuses: statuses.map(stripDoc),
      broadcasts: broadcasts.map(stripDoc),
      subscription: subscription ? stripDoc(subscription) : null
    },
    metadata: {
      totalConversations: conversations.length,
      totalMessages: messages.length,
      totalStatuses: statuses.length,
      totalBroadcasts: broadcasts.length,
      hasSubscription: Boolean(subscription)
    }
  };
};

const saveBackup = async (backupId, encryptedBackup, metadata) => {
  const body = JSON.stringify(encryptedBackup);

  if (s3Enabled) {
    await s3.upload({
      Bucket: BUCKET_NAME,
      Key: backupKeyFor(backupId),
      Body: body,
      ContentType: 'application/json',
      Metadata: {
        userId: metadata.userId,
        timestamp: metadata.timestamp,
        version: metadata.version
      }
    }).promise();
    return { storage: 's3' };
  }

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  await fs.writeFile(backupPathFor(backupId), body, 'utf8');
  return { storage: 'local' };
};

const readBackup = async (backupId) => {
  if (s3Enabled) {
    const data = await s3.getObject({ Bucket: BUCKET_NAME, Key: backupKeyFor(backupId) }).promise();
    return JSON.parse(data.Body.toString('utf8'));
  }

  const data = await fs.readFile(backupPathFor(backupId), 'utf8');
  return JSON.parse(data);
};

// @desc    Create encrypted backup
// @route   POST /api/backup/create
// @access  Private
exports.createBackup = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const backupData = await generateBackupData(userId);
    const encryptedBackup = encryptBackup(backupData);
    const backupId = `backup_${userId}_${Date.now()}.json`;
    const storage = await saveBackup(backupId, encryptedBackup, backupData);
    await User.findByIdAndUpdate(userId, { 'backupSettings.lastBackupAt': new Date() });

    res.status(200).json({
      success: true,
      message: 'Backup created successfully',
      backupId,
      storage: storage.storage,
      timestamp: backupData.timestamp,
      metadata: backupData.metadata
    });
  } catch (error) {
    console.error('[Backup] Error creating backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    });
  }
};

// @desc    List backups
// @route   GET /api/backup/list
// @access  Private
exports.listBackups = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    let backups = [];

    if (s3Enabled) {
      const data = await s3.listObjectsV2({
        Bucket: BUCKET_NAME,
        Prefix: `${S3_PREFIX}/backup_${userId}_`,
        MaxKeys: 50
      }).promise();

      backups = (data.Contents || []).map((obj) => ({
        backupId: obj.Key.split('/').pop(),
        lastModified: obj.LastModified,
        size: obj.Size,
        storage: 's3'
      }));
    } else {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      const files = await fs.readdir(BACKUP_DIR);
      backups = await Promise.all(files
        .filter((file) => file.startsWith(`backup_${userId}_`) && file.endsWith('.json'))
        .map(async (file) => {
          const stat = await fs.stat(path.join(BACKUP_DIR, file));
          return {
            backupId: file,
            lastModified: stat.mtime,
            size: stat.size,
            storage: 'local'
          };
        }));
    }

    backups.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    res.status(200).json({
      success: true,
      backups,
      total: backups.length,
      storage: s3Enabled ? 's3' : 'local'
    });
  } catch (error) {
    console.error('[Backup] Error listing backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
      error: error.message
    });
  }
};

// @desc    Restore backup data owned by the current user
// @route   POST /api/backup/restore/:backupId
// @access  Private
exports.restoreBackup = async (req, res) => {
  try {
    const { backupId } = req.params;
    const userId = getCurrentUserId(req);
    if (!backupId) {
      return res.status(400).json({ success: false, message: 'Backup ID is required' });
    }

    const encryptedBackup = await readBackup(backupId);
    const backupData = decryptBackup(encryptedBackup);
    if (backupData.userId !== userId) {
      return res.status(403).json({ success: false, message: 'This backup belongs to another user' });
    }

    const { conversations = [], messages = [], statuses = [], broadcasts = [], subscription, user } = backupData.data || {};

    if (user?._id) {
      delete user.passwordHash;
      delete user.emailVerificationToken;
      delete user.passwordResetToken;
      delete user.twoFactorSecret;
      await User.findByIdAndUpdate(userId, withoutImmutableId(user), { upsert: true, new: true });
    }

    for (const conversation of conversations) {
      if (Array.isArray(conversation.participants) && conversation.participants.some((id) => id?.toString() === userId)) {
        await Conversation.findByIdAndUpdate(conversation._id, withoutImmutableId(conversation), { upsert: true, new: true });
      }
    }

    const allowedConversationIds = new Set(conversations.map((conversation) => conversation._id?.toString()));
    for (const message of messages) {
      if (allowedConversationIds.has(message.conversationId?.toString())) {
        await Message.findByIdAndUpdate(message._id, withoutImmutableId(message), { upsert: true, new: true });
      }
    }

    for (const status of statuses) {
      if (status.userId?.toString() === userId) {
        await Status.findByIdAndUpdate(status._id, withoutImmutableId(status), { upsert: true, new: true });
      }
    }

    for (const broadcast of broadcasts) {
      if (broadcast.createdBy?.toString() === userId) {
        await Broadcast.findByIdAndUpdate(broadcast._id, withoutImmutableId(broadcast), { upsert: true, new: true });
      }
    }

    if (subscription?.userId?.toString() === userId) {
      await Subscription.findOneAndUpdate({ userId }, withoutImmutableId(subscription), { upsert: true, new: true });
    }

    res.status(200).json({
      success: true,
      message: 'Backup restored successfully',
      timestamp: backupData.timestamp,
      metadata: backupData.metadata
    });
  } catch (error) {
    console.error('[Backup] Error restoring backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup',
      error: error.message
    });
  }
};

// @desc    Delete backup
// @route   DELETE /api/backup/:backupId
// @access  Private
exports.deleteBackup = async (req, res) => {
  try {
    const { backupId } = req.params;
    const userId = getCurrentUserId(req);
    if (!backupId || !path.basename(backupId).startsWith(`backup_${userId}_`)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this backup' });
    }

    if (s3Enabled) {
      await s3.deleteObject({ Bucket: BUCKET_NAME, Key: backupKeyFor(backupId) }).promise();
    } else {
      await fs.unlink(backupPathFor(backupId));
    }

    res.status(200).json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('[Backup] Error deleting backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup',
      error: error.message
    });
  }
};

exports.scheduleBackup = async (req, res) => {
  try {
    const { interval = 'daily', enabled = true } = req.body;
    await User.findByIdAndUpdate(getCurrentUserId(req), {
      $set: {
        'backupSettings.enabled': Boolean(enabled),
        'backupSettings.interval': interval
      }
    });

    res.status(200).json({
      success: true,
      message: `Backup schedule updated to ${interval}`,
      interval,
      enabled: Boolean(enabled)
    });
  } catch (error) {
    console.error('[Backup] Error scheduling backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule backup',
      error: error.message
    });
  }
};

exports.getBackupStatus = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const latest = await exports.listBackupsForStatus(userId);

    res.status(200).json({
      success: true,
      configured: true,
      storage: s3Enabled ? 's3' : 'local',
      bucket: s3Enabled ? BUCKET_NAME : null,
      region: process.env.AWS_REGION || 'us-east-1',
      backupCount: latest.length,
      latestBackup: latest[0] || null
    });
  } catch (error) {
    console.error('[Backup] Error getting backup status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backup status',
      error: error.message
    });
  }
};

exports.listBackupsForStatus = async (userId) => {
  if (s3Enabled) {
    const data = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: `${S3_PREFIX}/backup_${userId}_`,
      MaxKeys: 10
    }).promise();
    return (data.Contents || []).map((obj) => ({
      backupId: obj.Key.split('/').pop(),
      lastModified: obj.LastModified,
      size: obj.Size,
      storage: 's3'
    })).sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  }

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const files = await fs.readdir(BACKUP_DIR);
  const backups = await Promise.all(files
    .filter((file) => file.startsWith(`backup_${userId}_`) && file.endsWith('.json'))
    .map(async (file) => {
      const stat = await fs.stat(path.join(BACKUP_DIR, file));
      return {
        backupId: file,
        lastModified: stat.mtime,
        size: stat.size,
        storage: 'local'
      };
    }));

  return backups.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
};
