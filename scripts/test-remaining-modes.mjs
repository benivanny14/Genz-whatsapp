// Test remaining status modes with proper modal reopen
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

async function openModal(wsUrl) {
  const result = await cdpEval(wsUrl, `
    (async () => {
      // Check if modal is already open
      let overlay = document.querySelector('.create-status-overlay');
      if (overlay) return 'ALREADY_OPEN';
      
      const fab = document.querySelector('.fab-create-status');
      if (!fab) return 'NO_FAB';
      fab.click();
      await new Promise(r => setTimeout(r, 2000));
      
      overlay = document.querySelector('.create-status-overlay');
      return overlay ? 'OPENED' : 'STILL_CLOSED';
    })()
  `);
  await sleep(500);
  return result;
}

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page target'); process.exit(1); }
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('Connected:', page.url);

  const results = { passed: 0, failed: 0, tests: [] };
  function pass(name) { results.passed++; results.tests.push('✅ ' + name); console.log('✅ ' + name); }
  function fail(name, reason) { results.failed++; results.tests.push('❌ ' + name + ': ' + reason); console.log('❌ ' + name + ': ' + reason); }

  // === Test Location Mode ===
  console.log('\n--- Location Status Mode ---');
  let result = await openModal(wsUrl);
  console.log('Modal:', result);
  
  result = await cdpEval(wsUrl, `
    (async () => {
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return 'NO_MODAL';
      
      const locBtn = [...overlay.querySelectorAll('button')].find(b => b.textContent?.trim().toLowerCase() === 'location');
      if (!locBtn) return 'NO_LOC_BTN';
      
      locBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      
      const hasShareBtn = [...document.querySelectorAll('button')].some(b => b.textContent?.includes('Share Current Location'));
      const hasSearch = !!document.querySelector('input[placeholder*="Search" i]');
      const hasShareStatus = [...document.querySelectorAll('button')].some(b => b.textContent?.includes('Share Location Status'));
      
      return 'shareBtn=' + hasShareBtn + ' search=' + hasSearch + ' shareStatus=' + hasShareStatus;
    })()
  `);
  
  if (result?.includes('shareBtn=true') && result?.includes('shareStatus=true')) {
    pass('Location status mode renders correctly (isSharing bug FIXED!)');
  } else {
    fail('Location status mode', result);
  }
  console.log('  ', result);

  // Go back from location mode (X button)
  await cdpEval(wsUrl, `
    (async () => {
      // Click the first button (X) to go back
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return;
      const backBtn = overlay.querySelector('button');
      if (backBtn) backBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    })()
  `);
  await sleep(2000);

  // === Test Text Mode ===
  console.log('\n--- Text Status Mode ---');
  result = await openModal(wsUrl);
  console.log('Modal:', result);
  
  result = await cdpEval(wsUrl, `
    (async () => {
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return 'NO_MODAL';
      
      const textBtn = [...overlay.querySelectorAll('button')].find(b => b.textContent?.trim().toLowerCase() === 'text');
      if (!textBtn) return 'NO_TEXT_BTN';
      
      textBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      
      const hasTextarea = !!document.querySelector('textarea');
      const hasSendBtn = !!document.querySelector('.send-status-btn');
      const colors = document.querySelectorAll('.color-dot').length;
      const hasFontBtn = !!document.querySelector('.font-selector-btn');
      const hasPrivacyBtn = document.body?.innerText?.includes('Reply');
      const hasDurationBtn = document.body?.innerText?.includes('24h') || document.body?.innerText?.includes('Duration');
      
      return 'textarea=' + hasTextarea + ' sendBtn=' + hasSendBtn + ' colors=' + colors + 
        ' fontBtn=' + hasFontBtn + ' privacy=' + hasPrivacyBtn + ' duration=' + hasDurationBtn;
    })()
  `);
  
  if (result?.includes('textarea=true')) {
    pass('Text status mode renders correctly');
  } else {
    fail('Text status mode', result);
  }
  console.log('  ', result);

  // Go back
  await cdpEval(wsUrl, `
    (async () => {
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return;
      const backBtn = overlay.querySelector('button');
      if (backBtn) backBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    })()
  `);
  await sleep(2000);

  // === Test Photo and Video mode ===
  console.log('\n--- Photo/Video Status Mode ---');
  result = await openModal(wsUrl);
  console.log('Modal:', result);
  
  result = await cdpEval(wsUrl, `
    (() => {
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return 'NO_OVERLAY';
      
      const photoLabel = [...overlay.querySelectorAll('label')].find(l => l.textContent?.trim().toLowerCase() === 'photo');
      const videoLabel = [...overlay.querySelectorAll('label')].find(l => l.textContent?.trim().toLowerCase() === 'video');
      const photoInput = overlay.querySelector('input[type="file"][accept="image/*"]');
      const videoInput = overlay.querySelector('input[type="file"][accept="video/*"]');
      
      return 'photoLabel=' + !!photoLabel + ' photoInput=' + !!photoInput + ' videoLabel=' + !!videoLabel + ' videoInput=' + !!videoInput;
    })()
  `);
  
  if (result?.includes('photoLabel=true') && result?.includes('videoLabel=true')) {
    pass('Photo and Video file inputs present');
  } else {
    fail('Photo/Video file inputs', result);
  }
  console.log('  ', result);

  // === Verify the Location fix works ===
  console.log('\n--- Verifying Location Fix ---');
  result = await cdpEval(wsUrl, `
    (() => {
      // Verify CreateStatus component renders without errors
      const errorElements = document.querySelectorAll('[class*="error"]');
      const reactError = document.querySelector('.error-boundary');
      
      return 'errors=' + errorElements.length + ' reactError=' + !!reactError + 
        ' url=' + location.href;
    })()
  `);
  
  if (!result?.includes('reactError=true')) {
    pass('No React errors after status operations');
  } else {
    fail('React error detected', result);
  }
  console.log('  ', result);

  // === SUMMARY ===
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║              REMAINING STATUS MODES TEST RESULTS             ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  results.tests.forEach(t => console.log('║ ' + t.padEnd(64) + '║'));
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║ TOTAL: ' + results.passed + ' passed, ' + results.failed + ' failed' + ' '.repeat(64 - 21 - String(results.passed).length - String(results.failed).length) + '║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  if (results.failed > 0) process.exit(1);
}

main().catch(e => console.error('FATAL:', e.message));
