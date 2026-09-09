const http = require('http');
const WebSocket = require(require('path').join(process.cwd(), '..', 'frontend', 'node_modules', 'ws'));
const API = 'http://10.0.2.2:5000';

function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/list', res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

function cdpEval(expression) {
  return new Promise(async (resolve, reject) => {
    const targets = await getTargets();
    const page = targets.find(t => t.type === 'page');
    if (!page) return reject(new Error('no page'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      setTimeout(() => ws.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } })), 400);
    });
    ws.on('message', raw => { const m = JSON.parse(raw); if (m.id === 2) { resolve(m.result?.result?.value); ws.close(); } });
    ws.on('error', reject);
    setTimeout(() => { try { ws.close(); } catch {} reject(new Error('timeout')); }, 20000);
  });
}

const wav = `(()=>{const sr=8000,n=sr,buf=new ArrayBuffer(44+n*2),v=new DataView(buf);
const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
ws(0,'RIFF');v.setUint32(4,36+n*2,true);ws(8,'WAVE');ws(12,'fmt ');
v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
ws(36,'data');v.setUint32(40,n*2,true);
for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.sin(i*0.1)*16000,true);
return new Blob([buf],{type:'audio/wav'})})()`;

async function main() {
  console.log('🚀 Starting CDP test on Android emulator...\n');

  // ── 1. LOGIN ──
  console.log('━━━ 1. LOGIN ━━━');
  const login = JSON.parse(await cdpEval(`
    (async () => {
      const r = await fetch('${API}/api/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({identifier:'testuser1',password:'TestPass123!@#'})
      });
      const d = await r.json();
      if(!d.success) return JSON.stringify({ok:false,err:d.message});
      localStorage.setItem('genz_token',d.token);
      localStorage.setItem('genz_refresh_token',d.refreshToken);
      localStorage.setItem('genz_user',JSON.stringify(d.user));
      return JSON.stringify({ok:true,user:d.user.username});
    })()
  `));
  console.log(login.ok ? `  ✅ Login: ${login.user}` : `  ❌ FAIL: ${login.err}`);

  // Navigate to chat
  console.log('  → Navigating to /chat...');
  await cdpEval(`window.location.href='/chat'`);
  await new Promise(r => setTimeout(r, 6000));

  // Reconnect and verify
  const pageCheck = JSON.parse(await cdpEval(`JSON.stringify({url:location.href,token:!!localStorage.getItem('genz_token')})`));
  console.log(`  📍 Page: ${pageCheck.url}, Token: ${pageCheck.token}`);

  if (!pageCheck.token) {
    console.log('  ⚠️ Token lost after navigation — re-injecting...');
    await cdpEval(`
      localStorage.setItem('genz_token','${login.token || ''}');
      localStorage.setItem('genz_user','${JSON.stringify({username:'testuser1'})}');
    `);
  }

  // ── 2. TEXT STATUS ──
  console.log('\n━━━ 2. TEXT STATUS ━━━');
  const r2 = JSON.parse(await cdpEval(`
    (async () => {
      const t=localStorage.getItem('genz_token');
      const r=await fetch('${API}/api/advanced/status',{method:'POST',
        headers:{'Authorization':'Bearer '+t,'Content-Type':'application/json'},
        body:JSON.stringify({type:'text',content:'Habari za CDP! 🔥',backgroundColor:'#00a884',textColor:'#ffffff'})});
      const d=await r.json(); return JSON.stringify({ok:d.success,err:d.message});
    })()
  `));
  console.log(r2.ok ? '  ✅ PASS' : `  ❌ FAIL: ${r2.err}`);

  // ── 3. IMAGE STATUS ──
  console.log('\n━━━ 3. IMAGE STATUS ━━━');
  const r3 = JSON.parse(await cdpEval(`
    (async () => {
      const t=localStorage.getItem('genz_token');
      const c=document.createElement('canvas'); c.width=200; c.height=200;
      const x=c.getContext('2d'); x.fillStyle='#00a884'; x.fillRect(0,0,200,200);
      x.fillStyle='white'; x.font='bold 24px Arial'; x.fillText('Picha',60,110);
      const blob=await new Promise(r=>c.toBlob(r,'image/png'));
      const fd=new FormData(); fd.append('file',blob,'test.png');
      const u=await fetch('${API}/api/media/upload',{method:'POST',headers:{'Authorization':'Bearer '+t},body:fd});
      const ud=await u.json();
      if(!ud.success) return JSON.stringify({ok:false,err:ud.message});
      const sr=await fetch('${API}/api/advanced/status',{method:'POST',
        headers:{'Authorization':'Bearer '+t,'Content-Type':'application/json'},
        body:JSON.stringify({type:'image',content:'Picha CDP 📸',mediaUrl:ud.fileUrl,mediaType:'image/png'})});
      const sd=await sr.json(); return JSON.stringify({ok:sd.success,err:sd.message});
    })()
  `));
  console.log(r3.ok ? '  ✅ PASS' : `  ❌ FAIL: ${r3.err}`);

  // ── 4. LOCATION STATUS ──
  console.log('\n━━━ 4. LOCATION STATUS ━━━');
  const r4 = JSON.parse(await cdpEval(`
    (async () => {
      const t=localStorage.getItem('genz_token');
      const r=await fetch('${API}/api/advanced/status',{method:'POST',
        headers:{'Authorization':'Bearer '+t,'Content-Type':'application/json'},
        body:JSON.stringify({type:'location',content:'Niko DSM 📍',locationData:{lat:-6.7924,lng:39.2083,name:'Dar es Salaam'}})});
      const d=await r.json(); return JSON.stringify({ok:d.success,err:d.message});
    })()
  `));
  console.log(r4.ok ? '  ✅ PASS' : `  ❌ FAIL: ${r4.err}`);

  // ── 5. VOICE STATUS ──
  console.log('\n━━━ 5. VOICE STATUS ━━━');
  const r5 = JSON.parse(await cdpEval(`
    (async () => {
      const t=localStorage.getItem('genz_token');
      const blob=${wav};
      const fd=new FormData(); fd.append('file',blob,'voice.wav');
      const u=await fetch('${API}/api/media/upload',{method:'POST',headers:{'Authorization':'Bearer '+t},body:fd});
      const ud=await u.json();
      if(!ud.success) return JSON.stringify({ok:false,err:ud.message});
      const sr=await fetch('${API}/api/advanced/status',{method:'POST',
        headers:{'Authorization':'Bearer '+t,'Content-Type':'application/json'},
        body:JSON.stringify({type:'voice',content:'Sauti CDP 🎤',mediaUrl:ud.fileUrl,mediaType:'audio/wav'})});
      const sd=await sr.json(); return JSON.stringify({ok:sd.success,err:sd.message});
    })()
  `));
  console.log(r5.ok ? '  ✅ PASS' : `  ❌ FAIL: ${r5.err}`);

  // ── 6. MUSIC STATUS ──
  console.log('\n━━━ 6. MUSIC STATUS ━━━');
  const r6 = JSON.parse(await cdpEval(`
    (async () => {
      const t=localStorage.getItem('genz_token');
      const blob=${wav};
      const fd=new FormData(); fd.append('file',blob,'music.wav');
      const u=await fetch('${API}/api/media/upload',{method:'POST',headers:{'Authorization':'Bearer '+t},body:fd});
      const ud=await u.json();
      if(!ud.success) return JSON.stringify({ok:false,err:ud.message});
      const sr=await fetch('${API}/api/advanced/status',{method:'POST',
        headers:{'Authorization':'Bearer '+t,'Content-Type':'application/json'},
        body:JSON.stringify({type:'music',content:'Muziki CDP 🎵',mediaUrl:ud.fileUrl,mediaType:'audio/wav'})});
      const sd=await sr.json(); return JSON.stringify({ok:sd.success,err:sd.message});
    })()
  `));
  console.log(r6.ok ? '  ✅ PASS' : `  ❌ FAIL: ${r6.err}`);

  // ── 7. VOICE MESSAGE UPLOAD ──
  console.log('\n━━━ 7. VOICE MESSAGE UPLOAD ━━━');
  const r7 = JSON.parse(await cdpEval(`
    (async () => {
      const t=localStorage.getItem('genz_token');
      const blob=${wav};
      const fd=new FormData(); fd.append('file',blob,'voice-msg.wav');
      const u=await fetch('${API}/api/media/upload',{method:'POST',headers:{'Authorization':'Bearer '+t},body:fd});
      const ud=await u.json(); return JSON.stringify({ok:ud.success,err:ud.message,url:ud.fileUrl?.substring(0,50)});
    })()
  `));
  console.log(r7.ok ? `  ✅ PASS (${r7.url})` : `  ❌ FAIL: ${r7.err}`);

  // ── 8. WINGA PRODUCT ──
  console.log('\n━━━ 8. WINGA PRODUCT ━━━');
  const r8 = JSON.parse(await cdpEval(`
    (async () => {
      const t=localStorage.getItem('genz_token');
      const c=document.createElement('canvas'); c.width=200; c.height=200;
      const x=c.getContext('2d'); x.fillStyle='#ff5722'; x.fillRect(0,0,200,200);
      x.fillStyle='white'; x.font='bold 18px Arial'; x.fillText('WINGA',55,105);
      const blob=await new Promise(r=>c.toBlob(r,'image/png'));
      const fd=new FormData(); fd.append('file',blob,'product.png');
      const u=await fetch('${API}/api/media/upload',{method:'POST',headers:{'Authorization':'Bearer '+t},body:fd});
      const ud=await u.json();
      if(!ud.success) return JSON.stringify({ok:false,err:ud.message});
      const pr=await fetch('${API}/api/products',{method:'POST',
        headers:{'Authorization':'Bearer '+t,'Content-Type':'application/json'},
        body:JSON.stringify({name:'Bidhaa CDP',price:15000,description:'Test product',image:ud.fileUrl})});
      const pd=await pr.json();
      const lr=await fetch('${API}/api/products',{headers:{'Authorization':'Bearer '+t}});
      const ld=await lr.json();
      return JSON.stringify({ok:pd.success,products:ld.products?.length,err:pd.message});
    })()
  `));
  console.log(r8.ok ? `  ✅ PASS (${r8.products} products)` : `  ❌ FAIL: ${r8.err}`);

  // ── 9. VERIFY ALL ──
  console.log('\n━━━ 9. FINAL VERIFICATION ━━━');
  const fv = JSON.parse(await cdpEval(`
    (async () => {
      const t=localStorage.getItem('genz_token');
      const [sr,pr]=await Promise.all([
        fetch('${API}/api/advanced/status',{headers:{'Authorization':'Bearer '+t}}),
        fetch('${API}/api/products',{headers:{'Authorization':'Bearer '+t}})
      ]);
      const sd=await sr.json(), pd=await pr.json();
      return JSON.stringify({
        statuses:sd.statuses?.length||0,
        types:[...new Set((sd.statuses||[]).map(s=>s.type))],
        products:pd.products?.length||0
      });
    })()
  `));
  console.log(`  📊 Statuses: ${fv.statuses} — types: ${fv.types?.join(', ')}`);
  console.log(`  📊 Products: ${fv.products}`);

  // ── SCREENSHOT via CDP Page.captureScreenshot ──
  console.log('\n━━━ 10. CAPTURE SCREENSHOT ━━━');
  // Need a fresh WS connection for captureScreenshot
  const targets = await getTargets();
  const page = targets.find(t => t.type === 'page');
  const screenshotData = await new Promise(async (resolve) => {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      setTimeout(() => ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'png' } })), 300);
    });
    ws.on('message', raw => {
      const m = JSON.parse(raw);
      if (m.id === 2 && m.result) { resolve(m.result.data); ws.close(); }
    });
    ws.on('error', () => resolve(null));
    setTimeout(() => { try { ws.close(); } catch {} resolve(null); }, 10000);
  });
  if (screenshotData) {
    require('fs').writeFileSync('.livetest/emulator-screenshot.png', Buffer.from(screenshotData, 'base64'));
    console.log('  📸 Screenshot saved: .livetest/emulator-screenshot.png');
  } else {
    console.log('  ⚠️ Screenshot capture failed');
  }

  // ── SUMMARY ──
  const results = [r2,r3,r4,r5,r6,r7,r8];
  const passed = results.filter(r => r.ok).length;
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏆 FINAL: ${passed}/${results.length} PASSED`);
  if (passed === results.length) {
    console.log('🎉 KILA KITU KAPO SAWA! APK inafanya kazi vizuri!');
  } else {
    console.log('⚠️ Baadhi ya features hazijafanya kazi');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(0);
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
