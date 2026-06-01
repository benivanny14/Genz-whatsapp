const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'context', 'ChatContext.jsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /const getMediaGallery = async \(conversationId, mediaType = 'all'\) => \{[\s\S]*?\} catch \(err\) \{[\s\S]*?\}[\s\S]*?\};\s+const getMessageInfo/;

const replacement = `const getMediaGallery = async (conversationId, mediaType = 'all') => {
    try {
      const response = await authFetch(\`\${SOCKET_URL}/api/chat/conversations/\${conversationId}/media?mediaType=\${mediaType}\`);
      const data = await response.json();
      const items = data.data || data.media || [];
      const normalizedItems = items.map(item => ({
        ...item,
        mediaUrl: item.mediaUrl || item.content || item.url || ''
      }));
      return { ...data, data: normalizedItems, media: normalizedItems };
    } catch (err) {
      console.error('Get media gallery error:', err);
      return { success: false, message: 'Failed to fetch media' };
    }
  };

  const getMessageInfo`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log('Done!');
