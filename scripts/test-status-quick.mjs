// Quick CDP test to login and check status page
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
      if (msg.id === 1) {
        ws.close();
        const val = msg.result?.result?.value ?? msg.result;
        resolve(val);
      }
    };
    ws.onerror = (e) => reject(e);
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout')); }, 20000);
  });
}

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page target'); process.exit(1); }
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('Page:', page.title, '| URL:', page.url);

  // Check current state
  let result = await cdpEval(wsUrl, `document.title + ' | ' + location.href`);
  console.log('State:', result);

  // Check what's on the page
  result = await cdpEval(wsUrl, `document.body?.innerText?.substring(0, 500) || 'no body'`);
  console.log('Body text:', result);

  // Check if we need to login
  if (page.url.includes('login')) {
    console.log('\n=== Logging in ===');
    result = await cdpEval(wsUrl, `
      (async () => {
        const inputs = document.querySelectorAll('input');
        const info = Array.from(inputs).map(i => i.type + ':' + i.placeholder).join(' | ');
        
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        
        const textInput = Array.from(inputs).find(i => i.type === 'text' && i.placeholder?.toLowerCase().includes('user'));
        const passInput = Array.from(inputs).find(i => i.type === 'password');
        
        if (textInput && passInput) {
          setter.call(textInput, 'bufftest1');
          textInput.dispatchEvent(new Event('input', { bubbles: true }));
          setter.call(passInput, 'TestPass123!@#');
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise(r => setTimeout(r, 500));
          
          const btns = document.querySelectorAll('button');
          const loginBtn = Array.from(btns).find(b => b.textContent?.trim().toLowerCase() === 'login');
          if (loginBtn) { loginBtn.click(); return 'Login clicked! Inputs: ' + info; }
          return 'No login btn. Inputs: ' + info + ' | Btns: ' + Array.from(btns).map(b => b.textContent?.trim()).join(', ');
        }
        return 'Fields not found: ' + info;
      })()
    `);
    console.log('Login:', result);
    
    // Wait for navigation
    await new Promise(r => setTimeout(r, 6000));
    
    result = await cdpEval(wsUrl, `location.href`);
    console.log('After login URL:', result);
  }

  // Navigate to status
  console.log('\n=== Navigate to Status ===');
  result = await cdpEval(wsUrl, `
    (() => {
      // Try hash navigation
      window.location.hash = '/status';
      return 'Navigated to #/status. Current: ' + location.href;
    })()
  `);
  console.log('Nav:', result);
  await new Promise(r => setTimeout(r, 3000));

  // Check status page
  result = await cdpEval(wsUrl, `document.body?.innerText?.substring(0, 600)`);
  console.log('Status page text:', result);

  // Look for create status button
  console.log('\n=== Find Create Status Button ===');
  result = await cdpEval(wsUrl, `
    (() => {
      const allBtns = document.querySelectorAll('button, [role="button"], a, label');
      const relevant = Array.from(allBtns).filter(b => {
        const t = b.textContent?.toLowerCase() || '';
        const c = b.className?.toLowerCase() || '';
        return t.includes('create') || t.includes('status') || c.includes('fab') || c.includes('create') || c.includes('camera');
      });
      return 'Found ' + relevant.length + ' create buttons: ' + relevant.map(b => b.textContent?.trim().substring(0, 40) + ' | cls:' + (b.className || '').substring(0, 40)).join('\\n');
    })()
  `);
  console.log('Create buttons:', result);

  // Check for any visible errors
  result = await cdpEval(wsUrl, `
    (() => {
      const errBoundary = document.querySelector('.error-boundary, [data-error], .crash');
      const consoleErrors = window.__consoleErrors || [];
      return 'Error boundary: ' + (errBoundary ? errBoundary.innerText : 'none') + ' | URL: ' + location.href;
    })()
  `);
  console.log('Errors:', result);
}

main().catch(e => console.error('FATAL:', e.message));
