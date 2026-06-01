const fs = require('fs');

const path = 'src/context/ChatContext.jsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Find the line where blockUser starts (should be around 2586)
let startIndex = lines.findIndex((l, i) => i > 2500 && l.includes('const blockUser = '));

// Find the line where searchMessages starts (// ──── NEW WHATSAPP FEATURES ────)
let endIndex = lines.findIndex((l, i) => i > startIndex && l.includes('// ──── NEW WHATSAPP FEATURES ────'));

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end index.");
  process.exit(1);
}

// The correct block of functions to insert between updateContact and NEW WHATSAPP FEATURES
const correctBlock = `  const blockUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(\`\${SOCKET_URL}/api/chat/users/\${userId}/block\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setBlockedUsers(prev => [...(prev || []), userId]);
        emitSafe('block_user', { userId, blockerId: currentUserId });
      }
      return data;
    } catch (err) {
      console.error('Block user error:', err);
      return { success: false };
    }
  };

  const unblockUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(\`\${SOCKET_URL}/api/chat/users/\${userId}/block\`, {
        method: 'DELETE',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setBlockedUsers(prev => (prev || []).filter(id => id !== userId));
        emitSafe('unblock_user', { userId, blockerId: currentUserId });
      }
      return data;
    } catch (err) {
      console.error('Unblock user error:', err);
      return { success: false };
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(\`\${SOCKET_URL}/api/user/profile\`, {
        method: 'PUT',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (data.success) {
        if (updates.username) localStorage.setItem('username', updates.username);
        if (updates.profilePicture) localStorage.setItem('profilePicture', updates.profilePicture);
        if (updates.bio) localStorage.setItem('bio', updates.bio);
      }
      return data;
    } catch (err) {
      console.error('Update profile error:', err);
      return { success: false };
    }
  };
`;

const newLines = [
  ...lines.slice(0, startIndex),
  ...correctBlock.split('\n'),
  ...lines.slice(endIndex)
];

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log("Fixed ChatContext.jsx successfully!");
