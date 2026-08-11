// Chat export utility - exports chat as .txt file (WhatsApp format)

export const exportChatAsTxt = (messages = [], conversationName = 'Chat', currentUserId) => {
  const lines = [
    `GENZ WhatsApp Chat Export`,
    `Chat: ${conversationName}`,
    `Exported: ${new Date().toLocaleString()}`,
    `${'─'.repeat(40)}`,
    '',
  ];

  messages.forEach(msg => {
    const time = new Date(msg.createdAt || Date.now()).toLocaleString();
    const sender = msg.sender?.username || msg.senderName || (msg.sender === currentUserId ? 'You' : 'Unknown');
    let text = '';

    switch (msg.messageType) {
      case 'image': text = '📷 Photo'; break;
      case 'video': text = '🎥 Video'; break;
      case 'audio': text = '🎤 Voice message'; break;
      case 'file': text = `📎 File: ${msg.fileName || 'file'}`; break;
      case 'location': text = `📍 Location: ${msg.location?.lat?.toFixed(5)}, ${msg.location?.lng?.toFixed(5)}`; break;
      case 'contact': text = `👤 Contact: ${msg.contactData?.name || 'Contact'}`; break;
      case 'sticker': text = '🎭 Sticker'; break;
      case 'gif': text = '🎞️ GIF'; break;
      case 'structured': {
        const textPart = (msg.structuredContent || []).find(c => c.type === 'text');
        const mediaPart = (msg.structuredContent || []).find(c => c.type !== 'text');
        const caption = textPart?.value || '';
        text = mediaPart ? `📎 Media${caption ? `: ${caption}` : ''}` : (caption || '[Message]');
        break;
      }
      default: text = typeof msg.content === 'string' ? msg.content : '[Message]';
    }

    if (msg.isDeleted) text = '🚫 This message was deleted';
    lines.push(`[${time}] ${sender}: ${text}`);

    if (msg.reactions?.length) {
      const reactionStr = msg.reactions.map(r => `${r.emoji} ${r.user?.username || ''}`).join(', ');
      lines.push(`  ↳ Reactions: ${reactionStr}`);
    }
  });

  lines.push('', `${'─'.repeat(40)}`, 'Exported from GENZ WhatsApp');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${conversationName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Export a chat in the canonical WhatsApp .txt format
 * (`[MM/DD/YYYY, HH:MM:SS AM/PM] Sender: message`) so it round-trips through
 * parseWhatsAppTxt (chatImporter.js) with formatting markers preserved.
 * Own messages are attributed to "You", media messages to "<omitted>" labels.
 */
export const exportChatAsWhatsAppTxt = (messages = [], conversationName = 'Chat', currentUserId) => {
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDateTime = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '[Unknown date, time]';
    const ap = d.getHours() >= 12 ? 'PM' : 'AM';
    const h = d.getHours() % 12 || 12;
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}, ${pad(h)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ap}`;
  };
  const isOwn = (msg) =>
    msg.sender === currentUserId ||
    (msg.sender && String(msg.sender?._id || '') === String(currentUserId)) ||
    msg.sender?.username === 'You';
  const senderName = (msg) => (isOwn(msg) ? 'You' : msg.sender?.username || msg.senderName || 'Unknown');

  const textOf = (msg) => {
    if (msg.isDeleted) return 'This message was deleted';
    switch (msg.messageType) {
      case 'image': return 'image omitted';
      case 'video': return 'video omitted';
      case 'audio': return 'audio omitted';
      case 'sticker': return 'sticker omitted';
      case 'gif': return 'gif omitted';
      case 'file': return `${msg.fileName || 'file'} (file attached)`;
      case 'location': return `📍 Location: ${msg.location?.lat?.toFixed(5)}, ${msg.location?.lng?.toFixed(5)}`;
      case 'contact': return `👤 Contact: ${msg.contactData?.name || 'Contact'}`;
      case 'structured': {
        const textPart = (msg.structuredContent || []).find((c) => c.type === 'text');
        const mediaPart = (msg.structuredContent || []).find((c) => c.type !== 'text');
        const caption = textPart?.value || '';
        if (!mediaPart) return caption || '[Message]';
        return caption ? `${caption}\n<Media omitted>` : '<Media omitted>';
      }
      default: return typeof msg.content === 'string' ? msg.content : '';
    }
  };

  const lines = [];
  (messages || []).forEach((msg) => {
    if (msg.isSystem || msg.messageType === 'system' || msg.messageType === 'notification') return;
    const text = textOf(msg);
    if (!text) return;
    lines.push(`[${fmtDateTime(msg.createdAt || Date.now())}] ${senderName(msg)}: ${text}`);
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${conversationName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportChatAsJson = (messages = [], conversationName = 'Chat') => {
  const data = {
    exportedAt: new Date().toISOString(),
    conversation: conversationName,
    messageCount: messages.length,
    messages: messages.map(m => ({
      id: m._id || m.id,
      sender: m.sender?.username || m.senderName,
      content: m.content,
      type: m.messageType,
      time: m.createdAt,
      reactions: m.reactions,
      status: m.status,
    }))
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${conversationName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
