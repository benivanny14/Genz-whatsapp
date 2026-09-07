// CDP login script for Genz Messenger on Android emulator
// Uses Node.js 22 built-in WebSocket
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
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout')); }, 15000);
  });
}

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page target'); process.exit(1); }
  
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('Connected to:', page.title, '| URL:', page.url);

  // Step 1: Fill and submit login form
  const loginRes = await cdpEval(wsUrl, `
    (async () => {
      const inputs = document.querySelectorAll('input');
      const usernameInput = Array.from(inputs).find(i => i.type === 'text');
      const passwordInput = Array.from(inputs).find(i => i.type === 'password');
      
      if (!usernameInput || !passwordInput) return 'Fields not found: ' + inputs.length;
      
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      
      setter.call(usernameInput, 'bufftest1');
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      setter.call(passwordInput, 'TestPass123!@#');
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      await new Promise(r => setTimeout(r, 500));
      
      const buttons = document.querySelectorAll('button');
      const loginBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Login');
      if (loginBtn) { loginBtn.click(); return 'Login clicked!'; }
      return 'No login button found. Buttons: ' + Array.from(buttons).map(b => b.textContent).join(', ');
    })()
  `);
  console.log('Login:', JSON.stringify(loginRes));

  // Wait for navigation
  await new Promise(r => setTimeout(r, 5000));

  // Step 2: Check state after login
  const state = await cdpEval(wsUrl, `location.href + ' | ' + document.body?.innerText?.substring(0, 500)`);
  console.log('After login:', JSON.stringify(state));
}

main().catch(console.error);
