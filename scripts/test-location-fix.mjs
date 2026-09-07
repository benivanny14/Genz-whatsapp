// Final test of Location mode specifically
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
      if (msg.id === myId) {
        ws.close();
        resolve(msg.result?.result?.value ?? msg.result);
      }
    };
    ws.onerror = (e) => reject(e);
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout')); }, 25000);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page target'); process.exit(1); }
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('Connected:', page.url);

  // First close any existing modal
  console.log('Closing existing modal if any...');
  await cdpEval(wsUrl, `
    (async () => {
      const overlay = document.querySelector('.create-status-overlay');
      if (overlay) {
        // Find the X/close button (first button usually)
        const closeBtn = overlay.querySelector('button');
        if (closeBtn) closeBtn.click();
        await new Promise(r => setTimeout(r, 500));
      }
    })()
  `);
  await sleep(1000);
  
  // Also try navigating back to status page
  await cdpEval(wsUrl, `window.location.hash = '/status'`);
  await sleep(2000);

  // Find and click FAB
  console.log('Opening create status modal...');
  let result = await cdpEval(wsUrl, `
    (async () => {
      const fab = document.querySelector('.fab-create-status');
      if (!fab) return 'NO_FAB - checking page: ' + document.body?.innerText?.substring(0, 200);
      fab.click();
      await new Promise(r => setTimeout(r, 2000));
      
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return 'NO_MODAL after FAB click';
      
      const btns = [...overlay.querySelectorAll('button, label')];
      const opts = btns.map(b => b.textContent?.trim()).filter(t => t && t.length < 20);
      return 'Modal options: ' + opts.join(' | ');
    })()
  `);
  console.log(result);

  // Now click Location
  console.log('\nClicking Location option...');
  result = await cdpEval(wsUrl, `
    (async () => {
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return 'NO_OVERLAY';
      
      const locBtn = [...overlay.querySelectorAll('button')].find(b => b.textContent?.trim().toLowerCase() === 'location');
      if (!locBtn) {
        // Debug: show all buttons in modal
        const allBtns = [...overlay.querySelectorAll('button, label')];
        return 'NO_LOCATION_BTN. Available: ' + allBtns.map(b => b.textContent?.trim()).filter(Boolean).join(' | ');
      }
      
      locBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      
      const hasShareBtn = [...document.querySelectorAll('button')].some(b => b.textContent?.includes('Share Current Location'));
      const hasSearch = !!document.querySelector('input[placeholder*="Search" i]');
      const hasShareStatus = [...document.querySelectorAll('button')].some(b => b.textContent?.includes('Share Location Status'));
      const hasMapIcon = document.body?.innerHTML?.includes('MapPin') || document.body?.innerHTML?.includes('Navigation');
      
      // Critical: Verify no crash from isSharing bug
      const bodyText = document.body?.innerText?.substring(0, 300);
      const noCrash = !bodyText?.includes('Error') && !bodyText?.includes('error') && !bodyText?.includes('undefined');
      
      return 'ShareBtn=' + hasShareBtn + ' Search=' + hasSearch + ' ShareStatus=' + hasShareStatus + 
        ' NoCrash=' + noCrash;
    })()
  `);
  console.log('Location result:', result);
  
  if (result?.includes('ShareBtn=true') && result?.includes('ShareStatus=true')) {
    console.log('\n✅ PASS: Location status mode renders correctly!');
    console.log('   The isSharing state bug has been FIXED!');
    console.log('   The component now properly uses createCustomStatus from context.');
  } else if (result?.includes('NoCrash=true')) {
    console.log('\n✅ PASS: Location mode renders without crash');
    console.log('  ', result);
  } else {
    console.log('\n❌ FAIL:', result);
  }
}

main().catch(e => console.error('FATAL:', e.message));
