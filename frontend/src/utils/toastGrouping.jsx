/**
 * toastGrouping.js — Prevents toast spam in group chats.
 *
 * WhatsApp behaviour: instead of showing a new toast for every message in a
 * busy group, we aggregate them. "3 new messages in Genz Squad" replaces
 * individual toasts. DMs still get individual toasts.
 *
 * Strategy:
 *   - Each conversation gets a 3-second aggregation window.
 *   - Within that window, messages are counted but no new toast is shown.
 *   - After the window closes, a single grouped toast fires with the count.
 *   - react-hot-toast's custom `id` is used to replace/update the toast
 *     instead of stacking new ones.
 */

import toast from 'react-hot-toast';

/** How long to aggregate before showing the grouped toast (ms) */
const AGGREGATION_WINDOW = 3000;

/** Active aggregation buckets: conversationId → { count, timeout, names } */
const buckets = new Map();

/**
 * Show a grouped message toast.
 *
 * @param {Object} options
 * @param {string} options.senderName — name of the message sender
 * @param {string} options.conversationId — conversation / group id
 * @param {string} [options.conversationName] — display name for groups
 * @param {boolean} [options.isGroup] — true if the conversation is a group
 * @param {string} [options.preview] — message preview text
 */
export const showGroupedMessageToast = ({
  senderName,
  conversationId,
  conversationName,
  isGroup = false,
  preview = 'New message'
}) => {
  if (!conversationId) return;

  const key = String(conversationId);
  const existing = buckets.get(key);

  if (existing) {
    // Increment counter within the aggregation window
    existing.count += 1;
    if (!existing.names.includes(senderName)) {
      existing.names.push(senderName);
    }
    existing.lastPreview = preview;
    // Reset the timeout so we wait AGGREGATION_WINDOW from the last message
    clearTimeout(existing.timeout);
    existing.timeout = setTimeout(() => flushBucket(key), AGGREGATION_WINDOW);
    return;
  }

  // First message — start a new bucket
  const bucket = {
    count: 1,
    names: [senderName],
    lastPreview: preview,
    conversationName: conversationName || senderName,
    isGroup,
    timeout: setTimeout(() => flushBucket(key), AGGREGATION_WINDOW)
  };
  buckets.set(key, bucket);
};

/**
 * Flush a single aggregation bucket → show the toast.
 * @param {string} key — conversationId
 */
const flushBucket = (key) => {
  const bucket = buckets.get(key);
  if (!bucket) return;
  buckets.delete(key);

  const { count, names, lastPreview, conversationName, isGroup } = bucket;

  if (count === 1 && !isGroup) {
    // Single DM message — standard individual toast
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{names[0]}</p>
            <p className="text-xs text-gray-400 truncate">{lastPreview}</p>
          </div>
        </div>
      ),
      {
        id: `toast-${key}`,
        duration: 4000,
        style: {
          background: '#1f2937',
          color: '#fff',
          borderRadius: '12px',
          padding: '12px 16px'
        }
      }
    );
    return;
  }

  // Grouped toast (multiple messages or group chat)
  const senderText = count === 1
    ? names[0]
    : names.length === 2
      ? `${names[0]} and ${names[1]}`
      : names.length > 2
        ? `${names[0]} and ${names.length - 1} others`
        : names[0];

  const title = isGroup
    ? `${count} new message${count > 1 ? 's' : ''} in ${conversationName}`
    : `${count} new message${count > 1 ? 's' : ''} from ${senderText}`;

  toast(
    (t) => (
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-gray-400 truncate">{lastPreview}</p>
        </div>
      </div>
    ),
    {
      id: `toast-${key}`,
      duration: 5000,
      style: {
        background: '#1f2937',
        color: '#fff',
        borderRadius: '12px',
        padding: '12px 16px'
      }
    }
  );
};

/**
 * Clear all pending aggregation buckets (e.g. on logout).
 */
export const clearAllBuckets = () => {
  for (const [, bucket] of buckets) {
    clearTimeout(bucket.timeout);
  }
  buckets.clear();
};

export default { showGroupedMessageToast, clearAllBuckets };
