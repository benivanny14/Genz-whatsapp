// Sanitize a client-supplied filename into a plain basename that is safe to
// embed in a storage path. Prevents path traversal (../), absolute paths,
// control characters and hidden/dotfile names from reaching the filesystem.
const safeFilename = (name, fallback = 'file') => {
  if (typeof name !== 'string' || !name.trim()) return fallback;

  // Normalize separators, then keep only the final path segment
  const lastSegment = name.replace(/\\/g, '/').split('/').pop();

  let cleaned = lastSegment
    .replace(/[\u0000-\u001f\u007f]/g, '') // strip control characters
    .replace(/[^\w.\- ]+/g, '_')           // strip anything non-word (incl. separators)
    .replace(/^\.+/, '')                   // strip leading dots (hidden / "..")
    .trim()
    .slice(0, 100);

  if (!cleaned || cleaned === '.' || cleaned === '..') cleaned = fallback;
  return cleaned;
};

module.exports = { safeFilename };
