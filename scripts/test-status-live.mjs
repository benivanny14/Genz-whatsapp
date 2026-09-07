// Live test script for Status posting features on Android emulator via CDP
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
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout')); }, 20000);
  });
}

async function getWsUrl() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  if (!page) throw new Error('No page target found');
  return page.webSocketDebuggerUrl;
}

async function login(wsUrl) {
  console.log('\n=== Step 1: Login ===');
  const res = await cdpEval(wsUrl, `
    (async () => {
      const inputs = document.querySelectorAll('input');
      const usernameInput = Array.from(inputs).find(i => i.placeholder?.toLowerCase().includes('user') || (i.type === 'text' && !i.placeholder?.toLowerCase().includes('phone')));
      const passwordInput = Array.from(inputs).find(i => i.type === 'password');
      
      if (!usernameInput || !passwordInput) return 'Login fields not found: ' + Array.from(inputs).map(i => i.placeholder + '/' + i.type).join(', ');
      
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(usernameInput, 'bufftest1');
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      setter.call(passwordInput, 'TestPass123!@#');
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      await new Promise(r => setTimeout(r, 500));
      
      const buttons = document.querySelectorAll('button');
      const loginBtn = Array.from(buttons).find(b => b.textContent?.trim().toLowerCase() === 'login');
      if (loginBtn) { loginBtn.click(); return 'Login clicked!'; }
      return 'No login button. Buttons: ' + Array.from(buttons).map(b => b.textContent?.trim()).join(' | ');
    })()
  `);
  console.log('Login result:', res?.value);
  return res;
}

async function getStatusPage(wsUrl) {
  console.log('\n=== Step 2: Navigate to Status page ===');
  const res = await cdpEval(wsUrl, `
    (async () => {
      // Click Status tab or navigate
      const links = document.querySelectorAll('[class*="nav"], [class*="tab"], a, button');
      const statusLink = Array.from(links).find(el => el.textContent?.trim().toLowerCase().includes('status') || el.textContent?.includes('📱'));
      if (statusLink) { statusLink.click(); return 'Clicked Status tab'; }
      
      // Try SPA navigation
      if (window.location.hash !== '#/status') {
        window.location.hash = '/status';
        return 'Navigated via hash to /status';
      }
      return 'Already on status or unknown state: ' + window.location.href;
    })()
  `);
  console.log('Nav result:', res?.value);
  await new Promise(r => setTimeout(r, 2000));
  return res;
}

async function testCreateStatusButton(wsUrl) {
  console.log('\n=== Step 3: Test Create Status Button ===');
  const res = await cdpEval(wsUrl, `
    (async () => {
      // Look for camera/FAB button to open status creator
      const buttons = document.querySelectorAll('button, [role="button"], .fab, [class*="create"], [class*="add"], [class*="fab"]');
      const createBtn = Array.from(buttons).find(b => {
        const text = b.textContent?.toLowerCase() || '';
        const cls = b.className?.toLowerCase() || '';
        return text.includes('create') || text.includes('status') || cls.includes('fab') || cls.includes('create') || cls.includes('add');
      });
      
      if (createBtn) { createBtn.click(); return 'Create status button clicked: ' + createBtn.className; }
      
      // Also check for SVG icons (camera/plus)
      const svgs = document.querySelectorAll('svg');
      return 'No create button found. Buttons: ' + Array.from(buttons).slice(0, 10).map(b => b.textContent?.trim().substring(0, 30) + ' | cls:' + b.className?.substring(0, 30)).join('\\n');
    })()
  `);
  console.log('Create status:', res?.value);
  await new Promise(r => setTimeout(r, 1000));
  return res;
}

async function testStatusModal(wsUrl) {
  console.log('\n=== Step 4: Check Status Create Modal ===');
  const res = await cdpEval(wsUrl, `
    (async () => {
      const overlay = document.querySelector('.create-status-overlay, [class*="create-status"], [class*="status-modal"]');
      if (!overlay) return 'No status modal found. Page HTML snippet: ' + document.body.innerHTML.substring(0, 800);
      
      const buttons = overlay.querySelectorAll('button, label, [class*="option"]');
      const options = Array.from(buttons).map(b => b.textContent?.trim()).filter(t => t && t.length < 30);
      return 'Status modal found! Options: ' + options.join(' | ');
    })()
  `);
  console.log('Modal check:', res?.value);
  return res;
}

async function checkConsoleErrors(wsUrl) {
  console.log('\n=== Check Console Errors ===');
  const res = await cdpEval(wsUrl, `
    (() => {
      // Check for any visible errors on page
      const errors = document.querySelectorAll('[class*="error"], .error-boundary, [role="alert"]');
      return 'Error elements: ' + errors.length + ' | URL: ' + location.href;
    })()
  `);
  console.log('Errors:', res?.value);
  return res;
}

async function main() {
  try {
    const wsUrl = await getWsUrl();
    console.log('Connected to CDP');
    
    // Check current state
    const state = await cdpEval(wsUrl, 'location.href');
    console.log('Current URL:', state?.value);
    
    // Login if needed
    if (state?.value?.includes('login')) {
      await login(wsUrl);
      await new Promise(r => setTimeout(r, 5000));
      
      // Check new URL
      const newState = await cdpEval(wsUrl, 'location.href');
      console.log('After login URL:', newState?.value);
    }
    
    // Navigate to status
    await getStatusPage(wsUrl);
    await new Promise(r => setTimeout(r, 2000));
    
    // Check console errors
    await checkConsoleErrors(wsUrl);
    
    // Try to open create status
    await testCreateStatusButton(wsUrl);
    await new Promise(r => setTimeout(r, 1000));
    
    // Check if modal opened
    await testStatusModal(wsUrl);
    
    console.log('\n=== Test Complete ===');
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

main();
