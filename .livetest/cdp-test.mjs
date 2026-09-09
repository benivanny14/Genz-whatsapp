import WebSocket from 'ws';

const CDP_URL = 'http://localhost:9222';

async function getTargets() {
  const res = await fetch(`${CDP_URL}/json/list`);
  return res.json();
}

async function connectAndRun(jsCode) {
  const targets = await getTargets();
  const page = targets.find(t => t.type === 'page' && t.url.includes('localhost'));
  if (!page) throw new Error('No page target found');
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    
    ws.on('open', () => {
      // Enable Runtime
      ws.send(JSON.stringify({ id: id++, method: 'Runtime.enable' }));
      // Execute JS
      ws.send(JSON.stringify({ 
        id: id++, 
        method: 'Runtime.evaluate', 
        params: { expression: jsCode, awaitPromise: true, returnByValue: true }
      }));
    });
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.id === 2 && msg.result) {
        resolve(msg.result.result?.value || msg.result);
        ws.close();
      }
      if (msg.error) {
        reject(new Error(msg.error.message));
        ws.close();
      }
    });
    
    ws.on('error', reject);
    setTimeout(() => { ws.close(); reject(new Error('Timeout')); }, 30000);
  });
}

// Test 1: Check current page state
console.log('=== Checking page state ===');
const state = await connectAndRun(`
  JSON.stringify({
    url: location.href,
    hasReactRoot: !!document.getElementById('root'),
    text: document.body?.innerText?.substring(0, 200),
    inputs: document.querySelectorAll('input').length,
    buttons: document.querySelectorAll('button').length
  })
`);
console.log('State:', state);

// Test 2: Check if there are input fields and what's on the page
console.log('\n=== Page elements ===');
const elements = await connectAndRun(`
  JSON.stringify({
    inputs: Array.from(document.querySelectorAll('input')).map(el => ({
      placeholder: el.placeholder,
      type: el.type,
      value: el.value
    })),
    buttons: Array.from(document.querySelectorAll('button')).map(el => ({
      text: el.textContent?.trim(),
      disabled: el.disabled
    }))
  })
`);
console.log('Elements:', elements);

ws.close?.();
process.exit(0);
