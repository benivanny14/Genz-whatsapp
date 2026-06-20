# GENZ WhatsApp - Comprehensive Testing Guide

## 🧪 How to Test All Features

### 1. **Voice/Video Calls** ✅
**Test Steps:**
1. Open the app and go to a chat
2. Click the phone icon (voice call) or video icon (video call) in the header
3. Call should start ringing on the recipient's end
4. Recipient should see incoming call screen with Accept/Decline buttons
5. Once accepted, conversation should start
6. Test mute/unmute, camera on/off, speaker toggle
7. Test ending the call

**Expected Results:**
- ✅ Call initiates successfully
- ✅ Ringtone plays (Web Audio API)
- ✅ Incoming call screen appears
- ✅ Video shows remote stream for video calls
- ✅ PiP (Picture-in-Picture) shows local video
- ✅ Controls work (mute, camera, speaker, end call)
- ✅ Call duration timer shows when connected
- ✅ Call ends properly

**Files Involved:**
- `frontend/src/components/CallScreen.jsx`
- `frontend/src/services/webrtc.js`
- `backend/socket/index.js`
- `backend/config/webrtc.js`

---

### 2. **Call Notification Pop-up** ✅
**Test Steps:**
1. Have someone call you while you're on a different page or app is in background
2. Check if call notification appears as a pop-up
3. Notification should slide in from the right
4. Should show caller name, profile picture, and call type
5. Accept/Decline buttons should work

**Expected Results:**
- ✅ Pop-up appears even when app is in background
- ✅ Slides in from right with animation
- ✅ Shows caller info clearly
- ✅ Accept/Decline buttons functional
- ✅ Dismisses properly after action

**Files Involved:**
- `frontend/src/services/notifications.js`
- `frontend/src/index.css` (`.call-notification-popup`)
- `backend/socket/index.js`

---

### 3. **Reply System** ✅
**Test Steps:**
1. In a chat, long-press or right-click a message
2. Select "Reply" from context menu
3. Reply preview should appear above input
4. Type your reply and send
5. The sent message should show it's a reply
6. Recipient should see the reply context

**Expected Results:**
- ✅ Reply preview shows original message
- ✅ Reply has border-left accent (green color)
- ✅ Sent message shows reply indicator
- ✅ Recipient sees which message was replied to
- ✅ Works for both text and media messages

**Files Involved:**
- `frontend/src/components/ChatArea.jsx`
- `frontend/src/index.css` (`.reply-preview`, `.reply-indicator`)
- `frontend/src/context/ChatContext.jsx`

---

### 4. **Tabs (Personal, Work, Groups)** ✅
**Test Steps:**
1. Go to chatlist
2. See tabs at the top: All, Personal, Work, Groups
3. Click each tab to filter conversations
4. Try adding a new tab
5. Assign conversations to different tabs

**Expected Results:**
- ✅ Tabs visible at top of chatlist
- ✅ Clicking tab filters conversations correctly
- ✅ "All" shows all conversations
- ✅ "Personal" shows only personal chats
- ✅ "Work" shows only work-related chats
- ✅ "Groups" shows only group conversations
- ✅ Can add new tabs
- ✅ Can assign conversations to tabs

