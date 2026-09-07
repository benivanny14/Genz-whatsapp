// Step-by-step posting of all status types
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
function cdpEval(wsUrl, expr, timeout = 20000) {
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
      if (msg.id === myId) { ws.close(); resolve(msg.result?.result?.value); }
    };
    ws.onerror = (e) => reject(e);
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout')); }, timeout);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('Connected:', page.url);

  // Get token
  const token = await cdpEval(wsUrl, `localStorage.getItem('authToken') || localStorage.getItem('token') || 'NO'`);
  console.log('Token:', token?.substring(0, 25) + '...');
  if (!token || token === 'NO') { console.log('Not logged in'); return; }

  // Store token
  await cdpEval(wsUrl, `window.__T = '${token}'`);

  // PHOTO
  console.log('\n--- PHOTO STATUS ---');
  try {
    const r1 = await cdpEval(wsUrl, `(async () => {
      const t = window.__T;
      const c = document.createElement('canvas');
      c.width = 400; c.height = 400;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0,0,400,400);
      g.addColorStop(0,'#ff6b6b'); g.addColorStop(0.5,'#4ecdc4'); g.addColorStop(1,'#45b7d1');
      x.fillStyle = g; x.fillRect(0,0,400,400);
      x.fillStyle='white'; x.font='bold 32px sans-serif'; x.textAlign='center';
      x.fillText('Photo Status', 200, 200);
      const b = await new Promise(r => c.toBlob(r, 'image/png'));
      const fd = new FormData(); fd.append('file', b, 'photo.png');
      const u = await fetch('/api/status/upload', { method:'POST', headers:{Authorization:'Bearer '+t}, body:fd });
      const ud = await u.json();
      if (!ud.success) return 'UPLOAD_FAIL: ' + JSON.stringify(ud);
      const s = await fetch('/api/status', { method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},
        body: JSON.stringify({type:'image',content:ud.fileUrl,caption:'Photo test',privacy:'contacts',replySettings:'everyone',quality:'standard',statusDuration:24}) });
      const sd = await s.json();
      return sd.success ? 'OK:'+sd.status?._id : 'FAIL:'+JSON.stringify(sd);
    })()`, 25000);
    console.log('Result:', r1);
  } catch (e) { console.log('Error:', e.message); }

  // VIDEO  
  console.log('\n--- VIDEO STATUS ---');
  try {
    const r2 = await cdpEval(wsUrl, `(async () => {
      const t = window.__T;
      const c = document.createElement('canvas');
      c.width = 320; c.height = 240;
      const x = c.getContext('2d');
      x.fillStyle='#667eea'; x.fillRect(0,0,320,240);
      x.fillStyle='white'; x.font='bold 20px sans-serif'; x.textAlign='center';
      x.fillText('Video Status', 160, 120);
      const s = c.captureStream(1);
      const r = new MediaRecorder(s, {mimeType:'video/webm'});
      const ch = [];
      r.ondataavailable = e => { if(e.data.size>0) ch.push(e.data); };
      return new Promise(res => {
        r.onstop = async () => {
          const b = new Blob(ch, {type:'video/webm'});
          const fd = new FormData(); fd.append('file', b, 'video.webm');
          const u = await fetch('/api/status/upload', { method:'POST', headers:{Authorization:'Bearer '+t}, body:fd });
          const ud = await u.json();
          if (!ud.success) { res('UPLOAD_FAIL:'+JSON.stringify(ud)); return; }
          const s2 = await fetch('/api/status', { method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},
            body: JSON.stringify({type:'video',content:ud.fileUrl,caption:'Video test',privacy:'contacts',replySettings:'everyone',quality:'standard',statusDuration:24}) });
          const sd = await s2.json();
          res(sd.success ? 'OK:'+sd.status?._id : 'FAIL:'+JSON.stringify(sd));
        };
        r.start();
        setTimeout(() => r.stop(), 1000);
      });
    })()`, 25000);
    console.log('Result:', r2);
  } catch (e) { console.log('Error:', e.message); }

  // VOICE
  console.log('\n--- VOICE STATUS ---');
  try {
    const r3 = await cdpEval(wsUrl, `(async () => {
      const t = window.__T;
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const sr = ac.sampleRate, dur = 3, len = sr * dur;
      const buf = ac.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      for (let i=0;i<len;i++) { const ti=i/sr; d[i]=0.3*Math.sin(2*Math.PI*440*ti)*Math.exp(-ti*0.5)+0.15*Math.sin(2*Math.PI*880*ti)*Math.exp(-ti*0.8); }
      const bps=2, ba=bps, br=sr*ba, ds=len*ba;
      const ab=new ArrayBuffer(44+ds); const v=new DataView(ab);
      const ws2=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
      ws2(0,'RIFF');v.setUint32(4,36+ds,true);ws2(8,'WAVE');ws2(12,'fmt ');
      v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
      v.setUint32(24,sr,true);v.setUint32(28,br,true);v.setUint16(32,ba,true);
      v.setUint16(34,16,true);ws2(36,'data');v.setUint32(40,ds,true);
      let off=44; for(let i=0;i<len;i++){const s=Math.max(-1,Math.min(1,d[i]));v.setInt16(off,s<0?s*0x8000:s*0x7fff,true);off+=2;}
      const blob=new Blob([ab],{type:'audio/wav'});
      const fd=new FormData();fd.append('file',blob,'voice.wav');
      const u=await fetch('/api/status/upload',{method:'POST',headers:{Authorization:'Bearer '+t},body:fd});
      const ud=await u.json();
      if(!ud.success)return 'UPLOAD_FAIL:'+JSON.stringify(ud);
      const s2=await fetch('/api/status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},
        body:JSON.stringify({type:'voice',content:ud.fileUrl,caption:'Voice test',privacy:'contacts',replySettings:'everyone',quality:'standard',statusDuration:24})});
      const sd=await s2.json();
      return sd.success?'OK:'+sd.status?._id:'FAIL:'+JSON.stringify(sd);
    })()`, 25000);
    console.log('Result:', r3);
  } catch (e) { console.log('Error:', e.message); }

  // VOICE MESSAGE
  console.log('\n--- VOICE MESSAGE IN CHAT ---');
  try {
    // Navigate to chat first
    await cdpEval(wsUrl, `window.location.hash = '/chat'`);
    await sleep(3000);
    
    // Click bufftest2 conversation
    await cdpEval(wsUrl, `(async () => {
      const els = [...document.querySelectorAll('*')];
      const c = els.find(e => (e.textContent||'').includes('bufftest2') && e.offsetHeight > 0 && e.offsetHeight < 100);
      if (c) c.click();
    })()`);
    await sleep(2000);

    const r4 = await cdpEval(wsUrl, `(async () => {
      const t = window.__T;
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const sr=ac.sampleRate, dur=2, len=sr*dur;
      const buf=ac.createBuffer(1,len,sr);const d=buf.getChannelData(0);
      for(let i=0;i<len;i++){const ti=i/sr;d[i]=0.4*Math.sin(2*Math.PI*330*ti)*(1-ti/dur);}
      const bps=2,ba=bps,br=sr*ba,ds=len*ba;
      const ab=new ArrayBuffer(44+ds);const v=new DataView(ab);
      const ws2=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
      ws2(0,'RIFF');v.setUint32(4,36+ds,true);ws2(8,'WAVE');ws2(12,'fmt ');
      v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
      v.setUint32(24,sr,true);v.setUint32(28,br,true);v.setUint16(32,ba,true);
      v.setUint16(34,16,true);ws2(36,'data');v.setUint32(40,ds,true);
      let off=44;for(let i=0;i<len;i++){const s=Math.max(-1,Math.min(1,d[i]));v.setInt16(off,s<0?s*0x8000:s*0x7fff,true);off+=2;}
      const blob=new Blob([ab],{type:'audio/wav'});
      const fd=new FormData();fd.append('file',blob,'voice-msg.wav');
      const u=await fetch('/api/media/upload',{method:'POST',headers:{Authorization:'Bearer '+t},body:fd});
      const ud=await u.json();
      return ud.success?'VOICE_MSG_OK:'+JSON.stringify({url:ud.fileUrl||ud.url}).substring(0,80):'UPLOAD_FAIL:'+JSON.stringify(ud);
    })()`, 25000);
    console.log('Result:', r4);
  } catch (e) { console.log('Error:', e.message); }

  // VERIFY
  console.log('\n--- VERIFYING ---');
  await cdpEval(wsUrl, `window.location.hash = '/status'`);
  await sleep(3000);
  
  try {
    const verify = await cdpEval(wsUrl, `(async () => {
      const t = window.__T;
      const r = await fetch('/api/status', {headers:{Authorization:'Bearer '+t}});
      const d = await r.json();
      const my = (d.statuses||[]).filter(s => (s.userId?._id||s.userId) === '6a9af830b59765bc43aa768f');
      return my.map(s => s.type + ': ' + (s.content||'').substring(0, 50)).join(' | ');
    })()`, 15000);
    console.log('My statuses:', verify);
  } catch (e) { console.log('Error:', e.message); }

  // Screenshot
  const finalPage = await cdpEval(wsUrl, `document.body?.innerText?.substring(0, 500)`);
  console.log('\nStatus page:', finalPage);
}

main().catch(e => console.error('FATAL:', e.message));
