// Detailed test for Status creation, Chat features, View-once, App lock
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

  console.log('=== DETAILED FEATURE TESTS ===\n');

  // ===== TEST: Status Creation =====
  console.log('--- TEST A: Status Creation Page ---');
  await val(wsUrl, `window.location.href = '/status'`);
  await new Promise(r => setTimeout(r, 2000));
  
  const statusResult = await val(wsUrl, `
    (async () => {
      // Click Create Status button
      const allBtns = document.querySelectorAll('button, [role="button"]');
      const createBtn = Array.from(allBtns).find(b => b.textContent?.trim() === 'Create Status');
      if (createBtn) {
        createBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        return 'Create Status clicked! Current page: ' + location.href + ' | UI: ' + document.body?.innerText?.substring(0, 600);
      }
      return 'Create Status button not found';
    })()
  `);
  console.log(statusResult?.substring(0, 500));

  // Check for media upload options (video, photo, voice, location)
  const mediaOptions = await val(wsUrl, `
    (async () => {
      await new Promise(r => setTimeout(r, 1000));
      const allText = document.body?.innerText || '';
      const allBtns = document.querySelectorAll('button, [role="button"], input[type="file"]');
      const btnTexts = Array.from(allBtns).map(b => b.textContent?.trim() || b.getAttribute('aria-label') || b.getAttribute('title') || b.type || 'unnamed').filter(Boolean);
      
      // Check for file inputs
      const fileInputs = document.querySelectorAll('input[type="file"]');
      const fileTypes = Array.from(fileInputs).map(f => f.accept || 'any');
      
      return JSON.stringify({
        buttons: btnTexts,
        fileInputs: fileTypes,
        hasPhoto: allText.includes('photo') || allText.includes('Photo') || allText.includes('image') || allText.includes('Image'),
        hasVideo: allText.includes('video') || allText.includes('Video'),
        hasVoice: allText.includes('voice') || allText.includes('Voice'),
        hasLocation: allText.includes('location') || allText.includes('Location'),
        pageText: allText.substring(0, 800)
      });
    })()
  `);
  console.log('Media options:', mediaOptions?.substring(0, 500));

  // ===== TEST: Chat & Message Composer =====
  console.log('\n--- TEST B: Chat & Message Composer ---');
  
  // Navigate to chat and open a conversation
  await val(wsUrl, `window.location.href = '/chat'`);
  await new Promise(r => setTimeout(r, 2000));

  // Start a chat with self (note to self)
  const selfChat = await val(wsUrl, `
    (async () => {
      // Look for "Note to self" or any chat item
      const chatItems = document.querySelectorAll('[class*="chat"], [class*="conversation"], [class*="item"]');
      const noteToSelf = Array.from(chatItems).find(c => c.textContent?.includes('Note to self') || c.textContent?.includes('yourself'));
      if (noteToSelf) { 
        noteToSelf.click(); 
        await new Promise(r => setTimeout(r, 2000));
        return 'Opened note to self chat';
      }
      
      // Navigate to self-chat via new-chat page
      window.location.href = '/new-chat';
      await new Promise(r => setTimeout(r, 2000));
      
      const youBtn = Array.from(document.querySelectorAll('button, [role="button"], div')).find(b => b.textContent?.includes('Note to self') || b.textContent?.includes('Message yourself'));
      if (youBtn) {
        youBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        return 'Opened self chat from new-chat';
      }
      
      return 'Could not find self chat. Page text: ' + document.body?.innerText?.substring(0, 300);
    })()
  `);
  console.log('Chat open:', selfChat?.substring(0, 200));

  // Check message composer area
  const composerUI = await val(wsUrl, `
    (async () => {
      await new Promise(r => setTimeout(r, 1000));
      const allBtns = document.querySelectorAll('button, [role="button"]');
      const allInputs = document.querySelectorAll('input, textarea, [contenteditable]');
      
      const btnLabels = Array.from(allBtns).map(b => {
        return b.textContent?.trim()?.substring(0, 30) || b.getAttribute('aria-label') || b.getAttribute('title') || b.className?.substring(0, 30) || 'unknown';
      }).filter(Boolean);

      return JSON.stringify({
        url: location.href,
        buttons: btnLabels.slice(0, 25),
        inputs: allInputs.length,
        hasComposer: document.querySelector('[class*="composer"], [class*="input-area"], [class*="message-input"]') !== null,
        pageText: document.body?.innerText?.substring(0, 400)
      });
    })()
  `);
  console.log('Composer UI:', composerUI?.substring(0, 500));

  // Test typing indicator - start typing and check
  console.log('\n--- TEST C: Typing Indicator ---');
  const typingTest = await val(wsUrl, `
    (async () => {
      const input = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
      if (!input) return 'No input found';
      
      // Simulate typing
      const setter = input.tagName === 'TEXTAREA' || input.tagName === 'INPUT' 
        ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
        : null;
      
      if (setter) {
        setter.call(input, 'Hello testing typing indicator');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (input.contentEditable === 'true') {
        input.textContent = 'Hello testing typing indicator';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      await new Promise(r => setTimeout(r, 1000));
      
      // Check if there's a typing indicator being shown
      const indicator = document.querySelector('[class*="typing"], [class*="indicator"]');
      return 'Typed text. Indicator found: ' + (indicator ? indicator.textContent : 'none') + ' | Input value: ' + (input.value || input.textContent || '').substring(0, 50);
    })()
  `);
  console.log('Typing test:', typingTest);

  // Test More Actions menu
  console.log('\n--- TEST D: More Actions Menu ---');
  const moreActions = await val(wsUrl, `
    (async () => {
      // Look for more actions / attachment / plus button near the composer
      const allBtns = document.querySelectorAll('button, [role="button"]');
      const moreBtns = Array.from(allBtns).filter(b => {
        const label = (b.textContent?.trim() + b.getAttribute('aria-label') + b.getAttribute('title') + b.className).toLowerCase();
        return label.includes('more') || label.includes('attach') || label.includes('plus') || label.includes('menu') || label.includes('emoji') || label.includes('camera') || label.includes('paperclip');
      });
      
      // Click the more/attachment button
      if (moreBtns.length > 0) {
        moreBtns[0].click();
        await new Promise(r => setTimeout(r, 1000));
        
        // Check what menu appeared
        const menuItems = document.querySelectorAll('[class*="menu"], [class*="dropdown"], [class*="action"], [role="menu"], [role="menuitem"]');
        const menuTexts = Array.from(menuItems).map(m => m.textContent?.trim()?.substring(0, 40)).filter(Boolean);
        
        return JSON.stringify({
          clickedButton: moreBtns[0].getAttribute('aria-label') || moreBtns[0].className?.substring(0, 40),
          menuItems: menuTexts,
          fullPage: document.body?.innerText?.substring(0, 800)
        });
      }
      
      return 'No more/attachment buttons found. All buttons: ' + Array.from(allBtns).map(b => (b.getAttribute('aria-label') || b.textContent?.trim() || '').substring(0, 30)).filter(Boolean).join(' | ');
    })()
  `);
  console.log('More actions:', moreActions?.substring(0, 500));

  // ===== TEST: View Once Feature =====
  console.log('\n--- TEST E: View Once Feature ---');
  const viewOnce = await val(wsUrl, `
    (async () => {
      // Check if view-once option exists in message composer
      const pageText = document.body?.innerText || '';
      const allBtns = document.querySelectorAll('button, [role="button"]');
      
      // Look for view-once related buttons or toggles
      const viewOnceBtns = Array.from(allBtns).filter(b => {
        const label = (b.textContent?.trim() + b.getAttribute('aria-label') + b.getAttribute('title') + b.className).toLowerCase();
        return label.includes('view once') || label.includes('viewonce') || label.includes('1');
      });
      
      return JSON.stringify({
        foundViewOnceButtons: viewOnceBtns.length,
        allButtons: Array.from(allBtns).map(b => (b.getAttribute('aria-label') || b.textContent?.trim() || '').substring(0, 30)).filter(Boolean),
        hasViewOnceInText: pageText.includes('view once') || pageText.includes('View once'),
        hasAntiViewOnce: pageText.includes('anti') || pageText.includes('Anti')
      });
    })()
  `);
  console.log('View Once:', viewOnce?.substring(0, 500));

  // ===== TEST: Winga (Product Upload) =====
  console.log('\n--- TEST F: Winga (Product Upload) ---');
  await val(wsUrl, `window.location.href = '/winga'`);
  await new Promise(r => setTimeout(r, 3000));
  
  const wingaResult = await val(wsUrl, `
    (async () => {
      const allBtns = document.querySelectorAll('button, [role="button"]');
      const postBtn = Array.from(allBtns).find(b => b.textContent?.trim() === 'Post' || b.textContent?.includes('Post'));
      
      if (postBtn) {
        postBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        
        const formText = document.body?.innerText?.substring(0, 800);
        const formInputs = document.querySelectorAll('input, textarea, select');
        const inputInfo = Array.from(formInputs).map(i => i.type + ':' + (i.placeholder || i.name || '')).filter(Boolean);
        
        return JSON.stringify({
          formVisible: true,
          inputs: inputInfo,
          pageText: formText
        });
      }
      
      return 'Post button not found. Buttons: ' + Array.from(allBtns).map(b => b.textContent?.trim()?.substring(0, 20)).filter(Boolean).join(', ');
    })()
  `);
  console.log('Winga post form:', wingaResult?.substring(0, 500));

  // ===== TEST: App Lock =====
  console.log('\n--- TEST G: App Lock Settings ---');
  await val(wsUrl, `window.location.href = '/settings'`);
  await new Promise(r => setTimeout(r, 2000));
  
  const appLock = await val(wsUrl, `
    (async () => {
      const allText = document.body?.innerText || '';
      
      // Check for app lock related elements
      const hasAppLock = allText.includes('App lock') || allText.includes('app lock');
      const hasFingerprint = allText.includes('fingerprint') || allText.includes('Fingerprint');
      const hasBiometric = allText.includes('biometric') || allText.includes('Biometric');
      const hasPasscode = allText.includes('passcode') || allText.includes('Passcode') || allText.includes('PIN');
      
      // Look for privacy/security navigation
      const links = document.querySelectorAll('a, [role="button"], button');
      const privacyLink = Array.from(links).find(l => l.textContent?.includes('Privacy'));
      
      if (privacyLink) {
        privacyLink.click();
        await new Promise(r => setTimeout(r, 2000));
        const privacyText = document.body?.innerText?.substring(0, 1000);
        return JSON.stringify({
          hasAppLock,
          hasFingerprint,
          hasBiometric,
          hasPasscode,
          privacyPage: privacyText
        });
      }
      
      return JSON.stringify({ hasAppLock, hasFingerprint, hasBiometric, hasPasscode, pageText: allText.substring(0, 500) });
    })()
  `);
  console.log('App Lock:', appLock?.substring(0, 600));

  // ===== TEST: Notifications =====
  console.log('\n--- TEST H: Notifications ---');
  const notifResult = await val(wsUrl, `
    (async () => {
      // Check notification permissions
      const hasPermission = 'Notification' in window ? Notification.permission : 'not supported';
      
      // Check localStorage for notification settings
      const notifSettings = localStorage.getItem('notificationSettings');
      
      // Check for service worker registration
      const swRegistered = 'serviceWorker' in navigator;
      
      return JSON.stringify({
        notificationPermission: hasPermission,
        hasServiceWorker: swRegistered,
        notifSettings: notifSettings ? 'set' : 'not set',
        fcmToken: localStorage.getItem('fcm_token') || 'none'
      });
    })()
  `);
  console.log('Notifications:', notifResult);

  // Take a screenshot of the final state
  console.log('\n=== TESTS COMPLETE ===');
}

main().catch(console.error);
