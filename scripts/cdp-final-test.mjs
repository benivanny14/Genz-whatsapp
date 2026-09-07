// Final comprehensive test for all features
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

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  const wsUrl = page.webSocketDebuggerUrl;

  console.log('=== FINAL COMPREHENSIVE TEST ===\n');

  // ===== 1. OPEN SELF-CHAT (Note to Self) =====
  console.log('--- 1. Opening Self-Chat ---');
  
  // Use the API to get/create self conversation
  const selfChat = await val(wsUrl, `
    (async () => {
      try {
        // Get auth token from localStorage
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const API = '${await getApiBase(wsUrl)}';
        
        // Get or create self conversation via API
        const res = await fetch(API + '/chat/conversations', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        const conversations = data.conversations || data.data?.conversations || [];
        
        if (conversations.length > 0) {
          // Find self-chat or use first conversation
          const selfConv = conversations.find(c => c.isSelfChat || c.participants?.length === 1 || c.type === 'self');
          const targetConv = selfConv || conversations[0];
          
          if (targetConv?._id) {
            window.location.href = '/chat/' + targetConv._id;
            return 'Navigated to conversation: ' + targetConv._id + ' (type: ' + (targetConv.type || 'direct') + ')';
          }
        }
        
        return 'No conversations found: ' + JSON.stringify(data).substring(0, 200);
      } catch(e) {
        return 'Error: ' + e.message;
      }
    })()
  `);
  console.log(selfChat?.substring(0, 200));
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Check if we're in a chat
  const chatCheck = await val(wsUrl, `location.href`);
  console.log('Current URL:', chatCheck);

  // If we're not in a chat, try navigating differently
  if (!chatCheck?.includes('/chat/') || chatCheck?.includes('/new-chat')) {
    console.log('Not in a chat, trying alternative approach...');
    
    const altChat = await val(wsUrl, `
      (async () => {
        // Try to get self-chat via the self-chat API
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const me = await fetch('${await getApiBase(wsUrl)}/auth/me', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const meData = await me.json();
        const userId = meData.user?._id || meData.data?.user?._id;
        
        if (userId) {
          // Create self-conversation
          const convRes = await fetch('${await getApiBase(wsUrl)}/chat/conversation', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
          });
          const convData = await convRes.json();
          const convId = convData.conversation?._id || convData.data?.conversation?._id;
          
          if (convId) {
            window.location.href = '/chat/' + convId;
            return 'Created and navigated to self-chat: ' + convId;
          }
          return 'Could not create conversation: ' + JSON.stringify(convData).substring(0, 200);
        }
        return 'Could not get user ID';
      })()
    `);
    console.log(altChat?.substring(0, 300));
    await new Promise(r => setTimeout(r, 3000));
  }

  // Check final state
  const finalState = await val(wsUrl, `
    (async () => {
      const url = location.href;
      const hasTextarea = !!document.querySelector('textarea');
      const hasInput = !!document.querySelector('input[type="text"]');
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]')).map(b => (b.getAttribute('aria-label') || b.textContent?.trim() || '').substring(0, 25)).filter(Boolean).slice(0, 25);
      const pageText = document.body?.innerText?.substring(0, 500);
      
      return JSON.stringify({ url, hasTextarea, hasInput, buttons, pageText });
    })()
  `);
  console.log('Chat state:', finalState?.substring(0, 500));

  // ===== 2. TEST MESSAGE COMPOSER & MORE ACTIONS =====
  console.log('\n--- 2. Message Composer & More Actions Menu ---');
  
  const composerTest = await val(wsUrl, `
    (async () => {
      const textarea = document.querySelector('textarea');
      const textInput = document.querySelector('input[type="text"][placeholder*="Type"]');
      const composerInput = textarea || textInput;
      
      if (!composerInput) {
        return JSON.stringify({ 
          error: 'No composer input found',
          allInputs: Array.from(document.querySelectorAll('input, textarea')).map(i => ({type: i.type, placeholder: i.placeholder, className: i.className?.substring(0, 30)}))
        });
      }
      
      // Find all buttons in the composer area
      const allBtns = document.querySelectorAll('button, [role="button"]');
      const composerBtns = Array.from(allBtns).filter(b => {
        const rect = b.getBoundingClientRect();
        return rect.bottom > window.innerHeight - 200; // Bottom 200px = composer area
      });
      
      const btnInfo = composerBtns.map(b => ({
        label: b.getAttribute('aria-label') || b.textContent?.trim()?.substring(0, 20) || '',
        title: b.getAttribute('title') || '',
        expanded: b.getAttribute('aria-expanded'),
        pressed: b.getAttribute('aria-pressed')
      }));
      
      return JSON.stringify({
        inputType: composerInput.tagName,
        inputPlaceholder: composerInput.placeholder,
        composerButtons: btnInfo,
        inputPosition: composerInput.getBoundingClientRect()
      });
    })()
  `);
  console.log('Composer:', composerTest?.substring(0, 600));

  // Click the attachment menu (paperclip icon)
  console.log('\n--- 3. Attachment Menu Test ---');
  const attachMenu = await val(wsUrl, `
    (async () => {
      // Find the attachment/paperclip button
      const attachBtn = document.querySelector('button[aria-label="Open attachment menu"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => {
                          const label = (b.getAttribute('aria-label') || b.getAttribute('title') || '').toLowerCase();
                          return label.includes('attach');
                        });
      
      if (attachBtn) {
        attachBtn.click();
        await new Promise(r => setTimeout(r, 1000));
        
        // Check what menu appeared
        const menuItems = Array.from(document.querySelectorAll('[role="button"], button')).filter(b => {
          const rect = b.getBoundingClientRect();
          const parent = b.closest('[class*="grid"], [class*="menu"], [class*="dropdown"]');
          return parent && rect.height > 20;
        });
        
        return JSON.stringify({
          clicked: 'attachment menu',
          menuItems: menuItems.map(m => ({
            label: m.getAttribute('aria-label') || m.textContent?.trim()?.substring(0, 20) || '',
            title: m.getAttribute('title') || ''
          })).slice(0, 20)
        });
      }
      return 'Attachment button not found';
    })()
  `);
  console.log('Attachment menu:', attachMenu?.substring(0, 600));

  // ===== 4. TEST VIEW ONCE TOGGLE =====
  console.log('\n--- 4. View Once Toggle ---');
  const viewOnceTest = await val(wsUrl, `
    (async () => {
      // Find the view-once button (Eye icon)
      const viewOnceBtn = document.querySelector('button[aria-label="Toggle view-once mode"]');
      
      if (viewOnceBtn) {
        const wasPressed = viewOnceBtn.getAttribute('aria-pressed');
        viewOnceBtn.click();
        await new Promise(r => setTimeout(r, 500));
        const isPressed = viewOnceBtn.getAttribute('aria-pressed');
        
        // Check if view-once indicator appeared
        const viewOnceIndicator = document.body?.innerText?.includes('View once');
        
        // Check for shield button
        const shieldBtn = document.querySelector('button[aria-label*="screenshot protection"]');
        
        return JSON.stringify({
          toggled: true,
          wasPressed,
          isPressed,
          viewOnceIndicatorVisible: viewOnceIndicator,
          shieldButtonFound: !!shieldBtn,
          shieldButtonLabel: shieldBtn?.getAttribute('aria-label') || 'none'
        });
      }
      
      // Also check attachment menu for view once
      const allBtns = Array.from(document.querySelectorAll('button, [role="button"]'));
      const viewOnceInMenu = allBtns.filter(b => {
        const text = (b.textContent?.trim() + b.getAttribute('title') + b.getAttribute('aria-label')).toLowerCase();
        return text.includes('view once');
      });
      
      return JSON.stringify({
        directButton: false,
        viewOnceInMenu: viewOnceInMenu.map(b => ({
          text: b.textContent?.trim()?.substring(0, 20),
          label: b.getAttribute('aria-label'),
          title: b.getAttribute('title')
        }))
      });
    })()
  `);
  console.log('View Once:', viewOnceTest?.substring(0, 500));

  // ===== 5. TEST MORE OPTIONS MENU (⋮) =====
  console.log('\n--- 5. More Options Menu (⋮) ---');
  const moreOptions = await val(wsUrl, `
    (async () => {
      // Find the more options button (⋮ / MoreVertical)
      const moreBtn = document.querySelector('button[aria-label="More formatting options"]');
      
      if (moreBtn) {
        moreBtn.click();
        await new Promise(r => setTimeout(r, 500));
        
        // Check menu content
        const menuItems = Array.from(document.querySelectorAll('button, [role="menuitem"]')).filter(b => {
          const rect = b.getBoundingClientRect();
          return rect.width > 50 && rect.height > 20;
        });
        
        return JSON.stringify({
          toggled: true,
          expanded: moreBtn.getAttribute('aria-expanded'),
          items: menuItems.map(m => ({
            text: m.textContent?.trim()?.substring(0, 30),
            title: m.getAttribute('title') || ''
          })).filter(i => i.text && !i.text.includes('Chats') && !i.text.includes('Status')).slice(0, 15)
        });
      }
      
      // Check all buttons for more options
      const allBtns = Array.from(document.querySelectorAll('button, [role="button"]'));
      const moreBtns = allBtns.filter(b => {
        const info = (b.getAttribute('aria-label') + b.getAttribute('title') + b.textContent).toLowerCase();
        return info.includes('more') || info.includes('⋮') || info.includes('format');
      });
      
      return JSON.stringify({
        directButton: false,
        candidates: moreBtns.map(b => ({
          label: b.getAttribute('aria-label'),
          title: b.getAttribute('title'),
          text: b.textContent?.trim()?.substring(0, 20)
        }))
      });
    })()
  `);
  console.log('More Options:', moreOptions?.substring(0, 600));

  // ===== 6. TEST TYPING INDICATOR =====
  console.log('\n--- 6. Typing Indicator ---');
  const typingTest = await val(wsUrl, `
    (async () => {
      const input = document.querySelector('textarea') || document.querySelector('input[type="text"][placeholder*="Type"]');
      if (!input) return JSON.stringify({ error: 'No input found' });
      
      // Type a message
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set 
        || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(input, 'Testing typing indicator...');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        // Also dispatch React synthetic events
        const nativeInputEvent = new Event('input', { bubbles: true });
        Object.defineProperty(nativeInputEvent, 'target', { value: input });
        input.dispatchEvent(nativeInputEvent);
      }
      
      await new Promise(r => setTimeout(r, 2000));
      
      // Check for typing indicator in the DOM
      const typingElements = document.querySelectorAll('[class*="typing"], [class*="indicator"]');
      
      // Check socket connection state
      const socketState = window.io?.()?.connected || 'unknown';
      
      return JSON.stringify({
        typed: input.value?.substring(0, 30) || input.textContent?.substring(0, 30),
        typingIndicatorElements: Array.from(typingElements).map(e => ({
          className: e.className?.substring(0, 50),
          text: e.textContent?.trim()?.substring(0, 30),
          visible: e.offsetHeight > 0
        })),
        socketConnected: socketState
      });
    })()
  `);
  console.log('Typing:', typingTest?.substring(0, 500));

  // ===== 7. SEND MESSAGE =====
  console.log('\n--- 7. Send Message ---');
  const sendTest = await val(wsUrl, `
    (async () => {
      const input = document.querySelector('textarea') || document.querySelector('input[type="text"][placeholder*="Type"]');
      if (!input) return 'No input';
      
      // Make sure there's text
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set 
        || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (setter && input.value !== 'Test message from Buffy!') {
        setter.call(input, 'Test message from Buffy!');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      await new Promise(r => setTimeout(r, 300));
      
      // Find send button
      const sendBtn = document.querySelector('button[aria-label="Send message"]');
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        
        // Check if message appeared
        const messages = document.querySelectorAll('[class*="message"], [class*="bubble"]');
        return JSON.stringify({
          sent: true,
          messageCount: messages.length,
          inputAfter: input.value || input.textContent || 'empty'
        });
      }
      
      return JSON.stringify({
        sent: false,
        sendButtonFound: !!sendBtn,
        disabled: sendBtn?.disabled,
        inputValue: input.value || input.textContent
      });
    })()
  `);
  console.log('Send:', sendTest?.substring(0, 300));

  // ===== 8. TEST APP LOCK / SECURITY =====
  console.log('\n--- 8. App Lock Settings ---');
  await val(wsUrl, `window.location.href = '/settings/security'`);
  await new Promise(r => setTimeout(r, 3000));
  
  const appLockTest = await val(wsUrl, `
    (async () => {
      const text = document.body?.innerText || '';
      
      // Check for app lock related content
      const hasAppLock = text.includes('App lock') || text.includes('app lock') || text.includes('biometric') || text.includes('Biometric');
      const hasPasscode = text.includes('passcode') || text.includes('Passcode') || text.includes('PIN') || text.includes('pin');
      const hasFingerprint = text.includes('fingerprint') || text.includes('Fingerprint');
      
      // Check all buttons/toggles on this page
      const allBtns = Array.from(document.querySelectorAll('button, [role="switch"], input[type="checkbox"]'));
      const securityItems = allBtns.map(b => ({
        text: b.textContent?.trim()?.substring(0, 40) || '',
        label: b.getAttribute('aria-label') || '',
        checked: b.getAttribute('aria-checked') || b.checked
      })).filter(i => i.text || i.label);
      
      return JSON.stringify({
        url: location.href,
        hasAppLock,
        hasPasscode,
        hasFingerprint,
        pageContent: text.substring(0, 1000),
        securityItems
      });
    })()
  `);
  console.log('App Lock:', appLockTest?.substring(0, 600));

  // ===== 9. TEST WINGA (PRODUCT UPLOAD) =====
  console.log('\n--- 9. Winga (Product Upload) ---');
  await val(wsUrl, `window.location.href = '/winga'`);
  await new Promise(r => setTimeout(r, 3000));
  
  const wingaTest = await val(wsUrl, `
    (async () => {
      const text = document.body?.innerText || '';
      
      // Click "Post" button if it exists
      const postBtn = Array.from(document.querySelectorAll('button, [role="button"]')).find(b => 
        b.textContent?.trim() === 'Post'
      );
      
      if (postBtn) {
        postBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        
        // Check form fields
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
        const formFields = inputs.map(i => ({
          type: i.type,
          placeholder: i.placeholder || i.name || '',
          tag: i.tagName
        })).filter(f => f.placeholder || f.type !== 'hidden');
        
        return JSON.stringify({
          formOpened: true,
          pageText: document.body?.innerText?.substring(0, 800),
          formFields
        });
      }
      
      return JSON.stringify({
        formOpened: false,
        postButtonFound: false,
        pageText: text.substring(0, 500),
        allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()?.substring(0, 20)).filter(Boolean)
      });
    })()
  `);
  console.log('Winga:', wingaTest?.substring(0, 600));

  // ===== 10. TEST NOTIFICATIONS =====
  console.log('\n--- 10. Notification State ---');
  const notifTest = await val(wsUrl, `
    JSON.stringify({
      notificationAPI: 'Notification' in window,
      permission: typeof Notification !== 'undefined' ? Notification.permission : 'N/A',
      serviceWorkerActive: 'serviceWorker' in navigator,
      localStorageKeys: Object.keys(localStorage).filter(k => k.includes('notif') || k.includes('push') || k.includes('fcm') || k.includes('genz')),
      registrationId: localStorage.getItem('fcm_registration_id') || 'none'
    })
  `);
  console.log('Notifications:', notifTest);

  // ===== 11. TEST ANTI-VIEW ONCE (checking source code) =====
  console.log('\n--- 11. Anti-View Once Feature Check ---');
  const antiViewOnce = await val(wsUrl, `
    (async () => {
      // Navigate to settings
      window.location.href = '/settings';
      await new Promise(r => setTimeout(r, 2000));
      
      // Check for GENZ Mods related content
      const text = document.body?.innerText || '';
      const hasAntiRevoke = text.includes('Anti-revoke') || text.includes('anti-revoke') || text.includes('Anti Revoke');
      const hasAntiViewOnce = text.includes('anti-view-once') || text.includes('Anti View Once') || text.includes('anti view once');
      
      // Check for features page
      return JSON.stringify({
        hasAntiRevoke,
        hasAntiViewOnce,
        settingsText: text.substring(0, 500)
      });
    })()
  `);
  console.log('Anti-View Once:', antiViewOnce?.substring(0, 400));

  console.log('\n=== ALL TESTS COMPLETE ===');
}

async function getApiBase(wsUrl) {
  return await cdpEval(wsUrl, `resolveApiBase ? resolveApiBase() : 'http://10.0.2.2:5000/api'`).then(r => r?.value || 'http://10.0.2.2:5000/api');
}

main().catch(console.error);
