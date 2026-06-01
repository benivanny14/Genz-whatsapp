# Frontend Components Quick Reference

## New Files Created

```
frontend/src/components/
├── SearchMessages.jsx          # Full-text search modal
├── MediaGallery.jsx            # Media browser with preview
├── MessageInfo.jsx             # Message metadata display
├── ForwardDialog.jsx           # Multi-conversation forward selector
├── ReportDialog.jsx            # Message report form
├── GroupInfo.jsx               # Group details & management
└── MessageContextMenu.jsx      # Context menu for message actions
```

## Modified Files

```
frontend/src/context/
└── ChatContext.jsx             # Added 9 API functions + 5 socket listeners
```

## Documentation Files

```
root/
├── FRONTEND_INTEGRATION_GUIDE.md     # Detailed integration instructions
└── FEATURE_COMPLETION_REPORT.md      # Feature status & testing checklist
```

---

## Component Properties Reference

### SearchMessages

```jsx
<SearchMessages
  conversationId={string}    // Required: conversation ID
  onSelectMessage={function} // Optional: called when message clicked
  onClose={function}         // Optional: called when closed
/>
```

### MediaGallery

```jsx
<MediaGallery
  conversationId={string}    // Required: conversation ID
  onClose={function}         // Optional: called when closed
/>
```

### MessageInfo

```jsx
<MessageInfo
  messageId={string}         // Required: message ID
  onClose={function}         // Optional: called when closed
/>
```

### ForwardDialog

```jsx
<ForwardDialog
  messageId={string}         // Required: message to forward
  messageContent={string}    // Optional: message preview text
  conversationId={string}    // Required: current conversation
  onClose={function}         // Optional: called when closed
/>
```

### ReportDialog

```jsx
<ReportDialog
  messageId={string}         // Required: message to report
  messageContent={string}    // Optional: message preview text
  senderInfo={object}        // Optional: sender user info
  onClose={function}         // Optional: called when closed
/>
```

### GroupInfo

```jsx
<GroupInfo
  groupId={string}           // Required: group ID
  currentUserId={string}     // Required: current user ID
  onClose={function}         // Optional: called when closed
/>
```

### MessageContextMenu

```jsx
<MessageContextMenu
  message={object}           // Required: message object
  position={{x, y}}          // Required: cursor position
  onClose={function}         // Optional: called when closed
  onDelete={function}        // Optional: delete handler
  onEdit={function}          // Optional: edit handler
  onToggleStar={function}    // Optional: star toggle handler
  currentUserId={string}     // Required: current user ID
/>
```

---

## useChat() Hook API

### New Functions Added

```javascript
// Search & Discovery
searchMessages(conversationId, query)
  Returns: { success, data: [messages] }

getMediaGallery(conversationId, mediaType='all')
  Returns: { success, data: [media] }
  mediaType: 'all' | 'image' | 'video' | 'audio' | 'document'

// Message Operations
getMessageInfo(messageId)
  Returns: { success, data: messageInfo }

markViewOnceViewed(messageId)
  Returns: { success }

forwardMessage(messageId, targetConversationIds)
  Returns: { success }
  targetConversationIds: array of conversation IDs

reportMessage(messageId, reason, details='')
  Returns: { success }
  reason: 'spam'|'harassment'|'inappropriate'|'misinformation'|'copyright'|'other'

// Group Operations
getGroupInfo(groupId)
  Returns: { success, data: groupInfo }

updateGroupInfo(groupId, updates)
  Returns: { success }
  updates: { groupName?, groupDescription?, groupPhoto? }

removeAdmin(groupId, userId)
  Returns: { success }
```

---

## Socket Events Handled

### Emitted

```javascript
socket.emit("message:forwarded", { messageId, targetConversationIds });
socket.emit("group:updated", { groupId, updates });
socket.emit("admin:removed", { groupId, userId });
socket.emit("message:view-once-viewed", { messageId });
```

### Received

```javascript
socket.on("message:forwarded", ({ messageId, targetConversationIds }) => {});
socket.on("group:updated", ({ groupId, updates }) => {});
socket.on("admin:removed", ({ groupId, userId }) => {});
socket.on("message:view-once-viewed", ({ messageId }) => {});
```

---

## Color Scheme

All components use this consistent color scheme:

```
Primary BG:     #0d1b2a (Dark Navy)
Secondary BG:   #1a2332 (Darker Navy)
Hover BG:       #374151 (Gray-700)
Border:         #4b5563 (Gray-700)

Text Primary:   White (#ffffff)
Text Secondary: #d1d5db (Gray-300)
Text Muted:     #9ca3af (Gray-400)

Accent Colors:
- Blue:         #2563eb (Blue-600)
- Green:        #10b981 (Green-500)
- Red:          #ef4444 (Red-500)
- Yellow:       #f59e0b (Yellow-500)
- Purple:       #8b5cf6 (Purple-500)
```

