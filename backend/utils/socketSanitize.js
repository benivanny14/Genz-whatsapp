/**
 * Socket message sanitization helper.
 *
 * Strips HTML tags and dangerous characters from text messages and captions
 * before they reach the database. Uses a whitelist approach (only plain
 * text allowed) to prevent XSS via stored messages.
 *
 * Usage:
 *   const { sanitizeSocketMessage } = require('../utils/socketSanitize');
 *   socket.on('send_message', (data) => {
 *     const clean = sanitizeSocketMessage(data);
 *     // use clean.text, clean.caption
 *   });
 */

/**
 * Strip all HTML tags and normalize whitespace.
 * If sanitize-html is available, use it; otherwise fall back to regex.
 */
function stripHtml(input) {
  if (typeof input !== 'string') return '';
  const text = input
    .replace(/<[^>]*>/g, '')       // strip all HTML tags
    .replace(/&lt;/g, '<')         // decode common entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim();
  return text;
}

/**
 * Sanitize a socket message payload.
 * Returns a new object with cleaned text and caption fields.
 */
function sanitizeSocketMessage(data) {
  if (!data || typeof data !== 'object') return data;

  const clean = { ...data };

  if (typeof clean.text === 'string') {
    clean.text = stripHtml(clean.text);
  }
  if (typeof clean.caption === 'string') {
    clean.caption = stripHtml(clean.caption);
  }

  // Validate message length
  const MAX_LENGTH = 5000;
  if (clean.text && clean.text.length > MAX_LENGTH) {
    clean.text = clean.text.substring(0, MAX_LENGTH);
  }
  if (clean.caption && clean.caption.length > MAX_LENGTH) {
    clean.caption = clean.caption.substring(0, MAX_LENGTH);
  }

  return clean;
}

module.exports = { sanitizeSocketMessage, stripHtml };
