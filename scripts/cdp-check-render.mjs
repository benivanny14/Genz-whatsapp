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
  await new Promise(resolve => { ws.onopen = resolve; });
  
  let msgId = 0;
  function send(method, params = {}) {
    const id = ++msgId;
    ws.send(JSON.stringify({ id, method, params }));
    return id;
  }
  
  send('Runtime.enable');
  
  const result = await new Promise((resolve) => {
    const id = send('Runtime.evaluate', {
      expression: `
        (async () => {
          await new Promise(r => setTimeout(r, 1000));
          
          // Check genz-shell structure
          const shell = document.querySelector('.genz-shell');
          if (!shell) return JSON.stringify({ error: 'No genz-shell found' });
          
          const children = Array.from(shell.children);
          const structure = children.map(c => ({
            classes: c.className?.substring(0, 100),
            visible: c.offsetWidth > 0,
            width: c.offsetWidth,
            height: c.offsetHeight,
            display: getComputedStyle(c).display,
            childHTML: c.innerHTML?.substring(0, 200)
          }));
          
          // Check if ChatArea loaded
          const spinners = document.querySelectorAll('.animate-spin');
          const spinTexts = Array.from(spinners).map(s => s.parentElement?.textContent?.trim()?.substring(0, 30));
          
          // Check for React error boundaries
          const errorBoundaries = document.querySelectorAll('[class*="error"], [class*="Error"]');
          
          // Get all inputs and textareas
          const allInputs = Array.from(document.querySelectorAll('input, textarea, [contenteditable]')).map(i => ({
            tag: i.tagName,
            type: i.type,
            placeholder: i.placeholder,
            visible: i.offsetHeight > 0,
            rect: i.getBoundingClientRect()
          }));
          
          return JSON.stringify({
            shellChildCount: children.length,
            structure,
            spinners: spinTexts,
            errorBoundaries: errorBoundaries.length,
            allInputs,
            bodyText: document.body?.innerText?.substring(0, 300)
          }, null, 2);
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    
    const checkResult = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', checkResult);
        resolve(msg.result?.value);
      }
    };
    ws.addEventListener('message', checkResult);
  });
  
  console.log(result);
  ws.close();
}

main().catch(console.error);