**Files Involved:**
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/index.css` (`.tab-container`, `.tab-button`)
- `frontend/src/context/ChatContext.jsx`

---

### 5. **GENZ Mods Scrolling** ✅
**Test Steps:**
1. Open Settings menu
2. Click "GENZ Mods"
3. Try to scroll down
4. Check if all mods are visible
5. Try toggling different mods

**Expected Results:**
- ✅ Page scrolls smoothly
- ✅ All mod settings are visible
- ✅ Header stays at top
- ✅ Can access all features
- ✅ Toggles work correctly

**Files Involved:**
- `frontend/src/pages/GENZMods.jsx`
- `frontend/src/index.css` (`.genz-mods-container`)

---

### 6. **Language Settings** ✅
**Test Steps:**
1. Go to Settings → App Language
2. Select a different language (e.g., Kiswahili, Francais)
3. Check if UI updates immediately
4. Refresh page and verify language persists

**Expected Results:**
- ✅ Language selector works
- ✅ UI updates immediately without refresh
- ✅ Language persists after refresh
- ✅ `document.documentElement.lang` updates
- ✅ Settings save to backend

**Files Involved:**
- `frontend/src/pages/Settings.jsx`
- `frontend/src/index.css`
- `backend/services/userService.js`

---

### 7. **Text Menu Toggle** ✅
**Test Steps:**
1. In a chat, select some text
2. Text menu should appear
3. Click the menu again
4. Menu should close

**Expected Results:**
- ✅ Menu appears when text is selected
- ✅ Menu toggles (open/close) on click
- ✅ Clicking outside closes menu
- ✅ Smooth slide-up animation
- ✅ Menu items are clickable

**Files Involved:**
- `frontend/src/components/ChatArea.jsx`
- `frontend/src/index.css` (`.text-menu`, `.text-menu-content`)

---

### 8. **Media Full-Screen** ✅
**Test Steps:**
1. Receive an image or video in chat
2. Click on the media
3. Should open full-screen
4. Click again or press ESC to close

**Expected Results:**
- ✅ Media opens in full-screen overlay
- ✅ Dark background (95% opacity)
- ✅ Media centered and scaled properly
- ✅ Click or ESC closes full-screen
- ✅ Smooth fade-in/out animation
- ✅ Works for images and videos

**Files Involved:**
- `frontend/src/components/ChatArea.jsx`
- `frontend/src/components/MediaGallery.jsx`
- `frontend/src/index.css` (`.media-fullscreen`)

---

### 9. **Profile Picture Enlargement** ✅
**Test Steps:**
1. In chatlist, click on someone's profile picture
2. Picture should enlarge
3. Click again to close

**Expected Results:**
- ✅ Profile picture enlarges (1.5x scale)
- ✅ Smooth transition animation
- ✅ Centered on screen
- ✅ Click to close
- ✅ Returns to normal size

**Files Involved:**
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/index.css` (`.profile-pic-enlarged`)

---

### 10. **Group Creation** ✅
**Test Steps:**
1. Click "New Group" button
2. Enter group name
3. Select contacts
4. Set group permissions
5. Create group

**Expected Results:**
- ✅ Modal opens with form
- ✅ Can enter group name
- ✅ Contact selection with checkboxes
- ✅ Can set permissions
- ✅ Group creates successfully
- ✅ Members added correctly

**Files Involved:**
- `frontend/src/pages/NewGroup.jsx`
- `frontend/src/components/GroupInfo.jsx`
- `frontend/src/index.css` (`.group-creation-modal`)

---

### 11. **User Data Isolation** ✅
**Test Steps:**
1. Login as User A
2. Check conversations - should only see User A's chats
3. Logout and login as User B
4. Check conversations - should only see User B's chats
5. Verify no data mixing

**Expected Results:**
- ✅ Each user sees only their own data
- ✅ No conversation leakage between users
- ✅ Authentication works correctly
- ✅ Socket rooms are separate
- ✅ API calls are user-specific

**Files Involved:**
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/context/ChatContext.jsx`
- `backend/socket/index.js`
- `backend/controllers/chatController.js`

---

### 12. **Settings & Security Scrollability** ✅
**Test Steps:**
1. Open Settings
2. Scroll through all sections
3. Open Security Settings
4. Scroll through all features

**Expected Results:**
- ✅ Settings page scrolls smoothly
- ✅ All sections accessible
- ✅ Security Settings scroll properly
- ✅ All features visible and functional
- ✅ Headers stay at top

**Files Involved:**
- `frontend/src/pages/Settings.jsx`
- `frontend/src/pages/SecuritySettings.jsx`
- `frontend/src/index.css` (`.settings-scrollable`, `.security-settings-scrollable`)

---

### 13. **Typing/Recording Indicators** ✅
**Test Steps:**
1. Open a chat
2. Start typing a message
3. Check if other person sees typing indicator
4. Start recording voice note
5. Check if recording indicator shows

**Expected Results:**
- ✅ Green typing indicator shows in chatlist
- ✅ Green recording indicator shows in chatlist
- ✅ Indicators show in real-time
- ✅ Indicators disappear when stopped
- ✅ Works via socket real-time

**Files Involved:**
- `frontend/src/components/ChatArea.jsx`
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/index.css` (`.typing-indicator-green`)
- `frontend/src/context/ChatContext.jsx`

