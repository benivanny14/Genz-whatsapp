const http = require('http');
const { WebSocket } = require('ws');

const CDP_PORT = 9222;

function getTargets() {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${CDP_PORT}/json/list`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function cdpExec(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: msgId++, method: 'Runtime.enable' }));
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: msgId++,
          method: 'Runtime.evaluate',
          params: { expression, awaitPromise: true, returnByValue: true }
        }));
      }, 200);
    });
    
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id === 2 && msg.result) {
        const val = msg.result.result?.value;
        resolve(val);
        ws.close();
      }
    });
    
    ws.on('error', reject);
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout')); }, 15000);
  });
}

async function main() {
  const targets = await getTargets();
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page found'); process.exit(1); }
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('Connected to:', page.url);

  // Step 1: Check page state
  const pageState = await cdpExec(wsUrl, `
    JSON.stringify({
      url: location.href,
      title: document.title,
      bodyText: document.body?.innerText?.substring(0, 300),
      inputCount: document.querySelectorAll('input').length,
      buttonCount: document.querySelectorAll('button').length,
    })
  `);
  console.log('\n=== PAGE STATE ===');
  console.log(pageState);

  // Step 2: Inject auth token to skip login
  console.log('\n=== LOGGING IN VIA TOKEN INJECTION ===');
  const loginResult = await cdpExec(wsUrl, `
    (async () => {
      try {
        // Fetch token from backend
        const res = await fetch('https://genz-whatsapp-1.onrender.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'testuser1', password: 'TestPass123!@#' })
        });
        const data = await res.json();
        if (!data.success) return JSON.stringify({ error: data.message });
        
        // Store in localStorage
        localStorage.setItem('genz_token', data.token);
        localStorage.setItem('genz_refresh_token', data.refreshToken);
        localStorage.setItem('genz_user', JSON.stringify(data.user));
        
        // Navigate to chat
        window.location.href = '/chat';
        return JSON.stringify({ success: true, user: data.user?.username });
      } catch(e) {
        return JSON.stringify({ error: e.message });
      }
    })()
  `);
  console.log('Login result:', loginResult);

  // Wait for navigation
  await new Promise(r => setTimeout(r, 5000));

  // Step 3: Check new page state
  const afterLogin = await cdpExec(wsUrl, `
    JSON.stringify({
      url: location.href,
      title: document.title,
      bodyText: document.body?.innerText?.substring(0, 500),
    })
  `);
  console.log('\n=== AFTER LOGIN ===');
  console.log(afterLogin);

  process.exit(0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
