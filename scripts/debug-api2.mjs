// Debug API calls with simpler return approach
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
      if (msg.id === myId) { ws.close(); resolve(msg.result?.result); }
    };
    ws.onerror = (e) => reject(e);
    setTimeout(() => { ws.close(); reject(new Error('timeout')); }, 20000);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('Connected:', page.url);

  // Test: auth/me
  let r = await cdpEval(wsUrl, `
    (async () => {
      const t = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!t) return 'NO_TOKEN';
      const res = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + t } });
      const data = await res.json();
      return 'me:status=' + res.status + ',success=' + data.success + ',user=' + (data.user?.username || 'none');
    })()
  `);
  console.log('Auth/me:', r?.value);

  // Test: Create text status
  r = await cdpEval(wsUrl, `
    (async () => {
      const t = localStorage.getItem('authToken') || localStorage.getItem('token');
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
        body: JSON.stringify({
          type: 'text',
          content: 'CDP text test ' + Date.now(),
          textStatus: { text: 'CDP text test', backgroundColor: '#128C7E', fontColor: '#FFFFFF', fontStyle: 'sans' },
          privacy: 'contacts',
          replySettings: 'everyone',
          quality: 'standard',
          statusDuration: 24
        })
      });
      const data = await res.json();
      return 'status:status=' + res.status + ',success=' + data.success + ',id=' + (data.status?._id || data.data?.status?._id || 'none') + ',msg=' + (data.message || data.error || 'ok');
    })()
  `);
  console.log('Text status:', r?.value);

  // Test: Upload image
  r = await cdpEval(wsUrl, `
    (async () => {
      const t = localStorage.getItem('authToken') || localStorage.getItem('token');
      const c = document.createElement('canvas');
      c.width = 200; c.height = 200;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0,0,200,200);
      g.addColorStop(0,'#ff6b6b'); g.addColorStop(1,'#4ecdc4');
      x.fillStyle = g; x.fillRect(0,0,200,200);
      x.fillStyle='white'; x.font='bold 24px sans-serif'; x.textAlign='center';
      x.fillText('Photo', 100, 105);
      const b = await new Promise(r => c.toBlob(r, 'image/png'));
      const fd = new FormData(); fd.append('file', b, 'photo.png');
      const res = await fetch('/api/status/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + t }, body: fd });
      const data = await res.json();
      return 'upload:status=' + res.status + ',success=' + data.success + ',url=' + (data.fileUrl || 'none').substring(0, 60) + ',msg=' + (data.message || data.error || 'ok');
    })()
  `);
  console.log('Upload:', r?.value);

  // Test: Create image status with uploaded URL
  r = await cdpEval(wsUrl, `
    (async () => {
      const t = localStorage.getItem('authToken') || localStorage.getItem('token');
      // First upload
      const c = document.createElement('canvas');
      c.width = 300; c.height = 300;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0,0,300,300);
      g.addColorStop(0,'#ff6b6b'); g.addColorStop(0.5,'#4ecdc4'); g.addColorStop(1,'#45b7d1');
      x.fillStyle = g; x.fillRect(0,0,300,300);
      x.fillStyle='white'; x.font='bold 28px sans-serif'; x.textAlign='center';
      x.fillText('Photo Status', 150, 140);
      x.font='16px sans-serif'; x.fillText(new Date().toLocaleTimeString(), 150, 170);
      const b = await new Promise(r => c.toBlob(r, 'image/png'));
      const fd = new FormData(); fd.append('file', b, 'photo.png');
      const uRes = await fetch('/api/status/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + t }, body: fd });
      const uData = await uRes.json();
      if (!uData.success) return 'UPLOAD_FAIL:' + (uData.message || JSON.stringify(uData).substring(0, 100));
      
      // Then create status
      const sRes = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
        body: JSON.stringify({
          type: 'image',
          content: uData.fileUrl,
          caption: 'Photo status test',
          privacy: 'contacts',
          replySettings: 'everyone',
          quality: 'standard',
          statusDuration: 24
        })
      });
      const sData = await sRes.json();
      return 'photo_status:status=' + sRes.status + ',success=' + sData.success + ',id=' + (sData.status?._id || sData.data?.status?._id || 'none') + ',msg=' + (sData.message || sData.error || 'ok');
    })()
  `);
  console.log('Photo status:', r?.value);

  // Test: Create video status
  r = await cdpEval(wsUrl, `
    (async () => {
      const t = localStorage.getItem('authToken') || localStorage.getItem('token');
      const c = document.createElement('canvas');
      c.width = 320; c.height = 240;
      const x = c.getContext('2d');
      x.fillStyle='#667eea'; x.fillRect(0,0,320,240);
      x.fillStyle='white'; x.font='bold 20px sans-serif'; x.textAlign='center';
      x.fillText('Video Status', 160, 120);
      const s = c.captureStream(1);
      const rec = new MediaRecorder(s, {mimeType:'video/webm'});
      const ch = [];
      rec.ondataavailable = e => { if(e.data.size>0) ch.push(e.data); };
      return new Promise(res => {
        rec.onstop = async () => {
          try {
            const b = new Blob(ch, {type:'video/webm'});
            const fd = new FormData(); fd.append('file', b, 'video.webm');
            const uRes = await fetch('/api/status/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + t }, body: fd });
            const uData = await uRes.json();
            if (!uData.success) { res('UPLOAD_FAIL:' + (uData.message || JSON.stringify(uData).substring(0, 80))); return; }
            const sRes = await fetch('/api/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
              body: JSON.stringify({
                type: 'video', content: uData.fileUrl, caption: 'Video status test',
                privacy: 'contacts', replySettings: 'everyone', quality: 'standard', statusDuration: 24
              })
            });
            const sData = await sRes.json();
            res('video_status:status=' + sRes.status + ',success=' + sData.success + ',id=' + (sData.status?._id || sData.data?.status?._id || 'none'));
          } catch (e) { res('ERROR:' + e.message); }
        };
        rec.start();
        setTimeout(() => rec.stop(), 1000);
      });
    })()
  `);
  console.log('Video status:', r?.value);

  // Test: Create voice status
  r = await cdpEval(wsUrl, `
    (async () => {
      const t = localStorage.getItem('authToken') || localStorage.getItem('token');
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const sr=ac.sampleRate, dur=3, len=sr*dur;
      const buf=ac.createBuffer(1,len,sr); const d=buf.getChannelData(0);
      for(let i=0;i<len;i++){const ti=i/sr; d[i]=0.3*Math.sin(2*Math.PI*440*ti)*Math.exp(-ti*0.5)+0.15*Math.sin(2*Math.PI*880*ti)*Math.exp(-ti*0.8);}
      const bps=2,ba=bps,br=sr*ba,ds=len*ba;
      const ab=new ArrayBuffer(44+ds); const v=new DataView(ab);
      const ws2=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
      ws2(0,'RIFF');v.setUint32(4,36+ds,true);ws2(8,'WAVE');ws2(12,'fmt ');
      v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
      v.setUint32(24,sr,true);v.setUint32(28,br,true);v.setUint16(32,ba,true);
      v.setUint16(34,16,true);ws2(36,'data');v.setUint32(40,ds,true);
      let off=44;for(let i=0;i<len;i++){const s=Math.max(-1,Math.min(1,d[i]));v.setInt16(off,s<0?s*0x8000:s*0x7fff,true);off+=2;}
      const blob=new Blob([ab],{type:'audio/wav'});
      const fd=new FormData();fd.append('file',blob,'voice.wav');
      const uRes=await fetch('/api/status/upload',{method:'POST',headers:{Authorization:'Bearer '+t},body:fd});
      const uData=await uRes.json();
      if(!uData.success) return 'UPLOAD_FAIL:'+(uData.message||JSON.stringify(uData).substring(0,80));
      const sRes=await fetch('/api/status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},
        body:JSON.stringify({type:'voice',content:uData.fileUrl,caption:'Voice status test',privacy:'contacts',replySettings:'everyone',quality:'standard',statusDuration:24})});
      const sData=await sRes.json();
      return 'voice_status:status='+sRes.status+',success='+sData.success+',id='+(sData.status?._id||sData.data?.status?._id||'none');
    })()
  `);
  console.log('Voice status:', r?.value);

  // Navigate to status page and check
  await cdpEval(wsUrl, `window.location.hash = '/status'`);
  await sleep(3000);
  
  r = await cdpEval(wsUrl, `
    (() => {
      const text = document.body?.innerText || '';
      const hasMyStatus = text.includes('My Status');
      const noUpdates = text.includes('No status updates') || text.includes('Tap to add');
      return 'page:hasMyStatus=' + hasMyStatus + ',noUpdates=' + noUpdates + ',url=' + location.href;
    })()
  `);
  console.log('Status page:', r?.value);
}

main().catch(e => console.error('FATAL:', e.message));