---

### 14. **Typing Indicator Animation (3 dots)** ✅
**Test Steps:**
1. Have someone type a message to you
2. Look at the bottom of the chat
3. Should see 3 animated dots

**Expected Results:**
- ✅ 3 dots appear when other person is typing
- ✅ Dots animate (bounce up and down)
- ✅ Proper timing (1.4s cycle)
- ✅ Dots disappear when typing stops
- ✅ Shows at bottom of chat

**Files Involved:**
- `frontend/src/components/ChatArea.jsx`
- `frontend/src/index.css` (`.typing-indicator`, `@keyframes typingBounce`)

---

### 15. **Server Pop-up** ✅
**Test Steps:**
1. Trigger a server error or notification
2. Check if pop-up appears
3. Should be at bottom, not top
4. Should auto-dismiss

**Expected Results:**
- ✅ Pop-up appears at bottom of screen
- ✅ Not intrusive
- ✅ Auto-dismisses after 3 seconds
- ✅ Only shows critical errors
- ✅ Doesn't block UI

**Files Involved:**
- `frontend/src/index.css` (`.server-notification`)
- Various components

---

### 16. **Auto-Refresh** ✅
**Test Steps:**
1. Have two devices/browsers open
2. Send a message from Device A
3. Check if it appears on Device B without refresh
4. Disconnect and reconnect network
5. Check if messages sync

**Expected Results:**
- ✅ Messages appear in real-time
- ✅ No manual refresh needed
- ✅ Auto-reconnects on disconnect
- ✅ Messages sync after reconnect
- ✅ Socket connection stable

**Files Involved:**
- `frontend/src/context/ChatContext.jsx`
- `frontend/src/services/socket.js`
- `backend/socket/index.js`

---

### 17. **Device Linking** ✅
**Test Steps:**
1. Go to Settings → Linked Devices
2. Click "Link a Device"
3. Scan QR code with another device
4. Check if device appears in list
5. Try logging out from linked device

**Expected Results:**
- ✅ QR code generates
- ✅ Can link new device
- ✅ Linked devices show in list
- ✅ Can logout from specific device
- ✅ Session management works

**Files Involved:**
- `frontend/src/pages/LinkedDevices.jsx`
- `frontend/src/components/DeviceManagement.jsx`
- `backend/controllers/deviceController.js`

---

### 18. **Wallpaper Feature** ✅
**Test Steps:**
1. Go to Settings → Chats → Wallpaper
2. Upload an image
3. Check if wallpaper applies
4. Try uploading a video
5. Adjust opacity

**Expected Results:**
- ✅ Can upload custom wallpaper
- ✅ Wallpaper applies to chat background
- ✅ Opacity control works
- ✅ Can set per-chat or global
- ✅ Video wallpaper works

**Files Involved:**
- `frontend/src/pages/Settings.jsx`
- `frontend/src/components/ChatArea.jsx`
- `frontend/src/index.css` (`.wallpaper-overlay`, `.chatlist-wallpaper`)

---

### 19. **Tag System** ✅
**Test Steps:**
1. In chatlist, long-press a conversation
2. Select "Add Tag"
3. Choose a tag (Personal, Work, Groups)
4. Check if tag appears
5. Filter by tag

**Expected Results:**
- ✅ Can add tags to conversations
- ✅ Tags are color-coded
- ✅ Can filter by tag
- ✅ Can remove tags
- ✅ Tags show in chatlist

