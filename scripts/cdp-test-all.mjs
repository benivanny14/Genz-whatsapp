// Comprehensive test script for Genz Messenger APK
// Tests all requested features via Chrome DevTools Protocol
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

function cdpEvalRaw(wsUrl, expr) {
  return cdpEval(wsUrl, expr).then(r => r?.value ?? JSON.stringify(r));
}

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page target'); process.exit(1); }
  
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('=== GENZ MESSENGER COMPREHENSIVE TEST ===\n');

  // Test 1: Check current state
  console.log('--- TEST 0: Current App State ---');
  const appState = await cdpEvalRaw(wsUrl, `location.href`);
  console.log('URL:', appState);

  // Test 2: Navigate to Status page
  console.log('\n--- TEST 1: Status Posting ---');
  const statusNav = await cdpEvalRaw(wsUrl, `
    (async () => {
      // Click Status tab in bottom nav
      const navItems = document.querySelectorAll('[class*="nav"], [class*="tab"], a, button');
      const statusBtn = Array.from(navItems).find(el => el.textContent?.trim() === 'Status');
      if (statusBtn) { statusBtn.click(); return 'Clicked Status tab'; }
      
      // Try clicking by href
      const links = document.querySelectorAll('a[href*="status"]');
      if (links.length) { links[0].click(); return 'Clicked status link'; }
      
      return 'Status tab not found. Nav items: ' + Array.from(navItems).slice(0, 10).map(n => n.textContent?.trim()).join(', ');
    })()
  `);
  console.log('Navigation:', statusNav);
  
  await new Promise(r => setTimeout(r, 2000));
  
  const statusPageState = await cdpEvalRaw(wsUrl, `location.href + ' | ' + document.body?.innerText?.substring(0, 400)`);
  console.log('Status page:', statusPageState.substring(0, 300));

  // Test 3: Check Status posting UI
  const statusUI = await cdpEvalRaw(wsUrl, `
    (async () => {
      // Look for create status button or UI
      const allButtons = document.querySelectorAll('button, [role="button"]');
      const buttonTexts = Array.from(allButtons).map(b => b.textContent?.trim() || b.getAttribute('aria-label') || b.getAttribute('title') || 'unnamed').filter(Boolean);
      return 'Status page buttons: ' + buttonTexts.join(' | ');
    })()
  `);
  console.log('Status UI:', statusUI);

  // Test 4: Navigate to Chat
  console.log('\n--- TEST 2: Chat Page ---');
  const chatNav = await cdpEvalRaw(wsUrl, `
    (async () => {
      const navItems = document.querySelectorAll('[class*="nav"], [class*="tab"], a, button');
      const chatBtn = Array.from(navItems).find(el => el.textContent?.trim() === 'Chats');
      if (chatBtn) { chatBtn.click(); return 'Clicked Chats tab'; }
      window.location.href = '/chat';
      return 'Navigating to /chat';
    })()
  `);
  console.log('Navigation:', chatNav);
  
  await new Promise(r => setTimeout(r, 2000));

  // Test 5: Check for "more actions" menu in message composer
  console.log('\n--- TEST 3: Message Composer & More Actions Menu ---');
  
  // First, try to start a new chat
  const newChatBtn = await cdpEvalRaw(wsUrl, `
    (async () => {
      // Look for new chat button (usually a + or "New" button)
      const allBtns = document.querySelectorAll('button, [role="button"], a');
      const newChat = Array.from(allBtns).find(b => 
        b.textContent?.includes('New') || 
        b.getAttribute('aria-label')?.includes('new') ||
        b.textContent?.includes('+')
      );
      if (newChat) { newChat.click(); return 'Clicked new chat: ' + (newChat.textContent?.trim() || newChat.getAttribute('aria-label')); }
      return 'New chat button not found. Available: ' + Array.from(allBtns).slice(0, 15).map(b => (b.textContent?.trim() || b.getAttribute('aria-label') || '').substring(0, 30)).join(' | ');
    })()
  `);
  console.log('New chat:', newChatBtn);

  await new Promise(r => setTimeout(r, 2000));

  // Check what page we're on now
  const currentPage = await cdpEvalRaw(wsUrl, `location.href + ' | ' + document.body?.innerText?.substring(0, 300)`);
  console.log('Current page:', currentPage.substring(0, 300));

  // Search for a user to chat with
  const searchResult = await cdpEvalRaw(wsUrl, `
    (async () => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input:not([type])');
      if (inputs.length === 0) return 'No search inputs found';
      
      const searchInput = inputs[0];
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(searchInput, 'bufftest2');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      await new Promise(r => setTimeout(r, 2000));
      
      // Check for search results
      const results = document.querySelectorAll('[class*="result"], [class*="user"], [class*="contact"]');
      return 'Search results: ' + results.length + ' | Page text: ' + document.body?.innerText?.substring(0, 300);
    })()
  `);
  console.log('Search:', searchResult?.substring?.(0, 300));

  // Test 6: Check Winga (product upload) feature
  console.log('\n--- TEST 4: Winga (Product Upload) ---');
  const wingaNav = await cdpEvalRaw(wsUrl, `
    (async () => {
      window.location.href = '/winga';
      return 'Navigating to /winga';
    })()
  `);
  console.log('Winga nav:', wingaNav);
  
  await new Promise(r => setTimeout(r, 3000));
  
  const wingaState = await cdpEvalRaw(wsUrl, `location.href + ' | ' + document.body?.innerText?.substring(0, 500)`);
  console.log('Winga page:', wingaState.substring(0, 400));

  // Test 7: Check App Lock settings
  console.log('\n--- TEST 5: App Lock Settings ---');
  const appLockNav = await cdpEvalRaw(wsUrl, `
    (async () => {
      window.location.href = '/settings';
      return 'Navigating to /settings';
    })()
  `);
  
  await new Promise(r => setTimeout(r, 3000));
  
  const settingsState = await cdpEvalRaw(wsUrl, `document.body?.innerText?.substring(0, 800)`);
  console.log('Settings page:', settingsState?.substring(0, 500));

  // Test 8: Check Security settings
  console.log('\n--- TEST 6: Security Settings ---');
  const secNav = await cdpEvalRaw(wsUrl, `
    (async () => {
      window.location.href = '/settings/security';
      return 'Navigating to security';
    })()
  `);
  
  await new Promise(r => setTimeout(r, 3000));
  
  const secState = await cdpEvalRaw(wsUrl, `document.body?.innerText?.substring(0, 800)`);
  console.log('Security page:', secState?.substring(0, 500));

  console.log('\n=== END OF TESTS ===');
}

main().catch(console.error);
