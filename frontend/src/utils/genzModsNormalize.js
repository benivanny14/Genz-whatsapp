/**
 * Maps flat frontend GENZ mods ↔ nested backend user.genzMods shape.
 */

export function flattenModsFromServer(settings = {}) {
  const flat = { ...settings };

  if (settings.autoReply && typeof settings.autoReply === 'object') {
    flat.autoReply = Boolean(settings.autoReply.enabled);
    flat.autoReplyMsg = settings.autoReply.message || '';
    // FIX: keywords used to be dropped here, so any ChatContext save re-created
    // them as [] and silently wiped auto-reply keywords set on the GENZ Mods page.
    flat.autoReplyKeywords = Array.isArray(settings.autoReply.keywords) ? settings.autoReply.keywords : [];
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

  // Ghost mode summary: one boolean that reflects the granular
  // hideOnline/hideTyping/hideRecording flags, no matter which UI set them
  // (app GENZ Settings sends a boolean, GENZ Mods page sends an object of
  // sub-options which the backend mirrors to the top-level flags).
  if (typeof settings.ghostMode === 'object' && settings.ghostMode !== null) {
    flat.ghostMode = Boolean(settings.ghostMode.hideOnline || settings.ghostMode.hideTyping || settings.ghostMode.hideRecording);
  } else if (settings.hideOnline !== undefined || settings.hideTyping !== undefined || settings.hideRecording !== undefined) {
    flat.ghostMode = Boolean(settings.hideOnline || settings.hideTyping || settings.hideRecording);
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
      // ghostMode boolean is a summary flag. Only fall back to "all on" for
      // legacy flat states that don't carry the granular flags; modern flat
      // state (which includes hideOnline/hideTyping/hideRecording) must keep
      // its per-option values or saving from the app would clobber choices
      // made on the GENZ Mods page.
      if (mods.hideOnline === undefined) out.hideOnline = true;
      if (mods.hideTyping === undefined) out.hideTyping = true;
      if (mods.hideRecording === undefined) out.hideRecording = true;
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
