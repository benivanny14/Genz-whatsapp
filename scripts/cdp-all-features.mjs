// Final targeted test for ALL features
import http from 'http';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function cdpEval(wsUrl, expr) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, awaitPromise: true, returnByValue: true }
      }));
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 1) { ws.close(); resolve(msg.result); }
    };
    ws.onerror = (e) => reject(e);
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout')); }, 30000);
  });
}

async function val(wsUrl, expr) {
  const r = await cdpEval(wsUrl, expr);
  return r?.value ?? JSON.stringify(r);
}

const results = {};

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  const wsUrl = page.webSocketDebuggerUrl;

  console.log('=== FINAL TARGETED TESTS ===\n');

  // ===== 1. STATUS POSTING =====
  console.log('━━━ TEST 1: STATUS POSTING ━━━');
  await val(wsUrl, `window.location.href = '/status'`);
  await new Promise(r => setTimeout(r, 2000));
  
  const statusTest = await val(wsUrl, `
    (async () => {
      const text = document.body?.innerText || '';
      const hasCreateBtn = text.includes('Create Status');
      const hasText = text.includes('Text');
      const hasPhoto = text.includes('Photo');
      const hasVideo = text.includes('Video');
      const hasVoice = text.includes('Voice');
      const hasLocation = text.includes('Location');
      const fileInputs = document.querySelectorAll('input[type="file"]');
      const fileAccepts = Array.from(fileInputs).map(f => f.accept);
      
      // Click Create Status to open form
      const createBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Create Status');
      if (createBtn) createBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      
      const afterClick = document.body?.innerText?.substring(0, 500);
      
      return JSON.stringify({
        hasCreateBtn,
        hasText, hasPhoto, hasVideo, hasVoice, hasLocation,
        fileInputs: fileAccepts,
        afterClickCreate: afterClick
      });
    })()
  `);
  console.log(statusTest);
  results.status = JSON.parse(statusTest || '{}');

  // ===== 2. CHAT - OPEN CONVERSATION =====
  console.log('\n━━━ TEST 2: CHAT CONVERSATION ━━━');
  await val(wsUrl, `window.location.href = '/chat'`);
  await new Promise(r => setTimeout(r, 3000));
  
  // Click on the self-chat (You) in the sidebar
  const chatOpen = await val(wsUrl, `
    (async () => {
      // Wait for page to load
      await new Promise(r => setTimeout(r, 1000));
      
      // Find conversation items in sidebar
      const allElements = document.querySelectorAll('*');
      const selfChatEl = Array.from(allElements).find(el => {
        const text = el.textContent?.trim();
        return text?.startsWith('You') && el.offsetWidth > 0 && el.offsetHeight > 0 && el.offsetHeight < 100 && el.className?.includes('cursor');
      });
      
      if (selfChatEl) {
        selfChatEl.click();
        await new Promise(r => setTimeout(r, 3000));
      }
      
      // Check if chat area opened
      const textarea = document.querySelector('textarea');
      const input = document.querySelector('input[type="text"]');
      
      // Find the message composer area
      const composerArea = document.querySelector('form[aria-label="Send message"]') || document.querySelector('[class*="composer"]');
      
      // Find attachment menu button
      const attachBtn = document.querySelector('button[aria-label="Open attachment menu"]');
      
      // Find view once button
      const viewOnceBtn = document.querySelector('button[aria-label="Toggle view-once mode"]');
      
      // Find more options button
      const moreBtn = document.querySelector('button[aria-label="More formatting options"]');
      
      // Find send button
      const sendBtn = document.querySelector('button[aria-label="Send message"]');
      
      return JSON.stringify({
        textareaFound: !!textarea,
        inputFound: !!input,
        composerAreaFound: !!composerArea,
        attachBtnFound: !!attachBtn,
        viewOnceBtnFound: !!viewOnceBtn,
        moreBtnFound: !!moreBtn,
        sendBtnFound: !!sendBtn,
        url: location.href
      });
    })()
  `);
  console.log('Chat open:', chatOpen);
  results.chat = JSON.parse(chatOpen || '{}');

  // ===== 3. MORE ACTIONS MENU =====
  console.log('\n━━━ TEST 3: MORE ACTIONS MENU ━━━');
  const moreActionsTest = await val(wsUrl, `
    (async () => {
      // First find and click attachment menu
      const attachBtn = document.querySelector('button[aria-label="Open attachment menu"]');
      if (attachBtn) {
        attachBtn.click();
        await new Promise(r => setTimeout(r, 500));
        
        // Get all visible buttons in the menu
        const menuGrid = document.querySelector('[class*="grid"]');
        const menuItems = menuGrid ? Array.from(menuGrid.querySelectorAll('[role="button"], button')).map(b => ({
          label: b.getAttribute('aria-label') || b.textContent?.trim()?.substring(0, 20),
          title: b.getAttribute('title') || ''
        })) : [];
        
        return JSON.stringify({
          menuOpened: true,
          expanded: attachBtn.getAttribute('aria-expanded'),
          items: menuItems,
          count: menuItems.length
        });
      }
      
      // Try the paperclip icon
      const paperclip = Array.from(document.querySelectorAll('button')).find(b => {
        return (b.getAttribute('aria-label') || '').includes('attach') || (b.getAttribute('title') || '').includes('attach');
      });
      
      return JSON.stringify({
        menuOpened: false,
        attachBtnFound: !!attachBtn,
        paperclipFound: !!paperclip
      });
    })()
  `);
  console.log('More actions:', moreActionsTest);
  results.moreActions = JSON.parse(moreActionsTest || '{}');

  // Close the menu
  await val(wsUrl, `document.body.click()`);
  await new Promise(r => setTimeout(r, 300));

  // ===== 4. VIEW ONCE =====
  console.log('\n━━━ TEST 4: VIEW ONCE ━━━');
  const viewOnceTest = await val(wsUrl, `
    (async () => {
      const viewOnceBtn = document.querySelector('button[aria-label="Toggle view-once mode"]');
      if (viewOnceBtn) {
        const before = viewOnceBtn.getAttribute('aria-pressed');
        viewOnceBtn.click();
        await new Promise(r => setTimeout(r, 500));
        const after = viewOnceBtn.getAttribute('aria-pressed');
        
        // Check for view once indicator
        const indicator = document.body?.innerText?.includes('View once');
        
        // Check for shield button
        const shieldBtn = document.querySelector('button[aria-label*="screenshot protection"], button[aria-label*="Shield"]');
        
        return JSON.stringify({
          toggled: true,
          beforePressed: before,
          afterPressed: after,
          indicatorVisible: indicator,
          shieldBtnFound: !!shieldBtn,
          shieldLabel: shieldBtn?.getAttribute('aria-label')
        });
      }
      return JSON.stringify({ toggled: false, error: 'View once button not found' });
    })()
  `);
  console.log('View once:', viewOnceTest);
  results.viewOnce = JSON.parse(viewOnceTest || '{}');

  // ===== 5. MORE OPTIONS (⋮) MENU =====
  console.log('\n━━━ TEST 5: MORE OPTIONS (⋮) MENU ━━━');
  const moreOptionsTest = await val(wsUrl, `
    (async () => {
      const moreBtn = document.querySelector('button[aria-label="More formatting options"]');
      if (moreBtn) {
        moreBtn.click();
        await new Promise(r => setTimeout(r, 500));
        
        // Get menu content
        const menuItems = Array.from(document.querySelectorAll('button')).filter(b => {
          const rect = b.getBoundingClientRect();
          return rect.width > 50 && rect.height > 20 && rect.top > 0;
        }).map(b => ({
          text: b.textContent?.trim()?.substring(0, 30),
          title: b.getAttribute('title') || ''
        })).filter(i => i.text && !['Chats','Status','Groups','Winga','Me'].includes(i.text));
        
        return JSON.stringify({
          expanded: moreBtn.getAttribute('aria-expanded'),
          items: menuItems.slice(0, 10)
        });
      }
      return JSON.stringify({ error: 'More options button not found' });
    })()
  `);
  console.log('More options:', moreOptionsTest);
  results.moreOptions = JSON.parse(moreOptionsTest || '{}');

  // ===== 6. TYPING INDICATOR =====
  console.log('\n━━━ TEST 6: TYPING INDICATOR ━━━');
  const typingTest = await val(wsUrl, `
    (async () => {
      const input = document.querySelector('textarea') || document.querySelector('input[type="text"]');
      if (!input) return JSON.stringify({ error: 'No input found' });
      
      // Focus and type
      input.focus();
      
      // Use React-compatible event dispatching
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      const setter = nativeTextareaSetter || nativeInputValueSetter;
      
      if (setter) {
        setter.call(input, 'Testing typing indicator...');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      await new Promise(r => setTimeout(r, 2000));
      
      // Check for typing indicators
      const typingElements = document.querySelectorAll('[class*="typing"], [class*="indicator"]');
      
      // Check socket state
      const socketInfo = typeof io !== 'undefined' ? 'available' : 'not available';
      
      return JSON.stringify({
        inputValue: input.value?.substring(0, 30) || input.textContent?.substring(0, 30),
        typingElements: Array.from(typingElements).map(e => ({
          class: e.className?.substring(0, 40),
          text: e.textContent?.trim()?.substring(0, 30),
          visible: e.offsetHeight > 0
        })),
        socketState: socketInfo
      });
    })()
  `);
  console.log('Typing:', typingTest);
  results.typing = JSON.parse(typingTest || '{}');

  // ===== 7. SEND MESSAGE =====
  console.log('\n━━━ TEST 7: SEND MESSAGE ━━━');
  const sendTest = await val(wsUrl, `
    (async () => {
      const input = document.querySelector('textarea') || document.querySelector('input[type="text"]');
      if (!input) return JSON.stringify({ error: 'No input' });
      
      // Set value
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
        || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(input, 'Test message from Buffy!');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      await new Promise(r => setTimeout(r, 300));
      
      // Find and click send
      const sendBtn = document.querySelector('button[aria-label="Send message"]');
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        
        // Check for sent message
        const msgs = document.querySelectorAll('[class*="message"], [class*="bubble"], [class*="chat"]');
        return JSON.stringify({ sent: true, msgElements: msgs.length });
      }
      
      return JSON.stringify({ sent: false, btnFound: !!sendBtn, disabled: sendBtn?.disabled, inputValue: input.value });
    })()
  `);
  console.log('Send:', sendTest);
  results.send = JSON.parse(sendTest || '{}');

  // ===== 8. APP LOCK =====
  console.log('\n━━━ TEST 8: APP LOCK (Settings > Privacy) ━━━');
  await val(wsUrl, `window.location.href = '/settings'`);
  await new Promise(r => setTimeout(r, 2000));
  
  const appLockTest = await val(wsUrl, `
    (async () => {
      // Click Privacy tab
      const tabs = document.querySelectorAll('button, [role="tab"], a');
      const privacyTab = Array.from(tabs).find(t => t.textContent?.trim() === 'Privacy');
      if (privacyTab) {
        privacyTab.click();
        await new Promise(r => setTimeout(r, 2000));
        
        const text = document.body?.innerText || '';
        const hasAppLock = text.includes('App Lock') || text.includes('app lock');
        const hasFingerprint = text.includes('fingerprint') || text.includes('Fingerprint');
        const hasPIN = text.includes('PIN') || text.includes('pin');
        
        // Find App Lock section
        const appLockSection = text.includes('App Lock');
        
        return JSON.stringify({
          privacyTabClicked: true,
          hasAppLock,
          hasFingerprint,
          hasPIN,
          pageText: text.substring(0, 1500)
        });
      }
      
      return JSON.stringify({ privacyTabClicked: false });
    })()
  `);
  console.log('App Lock:', appLockTest);
  results.appLock = JSON.parse(appLockTest || '{}');

  // ===== 9. WINGA POST FORM =====
  console.log('\n━━━ TEST 9: WINGA POST FORM ━━━');
  await val(wsUrl, `window.location.href = '/winga'`);
  await new Promise(r => setTimeout(r, 3000));
  
  const wingaTest = await val(wsUrl, `
    (async () => {
      // Click Post
      const postBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Post');
      if (postBtn) {
        postBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        
        const inputs = Array.from(document.querySelectorAll('input, textarea')).filter(i => i.offsetHeight > 0);
        const fields = inputs.map(i => ({
          type: i.type || i.tagName.toLowerCase(),
          placeholder: i.placeholder || ''
        }));
        
        // Check for image upload
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        return JSON.stringify({
          formOpened: true,
          fields,
          fileInputCount: fileInputs.length,
          pageText: document.body?.innerText?.substring(0, 600)
        });
      }
      return JSON.stringify({ formOpened: false });
    })()
  `);
  console.log('Winga:', wingaTest);
  results.winga = JSON.parse(wingaTest || '{}');

  // ===== 10. NOTIFICATIONS =====
  console.log('\n━━━ TEST 10: NOTIFICATIONS ━━━');
  const notifTest = await val(wsUrl, `
    JSON.stringify({
      notificationAPI: 'Notification' in window,
      serviceWorkerActive: 'serviceWorker' in navigator,
      notificationSettings: localStorage.getItem('genz_notification_settings'),
      fcmTokens: localStorage.getItem('fcm_token'),
      genzSettings: Object.keys(localStorage).filter(k => k.startsWith('genz_'))
    })
  `);
  console.log('Notifications:', notifTest);
  results.notifications = JSON.parse(notifTest || '{}');

  // ===== SUMMARY =====
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('=== TEST SUMMARY ===');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(JSON.stringify(results, null, 2));
  console.log('\n=== ALL TESTS COMPLETE ===');
}

main().catch(console.error);
