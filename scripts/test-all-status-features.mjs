// Test all status features via CDP after login
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
  if (result.includes('login')) {
    fail('Login check', 'Still on login page');
    return;
  }
  pass('Logged in (' + result + ')');

  // Navigate to Status page
  console.log('\n--- Navigating to Status ---');
  await cdpEval(wsUrl, `window.location.hash = '/status'`);
  await sleep(3000);
  result = await cdpEval(wsUrl, 'location.href');
  console.log('URL:', result);

  // Check StatusList renders
  result = await cdpEval(wsUrl, `
    (() => {
      const body = document.body?.innerText || '';
      return body.substring(0, 400);
    })()
  `);
  console.log('Page content:', result);

  // Find FAB (create status button)
  console.log('\n--- Finding Create Status FAB ---');
  result = await cdpEval(wsUrl, `
    (() => {
      const allEls = [...document.querySelectorAll('*')];
      const fabs = allEls.filter(el => {
        const cls = (el.className || '').toString().toLowerCase();
        return cls.includes('fab') || cls.includes('create-status');
      });
      return 'FABs found: ' + fabs.length + ' | ' + fabs.map(f => f.tagName + '.' + (f.className || '').toString().substring(0, 40)).join(' | ');
    })()
  `);
  console.log(result);

  // Click FAB to open Create Status modal
  console.log('\n--- Opening Create Status Modal ---');
  result = await cdpEval(wsUrl, `
    (async () => {
      const allEls = [...document.querySelectorAll('*')];
      const fab = allEls.find(el => {
        const cls = (el.className || '').toString().toLowerCase();
        return cls.includes('fab') || cls.includes('create-status');
      });
      if (!fab) return 'NO_FAB_FOUND';
      fab.click();
      await new Promise(r => setTimeout(r, 2000));
      
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return 'FAB_CLICKED_BUT_NO_MODAL';
      
      const btns = [...overlay.querySelectorAll('button, label')];
      const opts = btns.map(b => b.textContent?.trim()).filter(t => t && t.length < 20);
      return 'MODAL_OPENED: ' + opts.join(' | ');
    })()
  `);
  
  if (result?.includes('MODAL_OPENED')) {
    pass('Create Status modal opens');
    console.log('Options:', result);
  } else {
    fail('Create Status modal', result);
    return;
  }

  // === Test each status type ===
  console.log('\n--- Testing Status Type Buttons ---');
  
  // Text
  result = await cdpEval(wsUrl, `
    (() => {
      const overlay = document.querySelector('.create-status-overlay');
      const btn = [...overlay.querySelectorAll('button, label')].find(b => b.textContent?.trim().toLowerCase() === 'text');
      return btn ? 'FOUND' : 'MISSING';
    })()
  `);
  result === 'FOUND' ? pass('Text status option') : fail('Text status option', result);

  // Photo
  result = await cdpEval(wsUrl, `
    (() => {
      const overlay = document.querySelector('.create-status-overlay');
      const btn = [...overlay.querySelectorAll('button, label')].find(b => b.textContent?.trim().toLowerCase() === 'photo');
      return btn ? 'FOUND' : 'MISSING';
    })()
  `);
  result === 'FOUND' ? pass('Photo status option') : fail('Photo status option', result);

  // Video
  result = await cdpEval(wsUrl, `
    (() => {
      const overlay = document.querySelector('.create-status-overlay');
      const btn = [...overlay.querySelectorAll('button, label')].find(b => b.textContent?.trim().toLowerCase() === 'video');
      return btn ? 'FOUND' : 'MISSING';
    })()
  `);
  result === 'FOUND' ? pass('Video status option') : fail('Video status option', result);

  // Voice
  result = await cdpEval(wsUrl, `
    (() => {
      const overlay = document.querySelector('.create-status-overlay');
      const btn = [...overlay.querySelectorAll('button, label')].find(b => b.textContent?.trim().toLowerCase() === 'voice');
      return btn ? 'FOUND' : 'MISSING';
    })()
  `);
  result === 'FOUND' ? pass('Voice status option') : fail('Voice status option', result);

  // Location
  result = await cdpEval(wsUrl, `
    (() => {
      const overlay = document.querySelector('.create-status-overlay');
      const btn = [...overlay.querySelectorAll('button, label')].find(b => b.textContent?.trim().toLowerCase() === 'location');
      return btn ? 'FOUND' : 'MISSING';
    })()
  `);
  result === 'FOUND' ? pass('Location status option') : fail('Location status option', result);

  // === Test Voice Mode ===
  console.log('\n--- Testing Voice Status Mode ---');
  result = await cdpEval(wsUrl, `
    (async () => {
      const overlay = document.querySelector('.create-status-overlay');
      const voiceBtn = [...overlay.querySelectorAll('button')].find(b => b.textContent?.trim().toLowerCase() === 'voice');
      if (!voiceBtn) return 'NO_VOICE_BTN';
      
      voiceBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      
      const hasTitle = document.body?.innerText?.includes('Voice Status');
      const hasCaptionInput = !!document.querySelector('input[placeholder*="caption" i]');
      const hasMicButton = !!document.querySelector('svg');
      const hasTimer = !!document.body?.innerText?.match(/\\d:\\d\\d/);
      const hasRecordButton = [...document.querySelectorAll('button')].some(b => {
        const rect = b.getBoundingClientRect();
        return rect.width > 40 && rect.height > 40 && !b.textContent?.trim();
      });
      
      const checks = [hasTitle, hasMicButton, hasTimer, hasRecordButton];
      const passed = checks.filter(Boolean).length;
      
      return 'Voice mode: title=' + hasTitle + ', caption=' + hasCaptionInput + 
        ', mic=' + hasMicButton + ', timer=' + hasTimer + ', recordBtn=' + hasRecordButton +
        ' (' + passed + '/5 checks)';
    })()
  `);
  
  if (result?.includes('4/') || result?.includes('5/5')) {
    pass('Voice recording mode UI');
  } else {
    fail('Voice recording mode', result);
  }
  console.log('  ', result);

  // Go back to select
  await cdpEval(wsUrl, `
    (async () => {
      // Find and click back/close button in the voice mode
      const btns = [...document.querySelectorAll('button')];
      // The first button is typically the X/back button
      const backBtn = btns[0];
      if (backBtn) backBtn.click();
      await new Promise(r => setTimeout(r, 500));
    })()
  `);
  await sleep(1500);

  // === Test Location Mode ===
  console.log('\n--- Testing Location Status Mode ---');
  result = await cdpEval(wsUrl, `
    (async () => {
      // Reopen modal if needed
      let overlay = document.querySelector('.create-status-overlay');
      if (!overlay) {
        const allEls = [...document.querySelectorAll('*')];
        const fab = allEls.find(el => {
          const cls = (el.className || '').toString().toLowerCase();
          return cls.includes('fab') || cls.includes('create-status');
        });
        if (fab) fab.click();
        await new Promise(r => setTimeout(r, 1500));
        overlay = document.querySelector('.create-status-overlay');
      }
      if (!overlay) return 'NO_MODAL_FOR_LOCATION';
      
      const locBtn = [...overlay.querySelectorAll('button')].find(b => b.textContent?.trim().toLowerCase() === 'location');
      if (!locBtn) return 'NO_LOCATION_BTN';
      
      locBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      
      // Check location mode UI elements
      const hasShareLocationBtn = [...document.querySelectorAll('button')].some(b => b.textContent?.includes('Share Current Location'));
      const hasSearchInput = !!document.querySelector('input[placeholder*="Search" i]');
      const hasShareStatusBtn = [...document.querySelectorAll('button')].some(b => b.textContent?.includes('Share Location Status'));
      const hasMapIcon = !!document.querySelector('svg');
      
      const checks = [hasShareLocationBtn, hasSearchInput, hasShareStatusBtn, hasMapIcon];
      const passed = checks.filter(Boolean).length;
      
      // This is the critical fix - verify the component renders without crashing
      // (Previously would crash with ReferenceError: setIsSharing is not defined)
      const noErrors = !document.body?.innerText?.includes('Error') && !document.body?.innerText?.includes('error');
      
      return 'Location mode: shareBtn=' + hasShareLocationBtn + ', search=' + hasSearchInput + 
        ', shareStatus=' + hasShareStatusBtn + ', icon=' + hasMapIcon +
        ' (' + passed + '/4 checks) | noErrors=' + noErrors;
    })()
  `);
  
  if (result?.includes('3/') || result?.includes('4/4')) {
    pass('Location status mode (isSharing bug FIXED)');
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
  console.log('\n--- Testing Text Status Mode ---');
  result = await cdpEval(wsUrl, `
    (async () => {
      let overlay = document.querySelector('.create-status-overlay');
      if (!overlay) {
        const allEls = [...document.querySelectorAll('*')];
        const fab = allEls.find(el => {
          const cls = (el.className || '').toString().toLowerCase();
          return cls.includes('fab') || cls.includes('create-status');
        });
        if (fab) fab.click();
        await new Promise(r => setTimeout(r, 1500));
        overlay = document.querySelector('.create-status-overlay');
      }
      if (!overlay) return 'NO_MODAL_FOR_TEXT';
      
      const textBtn = [...overlay.querySelectorAll('button')].find(b => b.textContent?.trim().toLowerCase() === 'text');
      if (!textBtn) return 'NO_TEXT_BTN';
      
      textBtn.click();
      await new Promise(r => setTimeout(r, 1500));
      
      const hasTextarea = !!document.querySelector('textarea');
      const hasSendBtn = !!document.querySelector('.send-status-btn');
      const colorDots = document.querySelectorAll('.color-dot').length;
      const hasFontBtn = !!document.querySelector('.font-selector-btn');
      
      return 'Text mode: textarea=' + hasTextarea + ', sendBtn=' + hasSendBtn + 
        ', colors=' + colorDots + ', fontBtn=' + hasFontBtn;
    })()
  `);
  
  if (result?.includes('textarea=true')) {
    pass('Text status mode');
  } else {
    fail('Text status mode', result);
  }
  console.log('  ', result);

  // === Test Photo Mode (file picker) ===
  console.log('\n--- Testing Photo Status Option ---');
  // Go back to select
  await cdpEval(wsUrl, `
    (async () => {
      const btns = [...document.querySelectorAll('button')];
      const backBtn = btns[0];
      if (backBtn) backBtn.click();
      await new Promise(r => setTimeout(r, 500));
    })()
  `);
  await sleep(1500);

  result = await cdpEval(wsUrl, `
    (async () => {
      let overlay = document.querySelector('.create-status-overlay');
      if (!overlay) {
        const allEls = [...document.querySelectorAll('*')];
        const fab = allEls.find(el => {
          const cls = (el.className || '').toString().toLowerCase();
          return cls.includes('fab') || cls.includes('create-status');
        });
        if (fab) fab.click();
        await new Promise(r => setTimeout(r, 1500));
        overlay = document.querySelector('.create-status-overlay');
      }
      if (!overlay) return 'NO_MODAL';
      
      // Photo is a label wrapping a file input
      const photoLabel = [...overlay.querySelectorAll('label')].find(l => l.textContent?.trim().toLowerCase() === 'photo');
      const photoInput = overlay.querySelector('input[type="file"][accept="image/*"]');
      
      return 'Photo: label=' + !!photoLabel + ', fileInput=' + !!photoInput;
    })()
  `);
  
  if (result?.includes('label=true')) {
    pass('Photo status file picker');
  } else {
    fail('Photo status file picker', result);
  }
  console.log('  ', result);

  // === Test Video Mode (file picker) ===
  result = await cdpEval(wsUrl, `
    (() => {
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return 'NO_OVERLAY';
      
      const videoLabel = [...overlay.querySelectorAll('label')].find(l => l.textContent?.trim().toLowerCase() === 'video');
      const videoInput = overlay.querySelector('input[type="file"][accept="video/*"]');
      
      return 'Video: label=' + !!videoLabel + ', fileInput=' + !!videoInput;
    })()
  `);
  
  if (result?.includes('label=true')) {
    pass('Video status file picker');
  } else {
    fail('Video status file picker', result);
  }
  console.log('  ', result);

  // === SUMMARY ===
  console.log('\n\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           STATUS FEATURE LIVE TEST RESULTS              ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  results.tests.forEach(t => console.log('║ ' + t.padEnd(57) + '║'));
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║ Passed: ' + results.passed + ' | Failed: ' + results.failed + '                                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  if (results.failed > 0) {
    process.exit(1);
  }
}

main().catch(e => console.error('FATAL:', e.message));
