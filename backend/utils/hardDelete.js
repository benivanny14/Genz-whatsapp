/**
 * SECURITY (1.6): schedule the hard delete of a deleted-for-everyone message
 * after its retention window.
 *
 * Node's setTimeout clamps delays above 2^31-1 ms (~24.8 days) down to 1ms
 * (with a TimeoutOverflowWarning), so a naive `setTimeout(fn, 30 * 24 * 60 * 60 * 1000)`
 * would fire almost immediately and wipe the message — destroying the
 * deleted-messages mod's retention window right after a delete. This helper
 * walks the delay in sub-24-day chunks, keeping the timer accurate without
 * overflowing the 32-bit signed limit. The server-side sweep in server.js
 * (startExpiredMessageCleanup) remains the backstop for timers lost on restart.
 *
 * Retention depends on the deleting user's anti-revoke ("deleted messages")
 * settings:
 *   - mod ON  → purge after cacheRetentionDays (default 7), so the deleted-messages
 *               viewer + restore endpoint keep working for that window
 *   - mod OFF → purge after 30 days
 */
const Message = require('../models/Message');
const User = require('../models/User');
const { deleteFile, isCloudinaryConfigured } = require('../config/cloudinary');

const MAX_TIMEOUT_MS = 2147483647; // 2^31 - 1 (~24.8 days)
const HARD_DELETE_DELAY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CACHE_RETENTION_DAYS = 7;

// Pure decision helper (unit-testable): when the anti-revoke mod is enabled
// and caches deleted messages, the message document must survive the default
// 30-day purge so the deleted-messages viewer + restore endpoint keep working.
const antiRevokeRetainsMessage = (settings) => Boolean(
  settings && settings.antiRevokeEnabled && settings.cacheDeletedMessages
);

// How long the deleted document is retained before the hard purge, based on
// the deleter's anti-revoke settings.
const hardDeleteDelayFor = (settings) => {
  if (!antiRevokeRetainsMessage(settings)) return HARD_DELETE_DELAY_MS;
  const days = Number(settings.cacheRetentionDays);
  const safeDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_CACHE_RETENTION_DAYS;
  return safeDays * DAY_MS;
};

/**
 * Extract a Cloudinary publicId from a Cloudinary URL.
 * Cloudinary URLs have the shape:
 *   https://res.cloudinary.com/{cloud}/image/upload/{publicId}.{ext}
 * This mirrors the regex used in mediaController.js addMediaReference.
 */
const extractCloudinaryPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/upload\/(?:[^/]+\/)?(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
  return match?.[1] || null;
};

/**
 * Map a message's messageType to the Cloudinary resourceType.
 * Cloudinary uses 'video' for both video and audio resources.
 */
const cloudinaryResourceType = (messageType) => {
  if (messageType === 'image') return 'image';
  if (messageType === 'video' || messageType === 'audio' || messageType === 'voice') return 'video';
  // stickers, gifs, documents — treat as 'image' (Cloudinary default)
  return 'image';
};

/**
 * Delete associated Cloudinary media files for a message before removing
 * the MongoDB document. Failures are logged but do not block the
 * document deletion — we never want a stuck message because Cloudinary
 * was temporarily unreachable.
 */
const deleteCloudinaryMedia = async (message) => {
  if (!isCloudinaryConfigured?.()) return;

  const urls = [
    message.mediaUrl,
    message.localPreview,
    message.structuredContent?.[0]?.value // sticker URL
  ].filter(Boolean);

  for (const url of urls) {
    const publicId = extractCloudinaryPublicId(url);
    if (!publicId) continue;

    try {
      const result = await deleteFile(publicId, cloudinaryResourceType(message.messageType));
      if (!result?.success) {
        console.warn('[HardDelete] Cloudinary delete returned non-ok:', { publicId, result });
      }
    } catch (err) {
      // Best-effort — log and continue. The document will still be deleted.
      console.warn('[HardDelete] Cloudinary delete failed (continuing):', {
        publicId,
        error: err?.message
      });
    }
  }
};

