const fs = require('fs');
const path = require('path');

// 1. Update chatController.js
const chatControllerPath = path.join(__dirname, 'backend/controllers/chatController.js');
let chatControllerCode = fs.readFileSync(chatControllerPath, 'utf8');

const joinGroupFunc = `
exports.joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const conversation = await Conversation.findOne({ _id: groupId, isGroup: true });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = conversation.participants.some(p => p.toString() === req.user.id);
    if (isMember) {
      return res.status(400).json({ success: false, message: 'Already a member' });
    }

    conversation.participants.push(req.user.id);
    await conversation.save();

    res.status(200).json({ success: true, message: 'Joined group successfully', data: conversation });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ success: false, message: 'Failed to join group' });
  }
};
`;

if (!chatControllerCode.includes('exports.joinGroup')) {
  chatControllerCode += '\n' + joinGroupFunc;
  fs.writeFileSync(chatControllerPath, chatControllerCode);
  console.log('Added joinGroup to chatController.js');
}

// 2. Update chatRoutes.js
const chatRoutesPath = path.join(__dirname, 'backend/routes/chatRoutes.js');
let chatRoutesCode = fs.readFileSync(chatRoutesPath, 'utf8');

if (!chatRoutesCode.includes('joinGroup')) {
  chatRoutesCode = chatRoutesCode.replace(
    'leaveGroup,',
    'leaveGroup,\n  joinGroup,'
  );
  chatRoutesCode = chatRoutesCode.replace(
    'router.delete("/groups/:id/leave", leaveGroup);',
    'router.delete("/groups/:id/leave", leaveGroup);\nrouter.post("/groups/:groupId/join", joinGroup);'
  );
  fs.writeFileSync(chatRoutesPath, chatRoutesCode);
  console.log('Added joinGroup to chatRoutes.js');
}

// 3. Update ChatContext.jsx
const chatContextPath = path.join(__dirname, 'frontend/src/context/ChatContext.jsx');
let chatContextCode = fs.readFileSync(chatContextPath, 'utf8');

if (chatContextCode.includes('/api/groups/${groupId}/join')) {
  chatContextCode = chatContextCode.replace(
    '`${SOCKET_URL}/api/groups/${groupId}/join`',
    '`${SOCKET_URL}/api/chat/groups/${groupId}/join`'
  );
  fs.writeFileSync(chatContextPath, chatContextCode);
  console.log('Updated ChatContext.jsx API path');
}

console.log('Patch complete.');
