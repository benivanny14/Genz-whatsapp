const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/ChatArea.jsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes("import GroupInfo from './GroupInfo';")) {
  content = content.replace(
    "import ContactInfo from './ContactInfo';", 
    "import ContactInfo from './ContactInfo';\nimport GroupInfo from './GroupInfo';"
  );
}

const regex = /\{\s*\/\*\s*Group Info Modal\s*\*\/\s*\}.*?(?=\{\s*showFilePreview)/s;
const replacement = `{/* Group Info Panel */}
      <AnimatePresence>
        {showGroupInfo && selectedConversation?.isGroup && (
          <GroupInfo 
            group={selectedConversation} 
            currentUserId={user?._id || user?.id}
            onClose={() => setShowGroupInfo(false)} 
          />
        )}
      </AnimatePresence>
      
      {
`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content);
  console.log('Successfully replaced Group Info inline modal with component.');
} else {
  console.log('Regex not matched.');
}