/**
 * @param {object} message  the deleted message document (needs _id)
 * @param {string} [deleterId] user who deleted the message — their anti-revoke
 *                             setting decides the retention window
 */
const scheduleHardDelete = async (message, deleterId) => {
  if (!message?._id) return;

  let delay = HARD_DELETE_DELAY_MS;
  if (deleterId) {
    try {
      const query = User.findById(deleterId);
      const user = query && typeof query.select === 'function'
        ? await query.select('antiRevokeSettings').lean()
        : await query;
      delay = hardDeleteDelayFor(user?.antiRevokeSettings);
    } catch {
      // Fall through to the default 30-day purge if the lookup fails.
    }
  }

  let remaining = delay;
  const tick = () => {
    if (remaining <= 0) {
      // TATIZO 3 FIX: Delete Cloudinary media BEFORE removing the document.
      // This prevents orphaned files from accumulating on Cloudinary.
      deleteCloudinaryMedia(message).then(() => {
        Message.deleteOne({ _id: message._id, deletedForEveryone: true }).catch((cleanupErr) => {
          console.error('[HardDelete] cleanup failed:', cleanupErr?.message, { messageId: String(message._id) });
        });
      }).catch(() => {
        // deleteCloudinaryMedia swallows errors, but just in case:
        Message.deleteOne({ _id: message._id, deletedForEveryone: true }).catch(() => {});
      });
      return;
    }
    const chunk = Math.min(remaining, MAX_TIMEOUT_MS);
    remaining -= chunk;
    setTimeout(tick, chunk).unref?.();
  };
  tick();
};

/**
 * Batch-clean Cloudinary media for a set of messages BEFORE they are deleted.
 * Accepts a MongoDB query filter (e.g. { sender: userId }) — finds all
 * matching messages with media, extracts publicIds, and batch-deletes them.
 * This is best-effort: failures are logged but never throw.
 *
 * @param {object} query - MongoDB filter for Message.find()
 * @param {string} [label] - Human-readable label for log messages
 */
const cleanupCloudinaryForQuery = async (query, label = 'bulk') => {
  if (!isCloudinaryConfigured?.()) return;

  try {
    const mediaMessages = await Message.find({
      ...query,
      mediaUrl: { $exists: true, $ne: null, $ne: '' }
    }).select('mediaUrl messageType').lean();

    if (mediaMessages.length === 0) return;

    // Collect publicIds with their resource types
    const toDelete = [];
    for (const msg of mediaMessages) {
      const publicId = extractCloudinaryPublicId(msg.mediaUrl);
      if (publicId) {
        toDelete.push({ publicId, resourceType: cloudinaryResourceType(msg.messageType) });
      }
    }

    if (toDelete.length === 0) return;

    console.log(`[HardDelete:${label}] Cleaning up ${toDelete.length} Cloudinary files...`);

    // Batch-delete by resource type (Cloudinary API supports batch delete)
    const byType = {};
    for (const { publicId, resourceType } of toDelete) {
      if (!byType[resourceType]) byType[resourceType] = [];
      byType[resourceType].push(publicId);
    }

    const { deleteFiles } = require('../config/cloudinary');
    for (const [resourceType, ids] of Object.entries(byType)) {
      try {
        await deleteFiles(ids, resourceType);
      } catch (err) {
        console.warn(`[HardDelete:${label}] Batch Cloudinary delete failed:`, {
          resourceType,
          count: ids.length,
          error: err?.message
        });
      }
    }
  } catch (err) {
    console.warn(`[HardDelete:${label}] Cloudinary cleanup query failed (continuing):`, err?.message);
  }
};

module.exports = {
  scheduleHardDelete,
  antiRevokeRetainsMessage,
  hardDeleteDelayFor,
  extractCloudinaryPublicId,
  cloudinaryResourceType,
  deleteCloudinaryMedia,
  cleanupCloudinaryForQuery
};
