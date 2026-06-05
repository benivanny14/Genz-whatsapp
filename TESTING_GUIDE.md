# GENZ WhatsApp - Quick Deployment & Testing Guide

## Haraka! Quick Start (10 Minutes)

### Step 1: Pull Latest Changes
```bash
cd backend
git pull origin main
npm install
```

### Step 2: Start Server with Enhanced Logging
```bash
npm run dev
```

**Verify server starts with:**
```
✅ [ExpiredMessageCleanup] Started cleanup job
✅ Database connected
✅ Server listening on port 5000
✅ Socket.io initialized
```

---

## Test 1: Media Upload (2 Minutes)

### What to Test:
1. Open GENZ app in browser
2. Select a conversation
3. Click "Send Media" button
4. Upload an image, video, audio file, or document

### Expected Results:
✅ File uploads successfully (previously showed 400 error)
✅ File appears in chat with preview
✅ No console errors in DevTools
✅ Server log shows: `[uploadAny] File processed`

### If It Fails:
- Check browser DevTools Network tab
- Look for response status 400
- Check server terminal for errors
- Verify file size is less than 100MB

---

## Test 2: Phone Calls (3 Minutes)

### What to Test:
1. Open GENZ in TWO different browser windows
2. Account A: Search for Account B
3. Account A: Click call button
4. Account B: See incoming call and accept
5. Both should hear voice/see video

### Expected Results:
✅ Call connects within 3-5 seconds (previously stuck on "Connecting")
✅ Audio/video flows both ways
✅ Call timer shows duration
✅ Server logs show: `[WebRTC] Sending offer/answer`

### If Stuck on "Connecting":
```bash
# Add TURN server to .env (if behind restrictive firewall)
TURN_SERVER_URL=turn:your-turn.com
TURN_USERNAME=user
TURN_CREDENTIAL=pass
```
Then restart server and retry

---

## Test 3: Self-Destruct Messages (4 Minutes)

### What to Test:
1. Open conversation
2. Type message
3. Click settings icon → Enable "Self-Destruct"
4. Select timer: 10 seconds (for quick test)
5. Send message
6. Watch message disappear after 10 seconds

### Expected Results:
✅ Message shows timer countdown
✅ Message disappears after timer expires
✅ Close chat and reopen → message is gone
✅ Server log: `[ExpiredMessageCleanup] Deleted X messages`

### If Messages Don't Delete:
```bash
# Check server cleanup job is running (every 60 seconds)
# Look in terminal for: [ExpiredMessageCleanup]

# Manually check database
db.messages.find({ isSelfDestruct: true }).count()
```

---

## Test 4: Disappearing Messages (2 Minutes)

### What to Test:
1. Open group conversation
2. Click settings → "Disappearing Messages"
3. Enable and set timer (e.g., 24 hours)
4. Send new messages
5. Messages should indicate they're disappearing

### Expected Results:
✅ Setting applies to all new messages
✅ Messages show "Disappears in 24h" or similar
✅ Timer counts down in real-time
✅ Messages automatically delete when timer expires

---

## Test 5: Unread Count Badges (1 Minute)

### What to Test:
1. Account A: Send message to Account B
2. Account B: Check conversation list
3. Number badge should show "1" on unread message
4. Account B: Open chat and read message
5. Badge should disappear

### Expected Results:
✅ Unread badge appears immediately (real-time)
✅ Badge shows correct count
✅ Badge disappears when message is read
✅ No page refresh needed

### If Badge Doesn't Show:
- Check browser DevTools Console
- Look for Socket.io `conversation:unread-update` events
- Verify conversation includes `unreadCount` field in API response

---

## Test 6: View-Once Messages (2 Minutes)

### What to Test:
1. Send message with "View Once" enabled
2. Other user opens message
3. Message should disappear immediately
4. Sender gets notification "Message viewed"

### Expected Results:
✅ Message content hidden until clicked
✅ Shows "View Once" indicator
✅ Disappears after being viewed
✅ Cannot be reopened or forwarded
✅ Sender receives "Viewed" notification

---

## Complete Verification Checklist

```
MEDIA UPLOADS
- [ ] Images upload without 400 error
- [ ] Videos upload and play
- [ ] Audio files upload
- [ ] Documents upload and are downloadable
- [ ] Large files (50MB+) upload successfully

PHONE CALLS  
- [ ] Call initiates successfully
- [ ] Recipient sees incoming call prompt
- [ ] Call connects within 5 seconds
- [ ] Audio works both directions
- [ ] Video works (if enabled)
- [ ] Call ends properly
- [ ] Call log updated

SELF-DESTRUCT MESSAGES
- [ ] Message sends with timer
- [ ] Timer counts down visually
- [ ] Message deleted after timer expires
- [ ] Deleted even after closing chat
- [ ] Cannot be retrieved

DISAPPEARING MESSAGES
- [ ] Setting enables/disables properly
- [ ] New messages show timer
- [ ] Timer counts down
- [ ] Messages auto-delete
- [ ] Works for groups and 1-to-1 chats

UNREAD COUNTS
- [ ] Badge shows number of unread messages
- [ ] Badge updates in real-time (no refresh)
- [ ] Badge clears when message is read
- [ ] Works on all conversations
- [ ] Persists after page reload

VIEW-ONCE MESSAGES
- [ ] Shows "View Once" indicator
- [ ] Content hidden until tapped
- [ ] Disappears after viewing
- [ ] Cannot be reopened
- [ ] Cannot be forwarded
- [ ] Sender gets notification
```

