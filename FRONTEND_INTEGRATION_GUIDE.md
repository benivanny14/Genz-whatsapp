# Frontend Components Integration Guide

## Overview

This guide shows how to integrate the new WhatsApp-like features into your existing chat UI.

## Components Created

### 1. **SearchMessages.jsx**

- Location: `frontend/src/components/SearchMessages.jsx`
- Purpose: Full-text message search within a conversation
- Features:
  - Debounced search input
  - Message preview with sender info
  - Click to navigate to message
  - Loading and error states

**Usage:**

```jsx
import SearchMessages from "../components/SearchMessages";

const [showSearch, setShowSearch] = useState(false);

// In your chat component
{
  showSearch && (
    <SearchMessages
      conversationId={selectedConversation._id}
      onSelectMessage={(msg) => {
        // Navigate to message
        console.log("Selected message:", msg);
      }}
      onClose={() => setShowSearch(false)}
    />
  );
}
```

### 2. **MediaGallery.jsx**

- Location: `frontend/src/components/MediaGallery.jsx`
- Purpose: Display all media (photos, videos, audio, documents) in a conversation
- Features:
  - Tab filtering (All, Photos, Videos, Audio, Documents)
  - Grid view with thumbnails
  - Lightbox preview
  - Download capability

**Usage:**

```jsx
import MediaGallery from "../components/MediaGallery";

const [showMediaGallery, setShowMediaGallery] = useState(false);

{
  showMediaGallery && (
    <MediaGallery
      conversationId={selectedConversation._id}
      onClose={() => setShowMediaGallery(false)}
    />
  );
}
```

### 3. **MessageInfo.jsx**

- Location: `frontend/src/components/MessageInfo.jsx`
- Purpose: Display message metadata (delivery status, read receipts, reactions, etc.)
- Features:
  - Delivery status with icons (Sent/Delivered/Read)
  - Read-by list with timestamps
  - Reaction count
  - Forward count
  - View-once indicator
  - Edit timestamp

**Usage:**

```jsx
import MessageInfo from "../components/MessageInfo";

<MessageInfo
  messageId={message._id}
  onClose={() => setShowMessageInfo(false)}
/>;
```

### 4. **ForwardDialog.jsx**

- Location: `frontend/src/components/ForwardDialog.jsx`
- Purpose: Forward messages to one or multiple conversations
- Features:
  - Multi-select conversations
  - Message preview
  - Forward count display
  - Loading states
  - Excludes current conversation

**Usage:**

```jsx
import ForwardDialog from "../components/ForwardDialog";

<ForwardDialog
  messageId={message._id}
  messageContent={message.content}
  conversationId={currentConversationId}
  onClose={() => setShowForwardDialog(false)}
/>;
```

### 5. **ReportDialog.jsx**

- Location: `frontend/src/components/ReportDialog.jsx`
- Purpose: Report abusive/inappropriate messages
- Features:
  - Multiple report reasons (Spam, Harassment, Inappropriate, etc.)
  - Optional details textarea
  - Confirmation feedback
  - Only available for messages from other users

**Usage:**

```jsx
import ReportDialog from "../components/ReportDialog";

<ReportDialog
  messageId={message._id}
  messageContent={message.content}
  senderInfo={message.sender}
  onClose={() => setShowReportDialog(false)}
/>;
```

### 6. **GroupInfo.jsx**

- Location: `frontend/src/components/GroupInfo.jsx`
- Purpose: Display and manage group information
- Features:
  - Group photo, name, and description
  - Member list with admin indicators
  - Admin editing capabilities
  - Group statistics (members, admins, pinned)
  - Group settings display

**Usage:**

```jsx
import GroupInfo from "../components/GroupInfo";

<GroupInfo
  groupId={selectedConversation._id}
  currentUserId={currentUserId}
  onClose={() => setShowGroupInfo(false)}
/>;
```

### 7. **MessageContextMenu.jsx**

