# Orphaned Media Audit — Cloudinary Cleanup

## Summary

When messages with media attachments (images, videos, voice notes, stickers, etc.) are deleted from MongoDB, the corresponding Cloudinary files may not be cleaned up. This audit identifies all deletion paths in the backend and their Cloudinary cleanup status.

**Fixed (Tatizo 3):**
- ✅ `hardDelete.js` — `scheduleHardDelete()` now calls `deleteCloudinaryMedia()` before `Message.deleteOne()`

**Not Fixed (different concern):**
The following deletion paths use `Message.deleteMany()` and do NOT clean up Cloudinary media. However, they represent **bulk/admin operations** where the trade-off is different:

| File | Line | Operation | Cloudinary Cleanup | Risk |
|------|------|-----------|-------------------|------|
| `authController.js` | 665 | `Message.deleteMany({ sender: userId })` — account deletion | ❌ None | **HIGH** — user deletes account, all their media stays on Cloudinary forever |
| `adminController.js` | 374 | `Message.deleteMany({ sender: uid })` — admin deletes user | ❌ None | **HIGH** — same as above, admin-triggered |
| `adminContentController.js` | 66 | `Message.deleteMany({ conversationId })` — delete conversation | ❌ None | **MEDIUM** — conversation deleted but media remains |
| `adminContentController.js` | 140 | `Message.deleteMany({ conversationId: group._id })` — delete group | ❌ None | **MEDIUM** — group deleted but media remains |
| `fakeChatController.js` | 158 | `Message.deleteMany({ conversationId: conv._id })` — clear fake chat | ❌ None | **LOW** — test/demo data cleanup |
| `fakeChatController.js` | 206 | `Message.deleteMany({ conversationId: id })` — delete fake chat | ❌ None | **LOW** — test/demo data cleanup |
| `server.js` | 365 | `Message.deleteMany({ isSelfDestruct: true, disappearAt: { $lte } })` — self-destruct sweep | ❌ None | **MEDIUM** — self-destruct messages leave media behind |
| `server.js` | 382 | `Message.deleteMany({ isViewOnce, isConsumed })` — view-once sweep | ❌ None | **MEDIUM** — consumed view-once media stays |
| `server.js` | 396 | `Message.deleteMany({ deletedForEveryone, deletedAt: { $lte } })` — hard-delete backstop | ❌ None | **MEDIUM** — backstop sweep misses Cloudinary |

## Recommended Fixes (Priority Order)

### 1. Account Deletion (`authController.js:665`)
**Priority: HIGH** — This is the most user-facing issue. When a user deletes their account, all their media should be cleaned up.

**Fix approach:** Before `Message.deleteMany({ sender: userId })`, query the messages with media, extract Cloudinary publicIds, batch-delete via `deleteFiles()`, then delete the documents.

```js
// Before Message.deleteMany({ sender: userId })
const { deleteFiles, isCloudinaryConfigured } = require('../config/cloudinary');
if (isCloudinaryConfigured()) {
  const mediaMessages = await Message.find({ sender: userId, mediaUrl: { $exists: true, $ne: null } })
    .select('mediaUrl messageType').lean();
  const publicIds = mediaMessages
    .map(m => extractCloudinaryPublicId(m.mediaUrl))
    .filter(Boolean);
  if (publicIds.length > 0) {
    await deleteFiles(publicIds, 'video').catch(err => 
      console.warn('[AccountDelete] Cloudinary batch delete failed:', err.message));
  }
}
```

### 2. Conversation/Group Deletion (`adminContentController.js:66,140`)
**Priority: MEDIUM** — Admin operations, less frequent.

**Fix approach:** Same pattern as account deletion — query messages before bulk delete, extract publicIds, batch-delete Cloudinary files.

### 3. Self-Destruct / View-Once Sweep (`server.js:365,382`)
**Priority: MEDIUM** — Runs periodically, accumulates orphaned files.

**Fix approach:** In the sweep query, select `mediaUrl` before deleting. Use `deleteFiles()` for batch cleanup.

### 4. Hard-Delete Backstop (`server.js:396`)
**Priority: LOW** — The per-message `scheduleHardDelete` now handles Cloudinary cleanup (fixed in Tatizo 3). This backstop runs for messages missed by the per-delete timer.

**Fix approach:** Same pattern — select `mediaUrl` before bulk delete, batch-clean Cloudinary.

## Cloudinary Storage Estimate

Based on typical usage patterns:
- Average image: ~200KB
- Average video: ~5MB
- Average voice note: ~100KB

If 10% of messages have media and 5% of those are deleted without cleanup:
- 1000 messages → ~50 orphaned files → ~2.5MB wasted per 1000 messages
- At scale (1M messages) → ~2.5GB of orphaned storage

Cloudinary's free tier includes 25GB storage, so this becomes significant at scale.

## Files Modified in Tatizo 3

| File | Change |
|------|--------|
| `backend/utils/hardDelete.js` | Added `extractCloudinaryPublicId()`, `cloudinaryResourceType()`, `deleteCloudinaryMedia()`. Modified `scheduleHardDelete()` to call `deleteCloudinaryMedia()` before `Message.deleteOne()`. |
| `backend/tests/deletedMessageCycle.unit.test.js` | Added 10 new tests for `extractCloudinaryPublicId` and `cloudinaryResourceType` helpers. |
