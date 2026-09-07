// Login via CDP with React-compatible input filling
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

// Use CDP Input.dispatchKeyEvent to simulate real typing
async function cdpType(wsUrl, char) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = ++wsId;
    ws.onopen = () => {
      // keyDown
      ws.send(JSON.stringify({
        id: id,
        method: 'Input.dispatchKeyEvent',
        params: { type: 'keyDown', text: char, key: char, code: 'Key' + char.toUpperCase(), windowsVirtualKeyCode: char.charCodeAt(0) }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === id) {
        // keyUp
        ws.send(JSON.stringify({
          id: id + 1,
          method: 'Input.dispatchKeyEvent',
          params: { type: 'keyUp', key: char, code: 'Key' + char.toUpperCase(), windowsVirtualKeyCode: char.charCodeAt(0) }
        }));
      }
      if (msg.id === id + 1) {
        ws.close();
        resolve();
      }
    };
    ws.onerror = (e) => reject(e);
    setTimeout(() => { ws.close(); reject(new Error('type timeout')); }, 5000);
  });
}

async function cdpClick(wsUrl, x, y) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = ++wsId;
    ws.onopen = () => {
      ws.send(JSON.stringify({ id, method: 'Input.dispatchMouseEvent', params: { type: 'mousePressed', x, y, button: 'left', clickCount: 1 } }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === id) {
        ws.send(JSON.stringify({ id: id + 1, method: 'Input.dispatchMouseEvent', params: { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 } }));
      }
      if (msg.id === id + 1) { ws.close(); resolve(); }
    };
    ws.onerror = (e) => reject(e);
    setTimeout(() => { ws.close(); reject(new Error('click timeout')); }, 5000);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page target'); process.exit(1); }
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('Connected:', page.url);

  let result = await cdpEval(wsUrl, 'location.href');
  console.log('URL:', result);

  if (!result.includes('login')) {
    console.log('Already logged in!');
    return;
  }

  // Focus the username input and type using Input.insertText (React-compatible)
  console.log('\n=== Filling username ===');
  result = await cdpEval(wsUrl, `
    (() => {
      const inputs = [...document.querySelectorAll('input')];
      const info = inputs.map(i => i.type + ':' + i.placeholder + ':val=' + i.value).join(' | ');
      const phoneInput = inputs.find(i => i.placeholder?.includes('Phone') || i.placeholder?.includes('username'));
      if (phoneInput) {
        phoneInput.focus();
        phoneInput.click();
        return 'Focused: ' + phoneInput.placeholder + ' at ' + JSON.stringify(phoneInput.getBoundingClientRect());
      }
      return 'NOT_FOUND: ' + info;
    })()
  `);
  console.log(result);

  // Type username using CDP insertText
  await cdpEval(wsUrl, `
    (async () => {
      // Focus the field
      const inputs = [...document.querySelectorAll('input')];
      const phoneInput = inputs.find(i => i.placeholder?.includes('Phone') || i.placeholder?.includes('username'));
      if (!phoneInput) return 'NO_FIELD';
      phoneInput.focus();
      
      // Clear existing value
      phoneInput.value = '';
      
      // Use InputEvent to insert text
      const text = 'bufftest1';
      for (const char of text) {
        phoneInput.value += char;
        phoneInput.dispatchEvent(new InputEvent('input', { data: char, inputType: 'insertText', bubbles: true }));
        await new Promise(r => setTimeout(r, 50));
      }
      phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      return 'Username set: ' + phoneInput.value;
    })()
  `);
  await sleep(300);

  console.log('\n=== Filling password ===');
  await cdpEval(wsUrl, `
    (async () => {
      const inputs = [...document.querySelectorAll('input')];
      const passInput = inputs.find(i => i.type === 'password');
      if (!passInput) return 'NO_PASS_FIELD';
      passInput.focus();
      
      const text = 'TestPass123!@#';
      for (const char of text) {
        passInput.value += char;
        passInput.dispatchEvent(new InputEvent('input', { data: char, inputType: 'insertText', bubbles: true }));
        await new Promise(r => setTimeout(r, 50));
      }
      passInput.dispatchEvent(new Event('change', { bubbles: true }));
      return 'Password set: ' + passInput.value.length + ' chars';
    })()
  `);
  await sleep(300);

  console.log('\n=== Clicking Login ===');
  result = await cdpEval(wsUrl, `
    (() => {
      const btns = [...document.querySelectorAll('button')];
      const loginBtn = btns.find(b => b.textContent?.trim() === 'Login');
      if (loginBtn) {
        loginBtn.click();
        return 'Clicked Login! Disabled=' + loginBtn.disabled;
      }
      return 'No Login button';
    })()
  `);
  console.log(result);

  // Wait for navigation
  await sleep(7000);
  result = await cdpEval(wsUrl, 'location.href');
  console.log('\nAfter login URL:', result);

  if (!result.includes('login')) {
    console.log('LOGIN SUCCESS! Now testing status features...');
    
    // Navigate to Status
    await cdpEval(wsUrl, `window.location.hash = '/status'`);
    await sleep(3000);
    
    result = await cdpEval(wsUrl, 'location.href');
    console.log('Status page URL:', result);
    
    const bodyText = await cdpEval(wsUrl, `document.body?.innerText?.substring(0, 500)`);
    console.log('Page content:', bodyText);
    
    // Find create status button
    result = await cdpEval(wsUrl, `
      (() => {
        const allBtns = [...document.querySelectorAll('button, [role="button"], a, div')];
        const statusBtns = allBtns.filter(b => {
          const t = (b.textContent || '').trim();
          const c = (b.className || '').toLowerCase();
          return c.includes('fab') || c.includes('create') || c.includes('add-status') || t.includes('Create');
        });
        
        // Also check for any floating action button
        const fabs = document.querySelectorAll('[class*="fab"], [class*="float"], [class*="camera"]');
        
        return 'Status btns: ' + statusBtns.length + ' | FABs: ' + fabs.length + 
          ' | All btns: ' + allBtns.slice(0, 15).map(b => (b.textContent || '').trim().substring(0, 20)).join(', ');
      })()
    `);
    console.log('\nCreate buttons:', result);
    
    // Click FAB
    result = await cdpEval(wsUrl, `
      (async () => {
        // Try clicking FAB
        const fab = document.querySelector('[class*="fab"]');
        if (fab) { fab.click(); await new Promise(r => setTimeout(r, 1500)); }
        
        // Check for modal
        const overlay = document.querySelector('.create-status-overlay');
        if (!overlay) return 'NO_MODAL after FAB click. Body: ' + document.body?.innerText?.substring(0, 300);
        
        const options = [...overlay.querySelectorAll('button, label')];
        const optTexts = options.map(o => o.textContent?.trim()).filter(t => t && t.length < 20);
        return 'MODAL_OPENED! Options: ' + optTexts.join(' | ');
      })()
    `);
    console.log('Status modal:', result);

    // Test all 4 status types
    console.log('\n=== TESTING STATUS TYPES ===');
    
    // Photo
    const photoCheck = await cdpEval(wsUrl, `
      (() => {
        const overlay = document.querySelector('.create-status-overlay');
        if (!overlay) return 'NO_OVERLAY';
        const photoOpt = [...overlay.querySelectorAll('button, label')].find(b => b.textContent?.trim().toLowerCase().includes('photo'));
        return 'Photo: ' + (photoOpt ? 'FOUND (' + photoOpt.tagName + ')' : 'NOT FOUND');
      })()
    `);
    console.log(photoCheck);

    // Video
    const videoCheck = await cdpEval(wsUrl, `
      (() => {
        const overlay = document.querySelector('.create-status-overlay');
        if (!overlay) return 'NO_OVERLAY';
        const videoOpt = [...overlay.querySelectorAll('button, label')].find(b => b.textContent?.trim().toLowerCase().includes('video'));
        return 'Video: ' + (videoOpt ? 'FOUND (' + videoOpt.tagName + ')' : 'NOT FOUND');
      })()
    `);
    console.log(videoCheck);

    // Voice
    const voiceCheck = await cdpEval(wsUrl, `
      (() => {
        const overlay = document.querySelector('.create-status-overlay');
        if (!overlay) return 'NO_OVERLAY';
        const voiceOpt = [...overlay.querySelectorAll('button, label')].find(b => b.textContent?.trim().toLowerCase().includes('voice'));
        return 'Voice: ' + (voiceOpt ? 'FOUND (' + voiceOpt.tagName + ')' : 'NOT FOUND');
      })()
    `);
    console.log(voiceCheck);

    // Location
    const locCheck = await cdpEval(wsUrl, `
      (() => {
        const overlay = document.querySelector('.create-status-overlay');
        if (!overlay) return 'NO_OVERLAY';
        const locOpt = [...overlay.querySelectorAll('button, label')].find(b => b.textContent?.trim().toLowerCase().includes('location'));
        return 'Location: ' + (locOpt ? 'FOUND (' + locOpt.tagName + ')' : 'NOT FOUND');
      })()
    `);
    console.log(locCheck);

    // Text
    const textCheck = await cdpEval(wsUrl, `
      (() => {
        const overlay = document.querySelector('.create-status-overlay');
        if (!overlay) return 'NO_OVERLAY';
        const textOpt = [...overlay.querySelectorAll('button, label')].find(b => b.textContent?.trim().toLowerCase() === 'text');
        return 'Text: ' + (textOpt ? 'FOUND (' + textOpt.tagName + ')' : 'NOT FOUND');
      })()
    `);
    console.log(textCheck);

    // Test Voice mode
    console.log('\n=== TESTING VOICE MODE ===');
    const voiceResult = await cdpEval(wsUrl, `
      (async () => {
        const overlay = document.querySelector('.create-status-overlay');
        if (!overlay) return 'NO_OVERLAY';
        const voiceBtn = [...overlay.querySelectorAll('button')].find(b => b.textContent?.trim().toLowerCase().includes('voice'));
        if (!voiceBtn) return 'NO_VOICE_BTN';
        
        voiceBtn.click();
        await new Promise(r => setTimeout(r, 1500));
        
        // Check voice recording UI
        const container = document.querySelector('.text-create-container, [class*="voice"]');
        const micCircle = document.querySelector('button');
        const hasMicIcon = !!document.querySelector('svg');
        const timerText = document.body?.innerText?.match(/\\d:\\d\\d/)?.[0];
        
        return 'Voice mode loaded! Container: ' + !!container + 
          ' | Mic icons: ' + hasMicIcon + 
          ' | Timer: ' + (timerText || 'none') +
          ' | Body: ' + document.body?.innerText?.substring(0, 200);
      })()
    `);
    console.log(voiceResult);

    // Test Location mode
    console.log('\n=== TESTING LOCATION MODE ===');
    // Go back to select first
    await cdpEval(wsUrl, `
      (async () => {
        const backBtn = document.querySelector('.create-status-overlay button');
        if (backBtn) backBtn.click();
        await new Promise(r => setTimeout(r, 500));
        return 'Back clicked';
      })()
    `);
    await sleep(1000);

    const locResult = await cdpEval(wsUrl, `
      (async () => {
        // Reopen modal if needed
        const fab = document.querySelector('[class*="fab"]');
        if (fab) fab.click();
        await new Promise(r => setTimeout(r, 1000));
        
        const overlay = document.querySelector('.create-status-overlay');
        if (!overlay) return 'NO_OVERLAY';
        
        const locBtn = [...overlay.querySelectorAll('button')].find(b => b.textContent?.trim().toLowerCase().includes('location'));
        if (!locBtn) return 'NO_LOCATION_BTN';
        
        locBtn.click();
        await new Promise(r => setTimeout(r, 1500));
        
        // Check location mode UI
        const shareBtn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Share Current Location'));
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        const shareStatusBtn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Share Location Status'));
        
        return 'Location mode! ShareLocation: ' + !!shareBtn + 
          ' | SearchInput: ' + !!searchInput + 
          ' | ShareStatus: ' + !!shareStatusBtn +
          ' | URL: ' + location.href;
      })()
    `);
    console.log(locResult);

    // Test Text mode
    console.log('\n=== TESTING TEXT MODE ===');
    await cdpEval(wsUrl, `
      (async () => {
        const backBtn = document.querySelector('.create-status-overlay button');
        if (backBtn) backBtn.click();
        await new Promise(r => setTimeout(r, 500));
      })()
    `);
    await sleep(1000);

    const textResult = await cdpEval(wsUrl, `
      (async () => {
        const fab = document.querySelector('[class*="fab"]');
        if (fab) fab.click();
        await new Promise(r => setTimeout(r, 1000));
        
        const overlay = document.querySelector('.create-status-overlay');
        if (!overlay) return 'NO_OVERLAY';
        
        const textBtn = [...overlay.querySelectorAll('button')].find(b => b.textContent?.trim().toLowerCase() === 'text');
        if (!textBtn) return 'NO_TEXT_BTN';
        
        textBtn.click();
        await new Promise(r => setTimeout(r, 1500));
        
        const textarea = document.querySelector('textarea');
        const sendBtn = document.querySelector('.send-status-btn, button[class*="send"]');
        const colorDots = document.querySelectorAll('.color-dot');
        
        return 'Text mode! Textarea: ' + !!textarea + 
          ' | SendBtn: ' + !!sendBtn + 
          ' | ColorDots: ' + colorDots.length +
          ' | URL: ' + location.href;
      })()
    `);
    console.log(textResult);

    console.log('\n=== ALL TESTS COMPLETE ===');
  } else {
    console.log('Login still failed. Page text:');
    const text = await cdpEval(wsUrl, `document.body?.innerText?.substring(0, 400)`);
    console.log(text);
  }
}

main().catch(e => console.error('FATAL:', e.message));
