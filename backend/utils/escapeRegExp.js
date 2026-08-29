/**
 * Escapes special regex characters in a string.
 * @param {string} str
 * @returns {string} The escaped string safe for use in RegExp constructor.
 */
const escapeRegExp = (str) => {
  return String(str).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

module.exports = { escapeRegExp };
