# GENZ WhatsApp - Testing and Deployment Guide

## Pre-Deployment Checklist

### 1. Backend Verification
- [ ] All modified files syntax is correct
- [ ] Database migrations (if any) have been run
- [ ] Environment variables are properly set
- [ ] Server starts without errors: `npm run dev`
- [ ] No console warnings or errors on startup

### 2. Environment Setup
```bash
# Verify these are set in your .env file
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## Testing Protocol - Use 2 Different Accounts

### Account Setup
1. **Account A (Tester 1)**: username_a, password_a
2. **Account B (Tester 2)**: username_b, password_b

Both should be on different browsers or incognito windows to avoid session conflicts.

---

## Feature-by-Feature Testing

### ✅ TEST 1: VIEW-ONCE MESSAGES

#### Setup
- Open chat between Account A and Account B in separate browsers

#### Test Steps
1. **Account A**: Send a text message with "View Once" enabled
   - Click message options → "View Once"
   - Send message

2. **Account B**: Verify message appears with "View Once" indicator
   - Message should show "👁️ View once message" or similar
   - Content should NOT be visible until clicked

3. **Account B**: Open/view the message
   - Message content should appear
   - Message should be marked as consumed
   - Content should disappear or show "Opened" status

4. **Account A**: Check notification
   - Should receive notification that message was viewed
   - In recent updates log or notification center

5. **Close and Reopen Chat**
   - Account B: Close the chat completely
   - Account B: Reopen the conversation
   - **Expected**: View-once message should NOT reappear
   - Message should show "👁️ Opened" instead of content

#### ❌ If Test Fails
- Check browser console for JavaScript errors
- Check server logs for API errors
- Verify `isViewOnce: true` is being sent with message
- Check socket events in DevTools Network tab

---

### ✅ TEST 2: SELF-DESTRUCT MESSAGES

#### Setup
- Both accounts in active chat

#### Test Steps
1. **Account A**: Send message with 5-second self-destruct timer
   - Click message options → "Self Destruct"
   - Set timer to 5 seconds
   - Send message

2. **Account B**: Message arrives and shows timer
   - Message should display countdown: "Disappears in 5s"
   - Read the message

3. **Wait for message to expire**
   - Wait 5+ seconds
   - Message should disappear from chat

4. **Account A**: Check notification
   - Should see that message was read before deletion
   - Notification should show read status

5. **Close/Reopen Chat**
   - Account B: Close and reopen chat
   - **Expected**: Self-destruct message should NOT reappear
   - Chat history should not show the expired message

6. **Server Log Check**
   - Watch server console
   - Should see: `[ExpiredMessageCleanup] Deleted X expired self-destruct messages`
   - Appears approximately every minute

#### ❌ If Test Fails
- Check if message is being marked with `isSelfDestruct: true`
- Check if `disappearAt` timestamp is being set
- Monitor server cleanup job in console logs
- Verify TTL index is configured in MongoDB

---

### ✅ TEST 3: ANTI-SCREENSHOT NOTIFICATIONS

#### Setup
- Chat active between both accounts

#### Test Steps
1. **Account A**: Send an image with screenshot protection enabled
   - Send image message
   - Note if there's a way to enable "No screenshot" (may need frontend update)

2. **Account B**: Attempts to take screenshot
   - Take a screenshot of the message
   - Notification should appear: "User tried to screenshot your message"

3. **Account A**: Receives notification
   - Check notification in real-time
   - Should see who attempted screenshot and when

#### Note
- This feature requires frontend implementation to detect screenshot attempts
- Currently backend handles notification, but frontend needs to trigger it
- May require platform-specific implementations (Chrome, Firefox, mobile)

#### ❌ If Not Working
- Frontend needs to emit `reportScreenshotAttempt` socket event
- Backend endpoint `/api/chat/messages/:messageId/screenshot-attempt` is ready

---

### ✅ TEST 4: REAL-TIME UNREAD MESSAGE COUNTS

#### Setup
- Account B closes/minimizes the chat
- Account B's unread count should be visible in conversation list

#### Test Steps
1. **Account B**: Open chat list (conversations view)
   - Note: No messages yet, unread count = 0 (or not shown)

2. **Account A**: Send 3 messages to Account B
   - Message 1: "Hello"
   - Message 2: "How are you?"
   - Message 3: "Test message"

3. **Account B**: Immediately look at conversation list
   - **Expected**: Badge showing "3" next to conversation
   - Or "New messages" indicator with count

4. **Account B**: Open chat
   - View all 3 messages
   - Unread count should decrease in real-time (3 → 2 → 1 → 0)
   - As each message is read, count updates

5. **Account A**: Send 2 more messages
   - Unread count for Account B should show "2"

6. **Refresh Browser (Account B)**
   - Unread count should persist after page refresh
   - Count should NOT reset to 0

#### ❌ If Test Fails
- Check socket event: `conversation:unread-update`
- Verify `unreadCount` field in conversation response
- Check MongoDB to ensure unreadCount is being saved
- Verify `getConversations` includes unreadCount for user

---

### ✅ TEST 5: VOICE NOTES

#### Setup
- Both accounts in active chat

#### Test Steps
1. **Account A**: Record and send voice note
   - Click microphone/voice icon
   - Record a 5-second audio message
   - Send

2. **Account B**: Receives and plays voice note
   - Message shows waveform visualization
   - Click play button
   - Audio should play without "Audio unavailable" error
   - Volume slider should work
   - Duration shown correctly

3. **Quality Check**
   - Audio quality should be acceptable
   - No crackling or distortion
   - Voice is clear and understandable

4. **Download Option**
   - Account B should be able to download voice note
   - Click download/save button
   - File should save as `.webm` or `.mp3`

5. **Different Voice Effects** (if implemented)
   - Send voice note with robot voice effect
   - Send with echo effect
   - Verify effects are applied correctly

#### ❌ If Test Fails
- Check browser console for audio errors
- Verify file is uploading to `/uploads` directory
- Check MIME type of audio file
- Test direct URL access: `http://your-server/uploads/voice-*.webm`
- Enable Cloudinary for better compatibility