**Files Involved:**
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/index.css` (`.tag`, `.tag-personal`, `.tag-work`, `.tag-groups`)

---

## 📊 Test Results Template

Copy this and fill in as you test:

```markdown
## Test Results

### Date: [DATE]
### Tester: [YOUR NAME]
### Browser: [BROWSER & VERSION]
### Device: [DEVICE TYPE]

| Feature | Status | Notes |
|---------|--------|-------|
| Voice Calls | ✅ Pass / ❌ Fail | [Notes] |
| Video Calls | ✅ Pass / ❌ Fail | [Notes] |
| Call Notifications | ✅ Pass / ❌ Fail | [Notes] |
| Reply System | ✅ Pass / ❌ Fail | [Notes] |
| Tabs | ✅ Pass / ❌ Fail | [Notes] |
| GENZ Mods Scrolling | ✅ Pass / ❌ Fail | [Notes] |
| Language Settings | ✅ Pass / ❌ Fail | [Notes] |
| Text Menu Toggle | ✅ Pass / ❌ Fail | [Notes] |
| Media Full-Screen | ✅ Pass / ❌ Fail | [Notes] |
| Profile Enlargement | ✅ Pass / ❌ Fail | [Notes] |
| Group Creation | ✅ Pass / ❌ Fail | [Notes] |
| User Data Isolation | ✅ Pass / ❌ Fail | [Notes] |
| Settings Scrolling | ✅ Pass / ❌ Fail | [Notes] |
| Typing Indicators | ✅ Pass / ❌ Fail | [Notes] |
| 3 Dots Animation | ✅ Pass / ❌ Fail | [Notes] |
| Server Pop-up | ✅ Pass / ❌ Fail | [Notes] |
| Auto-Refresh | ✅ Pass / ❌ Fail | [Notes] |
| Device Linking | ✅ Pass / ❌ Fail | [Notes] |
| Wallpaper | ✅ Pass / ❌ Fail | [Notes] |
| Tag System | ✅ Pass / ❌ Fail | [Notes] |

### Overall Status: [PASS/FAIL]
### Issues Found: [LIST ANY ISSUES]
### Recommendations: [ANY SUGGESTIONS]
```

---

## 🐛 Common Issues & Solutions

### Issue: Calls not connecting
**Solution:** Check WebRTC configuration, ensure ICE servers are configured correctly

### Issue: Notifications not showing
**Solution:** Check Service Worker registration and notification permissions

### Issue: Scrolling not working
**Solution:** Verify CSS flex layout and overflow properties

### Issue: Real-time updates not working
**Solution:** Check socket connection and event listeners

### Issue: Data mixing between users
**Solution:** Verify authentication and user ID validation in all queries

---

## 📝 Testing Checklist

- [ ] All features tested
- [ ] No console errors
- [ ] Performance is good
- [ ] UI is responsive
- [ ] All animations smooth
- [ ] No data leakage
- [ ] Socket connection stable
- [ ] All modals work
- [ ] All buttons functional
- [ ] All forms validate
- [ ] All images load
- [ ] All videos play
- [ ] All audio plays
- [ ] All files upload
- [ ] All downloads work

---

## 🚀 Deployment Testing

Before deploying to production:

1. **Test on multiple browsers:**
   - Chrome/Edge
   - Firefox
   - Safari
   - Mobile browsers

2. **Test on multiple devices:**
   - Desktop
   - Tablet
   - Mobile

3. **Test network conditions:**
   - Fast connection
   - Slow connection
   - Offline mode
   - Reconnection

4. **Test user scenarios:**
   - New user registration
   - Existing user login
   - Multiple users
   - Group conversations
   - Media sharing
   - Calls

5. **Performance testing:**
   - Load time
   - Memory usage
   - CPU usage
   - Battery usage (mobile)

---

## 📞 Support

If you encounter any issues during testing:

1. Check browser console for errors
2. Check network tab for failed requests
3. Verify backend is running
4. Check database connections
5. Verify environment variables
6. Check logs for errors

---

**Happy Testing! 🎉**