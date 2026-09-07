// Focused feature testing
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

  console.log('=== FOCUSED FEATURE TESTS ===\n');

  // ===== 1. TEST CHAT CONVERSATION =====
  console.log('--- 1. Chat Conversation Test ---');
  
  // Navigate to new-chat, click "Note to self"
  await val(wsUrl, `window.location.href = '/new-chat'`);
  await new Promise(r => setTimeout(r, 3000));
  
  const newChatPage = await val(wsUrl, `document.body?.innerText?.substring(0, 500)`);
  console.log('New chat page:', newChatPage?.substring(0, 300));
  
  // Try clicking "Message yourself"
  const clickSelf = await val(wsUrl, `
    (async () => {
      const allEls = document.querySelectorAll('div, button, a, span');
      const selfChat = Array.from(allEls).find(el => {
        const t = el.textContent?.trim();
        return t && (t.includes('Message yourself') || t.includes('Note to self')) && el.children.length < 5;
      });
      if (selfChat) {
        selfChat.click();
        await new Promise(r => setTimeout(r, 3000));
        return 'Clicked self-chat. URL: ' + location.href;
      }
      
      // Try to find any chat entry
      const entries = document.querySelectorAll('[role="button"], [class*="cursor-pointer"]');
      return 'Self chat not found. Entries: ' + Array.from(entries).map(e => e.textContent?.trim()?.substring(0, 30)).filter(Boolean).join(' | ');
    })()
  `);
  console.log('Self chat click:', clickSelf?.substring(0, 200));

  await new Promise(r => setTimeout(r, 2000));

  // Check if we're in a chat now
  const chatState = await val(wsUrl, `
    (async () => {
      const url = location.href;
      const pageText = document.body?.innerText || '';
      
      // Check if we see a message input
      const textarea = document.querySelector('textarea');
      const inputs = document.querySelectorAll('input[type="text"]');
      const contentEditable = document.querySelectorAll('[contenteditable="true"]');
      
      // Look for message composer elements
      const composerArea = document.querySelector('[class*="composer"], [class*="message-input"], [class*="input-container"], [class*="chat-input"]');
      
      // Look for more actions / attachment buttons
      const allBtns = document.querySelectorAll('button, [role="button"]');
      const attachBtns = Array.from(allBtns).filter(b => {
        const info = (b.getAttribute('aria-label') + b.getAttribute('title') + b.className + b.textContent).toLowerCase();
        return info.includes('attach') || info.includes('emoji') || info.includes('camera') || info.includes('mic') || info.includes('send') || info.includes('more') || info.includes('plus') || info.includes('paperclip') || info.includes('gallery');
      });
      
      return JSON.stringify({
        url,
        hasTextarea: !!textarea,
        hasTextInput: inputs.length,
        hasContentEditable: contentEditable.length,
        hasComposer: !!composerArea,
        attachButtons: attachBtns.map(b => ({
          label: b.getAttribute('aria-label'),
          title: b.getAttribute('title'),
          text: b.textContent?.trim()?.substring(0, 20),
          className: b.className?.substring(0, 40)
        })),
        pageText: pageText.substring(0, 300)
      });
    })()
  `);
  console.log('Chat state:', chatState?.substring(0, 600));

  // ===== 2. TEST TYPING INDICATOR =====
  console.log('\n--- 2. Typing Indicator Test ---');
  
  const typingTest = await val(wsUrl, `
    (async () => {
      // Find the message input
      const textarea = document.querySelector('textarea');
      if (!textarea) return JSON.stringify({ error: 'No textarea found', url: location.href });
      
      // Focus the textarea and type
      textarea.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, 'Hello typing test');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      
      await new Promise(r => setTimeout(r, 2000));
      
      // Check the entire DOM for typing indicators
      const typingElements = document.querySelectorAll('[class*="typing"], [class*="indicator"], [class*="record"]');
      
      // Check socket events - look for any typing-related state
      const chatContext = window.__CHAT_CONTEXT_STATE__;
      
      return JSON.stringify({
        typingElementsFound: typingElements.length,
        typingElementTexts: Array.from(typingElements).map(e => e.textContent?.trim()?.substring(0, 30)),
        textareaValue: textarea.value,
        inputEvents: true
      });
    })()
  `);
  console.log('Typing test:', typingTest?.substring(0, 500));

  // ===== 3. TEST VIEW ONCE FEATURE =====
  console.log('\n--- 3. View Once Feature Test ---');
  
  const viewOnceTest = await val(wsUrl, `
    (async () => {
      const allBtns = document.querySelectorAll('button, [role="button"]');
      
      // Look for view-once toggle or button
      const viewOnceBtns = Array.from(allBtns).filter(b => {
        const info = ((b.getAttribute('aria-label') || '') + (b.getAttribute('title') || '') + b.textContent + b.className).toLowerCase();
        return info.includes('view once') || info.includes('viewonce') || info.includes('once');
      });
      
      // Look for any toggle/switch elements
      const toggles = document.querySelectorAll('input[type="checkbox"], [role="switch"], [class*="toggle"], [class*="switch"]');
      
      // Check for eye/view icons (lucide icons)
      const svgs = document.querySelectorAll('svg');
      const eyeIcons = Array.from(svgs).filter(s => {
        const paths = s.innerHTML;
        return paths.includes('eye') || paths.includes('Eye') || paths.includes('view');
      });
      
      return JSON.stringify({
        viewOnceButtons: viewOnceBtns.map(b => b.textContent?.trim()?.substring(0, 20)),
        toggleCount: toggles.length,
        eyeIconCount: eyeIcons.length,
        allButtons: Array.from(allBtns).map(b => (b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent?.trim() || '').substring(0, 25)).filter(Boolean).slice(0, 20)
      });
    })()
  `);
  console.log('View Once:', viewOnceTest?.substring(0, 600));

  // ===== 4. TEST MESSAGE SENDING =====
  console.log('\n--- 4. Message Sending Test ---');
  
  const sendTest = await val(wsUrl, `
    (async () => {
      const textarea = document.querySelector('textarea');
      if (!textarea) return 'No textarea';
      
      textarea.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, 'Test message from Buffy!');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      
      await new Promise(r => setTimeout(r, 500));
      
      // Find send button
      const allBtns = document.querySelectorAll('button');
      const sendBtn = Array.from(allBtns).find(b => {
        const info = (b.getAttribute('aria-label') + b.textContent + b.className).toLowerCase();
        return info.includes('send');
      });
      
      if (sendBtn) {
        sendBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        return 'Message sent! Page text after: ' + document.body?.innerText?.substring(0, 300);
      }
      
      return 'Send button not found';
    })()
  `);
  console.log('Send test:', sendTest?.substring(0, 300));

  // ===== 5. TEST APP LOCK / SECURITY =====
  console.log('\n--- 5. App Lock / Security Settings ---');
  
  await val(wsUrl, `window.location.href = '/settings/security'`);
  await new Promise(r => setTimeout(r, 3000));
  
  const securityPage = await val(wsUrl, `document.body?.innerText?.substring(0, 1000)`);
  console.log('Security page:', securityPage?.substring(0, 500));

  // ===== 6. TEST PRIVACY SETTINGS (for app lock) =====
  console.log('\n--- 6. Privacy Settings ---');
  
  await val(wsUrl, `window.location.href = '/settings'`);
  await new Promise(r => setTimeout(r, 2000));
  
  const privacyTest = await val(wsUrl, `
    (async () => {
      // Click Privacy tab
      const links = document.querySelectorAll('a, button, [role="tab"]');
      const privacyLink = Array.from(links).find(l => l.textContent?.trim() === 'Privacy');
      if (privacyLink) {
        privacyLink.click();
        await new Promise(r => setTimeout(r, 2000));
        return 'Privacy page: ' + document.body?.innerText?.substring(0, 1000);
      }
      return 'Privacy link not found';
    })()
  `);
  console.log('Privacy:', privacyTest?.substring(0, 500));

  // ===== 7. TEST NOTIFICATION SERVICE =====
  console.log('\n--- 7. Notification Service Check ---');
  
  const notifCheck = await val(wsUrl, `
    (async () => {
      // Check all notification-related state
      const sw = await navigator.serviceWorker?.getRegistration();
      
      // Check notificationService import
      const results = {
        serviceWorkerActive: !!sw?.active,
        serviceWorkerScope: sw?.scope,
        localStorageKeys: Object.keys(localStorage).filter(k => k.includes('notif') || k.includes('push') || k.includes('fcm')),
        notificationAPI: 'Notification' in window,
        permission: typeof Notification !== 'undefined' ? Notification.permission : 'N/A'
      };
      
      return JSON.stringify(results);
    })()
  `);
  console.log('Notification check:', notifCheck);

  console.log('\n=== ALL TESTS COMPLETE ===');
}

main().catch(console.error);
