// Full test of all status features - with proper login
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

let wsId = 0;
function cdpEval(wsUrl, expr) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const myId = ++wsId;
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: myId,
        method: 'Runtime.evaluate',
        params: { expression: expr, awaitPromise: true, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === myId) {
        ws.close();
        resolve(msg.result?.result?.value ?? msg.result);
      }
    };
    ws.onerror = (e) => reject(e);
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout')); }, 25000);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page target'); process.exit(1); }
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('Connected:', page.url);

  // 1. Login with username (not phone)
  let result = await cdpEval(wsUrl, 'location.href');
  
  if (result.includes('login')) {
    console.log('\n=== LOGGING IN ===');
    result = await cdpEval(wsUrl, `
      (async () => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        const inputs = [...document.querySelectorAll('input')];
        // The first text input is phone, we need to find it
        const phoneInput = inputs.find(i => i.placeholder?.includes('Phone') || i.placeholder?.includes('username'));
        const passInput = inputs.find(i => i.type === 'password');
        
        if (!phoneInput || !passInput) return 'FIELDS_NOT_FOUND: ' + inputs.map(i => i.type + ':' + i.placeholder).join(' | ');
        
        // Set username value
        setter.call(phoneInput, 'bufftest1');
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        setter.call(passInput, 'TestPass123!@#');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        await new Promise(r => setTimeout(r, 500));
        
        const btns = [...document.querySelectorAll('button')];
        const loginBtn = btns.find(b => b.textContent?.trim() === 'Login');
        if (loginBtn) { loginBtn.click(); return 'LOGIN_CLICKED'; }
        return 'NO_LOGIN_BTN: ' + btns.map(b => b.textContent?.trim()).join(', ');
      })()
    `);
    console.log('Login:', result);
    
    // Wait for login to complete
    await sleep(7000);
    result = await cdpEval(wsUrl, 'location.href');
    console.log('After login URL:', result);
    
    if (result.includes('login')) {
      // Check for error messages
      const errorText = await cdpEval(wsUrl, `document.body?.innerText?.substring(0, 500)`);
      console.log('Still on login. Page text:', errorText);
      console.log('\nLogin failed - continuing anyway to check UI...');
    }
  }

  // Navigate to status
  console.log('\n=== NAVIGATING TO STATUS ===');
  await cdpEval(wsUrl, `window.location.hash = '/status'`);
  await sleep(3000);
  
  result = await cdpEval(wsUrl, 'location.href');
  console.log('URL:', result);
  
  const bodyText = await cdpEval(wsUrl, `document.body?.innerText?.substring(0, 600)`);
  console.log('Body:', bodyText);

  // Look for create status button
  console.log('\n=== FINDING CREATE STATUS BUTTON ===');
  result = await cdpEval(wsUrl, `
    (() => {
      // Check all interactive elements
      const all = [...document.querySelectorAll('button, a, [role="button"], [onclick]')];
      const withIcons = all.filter(el => el.querySelector('svg, img, [class*="icon"]'));
      const statusRelated = all.filter(el => {
        const t = (el.textContent || '').toLowerCase();
        return t.includes('status') || t.includes('create') || t.includes('new');
      });
      
      return 'Total: ' + all.length + ' | With icons: ' + withIcons.length + ' | Status related: ' + statusRelated.length +
        '\\nAll buttons: ' + all.slice(0, 20).map(b => (b.textContent || '').trim().substring(0, 25) + ' [' + (b.className || '').substring(0, 25) + ']').join('\\n');
    })()
  `);
  console.log(result);

  // Check if there are console errors
  result = await cdpEval(wsUrl, `
    (() => {
      // Check for React errors
      const errorBoundary = document.querySelector('.error-boundary, [data-reactroot] [data-error]');
      const hasReact = !!document.querySelector('[data-reactroot], #root, #app');
      return 'React: ' + hasReact + ' | ErrorBoundary: ' + !!errorBoundary + ' | URL: ' + location.href;
    })()
  `);
  console.log('React check:', result);

  // Try to find the StatusList component
  result = await cdpEval(wsUrl, `
    (() => {
      // Check if StatusList rendered
      const statusList = document.querySelector('.status-list, [class*="status-list"], [class*="StatusList"]');
      const statusTray = document.querySelector('[class*="status-tray"], [class*="StatusTray"]');
      const myStatus = document.querySelector('[class*="my-status"], [class*="MyStatus"]');
      
      return 'StatusList: ' + (statusList ? statusList.className : 'none') +
        ' | StatusTray: ' + (statusTray ? statusTray.className : 'none') +
        ' | MyStatus: ' + (myStatus ? myStatus.className : 'none');
    })()
  `);
  console.log('Status components:', result);

  console.log('\n=== TEST COMPLETE ===');
}

main().catch(e => console.error('FATAL:', e.message));
