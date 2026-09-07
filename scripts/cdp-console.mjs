// Capture console output while clicking conversation
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

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  const wsUrl = page.webSocketDebuggerUrl;
  
  const ws = new WebSocket(wsUrl);
  const consoleLogs = [];
  
  await new Promise(resolve => { ws.onopen = resolve; });
  
  // Enable console
  let msgId = 0;
  function send(method, params = {}) {
    const id = ++msgId;
    ws.send(JSON.stringify({ id, method, params }));
    return id;
  }
  
  send('Console.enable');
  send('Runtime.enable');
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params?.args?.map(a => a.value || a.description || '').join(' ');
      if (text.includes('ChatContext') || text.includes('selectConversation') || text.includes('[chat]')) {
        consoleLogs.push(text);
      }
    }
  };
  
  // Click conversation
  const clickId = send('Runtime.evaluate', {
    expression: `
      (async () => {
        const h3 = Array.from(document.querySelectorAll('h3')).find(h => h.textContent?.trim() === 'You');
        if (h3) {
          const clickTarget = h3.closest('[class*="cursor-pointer"]') || h3.parentElement?.parentElement;
          if (clickTarget) {
            clickTarget.click();
            await new Promise(r => setTimeout(r, 4000));
            return 'Clicked. URL: ' + location.href + ' | textarea: ' + !!document.querySelector('textarea') + ' | sendBtn: ' + !!document.querySelector('button[aria-label="Send message"]');
          }
        }
        return 'H3 not found';
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });
  
  // Wait for click result
  await new Promise((resolve) => {
    const checkResult = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === clickId) {
        ws.removeEventListener('message', checkResult);
        resolve(msg);
      }
    };
    ws.addEventListener('message', checkResult);
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Console logs after click:');
  consoleLogs.forEach(log => console.log('  ', log));
  
  if (consoleLogs.length === 0) {
    console.log('  (no ChatContext logs captured)');
  }
  
  ws.close();
}

main().catch(console.error);
