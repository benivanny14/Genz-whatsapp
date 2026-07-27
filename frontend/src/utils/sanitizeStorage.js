const BLOB_URL_PREFIX = 'blob:';

export const isBlobUrl = (value) => (
  typeof value === 'string' && value.startsWith(BLOB_URL_PREFIX)
);

export const sanitizeBlobUrls = (value) => {
  if (isBlobUrl(value)) {
    return { value: '', changed: true };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const sanitized = value
      .map((item) => {
        const result = sanitizeBlobUrls(item);
        changed = changed || result.changed;
        return result.value;
      })
      .filter((item) => item !== '');
    return { value: sanitized, changed: changed || sanitized.length !== value.length };
  }

  if (value && typeof value === 'object') {
    let changed = false;
    const sanitized = {};
    Object.entries(value).forEach(([key, item]) => {
      const result = sanitizeBlobUrls(item);
      changed = changed || result.changed;
      sanitized[key] = result.value;
    });
    return { value: sanitized, changed };
  }

  return { value, changed: false };
};

export const cleanupLocalBlobUrls = () => {
  if (typeof localStorage === 'undefined') return 0;

  let cleaned = 0;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (!key) continue;

    const raw = localStorage.getItem(key);
    if (!raw || !raw.includes(BLOB_URL_PREFIX)) continue;

    if (isBlobUrl(raw)) {
      localStorage.removeItem(key);
      cleaned += 1;
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      const result = sanitizeBlobUrls(parsed);
      if (result.changed) {
        localStorage.setItem(key, JSON.stringify(result.value));
        cleaned += 1;
      }
    } catch {
      // Do not remove the item, it's just not valid JSON (e.g. raw strings like tokens or UUIDs)
      continue;
    }
  }

  return cleaned;
};