---

### ✅ TEST 6: PHONE CALLS

#### Setup
- Both accounts online
- Camera/Microphone permissions granted

#### Test Steps
1. **Account A**: Initiate a voice call
   - Click call icon
   - Select "Voice call"
   - Call initiates

2. **Account B**: Receives incoming call
   - Notification shows "Incoming call from Account A"
   - Ringing sound (if enabled)
   - "Accept" and "Reject" buttons

3. **Account B**: Accept call
   - Click "Accept"
   - Status should change from "Calling..." to "Connected"
   - **Expected**: NOT stuck on "Connecting" state

4. **Call Active**
   - Both accounts can hear each other clearly
   - Call timer shows elapsed time
   - Video shows (if video call)
   - Quality is acceptable

5. **Call End**
   - Either user clicks "End Call"
   - Call duration displayed correctly
   - Call log created showing:
     - Who called whom
     - Call duration
     - Date/time

#### ❌ If Test Fails - Troubleshooting

**If stuck on "Connecting":**
1. Check browser console for WebRTC errors
2. Test TURN server connectivity:
   ```bash
   echo "TURN_SERVER_URL=your_turn_server" >> .env
   ```
3. Check ICE candidate exchange in DevTools
4. Verify NAT/firewall allows peer connection

**If no audio:**
1. Check microphone permissions
2. Test microphone separately
3. Check audio constraints in WebRTC config
4. Test in different browser

**If connection fails:**
1. Ensure both users are online (check presence)
2. Check WebSocket connection is active
3. Verify STUN servers are accessible
4. Test with nearby users (latency issue)

---

### ✅ TEST 7: MEDIA UPLOADS

#### Setup
- Chat active between both accounts

#### Test Steps

**Image Upload:**
1. Account A: Click image icon → select JPG/PNG file (< 20MB)
2. Send image
3. Account B: Image appears in chat with thumbnail
4. Account B: Click to view full image
5. Account B: Can zoom/scroll image

**Video Upload:**
1. Account A: Click attachment → select MP4/WebM (< 100MB)
2. Send video
3. Account B: Video player appears with play button
4. Account B: Click play, video plays without errors
5. Account B: Video controls work (pause, volume, fullscreen)

**Document Upload:**
1. Account A: Click attachment → select PDF/DOCX/TXT (< 50MB)
2. Send document
3. Account B: Document shows as downloadable file
4. Account B: Can download and open file

**All Media Types:**
- [ ] Thumbnail/preview shows
- [ ] No "Unsupported format" error
- [ ] File size displayed correctly
- [ ] Download button available
- [ ] CORS headers allow access

#### ❌ If Test Fails
- Check file size limits in `/env`
- Verify Cloudinary is configured
- Check MIME type restrictions
- Look for file validation errors in server logs
- Test CORS with browser DevTools

---

## Real-Time Behavior Verification

### Socket.io Events Check
Open browser DevTools → Application → Web Sockets → Filter events

**Expected Events:**
- `message:received` - When new message arrives
- `message:read_receipt` - When sender reads message
- `conversation:unread-update` - When unread count changes
- `message:consumed` - For view-once/self-destruct
- `message:screenshot-attempted` - Screenshot notification
- `call:incoming` - Incoming call
- `call:accepted` - Call accepted

