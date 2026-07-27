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
