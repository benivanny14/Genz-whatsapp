// Debug why chat area doesn't render textarea
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
      consoleLogs.push(text);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleLogs.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails));
    }
  };
  
  // Navigate to chat and click conversation
  send('Runtime.evaluate', {
    expression: `
      (async () => {
        window.location.href = '/chat';
        await new Promise(r => setTimeout(r, 3000));
        
        // Click on "You" conversation
        const h3 = Array.from(document.querySelectorAll('h3')).find(h => h.textContent?.trim() === 'You');
        if (h3) {
          const clickTarget = h3.closest('[class*="cursor-pointer"]') || h3.parentElement?.parentElement;
          if (clickTarget) {
            clickTarget.click();
            await new Promise(r => setTimeout(r, 5000));
          }
        }
        
        // Now check the DOM structure
        const textarea = document.querySelector('textarea');
        const input = document.querySelector('input[type="text"]');
        const sendBtn = document.querySelector('button[aria-label="Send message"]');
        
        // Check chat area div
        const chatAreaDivs = document.querySelectorAll('[class*="flex-1"]');
        const visiblePanels = Array.from(chatAreaDivs).filter(d => d.offsetWidth > 0 && d.offsetWidth > 300);
        
        // Get full DOM structure of the chat container
        const genzShell = document.querySelector('.genz-shell');
        
        return JSON.stringify({
          textarea: !!textarea,
          input: !!input,
          sendBtn: !!sendBtn,
          url: location.href,
          visiblePanels: visiblePanels.length,
          shellChildren: genzShell ? Array.from(genzShell.children).map(c => ({
            classes: c.className?.substring(0, 80),
            visible: c.offsetWidth > 0,
            width: c.offsetWidth,
            childCount: c.children.length
          })) : [],
          bodyText: document.body?.innerText?.substring(0, 500)
        });
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });
  
  // Wait for result
  await new Promise((resolve) => {
    const checkResult = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === msgId) {
        ws.removeEventListener('message', checkResult);
        console.log('DOM structure:', msg.result?.value);
        resolve();
      }
    };
    ws.addEventListener('message', checkResult);
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Print all console logs (errors and warnings)
  console.log('\nConsole logs:');
  consoleLogs.filter(l => l.includes('error') || l.includes('Error') || l.includes('warn') || l.includes('ChatContext') || l.includes('ChatArea') || l.includes('exception')).forEach(log => console.log('  ', log.substring(0, 200)));
  
  ws.close();
}

main().catch(console.error);