### Performance Check
- No lag in message delivery (< 1 second)
- Socket reconnection works (kill network, should reconnect)
- No memory leaks (check DevTools Memory tab)
- CPU usage stays low during testing

---

## Database Verification

### MongoDB Check
```bash
# Connect to MongoDB
mongo your_database

# Check message cleanup
db.messages.find({ disappearAt: { $lt: new Date() } }).count()  # Should be 0 or declining

# Check unreadCount
db.conversations.findOne({ "unreadCount": { $exists: true } })

# Verify TTL index
db.messages.getIndexes()  # Should show "disappearAt_1" with TTL
```

---

## Server Log Verification

Watch logs while testing:
```bash
npm run dev  # Watch for these messages
```

**Expected Log Messages:**
```
[ExpiredMessageCleanup] Deleted 0 expired self-destruct messages
[ChatController] Message created with isViewOnce: true
[SocketIO] Message consumed event emitted
[SocketIO] Screenshot attempt reported
```

---

## Troubleshooting Table

| Issue | Cause | Solution |
|-------|-------|----------|
| View-once reappears | Message not filtered from DB | Check getMessages filter for `isConsumed: true` |
| Self-destruct doesn't delete | TTL not working | Run: `db.messages.deleteMany({ disappearAt: { $lt: new Date() } })` |
| Unread count not updating | Map not saving | Check `conversation.unreadCount` is being saved to DB |
| Voice note plays as silence | Wrong MIME type | Check audio file MIME type matches format |
| Call stuck connecting | TURN server issue | Add TURN server URL to .env, restart server |
| Messages lag | Socket bottleneck | Check socket emit frequency, may need debounce |
| Media won't upload | File size limit | Increase MAX_UPLOAD_BYTES in .env |

---

## Final Deployment Checklist

### Before Git Commit
- [ ] All tests passed with both accounts
- [ ] No console errors in browser DevTools
- [ ] No server errors in terminal
- [ ] Database is clean (no orphaned messages)
- [ ] Socket.io events are emitting correctly
- [ ] Mobile browsers tested (if applicable)
- [ ] Different chat types tested (1-on-1, groups)

### Git Commit Command
```bash
# Stage all changes
git add .

# Commit with detailed message
git commit -m "fix: implement comprehensive messaging improvements

FEATURES:
- View-once messages with notifications
- Self-destruct messages with auto-cleanup
- Anti-screenshot notifications (ready for frontend)
- Real-time unread message count tracking
- Message TTL deletion (with fallback cleanup)

CHANGES:
- Enhanced getMessages() to filter expired messages
- Added markViewOnceViewed() with notifications
- Created startExpiredMessageCleanup() background job
- Added reportScreenshotAttempt() endpoint
- Updated socket events for real-time sync
- Enhanced transformConversationForUser() with unread counts
- Improved message:read handler for unread tracking

TESTED:
- View-once message lifecycle
- Self-destruct message expiration
- Unread count synchronization
- Voice note playback
- Media file uploads/downloads
- Phone call establishment
- Socket.io event delivery

FIXES CRITICAL ISSUES:
- Messages reappearing after closing chat (FIXED)
- Unread counts not persisting (FIXED)
- View-once content visible outside chat (FIXED)
- Self-destruct messages not deleting (FIXED)
- Real-time sync issues (FIXED)"

# Push to remote
git push origin main
```

### Post-Deployment
- [ ] Monitor server logs for errors (first hour)
- [ ] Check error reporting (Sentry, if configured)
- [ ] Monitor database growth
- [ ] Check user feedback
- [ ] Review analytics for engagement metrics

---

## Rollback Plan (if needed)

```bash
# If deployment has critical issues
git revert <commit_hash>
git push origin main

# Clear expired messages job (if causing issues)
# Edit server.js, comment out startExpiredMessageCleanup(ioInstance);
# Restart server
```

---

## Support Information

If you encounter issues:
1. Check browser console (F12) for errors
2. Check server terminal for error logs
3. Verify MongoDB connection
4. Check socket.io connection in DevTools
5. Review this testing guide
6. Share error logs and reproduction steps

---

## Success Criteria

✅ All tests pass with 0 errors
✅ View-once and self-destruct work as expected
✅ Real-time updates happen without manual refresh
✅ Unread counts stay accurate
✅ Server logs show proper cleanup
✅ No performance degradation
✅ All socket events fire correctly
✅ Database is clean and optimized

If all criteria are met, proceed with GitHub commit! 🚀
