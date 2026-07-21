const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const mongoose = require('mongoose');

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const getCurrentUserId = (req) => req.user?._id?.toString() || LOCAL_USER_ID;

const ensureParticipant = (conversation, userId, res) => {
  if (!conversation) {
    res.status(404).json({ success: false, message: 'Conversation not found' });
    return false;
  }
  const isParticipant = conversation.participants.some(
    (p) => (p?._id || p).toString() === userId
  );
  if (!isParticipant) {
    res.status(403).json({ success: false, message: 'Not authorized for this conversation' });
    return false;
  }
  return true;
};

// Export chat as TXT
exports.exportAsTxt = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const conversationId = req.params.id;
    
    const conversation = await Conversation.findById(conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId },
      deletedForEveryone: false
    })
    .populate('sender', 'username phoneNumber')
    .sort({ createdAt: 1 });

    const convName = conversation.isGroup 
      ? conversation.groupName 
      : (await User.findById(
          conversation.participants.find(p => p.toString() !== userId)
        ))?.username || 'Unknown';

    let txt = `GENZ WhatsApp Chat Export\n`;
    txt += `Chat with: ${convName}\n`;
    txt += `Exported: ${new Date().toISOString()}\n`;
    txt += `${'='.repeat(50)}\n\n`;

    messages.forEach(msg => {
      const sender = msg.sender?.username || 'Unknown';
      const time = new Date(msg.createdAt).toLocaleString('sw-TZ');
      const content = msg.deletedForEveryone ? '[This message was deleted]' : (msg.content || `[${msg.messageType}]`);
      
      txt += `[${time}] ${sender}: ${content}\n`;
      
      if (msg.isEdited) {
        txt += `  (edited)\n`;
      }
      if (msg.mediaUrl) {
        txt += `  [Media: ${msg.mediaUrl}]\n`;
      }
      if (msg.replyTo) {
        txt += `  (reply to: ${msg.replyTo.content?.substring(0, 50) || 'message'})\n`;
      }
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="genz-chat-${convName.replace(/[^a-z0-9]/gi, '_')}.txt"`);
    res.send(txt);
  } catch (error) {
    console.error('Export TXT error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export chat as HTML
exports.exportAsHtml = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const conversationId = req.params.id;
    
    const conversation = await Conversation.findById(conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId },
      deletedForEveryone: false
    })
    .populate('sender', 'username phoneNumber profilePicture')
    .sort({ createdAt: 1 });

    const convName = conversation.isGroup 
      ? conversation.groupName 
      : (await User.findById(
          conversation.participants.find(p => p.toString() !== userId)
        ))?.username || 'Unknown';

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GENZ Chat: ${convName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0b141a; 
      color: #e9edef; 
      padding: 20px; 
      max-width: 800px; 
      margin: 0 auto;
    }
    .header { 
      background: #075e54; 
      color: white; 
      padding: 20px; 
      border-radius: 12px; 
      margin-bottom: 20px;
      text-align: center;
    }
    .header h1 { font-size: 20px; }
    .header p { font-size: 12px; opacity: 0.8; margin-top: 5px; }
    .message { 
      padding: 12px 16px; 
      margin: 8px 0; 
      border-radius: 8px; 
      max-width: 80%; 
      word-wrap: break-word;
    }
    .message.sent {
      background: #005c4b;
      margin-left: auto;
      text-align: right;
    }
    .message.received {
      background: #202c33;
      margin-right: auto;
    }
    .message .sender { 
      font-size: 11px; 
      font-weight: bold; 
      color: #06cf9c;
      margin-bottom: 4px;
    }
    .message .content { font-size: 14px; line-height: 1.4; }
    .message .time { 
      font-size: 10px; 
      color: #8696a0; 
      margin-top: 4px;
    }
    .message .edited { color: #8696a0; font-size: 10px; font-style: italic; }
    .message .media { 
      color: #53bdeb; 
      font-size: 11px; 
      margin-top: 4px;
      word-break: break-all;
    }
    .message.system {
      background: transparent;
      text-align: center;
      margin: 10px auto;
      max-width: 100%;
      color: #8696a0;
      font-size: 11px;
    }
    .date-separator {
      text-align: center;
      color: #8696a0;
      font-size: 10px;
      margin: 16px 0;
      padding: 4px 12px;
      background: #182229;
      border-radius: 4px;
      display: inline-block;
    }
    @media print {
      body { background: white; color: black; }
      .message.sent { background: #dcf8c6; color: black; }
      .message.received { background: #f0f0f0; color: black; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💬 Chat with ${convName}</h1>
    <p>Exported: ${new Date().toLocaleString('sw-TZ')} | Messages: ${messages.length}</p>
  </div>
`;

    let lastDate = '';
    messages.forEach(msg => {
      const senderName = msg.sender?.username || 'Unknown';
      const isSentByMe = msg.sender?._id?.toString() === userId;
      const msgDate = new Date(msg.createdAt).toLocaleDateString('sw-TZ', { 
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
      });
      
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        html += `<div class="date-separator">📅 ${msgDate}</div>\n`;
      }

      if (msg.messageType === 'system') {
        html += `<div class="message system">${msg.content}</div>\n`;
        return;
      }

      const time = new Date(msg.createdAt).toLocaleTimeString('sw-TZ', { 
        hour: '2-digit', minute: '2-digit' 
      });
      
      html += `<div class="message ${isSentByMe ? 'sent' : 'received'}">
        ${conversation.isGroup && !isSentByMe ? `<div class="sender">${senderName}</div>` : ''}
        <div class="content">${(msg.content || `[${msg.messageType}]`).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')}</div>
        ${msg.isEdited ? '<div class="edited">(edited)</div>' : ''}
        ${msg.mediaUrl ? `<div class="media">📎 <a href="${msg.mediaUrl}" style="color:#53bdeb">${msg.fileName || msg.messageType}</a></div>` : ''}
        <div class="time">${time}</div>
      </div>\n`;
    });

    html += `</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="genz-chat-${convName.replace(/[^a-z0-9]/gi, '_')}.html"`);
    res.send(html);
  } catch (error) {
    console.error('Export HTML error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export chat as JSON
exports.exportAsJson = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const conversationId = req.params.id;
    
    const conversation = await Conversation.findById(conversationId);
    if (!ensureParticipant(conversation, userId, res)) return;

    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId },
      deletedForEveryone: false
    })
    .populate('sender', 'username phoneNumber')
    .populate('replyTo', 'content messageType sender')
    .sort({ createdAt: 1 });

    const convName = conversation.isGroup 
      ? conversation.groupName 
      : (await User.findById(
          conversation.participants.find(p => p.toString() !== userId)
        ))?.username || 'Unknown';

    const exportData = {
      exportInfo: {
        app: 'GENZ WhatsApp',
        exportedAt: new Date().toISOString(),
        chatName: convName,
        isGroup: conversation.isGroup,
        totalMessages: messages.length
      },
      messages: messages.map(msg => ({
        id: msg._id,
        sender: msg.sender?.username || 'Unknown',
        senderPhone: msg.sender?.phoneNumber || '',
        content: msg.deletedForEveryone ? '[deleted]' : msg.content,
        messageType: msg.messageType,
        mediaUrl: msg.mediaUrl || null,
        fileName: msg.fileName || null,
        fileSize: msg.fileSize || 0,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        replyTo: msg.replyTo ? {
          content: msg.replyTo.content?.substring(0, 100),
          messageType: msg.replyTo.messageType
        } : null,
        createdAt: msg.createdAt,
        reactions: msg.reactions || [],
      }))
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="genz-chat-${convName.replace(/[^a-z0-9]/gi, '_')}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export JSON error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
