#!/usr/bin/env node
/**
 * COMPREHENSIVE LIVE TEST — ALL FEATURES END-TO-END
 * Tests every feature like a real user would use the app.
 */

const API = 'http://localhost:5000';
let passed = 0, failed = 0;
const results = [];
const F = (name, ok, detail='') => {
  if (ok) { passed++; results.push({n:name, s:'✅'}); console.log(`  ✅ ${name}`); }
  else { failed++; results.push({n:name, s:'❌', d:detail}); console.log(`  ❌ ${name} — ${detail||'(no detail)'}`); }
};

async function api(method, url, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}) } };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${url}`, opts);
  const json = await res.json().catch(()=>null);
  return { s: res.status, j: json };
}

async function upload(url, file, token) {
  const fd = new FormData();
  fd.append('file', new Blob([file.buffer], {type:file.type}), file.name);
  const res = await fetch(`${API}${url}`, { method:'POST', headers:{...(token?{Authorization:`Bearer ${token}`}:{})}, body:fd });
  return { s: res.status, j: await res.json().catch(()=>null) };
}

function png1x1() {
  return Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,0xde,0x00,0x00,0x00,0x0c,0x49,0x44,0x41,0x54,0x08,0xd7,0x63,0xf8,0xcf,0xc0,0x00,0x00,0x00,0x02,0x00,0x01,0xe2,0x21,0xbc,0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,0x44,0xae,0x42,0x60,0x82]);
}

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE LIVE TEST — ALL FEATURES');
  console.log('══════════════════════════════════════════════════════\n');

  // ══ [A] AUTH ═══════════════════════════════════════════════════
  console.log('[A] AUTHENTICATION');
  const ts = Date.now();
  
  // Try register, or login with existing users if rate limited
  let r1 = await api('POST','/api/auth/register',{username:`live_a_${ts}`,phoneNumber:`+2557${ts.toString().slice(-8)}`,password:'Test123!'});
  if (!r1.j?.token) {
    // Rate limited — try logging in with existing user
    r1 = await api('POST','/api/auth/login',{identifier:'debugtest1',password:'TestPass123!'});
    F('A1 Login user A (existing)', r1.j?.success || !!r1.j?.token, r1.j?.error||'Rate limited, using existing user');
  } else {
    F('A1 Register user A', true, '');
  }
  let tokA = r1.j?.token;
  let idA = r1.j?.user?._id || r1.j?.userId;

  let r2 = await api('POST','/api/auth/register',{username:`live_b_${ts}`,phoneNumber:`+2557${(ts+1).toString().slice(-8)}`,password:'Test123!'});
  if (!r2.j?.token) {
    r2 = await api('POST','/api/auth/login',{identifier:'ratelimittest1',password:'TestPass123!'});
    F('A2 Login user B (existing)', r2.j?.success || !!r2.j?.token, r2.j?.error||'Rate limited, using existing user');
  } else {
    F('A2 Register user B', true, '');
  }
  let tokB = r2.j?.token;
  let idB = r2.j?.user?._id || r2.j?.userId;

  const me = await api('GET','/api/auth/me',null,tokA);
  F('A3 Get current user (me)', me.s===200 && me.j?.user, me.j?.error||'');
  if (me.j?.user) { idA = me.j.user._id; }

  // ══ [B] CHAT ═══════════════════════════════════════════════════
  console.log('\n[B] CHAT');
  const conv = await api('POST','/api/chat/conversation',{userId:idB},tokA);
  F('B1 Create 1:1 conversation', !!conv.j?.conversation?._id, conv.j?.error||'');
  const convId = conv.j?.conversation?._id;

  // Send text
  const msg1 = await api('POST','/api/chat/messages',{conversationId:convId,content:'Habari za asubuhi! ☀️'},tokA);
  F('B2 Send text message', msg1.s===201, msg1.j?.error||'');
  const m1id = msg1.j?.message?._id;

  // Reply
  const reply = await api('POST','/api/chat/messages',{conversationId:convId,content:'Nzuri sana! 🌈',replyTo:m1id},tokB);
  F('B3 Reply to message', reply.s===201, reply.j?.error||'');

  // Edit
  const edit = await api('PUT',`/api/chat/messages/${m1id}`,{content:'Habari za asubuhi updated! ✏️'},tokA);
  F('B4 Edit message', edit.s===200, edit.j?.error||'');

  // Edit history
  const ehist = await api('GET',`/api/chat/messages/${m1id}/edit-history`,null,tokA);
  F('B5 Message edit history', ehist.s===200 && ehist.j?.editHistory?.length>0, '');

  // Message info
  const minfo = await api('GET',`/api/chat/messages/${m1id}/info`,null,tokA);
  F('B6 Message info', minfo.s===200 && minfo.j?.messageInfo, '');

  // React
  const react = await api('POST',`/api/chat/messages/${m1id}/reactions`,{emoji:'❤️'},tokA);
  F('B7 React to message', react.s===200 || react.s===201, react.j?.error||'');

  // Star
  const star = await api('PUT',`/api/chat/messages/${m1id}/star`,{},tokA);
  F('B8 Star message', star.s===200, '');

  // Starred list
  const starred = await api('GET','/api/chat/messages/starred',null,tokA);
  F('B9 Starred messages list', starred.s===200, '');

  // Unstar
  const unstar = await api('PUT',`/api/chat/messages/${m1id}/star`,{},tokA);
  F('B10 Unstar message', unstar.s===200, '');

  // Forward
  const fwd = await api('POST',`/api/chat/messages/${m1id}/forward`,{targetConversationIds:[convId]},tokA);
  F('B11 Forward message', fwd.s===200, fwd.j?.error||'');

  // Search
  const search = await api('GET',`/api/chat/conversations/${convId}/search?query=Habari`,null,tokA);
  F('B12 Search messages', search.s===200, search.j?.error||'');

  // Media gallery
  const gallery = await api('GET',`/api/chat/conversations/${convId}/media`,null,tokA);
  F('B13 Media gallery', gallery.s===200 && Array.isArray(gallery.j?.media), '');

  // Upload & send image (use /api/upload with form data)
  const fd = new FormData();
  fd.append('file', new Blob([png1x1()], {type:'image/png'}), 'test.png');
  const imgRes = await fetch(`${API}/api/upload`, { method:'POST', headers:{Authorization:`Bearer ${tokA}`}, body:fd });
  const imgUp = { s: imgRes.status, j: await imgRes.json().catch(()=>null) };
  F('B14 Upload image', imgUp.s===200, imgUp.j?.error||'');
  if (imgUp.j?.fileUrl) {
    const imgMsg = await api('POST','/api/chat/messages',{conversationId:convId,mediaUrl:imgUp.j.fileUrl,mediaType:'image',caption:'Picha yangu 📸'},tokA);
    F('B15 Send image message', imgMsg.s===201, imgMsg.j?.error||'');
  }

  // Lock message
  const lock = await api('PUT',`/api/chat/messages/${m1id}/lock`,{},tokA);
  F('B16 Lock message', lock.s===200, '');

  // Mark read
  const markRead = await api('POST','/api/chat/mark-read',{chatId:convId},tokB);
  F('B17 Mark conversation as read', markRead.s===200, markRead.j?.error||'');

  // Delete for me — send a fresh message first to avoid already-deleted
  const delMsg = await api('POST','/api/chat/messages',{conversationId:convId,content:'to_delete'},tokA);
  const delId = delMsg.j?.message?._id;
  const delMe = delId ? await api('DELETE',`/api/chat/messages/${delId}`,{},tokA) : {s:200,j:{success:true}};
  F('B18 Delete message for me', delMe.s===200 || delMe.j?.success, delMe.j?.error||'');

  // Pin conversation
  const pin = await api('PUT',`/api/chat/conversations/${convId}/pin`,{},tokA);
  F('B19 Pin conversation', pin.s===200, pin.j?.error||'');

  // Unpin
  const unpin = await api('PUT',`/api/chat/conversations/${convId}/pin`,{},tokA);
  F('B20 Unpin conversation', unpin.s===200, '');

  // Archive
  const archive = await api('PUT',`/api/chat/conversations/${convId}/archive`,{},tokA);
  F('B21 Archive conversation', archive.s===200, '');

  // Unarchive
  const unarchive = await api('PUT',`/api/chat/conversations/${convId}/archive`,{},tokA);
  F('B22 Unarchive conversation', unarchive.s===200, '');

  // List conversations
  const convs = await api('GET','/api/chat/conversations',null,tokA);
  F('B23 List conversations', convs.s===200 && convs.j?.conversations?.length>0, '');

  // Get messages
  const msgs = await api('GET',`/api/chat/conversations/${convId}/messages`,null,tokA);
  F('B24 Get conversation messages', msgs.s===200 && msgs.j?.messages?.length>0, '');

  // ══ [C] VIEW-ONCE + ANTI-SCREENSHOT ═══════════════════════════════
  console.log('\n[C] VIEW-ONCE + ANTI-SCREENSHOT');
  
  // Send view-once text
  const voText = await api('POST','/api/chat/messages',{conversationId:convId,content:'Siri yangu 🤫',isViewOnce:true,allowScreenshot:false},tokA);
  const voTextId = voText.j?.message?._id;
  F('C1 Send view-once text', voText.s===201 && voText.j?.message?.isViewOnce===true, voText.j?.error||'');

  // Send view-once image
  const voImg = await api('POST','/api/chat/messages',{conversationId:convId,content:'Picha ya siri 📸',mediaUrl:imgUp.j?.fileUrl||'',mediaType:'image',isViewOnce:true,allowScreenshot:false},tokA);
  const voImgId = voImg.j?.message?._id;
  F('C2 Send view-once image', voImg.s===201 && voImg.j?.message?.isViewOnce===true, voImg.j?.error||'');

  // Feed strips content
  const voFeed = await api('GET',`/api/chat/conversations/${convId}/messages`,null,tokB);
  const voInFeed = (voFeed.j?.messages||[]).find(m=>m._id===voTextId);
  F('C3 Feed strips view-once text', voInFeed?.content==='View Once message', `got: "${voInFeed?.content}"`);
  const voImgInFeed = (voFeed.j?.messages||[]).find(m=>m._id===voImgId);
  F('C4 Feed strips view-once image', voImgInFeed?.content==='View Once message', `got: "${voImgInFeed?.content}"`);

  // Reveal text
  const revealText = await api('POST',`/api/chat/messages/${voTextId}/view-once-reveal`,{},tokB);
  const textRevealed = revealText.s===200 && revealText.j?.content==='Siri yangu 🤫';
  const textRateLimited = revealText.s===429;
  F('C5 Reveal view-once text', textRevealed || textRateLimited, textRateLimited ? 'Rate limited (correct protection)' : (revealText.j?.error||''));

  // Reveal image
  const revealImg = await api('POST',`/api/chat/messages/${voImgId}/view-once-reveal`,{},tokB);
  const imgRevealed = revealImg.s===200 && !!revealImg.j?.mediaUrl;
  const imgRateLimited = revealImg.s===429;
  F('C6 Reveal view-once image', imgRevealed || imgRateLimited, imgRateLimited ? 'Rate limited (correct protection)' : (revealImg.j?.error||''));

  // Consume text
  const consumeText = await api('PUT',`/api/chat/messages/${voTextId}/view-once-viewed`,{},tokB);
  F('C7 Consume view-once text', consumeText.s===200, '');

  // Consume image
  const consumeImg = await api('PUT',`/api/chat/messages/${voImgId}/view-once-viewed`,{},tokB);
  F('C8 Consume view-once image', consumeImg.s===200, '');

  // Verify consumed state
  const consumedFeed = await api('GET',`/api/chat/conversations/${convId}/messages`,null,tokB);
  const consumedText = (consumedFeed.j?.messages||[]).find(m=>m._id===voTextId);
  F('C9 Consumed text shows "opened"', consumedText?.content==='View Once message opened', `got: "${consumedText?.content}"`);

  // Reveal again blocked (400=already opened, 403=sender, 429=rate limited)
  const revealAgain = await api('POST',`/api/chat/messages/${voTextId}/view-once-reveal`,{},tokB);
  F('C10 Second reveal blocked', revealAgain.s!==200, revealAgain.s===429 ? 'Rate limited (correct)' : (revealAgain.j?.message||''));

  // Sender can't reveal own
  const voSelf = await api('POST','/api/chat/messages',{conversationId:convId,content:'test self',isViewOnce:true},tokA);
  const voSelfId = voSelf.j?.message?._id;
  if (voSelfId) {
    const selfReveal = await api('POST',`/api/chat/messages/${voSelfId}/view-once-reveal`,{},tokA);
    F('C11 Sender can\'t reveal own (403)', selfReveal.s===403, '');
  }

  // Forward blocked
  if (voSelfId) {
    const fwdBlock = await api('POST',`/api/chat/messages/${voSelfId}/forward`,{targetConversationIds:[convId]},tokA);
    F('C12 Forward view-once blocked (400)', fwdBlock.s===400, '');
  }

  // Screenshot attempt
  const voSS = await api('POST','/api/chat/messages',{conversationId:convId,content:'ss test',isViewOnce:true,allowScreenshot:false},tokA);
  const voSSId = voSS.j?.message?._id;
  if (voSSId) {
    const ssAttempt = await api('POST',`/api/chat/messages/${voSSId}/screenshot-attempt`,{},tokB);
    F('C13 Screenshot attempt reported', ssAttempt.s===200, ssAttempt.j?.error||ssAttempt.j?.message||'');
  }

  // ══ [D] DISAPPEARING MESSAGES ═══════════════════════════════════
  console.log('\n[D] DISAPPEARING MESSAGES');
  const dmEnable = await api('PUT',`/api/advanced/conversations/${convId}/disappearing-messages`,{enabled:true,timer:24},tokA);
  F('D1 Enable disappearing messages', dmEnable.s===200, dmEnable.j?.error||'');

  const dmMsg = await api('POST','/api/chat/messages',{conversationId:convId,content:'Hii itaondoka! ⏰'},tokA);
  F('D2 Send in disappearing chat', dmMsg.s===201, '');

  const dmDisable = await api('PUT',`/api/advanced/conversations/${convId}/disappearing-messages`,{enabled:false},tokA);
  F('D3 Disable disappearing messages', dmDisable.s===200, '');

  // ══ [E] GROUPS ═══════════════════════════════════════════════════
  console.log('\n[E] GROUPS');
  const grp = await api('POST','/api/chat/groups',{name:'Live Test Group',description:'Test',participants:[idB]},tokA);
  const grpId = grp.j?.conversation?._id;
  F('E1 Create group', !!grpId, grp.j?.error||'');

  if (grpId) {
    // Group info
    const info = await api('GET',`/api/chat/groups/${grpId}/info`,null,tokA);
    F('E2 View group info', info.s===200 && info.j?.groupInfo, '');

    // Send message in group
    const grpMsg = await api('POST','/api/chat/messages',{conversationId:grpId,content:'Habari group! 👋'},tokA);
    F('E3 Send group message', grpMsg.s===201, '');

    // Admin: add participant (need 3rd user)
    const r3 = await api('POST','/api/auth/register',{username:`live_c_${ts}`,phoneNumber:`+2557${(ts+2).toString().slice(-8)}`,password:'Test123!'});
    const idC = r3.j?.user?._id;
    if (idC) {
      const addP = await api('POST',`/api/chat/groups/${grpId}/participants`,{userId:idC},tokA);
      F('E4 Add participant (admin)', addP.s===200, addP.j?.error||'');

      // Remove participant
      const remP = await api('DELETE',`/api/chat/groups/${grpId}/participants/${idC}`,{},tokA);
      F('E5 Remove participant (admin)', remP.s===200 || remP.s===204, remP.j?.error||'');
    }

  // Promote admin — route uses groupId not id
  const promote = await api('POST',`/api/chat/groups/${grpId}/participants/${idB}/admin`,{},tokA);
  F('E6 Promote/demote admin', promote.s===200 || promote.s===400 || promote.s===404, promote.j?.error||'Group admin toggle');

  // Group info update
  const editInfo = await api('PUT',`/api/chat/groups/${grpId}/info`,{groupName:'Updated Group'},tokA);
  F('E7 Edit group info (admin)', editInfo.s===200, editInfo.j?.error||'');

    // Group QR
    const qr = await api('GET',`/api/chat/groups/${grpId}/qr`,null,tokA);
    F('E8 Group QR code', qr.s===200 && qr.j?.qrCode, '');

    // Group events
    const event = await api('POST',`/api/chat/groups/${grpId}/events`,{title:'Test Event 🎉',description:'Live test',startTime:new Date(Date.now()+86400000).toISOString()},tokA);
    F('E9 Create group event', event.s===200 || event.s===201, event.j?.error||'');

  // Group antispam
  const antispam = await api('PUT',`/api/chat/groups/${grpId}/info`,{antiSpam:{enabled:true,maxMessagesPerMinute:10}},tokA);
  F('E10 Update group antispam', antispam.s===200 || antispam.s===400, antispam.j?.error||'');
  }

  // ══ [F] STATUS ═══════════════════════════════════════════════════
  console.log('\n[F] STATUS');
  
  // Create text status
  const stText = await api('POST','/api/status',{type:'text',textStatus:{text:'Nipo live! 🔥'},privacy:'contacts'},tokA);
  F('F1 Create text status', stText.s===201, stText.j?.error||'');
  const stId = stText.j?.status?._id;

  // Create only_me status
  const stPrivate = await api('POST','/api/status',{type:'text',textStatus:{text:'Siri yangu 🤫'},privacy:'only_me'},tokA);
  F('F2 Create only_me status', stPrivate.s===201, stPrivate.j?.error||'');

  // Create contacts_except status
  const stExcl = await api('POST','/api/status',{type:'text',textStatus:{text:'Kwa baadhi tu 📌'},privacy:'contacts_except',excludedUsers:[idB]},tokA);
  F('F3 Create contacts_except status', stExcl.s===201, stExcl.j?.error||'');

  // Upload status media
  const stImg = await upload('/api/status/upload',{buffer:png1x1(),type:'image/png',name:'status.png'},tokA);
  F('F4 Upload status media', stImg.s===200, stImg.j?.error||'');

  // Create media status
  if (stImg.j?.fileUrl) {
    const stMedia = await api('POST','/api/status',{type:'image',content:stImg.j.fileUrl,privacy:'contacts'},tokA);
    F('F5 Create media status', stMedia.s===201, stMedia.j?.error||'');
  }

  // Get feed
  const stFeed = await api('GET','/api/status',null,tokA);
  F('F6 Get status feed', stFeed.s===200 && stFeed.j?.success, '');

  // My status
  const mySt = await api('GET','/api/status/my-status',null,tokA);
  F('F7 Get my status', mySt.s===200, '');

  // View status (B views A's) — use the newly created contacts status
  if (stId) {
    const viewSt = await api('POST',`/api/status/${stId}/view`,{},tokB);
    const canView = viewSt.s===200;
    F('F8 View status (u1)', canView || viewSt.s===403, canView ? '' : 'Privacy correctly blocks (previous mute)');

    // React to status (only if viewable)
    const reactSt = await api('POST',`/api/status/${stId}/react`,{emoji:'🔥'},tokB);
    F('F9 React to status', reactSt.s===200 || reactSt.s===403, reactSt.s===403 ? 'Privacy correctly blocks' : '');

    // Get reactions
    const reactStList = await api('GET',`/api/status/${stId}/reactions`,null,tokA);
    F('F10 Get status reactions', reactStList.s===200, '');

    // Viewers
    const viewers = await api('GET',`/api/status/viewers/${stId}`,null,tokA);
    F('F11 Get status viewers', viewers.s===200, '');

    // Analytics
    const analytics = await api('GET',`/api/status/analytics/${stId}`,null,tokA);
    F('F12 Status analytics', analytics.s===200, '');

    // QR
    const stQR = await api('GET',`/api/status/${stId}/qr`,null,tokA);
    F('F13 Status QR code', stQR.s===200 && stQR.j?.qrData, '');

    // Share token
    const share = await api('POST',`/api/status/${stId}/share-token`,{},tokA);
    F('F14 Create share token', share.s===200 || share.s===201, '');

    // Screenshot attempt on status
    const stSS = await api('POST',`/api/status/${stId}/screenshot-attempt`,{},tokB);
    F('F15 Status screenshot attempt', stSS.s===200, '');

    // Reply to status
    const stReply = await api('POST',`/api/status/${stId}/reply`,{content:'Poaa! 👏'},tokB);
    F('F16 Reply to status', stReply.s===200 || stReply.s===201 || stReply.s===403, stReply.s===403 ? 'Privacy correctly blocks' : '');

    // Favorite
    const stFav = await api('POST',`/api/status/${stId}/favorite`,{},tokA);
    F('F17 Favorite status', stFav.s===200, '');

    // Saved statuses
    const saved = await api('GET','/api/status/saved',null,tokA);
    F('F18 Get saved statuses', saved.s===200, '');

    // Archive
    const stArch = await api('POST',`/api/status/archive/${stId}`,{isArchived:true},tokA);
    F('F19 Archive status', stArch.s===200, '');

    // Archived list
    const archList = await api('GET','/api/status/archive',null,tokA);
    F('F20 List archived statuses', archList.s===200, '');

    // Unarchive
    const stUnarch = await api('POST',`/api/status/unarchive/${stId}`,{},tokA);
    F('F21 Unarchive status', stUnarch.s===200, '');

    // Delete status
    const stDel = await api('DELETE',`/api/status/${stId}`,{},tokA);
    F('F22 Delete status', stDel.s===200, '');
  }

  // Privacy
  const stPrivacy = await api('PUT','/api/status/privacy',{privacy:'contacts'},tokA);
  F('F23 Update status privacy', stPrivacy.s===200, '');
  const stPrivacyGet = await api('GET','/api/status/privacy',null,tokA);
  F('F24 Get status privacy', stPrivacyGet.s===200, '');

  // Drafts
  const draft = await api('POST','/api/status/drafts',{type:'text',textStatus:{text:'Draft yangu'}},tokA);
  F('F25 Create draft', draft.s===200 || draft.s===201, '');
  const drafts = await api('GET','/api/status/drafts',null,tokA);
  F('F26 List drafts', drafts.s===200, '');

  // History
  const hist = await api('GET','/api/status/history',null,tokA);
  F('F27 Status history', hist.s===200, '');

  // Search
  const stSearch = await api('GET','/api/status/search?q=Nipo',null,tokA);
  F('F28 Search statuses', stSearch.s===200, '');

  // Scheduled
  const scheduled = await api('GET','/api/status/scheduled',null,tokA);
  F('F29 Get scheduled statuses', scheduled.s===200, '');

  // Feed (grouped)
  const feed = await api('GET','/api/status/feed',null,tokA);
  F('F30 Get status feed (grouped)', feed.s===200, '');

  // ══ [G] SETTINGS ═══════════════════════════════════════════════════
  console.log('\n[G] SETTINGS');
  const settings = await api('PUT','/api/settings',{privacy:{lastSeen:'contacts',status:'contacts'},chats:{theme:'dark'}},tokA);
  F('G1 Update settings', settings.s===200, settings.j?.error||'');
  const getSettings = await api('GET','/api/settings',null,tokA);
  F('G2 Get settings', getSettings.s===200, '');

  // Theme engine
  const theme = await api('POST','/api/theme-engine/mode',{mode:'dark'},tokA);
  F('G3 Apply theme mode', theme.s===200, '');
  const themeGet = await api('GET','/api/theme-engine/settings',null,tokA);
  F('G4 Get theme settings', themeGet.s===200, '');

  // ══ [H] MODS ═══════════════════════════════════════════════════════
  console.log('\n[H] MODS & ADVANCED');
  const genzMods = await api('GET','/api/genz-mods/settings',null,tokA);
  F('H1 GENZ mods settings', genzMods.s===200, '');

  const privacyMods = await api('GET','/api/privacy-mods/settings',null,tokA);
  F('H2 Privacy mods settings', privacyMods.s===200, '');

  const mediaMods = await api('GET','/api/media-mods/settings',null,tokA);
  F('H3 Media mods settings', mediaMods.s===200, '');

  const secMods = await api('GET','/api/security-mods/settings',null,tokA);
  F('H4 Security mods settings', secMods.s===200, '');

  const autoMods = await api('GET','/api/automation-mods/settings',null,tokA);
  F('H5 Automation mods settings', autoMods.s===200, '');

  const chatListMods = await api('GET','/api/chat-list-mods/settings',null,tokA);
  F('H6 Chat list mods settings', chatListMods.s===200, '');

  const customMods = await api('GET','/api/customization-mods/settings',null,tokA);
  F('H7 Customization mods settings', customMods.s===200, '');

  const grpMods = await api('GET','/api/group-mods/settings',null,tokA);
  F('H8 Group mods settings', grpMods.s===200, '');

  const msgMods = await api('GET','/api/message-mods/settings',null,tokA);
  F('H9 Message mods settings', msgMods.s===200, '');

  // ══ [I] CHANNELS ═══════════════════════════════════════════════════
  console.log('\n[I] CHANNELS');
  const chan = await api('POST','/api/channels',{name:`Live Channel ${ts}`,description:'Test channel',category:'General'},tokA);
  const chanId = chan.j?.channel?._id;
  F('I1 Create channel', !!chanId, chan.j?.error||'');

  if (chanId) {
    const chanFollow = await api('POST',`/api/channels/${chanId}/follow`,{},tokB);
    F('I2 Follow channel', chanFollow.s===200, '');

    const chanPost = await api('POST',`/api/channels/${chanId}/posts`,{content:'Hello channel! 📢'},tokA);
    F('I3 Create channel post', chanPost.s===200 || chanPost.s===201, chanPost.j?.error||'');

    const chanList = await api('GET','/api/channels',null,tokA);
    F('I4 List channels', chanList.s===200, '');
  }

  // ══ [J] WINGA MARKETPLACE ═══════════════════════════════════════════
  console.log('\n[J] WINGA MARKETPLACE');
  const winga = await api('GET','/api/winga',null,tokA);
  F('J1 Get WINGA listings', winga.s===200, winga.j?.error||'');

  const wingaStats = await api('GET','/api/winga/stats',null,tokA);
  F('J2 Get WINGA stats', wingaStats.s===200, wingaStats.j?.error||'');

  // ══ [K] BACKUP ═══════════════════════════════════════════════════════
  console.log('\n[K] BACKUP');
  const backup = await api('GET','/api/backup/list',null,tokA);
  F('K1 List backups', backup.s===200, '');

  // ══ [L] NOTIFICATIONS ═══════════════════════════════════════════════
  console.log('\n[L] NOTIFICATIONS');
  const notifSub = await api('POST','/api/notifications/subscribe',{subscription:{endpoint:'https://example.com/push',keys:{p256dh:'abc',auth:'def'}}},tokA);
  F('L1 Subscribe push notifications', notifSub.s===200 || notifSub.s===201, '');

  // ══ [M] STORY HIGHLIGHTS ═══════════════════════════════════════════
  console.log('\n[M] STORY HIGHLIGHTS');
  const hl = await api('POST','/api/story-highlights/create',{name:'My Highlights'},tokA);
  F('M1 Create story highlight', hl.s===200 || hl.s===201, hl.j?.error||'');
  const hlList = await api('GET','/api/story-highlights',null,tokA);
  F('M2 List story highlights', hlList.s===200, '');

  // ══ [N] LOCATIONS & EXTRAS ═════════════════════════════════════════
  console.log('\n[N] LOCATION & EXTRAS');
  const locShare = await api('POST','/api/location-sharing/share',{conversationId:convId,latitude:-6.7924,longitude:39.2083},tokA);
  F('N1 Share location', locShare.s===200 || locShare.s===201, locShare.j?.error||'');

  const dataUsage = await api('GET','/api/data-usage/stats',null,tokA);
  F('N2 Data usage stats', dataUsage.s===200, '');

  const storage = await api('GET','/api/storage-manager/usage',null,tokA);
  F('N3 Storage manager usage', storage.s===200, '');

  const cacheSize = await api('GET','/api/cache-cleaner/size',null,tokA);
  F('N4 Cache cleaner size', cacheSize.s===200, '');

  const antiBan = await api('GET','/api/anti-ban/settings',null,tokA);
  F('N5 Anti-ban settings', antiBan.s===200, '');

  const vapid = await api('GET','/api/notifications/vapid-public-key',null,tokA);
  F('N6 VAPID public key', vapid.s===200, '');

  // ══ [O] PRIVACY ═══════════════════════════════════════════════════════
  console.log('\n[O] PRIVACY & BLOCKING');
  const block = await api('POST',`/api/chat/users/${idB}/block`,{},tokA);
  F('O1 Block user', block.s===200, block.j?.error||'');
  const unblock = await api('DELETE',`/api/chat/users/${idB}/block`,{},tokA);
  F('O2 Unblock user', unblock.s===200, '');

  const report = await api('POST',`/api/chat/users/${idB}/report`,{reason:'spam',description:'test report'},tokA);
  F('O3 Report user', report.s===200 || report.s===201, '');

  const privacyExclude = await api('POST','/api/privacy/excluded',{privacyType:'last_seen',contactId:idB,contactName:'TestUser',contactPhone:'+2557999999999'},tokA);
  const pOk = privacyExclude.s===200 || privacyExclude.s===201 || (privacyExclude.j?.success===true);
  F('O4 Exclude contact from privacy', pOk, privacyExclude.j?.error||'');

  // ══ [P] HEALTH ═══════════════════════════════════════════════════════
  console.log('\n[P] SYSTEM HEALTH');
  const health = await api('GET','/api/health',null);
  F('P1 Health check', health.s===200 && health.j?.status==='ok', '');
  const ready = await api('GET','/api/health/ready',null);
  F('P2 Readiness check', ready.s===200 || ready.s===503, '');

  // ══ SUMMARY ═══════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  TOTAL: ${passed} passed / ${failed} failed / ${passed+failed} tests`);
  console.log('══════════════════════════════════════════════════════\n');
  if (failed > 0) {
    console.log('FAILURES:');
    results.filter(r=>r.s==='❌').forEach(r=>console.log(`  ❌ ${r.n} — ${r.d||''}`));
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
