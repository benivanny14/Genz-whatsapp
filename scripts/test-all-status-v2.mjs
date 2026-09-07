// Test all status features - find FAB by class
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

  const results = { passed: 0, failed: 0, tests: [] };
  function pass(name) { results.passed++; results.tests.push('✅ ' + name); console.log('✅ ' + name); }
  function fail(name, reason) { results.failed++; results.tests.push('❌ ' + name + ': ' + reason); console.log('❌ ' + name + ': ' + reason); }

  // Check we're logged in
  let result = await cdpEval(wsUrl, 'location.href');
  if (result.includes('login')) { fail('Login', 'Still on login'); return; }
  pass('Logged in');

  // Check the current page
  console.log('\n--- Current page ---');
  result = await cdpEval(wsUrl, `
    (() => {
      // Find the FAB
      const fab = document.querySelector('.fab-create-status');
      const statusTab = document.querySelector('[class*="tab"]')?.textContent;
      const sidebar = document.querySelector('[class*="sidebar"], [class*="Sidebar"]');
      
      return 'URL: ' + location.href + 
        ' | FAB: ' + !!fab + 
        ' | Sidebar: ' + !!sidebar +
        ' | Status tab in view: ' + document.body?.innerText?.includes('Status');
    })()
  `);
  console.log(result);

  // Check if Status tab is visible and clickable
  console.log('\n--- Navigating to Status ---');
  result = await cdpEval(wsUrl, `
    (async () => {
      // Click the Status tab in sidebar or bottom nav
      const allBtns = [...document.querySelectorAll('button, a, [role="tab"]')];
      const statusBtn = allBtns.find(b => {
        const t = (b.textContent || '').trim().toLowerCase();
        return t === 'status' || t.includes('📱') || t.includes('status');
      });
      
      if (statusBtn) {
        statusBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        return 'Status tab clicked: ' + statusBtn.textContent?.trim();
      }
      
      // Try clicking by class
      const statusElements = [...document.querySelectorAll('[class*="status"]')];
      return 'No Status tab. Status elements: ' + statusElements.length;
    })()
  `);
  console.log(result);
  await sleep(2000);

  // Check if FAB is now visible
  console.log('\n--- Checking FAB visibility ---');
  result = await cdpEval(wsUrl, `
    (() => {
      const fab = document.querySelector('.fab-create-status');
      if (fab) {
        const rect = fab.getBoundingClientRect();
        const styles = window.getComputedStyle(fab);
        return 'FAB found! Position: ' + rect.x + ',' + rect.y + ' Size: ' + rect.width + 'x' + rect.height + 
          ' Display: ' + styles.display + ' Visibility: ' + styles.visibility + ' Opacity: ' + styles.opacity;
      }
      return 'FAB not found';
    })()
  `);
  console.log(result);

  // Click FAB
  console.log('\n--- Clicking FAB ---');
  result = await cdpEval(wsUrl, `
    (async () => {
      const fab = document.querySelector('.fab-create-status');
      if (!fab) return 'NO_FAB';
      
      fab.click();
      await new Promise(r => setTimeout(r, 2000));
      
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return 'FAB_CLICKED_NO_MODAL';
      
      const btns = [...overlay.querySelectorAll('button, label')];
      const opts = btns.map(b => b.textContent?.trim()).filter(t => t && t.length < 20);
      return 'MODAL: ' + opts.join(' | ');
    })()
  `);
  
  if (result?.includes('MODAL')) {
    pass('Create Status modal opens');
    console.log('  ', result);
  } else {
    fail('Create Status modal', result);
    return;
  }

  // === Test each status type button ===
  console.log('\n--- Testing Status Types ---');
  
  const typeTests = ['text', 'photo', 'video', 'voice', 'location'];
  for (const type of typeTests) {
    result = await cdpEval(wsUrl, `
      (() => {
        const overlay = document.querySelector('.create-status-overlay');
        if (!overlay) return 'NO_OVERLAY';
        const btn = [...overlay.querySelectorAll('button, label')].find(b => b.textContent?.trim().toLowerCase() === '${type}');
        return btn ? 'FOUND' : 'MISSING';
      })()
    `);
    result === 'FOUND' ? pass(type.charAt(0).toUpperCase() + type.slice(1) + ' status option') : fail(type + ' status option', result);
  }

  // === Test Voice Mode ===
  console.log('\n--- Voice Status Mode ---');
  result = await cdpEval(wsUrl, `
    (async () => {
      const overlay = document.querySelector('.create-status-overlay');
      const voiceBtn = [...overlay.querySelectorAll('button')].find(b => b.textContent?.trim().toLowerCase() === 'voice');
      if (!voiceBtn) return 'NO_VOICE_BTN';
      
      voiceBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      
      const hasTitle = document.body?.innerText?.includes('Voice Status');
      const hasCaptionInput = !!document.querySelector('input[placeholder*="caption" i]');
      const hasSvg = !!document.querySelector('svg');
      const hasTimer = !!document.body?.innerText?.match(/\\d:\\d\\d/);
      
      return 'voiceTitle=' + hasTitle + ' caption=' + hasCaptionInput + ' svg=' + hasSvg + ' timer=' + hasTimer;
    })()
  `);
  
  if (result?.includes('voiceTitle=true')) {
    pass('Voice recording mode UI renders');
  } else {
    fail('Voice recording mode', result);
  }
  console.log('  ', result);

  // Go back from voice mode
  await cdpEval(wsUrl, `
    (async () => {
      const btns = [...document.querySelectorAll('button')];
      const backBtn = btns[0]; // First button is X/back
      if (backBtn) backBtn.click();
      await new Promise(r => setTimeout(r, 500));
    })()
  `);
  await sleep(1500);

  // === Test Location Mode ===
  console.log('\n--- Location Status Mode ---');
  result = await cdpEval(wsUrl, `
    (async () => {
      // Reopen modal
      let overlay = document.querySelector('.create-status-overlay');
      if (!overlay) {
        const fab = document.querySelector('.fab-create-status');
        if (fab) { fab.click(); await new Promise(r => setTimeout(r, 1500)); }
        overlay = document.querySelector('.create-status-overlay');
      }
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
    pass('Location status mode renders (isSharing bug FIXED!)');
  } else {
    fail('Location status mode', result);
  }
  console.log('  ', result);

  // Go back
  await cdpEval(wsUrl, `
    (async () => {
      const btns = [...document.querySelectorAll('button')];
      const backBtn = btns[0];
      if (backBtn) backBtn.click();
      await new Promise(r => setTimeout(r, 500));
    })()
  `);
  await sleep(1500);

  // === Test Text Mode ===
  console.log('\n--- Text Status Mode ---');
  result = await cdpEval(wsUrl, `
    (async () => {
      let overlay = document.querySelector('.create-status-overlay');
      if (!overlay) {
        const fab = document.querySelector('.fab-create-status');
        if (fab) { fab.click(); await new Promise(r => setTimeout(r, 1500)); }
        overlay = document.querySelector('.create-status-overlay');
      }
      if (!overlay) return 'NO_MODAL';
      
      const textBtn = [...overlay.querySelectorAll('button')].find(b => b.textContent?.trim().toLowerCase() === 'text');
      if (!textBtn) return 'NO_TEXT_BTN';
      
      textBtn.click();
      await new Promise(r => setTimeout(r, 1500));
      
      const hasTextarea = !!document.querySelector('textarea');
      const hasSendBtn = !!document.querySelector('.send-status-btn');
      const colors = document.querySelectorAll('.color-dot').length;
      
      return 'textarea=' + hasTextarea + ' sendBtn=' + hasSendBtn + ' colors=' + colors;
    })()
  `);
  
  if (result?.includes('textarea=true')) {
    pass('Text status mode renders');
  } else {
    fail('Text status mode', result);
  }
  console.log('  ', result);

  // Go back
  await cdpEval(wsUrl, `
    (async () => {
      const btns = [...document.querySelectorAll('button')];
      const backBtn = btns[0];
      if (backBtn) backBtn.click();
      await new Promise(r => setTimeout(r, 500));
    })()
  `);
  await sleep(1500);

  // === Test Photo/Video file inputs ===
  console.log('\n--- Photo/Video File Inputs ---');
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
    pass('Photo and Video file inputs');
  } else {
    fail('Photo/Video file inputs', result);
  }
  console.log('  ', result);

  // === SUMMARY ===
  console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              ALL STATUS FEATURES LIVE TEST                  ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  results.tests.forEach(t => console.log('║ ' + t.padEnd(62) + '║'));
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ Total: ' + results.passed + ' passed, ' + results.failed + ' failed' + ' '.repeat(62 - 20 - String(results.passed).length - String(results.failed).length) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  if (results.failed > 0) process.exit(1);
}

main().catch(e => console.error('FATAL:', e.message));
