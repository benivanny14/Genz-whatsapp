const User = require('../models/User');
const {
  sendNewMessageNotification,
  sendGroupNotification
} = require('../services/notificationService');

const stringify = (value) => (value === undefined || value === null ? '' : String(value));

const buildPreview = ({ showPreview, messageType, text }) => {
  if (!showPreview) return 'New message';
  if (messageType === 'image') return 'Photo';
  if (messageType === 'video') return 'Video';
  if (messageType === 'audio' || messageType === 'voice') return 'Voice note';
  if (messageType === 'sticker') return 'Sticker';
  if (messageType === 'gif') return 'GIF';
  if (messageType === 'location') return 'Location';
  if (messageType === 'contact') return 'Contact';
  return String(text || 'New message').slice(0, 120);
};

async function notifyConversationMessage({
  conversation,
  senderId,
  senderName,
  text,
  messageType,
  conversationId
}) {
  if (!conversation?.participants) return;
  const tasks = [];
  const groupName = conversation.groupName || conversation.name || 'Group';
  const isGroup = !!conversation.isGroup;

  for (const participantId of conversation.participants) {
    if (String(participantId) === String(senderId)) continue;
    const recipient = await User.findById(participantId).select('settings.notifications username');
    if (!recipient) continue;
    const settings = recipient.settings?.notifications || {};
    if (isGroup && settings.groups === false) continue;
    if (!isGroup && settings.messages === false) continue;
    const showPreview = settings.showPreview !== false;
    const preview = buildPreview({ showPreview, messageType, text });
    const payload = {
      senderName: senderName || 'GENZ',
      text: preview,
      conversationId: stringify(conversationId),
      senderId: stringify(senderId),
      type: messageType || 'text',
      groupId: isGroup ? stringify(conversationId) : '',
      groupName: isGroup ? groupName : '',
      deepLink: `app.genzwhatsapp://chat?conversationId=${encodeURIComponent(stringify(conversationId))}`,
      showPreview
    };
    if (isGroup) {
      tasks.push(sendGroupNotification(stringify(conversationId), [stringify(participantId)], {
        ...payload,
        groupName,
        senderName: senderName || 'GENZ'
      }));
    } else {
      tasks.push(sendNewMessageNotification(stringify(participantId), payload));
    }
  }

  if (tasks.length) {
    await Promise.allSettled(tasks);
  }
}

module.exports = {
  notifyConversationMessage,
  buildPreview
};