---

## Common Integration Patterns

### Pattern 1: Toggle Modal with State

```jsx
const [showModal, setShowModal] = useState(false);

// Trigger
<button onClick={() => setShowModal(true)}>Open</button>;

// Render
{
  showModal && <ModalComponent onClose={() => setShowModal(false)} />;
}
```

### Pattern 2: Message Long-Press

```jsx
const handleLongPress = (message, e) => {
  e.preventDefault();
  setContextMenu({
    message,
    position: { x: e.pageX, y: e.pageY },
  });
};

<div onContextMenu={(e) => handleLongPress(message, e)}>Content</div>;
```

### Pattern 3: API Call with Loading

```jsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const handleAction = async () => {
  setLoading(true);
  setError("");
  try {
    const response = await apiFunction();
    if (response.success) {
      // Handle success
    } else {
      setError(response.message);
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## Tailwind CSS Classes Used

Common utility classes across all components:

```css
/* Containers */
fixed inset-0 bg-black bg-opacity-50 z-50 p-4
rounded-lg max-w-md w-full max-h-96 flex flex-col

/* Text */
text-white text-sm font-bold
text-gray-400 text-xs
truncate (overflow hidden)

/* Buttons */
px-4 py-2 bg-blue-600 text-white rounded-lg
hover:bg-blue-700 transition disabled:opacity-50

/* Spacing */
gap-2 gap-3 space-y-2 space-y-4
px-3 py-2 p-4 m-4

/* Borders */
border border-gray-700 rounded-lg
border-b border-gray-700

/* Flexbox */
flex items-center justify-between
flex-1 flex-shrink-0 min-w-0
```

---

## Keyboard Shortcuts to Implement

Suggested shortcuts to add:

```javascript
// In Chat component useEffect
useEffect(() => {
  const handleKeyPress = (e) => {
    // Ctrl/Cmd + F for search
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      e.preventDefault();
      setShowSearch(true);
    }
    // Escape to close all modals
    if (e.key === "Escape") {
      setContextMenu(null);
      setShowSearch(false);
      setShowMedia(false);
    }
  };

  window.addEventListener("keydown", handleKeyPress);
  return () => window.removeEventListener("keydown", handleKeyPress);
}, []);
```

---

## Error Handling Guide

All components follow this pattern:

1. **Show Loading State**: Spinner/animation
2. **Make API Call**: Try/catch block
3. **Handle Success**: Update state, show feedback
4. **Handle Error**: Display error message, allow retry
5. **Show Confirmation**: Toast or inline message

---

## Performance Optimization Tips

1. **Memoize Components**: Wrap expensive components

   ```jsx
   const MemoizedComponent = React.memo(Component);
   ```

2. **Debounce Search**: Already implemented (300ms)

3. **Lazy Load Media**: Gallery loads on demand

4. **Cancel Requests**: Cleanup in useEffect

   ```jsx
   useEffect(() => {
     let cancelled = false;
     fetchData().then(() => {
       if (!cancelled) setData(result);
     });
     return () => {
       cancelled = true;
     };
   }, []);
   ```

5. **Avoid Inline Objects**: Move styles to Tailwind classes

---

## Testing Scenarios

### Search Messages

- [ ] Type 1 character → no results
- [ ] Type valid query → results appear
- [ ] Click result → closes modal
- [ ] Click with no results → shows "No messages found"

### Media Gallery

- [ ] Load gallery → all media appears
- [ ] Click tab → filters by type
- [ ] Click media → opens lightbox
- [ ] Click download → downloads file

### Message Info

- [ ] Load message info → shows metadata
- [ ] Check delivery status → correct icons shown
- [ ] View read-by → shows list with times
- [ ] Check reactions → displays all reactions

### Forward Message

- [ ] Select conversations → checkmarks appear
- [ ] Click forward → message sent to all selected
- [ ] Forward to 1 → works correctly
- [ ] Forward to multiple → all receive message

### Report Message

- [ ] Select reason → details field appears
- [ ] Submit empty details → still works
- [ ] Submit with details → saved correctly
- [ ] Only available for other users → verified

### Group Info

- [ ] Load group info → displays correctly
- [ ] Edit as admin → can change name/description
- [ ] Edit as member → edit button hidden
- [ ] Member list → shows all members with roles
- [ ] Remove admin → option appears for admins only

---

**Quick Links**

- Backend API: `backend/routes/chatRoutes.js`
- Context Functions: `frontend/src/context/ChatContext.jsx`
- Integration Guide: `FRONTEND_INTEGRATION_GUIDE.md`
- Feature Report: `FEATURE_COMPLETION_REPORT.md`
