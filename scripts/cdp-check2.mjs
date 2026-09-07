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
    ws.onerror = reject;
    setTimeout(() => { ws.close(); reject(new Error('timeout')); }, 30000);
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

  // Check the current state
  const state = await val(wsUrl, `
    (async () => {
      await new Promise(r => setTimeout(r, 1000));
      
      const shell = document.querySelector('.genz-shell');
      if (!shell) return 'No genz-shell found';
      
      const children = Array.from(shell.children);
      
      return JSON.stringify({
        childCount: children.length,
        children: children.map(c => ({
          tag: c.tagName,
          classes: c.className?.substring(0, 100),
          visible: c.offsetWidth > 0,
          width: c.offsetWidth,
          display: getComputedStyle(c).display,
          childCount: c.children.length
        })),
        textarea: !!document.querySelector('textarea'),
        sendBtn: !!document.querySelector('[aria-label="Send message"]'),
        spinners: document.querySelectorAll('.animate-spin').length
      }, null, 2);
    })()
  `);
  
  console.log(state);
}

main().catch(console.error);
