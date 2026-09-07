// Direct navigation test - open self-chat and test all features
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

  console.log('=== DIRECT NAVIGATION & FEATURE TESTS ===\n');

  // ===== 1. Navigate to self-chat directly =====
  console.log('--- 1. Navigate to Self-Chat ---');
  
  const convId = '6a9afc55b59765bc43aa7b77';
  
  // First, get auth info
  const authToken = await val(wsUrl, `localStorage.getItem('auth_token') || localStorage.getItem('token')`);
  console.log('Auth token exists:', !!authToken);
  
  // Create self-conversation via API if needed
  const createConv = await val(wsUrl, `
    (async () => {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const meRes = await fetch('http://10.0.2.2:5000/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const me = await meRes.json();
      const userId = me.user?._id;
      if (!userId) return 'Could not get user ID: ' + JSON.stringify(me).substring(0, 200);
      
      const convRes = await fetch('http://10.0.2.2:5000/api/chat/conversation', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const conv = await convRes.json();
      const id = conv.conversation?._id || conv.data?.conversation?._id;
      return id || 'No conversation ID: ' + JSON.stringify(conv).substring(0, 200);
    })()
  `);
  console.log('Conversation ID:', createConv);
  
  const conversationId = createConv?.includes('6a9af') ? createConv : convId;
  
  // Navigate via React Router
  await val(wsUrl, `
    (async () => {
      // Use React Router's navigate
      const event = new CustomEvent('open-chat', { detail: { conversationId: '${conversationId}' } });
      window.dispatchEvent(event);
      
      // Also try direct navigation
      window.history.pushState({}, '', '/chat');
      
      return 'Dispatched open-chat event';
    })()
  `);
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Check the sidebar for the conversation and click it
  const clickConv = await val(wsUrl, `
    (async () => {
      // Find the conversation in the sidebar
      const sidebarItems = document.querySelectorAll('[class*="cursor-pointer"], [role="button"], [class*="conversation"]');
      const selfChat = Array.from(sidebarItems).find(el => {
        const text = el.textContent?.trim();
        return text?.includes('You') || text?.includes('self') || text?.includes('Note');
      });
      
      if (selfChat) {
        selfChat.click();
        await new Promise(r => setTimeout(r, 3000));
        return 'Clicked self-chat in sidebar. URL: ' + location.href;
      }
      
      // Try clicking "Message" button
      const msgBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Message');
      if (msgBtn) {
        msgBtn.click();
        await new Promise(r => setTimeout(r, 3000));
        return 'Clicked Message button. URL: ' + location.href;
      }
      
      return 'Could not find conversation to click. Sidebar items: ' + Array.from(sidebarItems).slice(0, 10).map(e => e.textContent?.trim()?.substring(0, 30)).filter(Boolean).join(' | ');
    })()
  `);
  console.log('Click result:', clickConv?.substring(0, 200));
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Check if we're now in a chat
  const chatState = await val(wsUrl, `
    (async () => {
      const url = location.href;
      const textarea = document.querySelector('textarea');
      const textInput = document.querySelector('input[type="text"][placeholder*="Type"], input[type="text"][placeholder*="type"], input[type="text"][placeholder*="message"]');
      
      // Check for any visible input near the bottom of the page
      const allInputs = document.querySelectorAll('input[type="text"], textarea');
      const bottomInputs = Array.from(allInputs).filter(i => {
        const rect = i.getBoundingClientRect();
        return rect.bottom > window.innerHeight - 250;
      });
      
      return JSON.stringify({
        url,
        hasTextarea: !!textarea,
        hasTextInput: !!textInput,
        bottomInputCount: bottomInputs.length,
        bottomInputDetails: bottomInputs.map(i => ({
          placeholder: i.placeholder,
          type: i.type,
          visible: i.offsetHeight > 0,
          rect: i.getBoundingClientRect()
        })),
        bodyText: document.body?.innerText?.substring(0, 500)
      });
    })()
  `);
  console.log('Chat state:', chatState?.substring(0, 600));

  // If we're still not in chat, try clicking the conversation from the sidebar
  const forceOpen = await val(wsUrl, `
    (async () => {
      // Wait and try again
      await new Promise(r => setTimeout(r, 1000));
      
      // Look for all clickable elements in the sidebar
      const allClickable = document.querySelectorAll('div[class*="cursor-pointer"], div[class*="hover"], li[class*="cursor"]');
      const convItems = Array.from(allClickable).filter(el => {
        const text = el.textContent || '';
        return text.includes('You') || text.includes('self') || text.includes('bufftest');
      });
      
      if (convItems.length > 0) {
        convItems[0].click();
        await new Promise(r => setTimeout(r, 3000));
        
        // Check again
        const textarea2 = document.querySelector('textarea');
        const input2 = document.querySelector('input[placeholder*="Type"], input[placeholder*="type"]');
        return JSON.stringify({
          clicked: true,
          text: convItems[0].textContent?.substring(0, 30),
          hasTextarea: !!textarea2,
          hasInput: !!input2,
          url: location.href,
          bodyText: document.body?.innerText?.substring(0, 300)
        });
      }
      
      // Last resort: check all divs
      const allDivs = document.querySelectorAll('div');
      const youDiv = Array.from(allDivs).find(d => {
        return d.textContent?.trim() === 'You' && d.offsetWidth > 0;
      });
      
      return JSON.stringify({
        clicked: false,
        convItems: convItems.length,
        youDivFound: !!youDiv,
        youDivParent: youDiv?.parentElement?.textContent?.substring(0, 50)
      });
    })()
  `);
  console.log('Force open:', forceOpen?.substring(0, 500));

  // ===== 2. Test typing and message sending if in chat =====
  console.log('\n--- 2. Typing & Sending (if in chat) ---');
  
  const typeAndSend = await val(wsUrl, `
    (async () => {
      const textarea = document.querySelector('textarea');
      const input = document.querySelector('input[type="text"]');
      
      // Find any input that looks like a message composer
      const composer = textarea || Array.from(document.querySelectorAll('input[type="text"]')).find(i => {
        const ph = i.placeholder?.toLowerCase() || '';
        return ph.includes('type') || ph.includes('message') || ph.includes('send');
      });
      
      if (!composer) {
        return JSON.stringify({ 
          error: 'No composer found',
          url: location.href,
          bodyText: document.body?.innerText?.substring(0, 500)
        });
      }
      
      // Type message
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set 
        || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(composer, 'Test message from Buffy!');
        composer.dispatchEvent(new Event('input', { bubbles: true }));
        composer.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      await new Promise(r => setTimeout(r, 500));
      
      // Check for send button
      const sendBtn = document.querySelector('button[aria-label="Send message"]');
      
      return JSON.stringify({
        typed: true,
        inputValue: composer.value || composer.textContent,
        sendBtnFound: !!sendBtn,
        sendBtnDisabled: sendBtn?.disabled
      });
    })()
  `);
  console.log('Type & Send:', typeAndSend?.substring(0, 400));

  // ===== 3. Test Winga post form =====
  console.log('\n--- 3. Winga Post Form ---');
  await val(wsUrl, `window.location.href = '/winga'`);
  await new Promise(r => setTimeout(r, 3000));
  
  const wingaForm = await val(wsUrl, `
    (async () => {
      // Click Post button
      const postBtn = Array.from(document.querySelectorAll('button, [role="button"]')).find(b => b.textContent?.trim() === 'Post');
      if (postBtn) {
        postBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        
        // Get form details
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
        const formFields = inputs.filter(i => i.offsetHeight > 0).map(i => ({
          type: i.type || i.tagName,
          placeholder: i.placeholder || '',
          name: i.name || '',
          id: i.id || '',
          label: i.getAttribute('aria-label') || ''
        }));
        
        // Check for image upload
        const fileInputs = document.querySelectorAll('input[type="file"]');
        const fileAccepts = Array.from(fileInputs).map(f => f.accept);
        
        return JSON.stringify({
          formOpened: true,
          visibleFields: formFields,
          fileInputs: fileAccepts,
          pageText: document.body?.innerText?.substring(0, 600)
        });
      }
      
      return 'Post button not found';
    })()
  `);
  console.log('Winga form:', wingaForm?.substring(0, 600));

  // ===== 4. Test Security Settings =====
  console.log('\n--- 4. Security Settings Full ---');
  await val(wsUrl, `window.location.href = '/settings/security'`);
  await new Promise(r => setTimeout(r, 3000));
  
  const secFull = await val(wsUrl, `document.body?.innerText?.substring(0, 2000)`);
  console.log('Security full:', secFull?.substring(0, 800));

  // ===== 5. Test Privacy Settings for App Lock =====
  console.log('\n--- 5. Privacy Settings (App Lock) ---');
  await val(wsUrl, `window.location.href = '/settings'`);
  await new Promise(r => setTimeout(r, 2000));
  
  const privacyNav = await val(wsUrl, `
    (async () => {
      const links = document.querySelectorAll('button, a, [role="tab"]');
      const privacyLink = Array.from(links).find(l => l.textContent?.trim() === 'Privacy');
      if (privacyLink) {
        privacyLink.click();
        await new Promise(r => setTimeout(r, 2000));
        return 'Privacy page: ' + document.body?.innerText?.substring(0, 1200);
      }
      
      // Check all navigation items
      const navItems = Array.from(links).map(l => l.textContent?.trim()).filter(Boolean);
      return 'Privacy not found. Nav items: ' + navItems.join(' | ');
    })()
  `);
  console.log('Privacy:', privacyNav?.substring(0, 600));

  console.log('\n=== ALL TESTS COMPLETE ===');
}

main().catch(console.error);
