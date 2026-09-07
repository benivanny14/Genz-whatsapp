// Debug the API calls via CDP
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
      if (msg.id === myId) { ws.close(); resolve(msg); }
    };
    ws.onerror = (e) => reject(e);
    setTimeout(() => { ws.close(); reject(new Error('timeout')); }, 15000);
  });
}

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  const wsUrl = page.webSocketDebuggerUrl;

  // Test 1: Check token
  let r = await cdpEval(wsUrl, `localStorage.getItem('authToken') || localStorage.getItem('token') || 'NONE'`);
  console.log('Token check:', r.result?.result);

  // Test 2: Simple API call
  r = await cdpEval(wsUrl, `
    (async () => {
      const t = localStorage.getItem('authToken') || localStorage.getItem('token');
      const res = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + t } });
      const data = await res.json();
      return JSON.stringify({ status: res.status, success: data.success, username: data.user?.username });
    })()
  `);
  console.log('Auth/me check:', r.result?.result);

  // Test 3: Check status endpoint
  r = await cdpEval(wsUrl, `
    (async () => {
      const t = localStorage.getItem('authToken') || localStorage.getItem('token');
      const res = await fetch('/api/status', { headers: { Authorization: 'Bearer ' + t } });
      const data = await res.json();
      return JSON.stringify({ status: res.status, count: data.statuses?.length, success: data.success });
    })()
  `);
  console.log('Status check:', r.result?.result);

  // Test 4: Try to create a simple text status
  r = await cdpEval(wsUrl, `
    (async () => {
      const t = localStorage.getItem('authToken') || localStorage.getItem('token');
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
        body: JSON.stringify({
          type: 'text',
          content: 'Quick text status test',
          textStatus: { text: 'Quick text status test', backgroundColor: '#128C7E', fontColor: '#FFFFFF', fontStyle: 'sans' },
          privacy: 'contacts',
          replySettings: 'everyone',
          quality: 'standard',
          statusDuration: 24
        })
      });
      const data = await res.json();
      return JSON.stringify({ status: res.status, success: data.success, id: data.status?._id, error: data.message || data.error });
    })()
  `);
  console.log('Text status create:', r.result?.result);

  // Test 5: Try upload endpoint
  r = await cdpEval(wsUrl, `
    (async () => {
      const t = localStorage.getItem('authToken') || localStorage.getItem('token');
      // Create a tiny image
      const c = document.createElement('canvas');
      c.width = 100; c.height = 100;
      const x = c.getContext('2d');
      x.fillStyle = 'red';
      x.fillRect(0, 0, 100, 100);
      const b = await new Promise(r => c.toBlob(r, 'image/png'));
      
      const fd = new FormData();
      fd.append('file', b, 'test.png');
      
      const res = await fetch('/api/status/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + t },
        body: fd
      });
      const data = await res.json();
      return JSON.stringify({ status: res.status, success: data.success, fileUrl: data.fileUrl?.substring(0, 60), error: data.message || data.error });
    })()
  `);
  console.log('Upload check:', r.result?.result);
}

main().catch(e => console.error('FATAL:', e.message));
