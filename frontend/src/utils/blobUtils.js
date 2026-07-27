/**
 * Blob URL utility functions
 * Helper functions for detecting and handling blob URLs
 */

/**
 * Check if a value is a blob URL
 * @param {*} value - The value to check
 * @returns {boolean} - True if the value is a blob URL string
 */
export function hasStaleBlobUrl(value) {
  return typeof value === 'string' && value.startsWith('blob:');
}

/**
 * Check if a message contains any stale blob URLs in its media fields
 * @param {Object} message - The message object to check
 * @returns {boolean} - True if the message contains stale blob URLs
 */
export function messageHasStaleBlobUrl(message = {}) {
  const MEDIA_URL_FIELDS = ['content', 'mediaUrl', 'fileUrl', 'thumbnailUrl'];
  
  return MEDIA_URL_FIELDS.some((field) => hasStaleBlobUrl(message[field])) ||
         hasStaleBlobUrl(message.quotedStatus?.mediaUrl);
}
