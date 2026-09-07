// Quick check: navigate to chat, click conversation, check DOM
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

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  const wsUrl = page.webSocketDebuggerUrl;

  // Navigate to chat
  await cdpEval(wsUrl, `window.location.href = '/chat'`);
  await new Promise(r => setTimeout(r, 3000));

  // Click conversation
  await cdpEval(wsUrl, `
    (async () => {
      const h3 = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.trim() === 'You');
      if (h3) {
        const btn = h3.closest('button');
        if (btn) btn.click();
      }
      return 'clicked';
    })()
  `);
  
  await new Promise(r => setTimeout(r, 5000));

  // Check DOM state
  const result = await cdpEval(wsUrl, `
    (async () => {
      const shell = document.querySelector('.genz-shell');
      const children = shell ? Array.from(shell.children) : [];
      
      return JSON.stringify({
        url: location.href,
        shellExists: !!shell,
        shellChildCount: children.length,
        shellChildren: children.map(c => ({
          classes: c.className?.substring(0, 100),
          visible: c.offsetWidth > 0,
          width: c.offsetWidth,
          height: c.offsetHeight,
          display: getComputedStyle(c).display,
          text: c.innerText?.substring(0, 100)
        })),
        textarea: !!document.querySelector('textarea'),
        sendBtn: !!document.querySelector('[aria-label="Send message"]'),
        bodyText: document.body?.innerText?.substring(0, 300)
      }, null, 2);
    })()
  `);
  
  console.log(result?.value);
}

main().catch(console.error);