- Location: `frontend/src/components/MessageContextMenu.jsx`
- Purpose: Right-click/long-press context menu for messages
- Features:
  - Message Info
  - Star/Unstar
  - Copy text
  - Forward
  - Reply
  - Edit (own messages)
  - Delete (own messages)
  - Report (other's messages)

**Usage:**

```jsx
import MessageContextMenu from "../components/MessageContextMenu";

const [contextMenu, setContextMenu] = useState(null);

// Long-press handler
const handleMessageLongPress = (message, e) => {
  e.preventDefault();
  setContextMenu({
    message,
    position: { x: e.pageX, y: e.pageY },
  });
};

// In your message component
<div
  onContextMenu={(e) => handleMessageLongPress(message, e)}
  onLongPress={(e) => handleMessageLongPress(message, e)}
>
  {message.content}
</div>;

// Render context menu
{
  contextMenu && (
    <MessageContextMenu
      message={contextMenu.message}
      position={contextMenu.position}
      onClose={() => setContextMenu(null)}
      onDelete={() => {
        // Handle delete
        setContextMenu(null);
      }}
      onEdit={() => {
        // Handle edit
        setContextMenu(null);
      }}
      onToggleStar={() => {
        // Handle star toggle
        setContextMenu(null);
      }}
      currentUserId={currentUserId}
    />
  );
}
```

## ChatContext API Functions

All new functions are available from `useChat()` hook:

```jsx
const {
  // Search & Gallery
  searchMessages, // (conversationId, query) => Promise
  getMediaGallery, // (conversationId, mediaType) => Promise

  // Message Operations
  getMessageInfo, // (messageId) => Promise
  markViewOnceViewed, // (messageId) => Promise
  forwardMessage, // (messageId, targetConversationIds) => Promise
  reportMessage, // (messageId, reason, details) => Promise

  // Group Operations
  getGroupInfo, // (groupId) => Promise
  updateGroupInfo, // (groupId, updates) => Promise
  removeAdmin, // (groupId, userId) => Promise
} = useChat();
```

## Socket Event Listeners

The ChatContext now listens to these new socket events:

- `message:forwarded` - When a message is forwarded
- `group:updated` - When group info is updated
- `admin:removed` - When an admin is removed
- `message:view-once-viewed` - When a view-once message is viewed

## Integration Checklist

- [ ] Add search icon to chat header → triggers `<SearchMessages />`
- [ ] Add media gallery icon to group details → triggers `<MediaGallery />`
- [ ] Add long-press handlers to messages → triggers `<MessageContextMenu />`
- [ ] Add message info button → triggers `<MessageInfo />`
- [ ] Add forward button to message actions → triggers `<ForwardDialog />`
- [ ] Add report button (non-own messages) → triggers `<ReportDialog />`
- [ ] Add group info button → triggers `<GroupInfo />`
- [ ] Wire up edit and delete handlers
- [ ] Test all features on mobile and desktop

## Example: Complete Chat Component Integration

```jsx
import React, { useState } from "react";
import { useChat } from "../context/ChatContext";
import SearchMessages from "../components/SearchMessages";
import MediaGallery from "../components/MediaGallery";
import MessageContextMenu from "../components/MessageContextMenu";
import GroupInfo from "../components/GroupInfo";

export default function Chat() {
  const { selectedConversation, messages, toggleStarMessage } = useChat();
  const [showSearch, setShowSearch] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const handleMessageRightClick = (message, e) => {
    e.preventDefault();
    setContextMenu({
      message,
      position: { x: e.pageX, y: e.pageY },
    });
  };

  return (
    <div>
      {/* Chat Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <div>
          <h2>{selectedConversation?.groupName}</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSearch(true)}>🔍 Search</button>
          <button onClick={() => setShowMedia(true)}>🖼️ Media</button>
          {selectedConversation?.isGroup && (
            <button onClick={() => setShowGroupInfo(true)}>ℹ️ Info</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg._id}
            onContextMenu={(e) => handleMessageRightClick(msg, e)}
            className="p-2 mb-2 bg-gray-700 rounded"
          >
            <p>{msg.content}</p>
            {msg.isStarred && <span>⭐</span>}
          </div>
        ))}
      </div>

      {/* Modals */}
      {showSearch && (
        <SearchMessages
          conversationId={selectedConversation._id}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showMedia && (
        <MediaGallery
          conversationId={selectedConversation._id}
          onClose={() => setShowMedia(false)}
        />
      )}

      {showGroupInfo && selectedConversation?.isGroup && (
        <GroupInfo
          groupId={selectedConversation._id}
          currentUserId={localStorage.getItem("userId")}
          onClose={() => setShowGroupInfo(false)}
        />
      )}

      {contextMenu && (
        <MessageContextMenu
          message={contextMenu.message}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onToggleStar={() => {
            toggleStarMessage(contextMenu.message._id);
            setContextMenu(null);
          }}
          currentUserId={localStorage.getItem("userId")}
        />
      )}
    </div>
  );
}
```

## Styling Notes

All components use Tailwind CSS with the dark theme:

- Background: `#0d1b2a` (dark navy)
- Borders: Gray-700
- Hover: Gray-600
- Primary: Blue-600
- Accents: Various (yellow for star, red for delete, etc.)

## Backend API Endpoints

Reference for API calls made by these components:

```
GET    /api/chat/conversations/:conversationId/search?query=X
GET    /api/chat/conversations/:conversationId/media?type=all|image|video|audio|document
GET    /api/chat/messages/:messageId/info
PUT    /api/chat/messages/:messageId/view-once-viewed
POST   /api/chat/messages/:messageId/forward
POST   /api/chat/messages/:messageId/report
GET    /api/chat/groups/:groupId/info
PUT    /api/chat/groups/:groupId/info
DELETE /api/chat/groups/:groupId/admins/:userId
```

All endpoints require Bearer token in `Authorization` header.
