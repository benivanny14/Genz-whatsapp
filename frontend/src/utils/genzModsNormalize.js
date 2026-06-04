/**
 * Maps flat frontend GENZ mods ↔ nested backend user.genzMods shape.
 */

export function flattenModsFromServer(settings = {}) {
  const flat = { ...settings };

  if (settings.autoReply && typeof settings.autoReply === 'object') {
    flat.autoReply = Boolean(settings.autoReply.enabled);
    flat.autoReplyMsg = settings.autoReply.message || '';
  }

  if (settings.chatBackgroundMusic && typeof settings.chatBackgroundMusic === 'object') {
    flat.chatMusic = Boolean(settings.chatBackgroundMusic.enabled);
    flat.chatMusicUrl = settings.chatBackgroundMusic.track || '';
  }

  if (settings.antiDeleteMessages !== undefined && settings.antiDelete === undefined) {
    flat.antiDelete = settings.antiDeleteMessages;
  }

  if (settings.readReceipts === false && flat.hideReadReceipts === undefined) {
    flat.hideReadReceipts = true;
  }

  if (settings.hideOnline && flat.ghostMode === undefined) {
    flat.ghostMode = Boolean(settings.hideOnline || settings.hideTyping);
  }

  return flat;
}

export function normalizeModsForServer(mods = {}) {
  const out = { ...mods };

  if (typeof mods.autoReply === 'boolean') {
    out.autoReply = {
      enabled: mods.autoReply,
      message: mods.autoReplyMsg || '',
      keywords: mods.autoReplyKeywords || []
    };
    delete out.autoReplyMsg;
    delete out.autoReplyKeywords;
  }

  if (typeof mods.chatMusic === 'boolean' || mods.chatMusicUrl !== undefined) {
    out.chatBackgroundMusic = {
      enabled: Boolean(mods.chatMusic),
      track: mods.chatMusicUrl || ''
    };
    delete out.chatMusic;
    delete out.chatMusicUrl;
  }

  if (typeof mods.antiDelete === 'boolean') {
    out.antiDeleteMessages = mods.antiDelete;
  }

  if (typeof mods.hideReadReceipts === 'boolean') {
    out.readReceipts = !mods.hideReadReceipts;
  }

  if (typeof mods.ghostMode === 'boolean') {
    if (mods.ghostMode) {
      out.hideOnline = true;
      out.hideTyping = true;
      out.hideRecording = true;
    }
  }

  return out;
}

const SPAM_PATTERNS = [
  /win\s+(money|cash|prize)/i,
  /click\s+here\s+now/i,
  /free\s+bitcoin/i,
  /congratulations!?\s+you\s+won/i,
  /claim\s+your\s+reward/i
];

export function isLikelySpamMessage(message = {}) {
  const text = typeof message.content === 'string' ? message.content : '';
  if (!text.trim()) return false;
  const urlCount = (text.match(/https?:\/\//gi) || []).length;
  if (urlCount >= 3) return true;
  return SPAM_PATTERNS.some((re) => re.test(text));
}

export async function autoSaveMediaFromMessage(message = {}) {
  const url = message.mediaUrl || message.fileUrl;
  if (!url || typeof url !== 'string') return;
  const type = message.messageType || '';
  if (!['image', 'video', 'audio', 'file'].includes(type)) return;

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = message.fileName || `genz-${type}-${Date.now()}`;
    link.rel = 'noopener';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch {
    /* download may be blocked for cross-origin URLs */
  }
}