---

## Browser DevTools Debugging

### Open DevTools Console (F12)
```javascript
// Check Socket.io connection
socket.connected  // Should be true

// Listen for unread updates
socket.on('conversation:unread-update', (data) => {
  console.log('Unread update:', data);
});

// Listen for message received
socket.on('message:received', (msg) => {
  console.log('Message received:', msg);
});
```

### Network Tab
- Look for `POST /api/media/upload` → Status 200 (not 400)
- Look for WebSocket connection with Socket.io
- Look for `/api/chat/conversations` returning unreadCount field

### Application Tab
- Check Service Worker status (should be "activated")
- Check Local Storage for auth tokens
- Verify IndexedDB for offline data

---

## Server Terminal Output to Watch For

```bash
# ✅ Good Signs
[ExpiredMessageCleanup] Started cleanup job
[ExpiredMessageCleanup] Deleted 5 self-destruct messages
[WebRTC] Sending offer { from: ..., to: ... }
[WebRTC] Relaying ICE candidate
[uploadAny] File processed
[ChatContext] Unread count updated

# ❌ Problem Signs  
ERROR: [uploadAny] No file uploaded
ERROR: [WebRTC] Target user is offline
Error relaying ICE candidate
WARN: Disappearing timer skipped
```

---

## If You Need to Reset/Fix Issues

### Reset Database (⚠️ CAREFUL - DELETES ALL DATA):
```bash
# Connect to MongoDB
# Drop the database
use genz-whatsapp
db.dropDatabase()

# Restart server
npm run dev
```

### Clear Browser Cache:
```
DevTools → Application → Clear site data
Or: Ctrl+Shift+Delete (Clear browsing data)
```

### Restart Socket Connection:
```
Refresh browser page (F5)
Or: Close and reopen chat window
```

---

## Error Messages & Solutions

### "File size exceeds the allowed limit"
- Max file size is 100MB
- Compress video/image before uploading
- Use document format for large files

### "User is offline" (for calls)
- Verify both accounts are logged in
- Check socket connection in DevTools
- Refresh both browser windows

### "Subscription failed - no active Service Worker"
- Clear browser cache
- Reinstall service worker
- Try different browser
- Check browser notification permissions

### "No file uploaded" (media)
- Verify file is selected
- Check browser console for upload errors
- Try refreshing page
- Try different file format

---

## Production Deployment

### Before Going Live:
1. Run complete checklist above ✅
2. Test with 5+ concurrent users
3. Monitor server performance
4. Check disk space (media uploads)
5. Verify database backups working
6. Test on mobile browsers

### Deployment Steps:
```bash
# 1. Commit all changes
git add .
git commit -m "fix: comprehensive messaging improvements"

# 2. Push to GitHub
git push origin main

# 3. Deploy to production
# (your deployment process here)

# 4. Verify in production
# Test all 6 scenarios again in production URL
```

### Monitor After Deployment:
- Watch server logs every hour for first day
- Monitor error rates in Sentry/LogRocket
- Get user feedback
- Have rollback plan ready

---

## Need Help?

### Check Logs:
```bash
# Show last 100 lines of server log
tail -n 100 server.log

# Follow real-time logs
tail -f server.log | grep -i "error\|warning\|webrtc"
```

### Test Endpoints:
```bash
# Check media upload endpoint
curl -F "file=@test.jpg" http://localhost:5000/api/media/upload

# Check WebRTC config
curl http://localhost:5000/api/webrtc/config

# Check message cleanup status
curl http://localhost:5000/api/system/status
```

---

## Timeline Estimate

- **Quick Test (Just Verify Works)**: 10 minutes
- **Full Testing (All 6 Features)**: 30 minutes  
- **Production Deployment**: 1-2 hours (including testing)
- **Monitoring Post-Deployment**: First 24 hours

---

## ✅ SUCCESS CRITERIA

When you see ALL of these working:
1. ✅ Media uploads successfully
2. ✅ Phone calls connect within 5 seconds
3. ✅ Self-destruct messages delete on schedule
4. ✅ Unread badges update in real-time
5. ✅ View-once messages disappear after viewing
6. ✅ No console errors in DevTools
7. ✅ Server logs show cleanup job running
8. ✅ All privacy settings work correctly

**Then the system is READY FOR PRODUCTION! 🚀**

---

## Contact & Support

If issues persist after these fixes:
1. Check the full implementation guide: `GENZ_FIXES_IMPLEMENTATION.md`
2. Review server logs for specific errors
3. Test in different browser
4. Try on fresh database
5. Reach out with error messages and logs

---

**Karibu! Good luck with testing! 🎉**
