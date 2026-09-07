// Investigate why clicking conversation doesn't open chat view
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
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout')); }, 30000);
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

  console.log('=== INVESTIGATING CHAT NAVIGATION ===\n');

  // Navigate to chat
  await val(wsUrl, `window.location.href = '/chat'`);
  await new Promise(r => setTimeout(r, 3000));

  // Dump entire sidebar HTML
  const sidebarDump = await val(wsUrl, `
    (async () => {
      // Find the sidebar/left panel
      const sidebar = document.querySelector('[class*="sidebar"], [class*="left-panel"], [class*="chat-list"]');
      
      // Get all visible elements with text
      const allEls = document.querySelectorAll('*');
      const visibleText = [];
      
      for (const el of allEls) {
        if (el.offsetWidth > 0 && el.offsetHeight > 0 && el.children.length === 0) {
          const text = el.textContent?.trim();
          if (text && text.length > 0 && text.length < 50) {
            const rect = el.getBoundingClientRect();
            visibleText.push({
              tag: el.tagName,
              text: text,
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              w: Math.round(rect.width),
              h: Math.round(rect.height)
            });
          }
        }
      }
      
      return JSON.stringify(visibleText.slice(0, 40));
    })()
  `);
  console.log('Visible elements:', sidebarDump?.substring(0, 1500));

  // Try to find and click the conversation
  console.log('\n--- Trying to click conversation ---');
  const clickResult = await val(wsUrl, `
    (async () => {
      // Find all elements containing "You" or "bufftest"
      const allEls = document.querySelectorAll('*');
      const matches = [];
      
      for (const el of allEls) {
        if (el.offsetWidth > 0 && el.offsetHeight > 0) {
          const ownText = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 
            ? el.textContent?.trim() : '';
          if (ownText === 'You' || ownText?.includes('Note to self')) {
            matches.push({
              tag: el.tagName,
              text: ownText,
              parent: el.parentElement?.textContent?.trim()?.substring(0, 50),
              rect: el.getBoundingClientRect(),
              clickable: el.parentElement?.getAttribute('role') || el.parentElement?.className?.substring(0, 50)
            });
          }
        }
      }
      
      if (matches.length > 0) {
        // Click the parent of the first match (likely the conversation item)
        const target = matches[0];
        // Try clicking the parent element
        const parent = document.elementFromPoint(target.rect.x + target.rect.width/2, target.rect.y + target.rect.height/2);
        if (parent) {
          parent.click();
          await new Promise(r => setTimeout(r, 3000));
          
          return JSON.stringify({
            clicked: true,
            url: location.href,
            matchCount: matches.length,
            targetText: target.text,
            parentText: target.parent,
            newUrl: location.href,
            hasTextarea: !!document.querySelector('textarea'),
            bodyText: document.body?.innerText?.substring(0, 300)
          });
        }
      }
      
      return JSON.stringify({ clicked: false, matchCount: matches.length, matches: matches.slice(0, 5) });
    })()
  `);
  console.log('Click result:', clickResult?.substring(0, 600));

  // Check if the app has a selected conversation state
  console.log('\n--- Checking app state ---');
  const appState = await val(wsUrl, `
    (async () => {
      // Check if the conversation list items have click handlers
      const items = document.querySelectorAll('[class*="cursor-pointer"], [role="button"]');
      const convItems = Array.from(items).filter(i => {
        const rect = i.getBoundingClientRect();
        return rect.x < 400 && rect.width > 100; // Left panel
      });
      
      return JSON.stringify({
        totalClickable: items.length,
        leftPanelItems: convItems.length,
        items: convItems.map(i => ({
          text: i.textContent?.trim()?.substring(0, 40),
          classes: i.className?.substring(0, 60),
          rect: i.getBoundingClientRect()
        })).slice(0, 10)
      });
    })()
  `);
  console.log('App state:', appState?.substring(0, 800));

  // Try dispatching a custom event to open the chat
  console.log('\n--- Dispatching open-chat event ---');
  const dispatchResult = await val(wsUrl, `
    (async () => {
      window.dispatchEvent(new CustomEvent('open-chat', { 
        detail: { conversationId: '6a9afc55b59765bc43aa7b77' } 
      }));
      await new Promise(r => setTimeout(r, 3000));
      
      return JSON.stringify({
        url: location.href,
        hasTextarea: !!document.querySelector('textarea'),
        hasSendBtn: !!document.querySelector('button[aria-label="Send message"]'),
        bodyText: document.body?.innerText?.substring(0, 400)
      });
    })()
  `);
  console.log('Dispatch result:', dispatchResult?.substring(0, 500));

  // Try direct URL navigation
  console.log('\n--- Direct URL navigation ---');
  const urlNav = await val(wsUrl, `
    (async () => {
      window.history.pushState({}, '', '/chat/6a9afc55b59765bc43aa7b77');
      window.dispatchEvent(new PopStateEvent('popstate'));
      await new Promise(r => setTimeout(r, 3000));
      
      return JSON.stringify({
        url: location.href,
        hasTextarea: !!document.querySelector('textarea'),
        hasSendBtn: !!document.querySelector('button[aria-label="Send message"]'),
        bodyText: document.body?.innerText?.substring(0, 400)
      });
    })()
  `);
  console.log('URL nav:', urlNav?.substring(0, 500));

  console.log('\n=== INVESTIGATION COMPLETE ===');
}

main().catch(console.error);
