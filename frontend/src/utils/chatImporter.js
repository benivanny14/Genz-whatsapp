/**
 * chatImporter.js
 * ---------------
 * Parse real WhatsApp chat exports (.txt) into message objects, preserving the
 * original text verbatim so WhatsApp-style formatting markers (*bold*,
 * _italic_, ~strike~, `mono`) survive and can be rendered by FormattedText.
 *
 * Supported input:
 *   1. WhatsApp .txt export lines:
 *        [12/01/2026, 10:00:00 AM] John Doe: Hello *world*!
 *      (also handles 24h time and ISO-like dates)
 *   2. Existing JSON chat exports (exportChatAsJson shape) — passed through.
 */

const LINE_RE = /^\[([^\]]+)\]\s+([^:]+):\s*([\s\S]*)$/;

const parseDate = (raw) => {
  if (!raw) return new Date().toISOString();
  // WhatsApp: "12/01/2026, 10:00:00 AM"
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (m) {
    let [, d, mo, y, h, mi, s, ap] = m;
    let hour = parseInt(h, 10);
    if (ap) {
      if (ap.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (ap.toUpperCase() === 'AM' && hour === 12) hour = 0;
    }
    const date = new Date(y, mo - 1, d, hour, parseInt(mi, 10), parseInt(s || '0', 10));
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const stripMediaSuffix = (content) => {
  // WhatsApp appends "<Media omitted>" / "image omitted" style suffixes.
  return content
    .replace(/<Media omitted>\s*/gi, '')
    .replace(/<media omitted>\s*/gi, '')
    .replace(/image omitted\s*/gi, '')
    .replace(/\s*\(file attached\)\s*$/i, '')
    .trim();
};

/**
 * Parse WhatsApp .txt export text into an array of message objects.
 * @param {string} text raw file contents
 * @param {object} opts { conversationId, currentUserId }
 */
export const parseWhatsAppTxt = (text = '', opts = {}) => {
  const lines = String(text).split(/\r?\n/);
  const messages = [];
  let pending = null;

  const flush = () => {
    if (pending) {
      const content = stripMediaSuffix(pending.content);
      if (content) {
        messages.push({
          _id: `import-${messages.length}-${Date.now()}`,
          content,
          messageType: 'text',
          sender: pending.sender,
          createdAt: pending.createdAt,
          conversationId: opts.conversationId || null,
          status: 'sent',
          isImported: true,
          isGroup: Boolean(opts.isGroup)
        });
      }
      pending = null;
    }
  };

  for (const line of lines) {
    const m = line.match(LINE_RE);
    if (m) {
      flush();
      const [, timeRaw, senderRaw, body] = m;
      const sender = senderRaw.trim();
      pending = {
        sender: /^You$/i.test(sender) ? { username: 'You', _id: opts.currentUserId || 'you' } : { username: sender, _id: `import-user-${sender}` },
        createdAt: parseDate(timeRaw.trim()),
        content: body.trim()
      };
    } else if (pending && line.trim()) {
      // Continuation of a multi-line message
      pending.content += '\n' + line;
    }
  }
  flush();
  return messages;
};

/**
 * Import a chat file (.txt = WhatsApp export, .json = app export).
 * Returns { messages, format } or throws on failure.
 */
export const importChatFile = (content, fileName = '', opts = {}) => {
  const trimmed = String(content).trim();
  const isJson = fileName.toLowerCase().endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[');

  if (isJson) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return { messages: parsed, format: 'json' };
    if (parsed && Array.isArray(parsed.messages)) return { messages: parsed.messages, format: 'json' };
    throw new Error('JSON chat file has no messages array');
  }

  const messages = parseWhatsAppTxt(trimmed, opts);
  if (!messages.length) throw new Error('No messages found — not a WhatsApp .txt export?');
  return { messages, format: 'whatsapp-txt' };
};
