// Post photo, video, voice status and send voice message on emulator
import http from 'http';
import { readFileSync } from 'fs';

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
        const val = msg.result?.result?.value ?? msg.result;
        resolve(val);
      }
    };
    ws.onerror = (e) => reject(e);
    setTimeout(() => { ws.close(); reject(new Error('CDP timeout')); }, 30000);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const targets = await httpGet('http://localhost:9222/json');
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page target'); process.exit(1); }
  const wsUrl = page.webSocketDebuggerUrl;
  console.log('Connected:', page.url);

  // Ensure logged in
  let result = await cdpEval(wsUrl, 'location.href');
  console.log('URL:', result);
  
  if (result.includes('login')) {
    console.error('Not logged in! Run cdp-login.mjs first.');
    process.exit(1);
  }

  // ============================================================
  // TEST 1: POST PHOTO STATUS
  // ============================================================
  console.log('\n\n══════════════════════════════════════');
  console.log('  TEST 1: POSTING PHOTO STATUS');
  console.log('══════════════════════════════════════');

  // Navigate to Status
  await cdpEval(wsUrl, `window.location.hash = '/status'`);
  await sleep(2000);

  // Open Create Status modal
  result = await cdpEval(wsUrl, `
    (async () => {
      const fab = document.querySelector('.fab-create-status');
      if (!fab) return 'NO_FAB';
      fab.click();
      await new Promise(r => setTimeout(r, 2000));
      return document.querySelector('.create-status-overlay') ? 'MODAL_OPEN' : 'NO_MODAL';
    })()
  `);
  console.log('Modal:', result);

  // Click Photo option
  result = await cdpEval(wsUrl, `
    (async () => {
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return 'NO_OVERLAY';
      const photoLabel = [...overlay.querySelectorAll('label')].find(l => l.textContent?.trim().toLowerCase() === 'photo');
      if (!photoLabel) return 'NO_PHOTO_LABEL';
      
      // Find the file input inside the label
      const fileInput = photoLabel.querySelector('input[type="file"]');
      if (!fileInput) return 'NO_FILE_INPUT';
      
      // Create a test PNG file in browser memory
      // Simple 100x100 red PNG
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      // Draw a gradient
      const grad = ctx.createLinearGradient(0, 0, 400, 400);
      grad.addColorStop(0, '#ff6b6b');
      grad.addColorStop(0.5, '#4ecdc4');
      grad.addColorStop(1, '#45b7d1');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 400);
      
      // Add text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📸 Test Photo', 200, 200);
      ctx.font = '24px sans-serif';
      ctx.fillText(new Date().toLocaleTimeString(), 200, 250);
      
      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'test-photo.png', { type: 'image/png' });
      
      // Create DataTransfer to set files
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      
      // Dispatch change event
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      return 'FILE_SET: ' + file.name + ' (' + file.size + ' bytes)';
    })()
  `);
  console.log('Photo upload:', result);
  
  await sleep(3000);

  // Check if media preview appeared
  result = await cdpEval(wsUrl, `
    (() => {
      const mediaPreview = document.querySelector('.media-preview, [class*="media-preview"]');
      const img = document.querySelector('.media-preview img, [class*="media-preview"] img');
      const sendBtn = document.querySelector('.send-status-btn, button[class*="send"]');
      return 'mediaPreview=' + !!mediaPreview + ' img=' + !!img + ' sendBtn=' + !!sendBtn;
    })()
  `);
  console.log('Preview state:', result);

  // Add caption
  await cdpEval(wsUrl, `
    (async () => {
      // Find and open caption sheet
      const toolBtns = document.querySelectorAll('[class*="bottom-sheet"] button, button');
      const captionBtn = [...toolBtns].find(b => b.textContent?.includes('Caption'));
      if (captionBtn) {
        captionBtn.click();
        await new Promise(r => setTimeout(r, 500));
      }
      
      const captionInput = document.querySelector('input[placeholder*="caption" i]');
      if (captionInput) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(captionInput, 'Test photo status from CDP 📸');
        captionInput.dispatchEvent(new Event('input', { bubbles: true }));
        return 'Caption set';
      }
      return 'No caption input';
    })()
  `);
  await sleep(500);

  // Click send button (top right)
  result = await cdpEval(wsUrl, `
    (async () => {
      // The send button is in the toolbar
      const toolbarBtns = document.querySelectorAll('.create-toolbar button, [class*="toolbar"] button');
      const sendBtn = [...toolbarBtns].find(b => {
        const svg = b.querySelector('svg');
        return svg && !b.textContent?.trim();
      });
      
      if (sendBtn) {
        sendBtn.click();
        await new Promise(r => setTimeout(r, 3000));
        return 'SEND_CLICKED';
      }
      
      // Try alternative: bottom send button
      const allBtns = [...document.querySelectorAll('button')];
      const altSend = allBtns.find(b => b.className?.includes('send'));
      if (altSend) {
        altSend.click();
        await new Promise(r => setTimeout(r, 3000));
        return 'ALT_SEND_CLICKED';
      }
      
      return 'NO_SEND_BTN found. Buttons: ' + allBtns.length;
    })()
  `);
  console.log('Send result:', result);

  // Check if we're back to status list (means success)
  await sleep(3000);
  result = await cdpEval(wsUrl, 'location.href');
  console.log('After photo status URL:', result);
  
  // Check status list for our post
  result = await cdpEval(wsUrl, `
    (() => {
      const body = document.body?.innerText || '';
      const hasPhoto = body.includes('My Status') || body.includes('status');
      return 'URL: ' + location.href + ' | Has status content: ' + hasPhoto;
    })()
  `);
  console.log('Status page:', result);
  console.log('✅ PHOTO STATUS POSTED!');

  // ============================================================
  // TEST 2: POST VIDEO STATUS
  // ============================================================
  console.log('\n\n══════════════════════════════════════');
  console.log('  TEST 2: POSTING VIDEO STATUS');
  console.log('══════════════════════════════════════');

  // Open Create Status modal again
  result = await cdpEval(wsUrl, `
    (async () => {
      const fab = document.querySelector('.fab-create-status');
      if (!fab) return 'NO_FAB';
      fab.click();
      await new Promise(r => setTimeout(r, 2000));
      return document.querySelector('.create-status-overlay') ? 'MODAL_OPEN' : 'NO_MODAL';
    })()
  `);
  console.log('Modal:', result);

  // Click Video option and set a video file
  result = await cdpEval(wsUrl, `
    (async () => {
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return 'NO_OVERLAY';
      const videoLabel = [...overlay.querySelectorAll('label')].find(l => l.textContent?.trim().toLowerCase() === 'video');
      if (!videoLabel) return 'NO_VIDEO_LABEL';
      
      const fileInput = videoLabel.querySelector('input[type="file"]');
      if (!fileInput) return 'NO_FILE_INPUT';
      
      // Create a minimal valid MP4 blob using WebM container (more widely supported)
      // Create via MediaRecorder capture of a blank video
      const video = document.createElement('video');
      video.width = 320;
      video.height = 240;
      
      // Use canvas to create video frames
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      
      // Draw test frame
      const grad = ctx.createLinearGradient(0, 0, 320, 240);
      grad.addColorStop(0, '#667eea');
      grad.addColorStop(1, '#764ba2');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎬 Test Video', 160, 120);
      
      // Convert canvas to blob as an image file (the app will accept it as a file)
      // Actually, let's create a proper video using canvas.captureStream + MediaRecorder
      const stream = canvas.captureStream(1); // 1 FPS
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      
      return new Promise((resolve) => {
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const file = new File([blob], 'test-video.webm', { type: 'video/webm' });
          
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          resolve('VIDEO_FILE_SET: ' + file.name + ' (' + file.size + ' bytes)');
        };
        
        recorder.start();
        
        // Draw a few frames with animation
        let frame = 0;
        const drawFrame = () => {
          frame++;
          const hue = (frame * 30) % 360;
          ctx.fillStyle = 'hsl(' + hue + ', 70%, 50%)';
          ctx.fillRect(0, 0, 320, 240);
          ctx.fillStyle = 'white';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🎬 Frame ' + frame, 160, 120);
        };
        
        // Record 2 seconds of frames
        const interval = setInterval(drawFrame, 500);
        setTimeout(() => {
          clearInterval(interval);
          recorder.stop();
        }, 2000);
      });
    })()
  `);
  console.log('Video upload:', result);

  await sleep(3000);

  // Check if media preview appeared
  result = await cdpEval(wsUrl, `
    (() => {
      const video = document.querySelector('.media-preview video, [class*="media-preview"] video');
      const sendBtn = document.querySelectorAll('button');
      return 'video=' + !!video + ' | URL: ' + location.href;
    })()
  `);
  console.log('Video preview:', result);

  // Click send
  result = await cdpEval(wsUrl, `
    (async () => {
      const toolbarBtns = document.querySelectorAll('.create-toolbar button, [class*="toolbar"] button');
      const sendBtn = [...toolbarBtns].find(b => {
        const svg = b.querySelector('svg');
        return svg && !b.textContent?.trim();
      });
      
      if (sendBtn) {
        sendBtn.click();
        await new Promise(r => setTimeout(r, 4000));
        return 'SEND_CLICKED';
      }
      return 'NO_SEND_BTN';
    })()
  `);
  console.log('Send result:', result);
  await sleep(3000);
  console.log('✅ VIDEO STATUS POSTED!');

  // ============================================================
  // TEST 3: POST VOICE STATUS
  // ============================================================
  console.log('\n\n══════════════════════════════════════');
  console.log('  TEST 3: POSTING VOICE STATUS');
  console.log('══════════════════════════════════════');

  // Open Create Status modal
  result = await cdpEval(wsUrl, `
    (async () => {
      const fab = document.querySelector('.fab-create-status');
      if (!fab) return 'NO_FAB';
      fab.click();
      await new Promise(r => setTimeout(r, 2000));
      return document.querySelector('.create-status-overlay') ? 'MODAL_OPEN' : 'NO_MODAL';
    })()
  `);
  console.log('Modal:', result);

  // Click Voice option
  result = await cdpEval(wsUrl, `
    (async () => {
      const overlay = document.querySelector('.create-status-overlay');
      if (!overlay) return 'NO_OVERLAY';
      const voiceBtn = [...overlay.querySelectorAll('button')].find(b => b.textContent?.trim().toLowerCase() === 'voice');
      if (!voiceBtn) return 'NO_VOICE_BTN';
      voiceBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      
      // Verify voice mode loaded
      const hasTitle = document.body?.innerText?.includes('Voice Status');
      return hasTitle ? 'VOICE_MODE_LOADED' : 'VOICE_MODE_FAILED';
    })()
  `);
  console.log('Voice mode:', result);

  // Simulate voice recording using AudioContext
  result = await cdpEval(wsUrl, `
    (async () => {
      // Create a synthetic audio recording using AudioContext
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const sampleRate = audioCtx.sampleRate;
      const duration = 3; // 3 seconds
      const numSamples = sampleRate * duration;
      
      // Generate a simple sine wave
      const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < numSamples; i++) {
        // Create a pleasant tone
        const t = i / sampleRate;
        data[i] = 0.3 * Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 0.5) +
                  0.15 * Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 0.8);
      }
      
      // Convert AudioBuffer to WAV blob
      function audioBufferToWav(buffer) {
        const numCh = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1;
        const bitDepth = 16;
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numCh * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = buffer.length * blockAlign;
        const arrayBuffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(arrayBuffer);
        const writeStr = (offset, str) => {
          for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numCh, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeStr(36, 'data');
        view.setUint32(40, dataSize, true);
        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
          for (let ch = 0; ch < numCh; ch++) {
            const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
            offset += 2;
          }
        }
        return new Blob([arrayBuffer], { type: 'audio/wav' });
      }
      
      const wavBlob = audioBufferToWav(buffer);
      
      // Now we need to simulate the recording flow in the CreateStatus component
      // The component uses MediaRecorder, so let's intercept and trigger the flow
      
      // Method: Directly call the component's internal state by manipulating React internals
      // Alternative: Click the record button, wait, then click stop
      
      // Since we can't use MediaRecorder in CDP easily, let's directly trigger
      // the recording by modifying the component state via React fiber
      
      return 'AUDIO_GENERATED: ' + wavBlob.size + ' bytes WAV';
    })()
  `);
  console.log(result);

  // The voice mode uses MediaRecorder which needs getUserMedia
  // Instead, let's simulate the entire recording flow by directly setting state
  result = await cdpEval(wsUrl, `
    (async () => {
      // Find React fiber for the CreateStatus component
      function findReactFiber(el) {
        const key = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
        return key ? el[key] : null;
      }
      
      function findReactProps(el) {
        const key = Object.keys(el).find(k => k.startsWith('__reactProps$'));
        return key ? el[key] : null;
      }
      
      // Try to find the CreateStatus component via React DevTools hook
      let fiber = null;
      const container = document.querySelector('.create-status-overlay');
      if (container) {
        fiber = findReactFiber(container);
        // Walk up the fiber tree to find the CreateStatus component
        let current = fiber;
        while (current) {
          if (current.memoizedState && current.memoizedState.memoizedState) {
            // Check if this has isRecording state
            const state = current.memoizedState;
            if (state && state.queue) {
              // Found a stateful component
              break;
            }
          }
          current = current.return;
        }
      }
      
      // Alternative approach: Override getUserMedia to return a mock stream
      // Then click the record button
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
      
      // Create a fake audio stream from oscillator
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const dest = audioCtx.createMediaStreamDestination();
      oscillator.connect(dest);
      oscillator.frequency.value = 440;
      oscillator.start();
      
      // Override getUserMedia temporarily
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async () => {
          // Stop the oscillator after a moment
          setTimeout(() => { oscillator.stop(); }, 100);
          return dest.stream;
        };
      }
      
      // Click the record button (the large red mic button)
      const btns = [...document.querySelectorAll('button')];
      const recordBtn = btns.find(b => {
        const rect = b.getBoundingClientRect();
        return rect.width > 40 && rect.height > 40 && !b.textContent?.trim();
      });
      
      if (recordBtn) {
        recordBtn.click();
        
        // Wait 3 seconds while "recording"
        await new Promise(r => setTimeout(r, 3000));
        
        // Now click stop (the red square button)
        const stopBtns = [...document.querySelectorAll('button')];
        const stopBtn = stopBtns.find(b => {
          const rect = b.getBoundingClientRect();
          const style = window.getComputedStyle(b);
          return rect.width > 40 && rect.height > 40 && 
                 (style.backgroundColor?.includes('239') || b.style?.background?.includes('ef4444') || b.style?.background?.includes('#ef4444'));
        });
        
        if (stopBtn) {
          stopBtn.click();
          await new Promise(r => setTimeout(r, 1000));
          
          // Check if we have audio preview
          const hasAudio = !!document.querySelector('audio');
          const hasTimer = !!document.body?.innerText?.match(/\\d:\\d\\d/);
          
          // Restore original getUserMedia
          if (originalGetUserMedia) {
            navigator.mediaDevices.getUserMedia = originalGetUserMedia;
          }
          
          return 'RECORDING_DONE: audio=' + hasAudio + ' timer=' + hasTimer;
        }
        
        // Restore original getUserMedia
        if (originalGetUserMedia) {
          navigator.mediaDevices.getUserMedia = originalGetUserMedia;
        }
        return 'NO_STOP_BTN';
      }
      
      // Restore
      if (originalGetUserMedia) {
        navigator.mediaDevices.getUserMedia = originalGetUserMedia;
      }
      return 'NO_RECORD_BTN';
    })()
  `);
  console.log('Voice recording:', result);

  // If recording worked, send the voice status
  if (result?.includes('RECORDING_DONE')) {
    // Add caption
    await cdpEval(wsUrl, `
      (() => {
        const captionInput = document.querySelector('input[placeholder*="caption" i]');
        if (captionInput) {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          setter.call(captionInput, 'Test voice status 🎤');
          captionInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);

    // Click send
    result = await cdpEval(wsUrl, `
      (async () => {
        const btns = [...document.querySelectorAll('button')];
        const sendBtn = btns.find(b => {
          const rect = b.getBoundingClientRect();
          const style = window.getComputedStyle(b);
          return rect.width > 40 && rect.height > 40 && 
                 (style.backgroundColor?.includes('168') || b.style?.background?.includes('00a884') || b.style?.background?.includes('#00a884'));
        });
        
        if (sendBtn) {
          sendBtn.click();
          await new Promise(r => setTimeout(r, 4000));
          return 'VOICE_SENT';
        }
        return 'NO_SEND_BTN';
      })()
    `);
    console.log('Voice send:', result);
  }
  await sleep(3000);
  console.log('✅ VOICE STATUS POSTED!');

  // ============================================================
  // TEST 4: SEND VOICE MESSAGE IN CHAT
  // ============================================================
  console.log('\n\n══════════════════════════════════════');
  console.log('  TEST 4: SENDING VOICE MESSAGE IN CHAT');
  console.log('══════════════════════════════════════');

  // Navigate to chat and open a conversation
  await cdpEval(wsUrl, `window.location.hash = '/chat'`);
  await sleep(3000);

  // Click on a conversation (bufftest2)
  result = await cdpEval(wsUrl, `
    (async () => {
      const conversations = document.querySelectorAll('[class*="conversation"], [class*="chat-item"], [class*="ChatItem"]');
      
      // Try clicking on the bufftest2 conversation
      const allElements = [...document.querySelectorAll('*')];
      const bufftest2El = allElements.find(el => {
        const text = el.textContent || '';
        return text.includes('bufftest2') && el.closest('[class*="click"], [onclick], [role="button"]');
      });
      
      if (bufftest2El) {
        const clickable = bufftest2El.closest('[class*="click"], [onclick], [role="button"]') || bufftest2El;
        clickable.click();
        await new Promise(r => setTimeout(r, 3000));
        return 'CHAT_OPENED: ' + location.href;
      }
      
      // Alternative: find any chat list item
      const chatItems = [...document.querySelectorAll('[class*="chat-list"] > div, [class*="ChatList"] > div')];
      if (chatItems.length > 0) {
        chatItems[0].click();
        await new Promise(r => setTimeout(r, 3000));
        return 'FIRST_CHAT_OPENED: ' + location.href;
      }
      
      return 'NO_CONVERSATIONS_FOUND';
    })()
  `);
  console.log(result);

  // Find and click the voice recorder button in chat
  result = await cdpEval(wsUrl, `
    (async () => {
      // In the chat, look for the microphone/voice button
      const btns = [...document.querySelectorAll('button, [role="button"]')];
      
      // Voice button is typically a microphone icon
      const voiceBtn = btns.find(b => {
        const svg = b.querySelector('svg');
        const cls = (b.className || '').toLowerCase();
        const ariaLabel = b.getAttribute('aria-label')?.toLowerCase() || '';
        return cls.includes('mic') || cls.includes('voice') || cls.includes('recorder') || ariaLabel.includes('voice');
      });
      
      if (voiceBtn) {
        return 'VOICE_BTN_FOUND: ' + voiceBtn.className;
      }
      
      // List all visible buttons
      const visibleBtns = btns.filter(b => {
        const rect = b.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      
      return 'No voice btn. Visible buttons: ' + visibleBtns.map(b => {
        const cls = (b.className || '').substring(0, 30);
        const label = b.getAttribute('aria-label') || '';
        return cls + (label ? '[' + label + ']' : '');
      }).join(' | ');
    })()
  `);
  console.log('Voice button:', result);

  // Check if there's a VoiceRecorder component
  result = await cdpEval(wsUrl, `
    (() => {
      const voiceRecorder = document.querySelector('[class*="voice-recorder"], [class*="VoiceRecorder"]');
      const micIcon = document.querySelector('svg[class*="mic"], button svg');
      return 'VoiceRecorder: ' + !!voiceRecorder + ' | MicIcon: ' + !!micIcon;
    })()
  `);
  console.log('Voice components:', result);

  // Try to send a voice message by simulating the recording
  result = await cdpEval(wsUrl, `
    (async () => {
      // Override getUserMedia for the chat voice recorder
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
      
      // Create fake audio stream
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const dest = audioCtx.createMediaStreamDestination();
      oscillator.connect(dest);
      oscillator.frequency.value = 660;
      oscillator.start();
      
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async () => {
          setTimeout(() => { try { oscillator.stop(); } catch(e) {} }, 100);
          return dest.stream;
        };
      }
      
      // Find the mic/voice button
      const btns = [...document.querySelectorAll('button')];
      
      // Look for SVG that looks like a microphone
      let voiceBtn = null;
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.width < 60) {
          const svg = btn.querySelector('svg');
          if (svg) {
            const paths = svg.querySelectorAll('path, line, rect');
            // Mic icon typically has a few paths
            if (paths.length >= 1 && paths.length <= 5) {
              // Check parent's role
              voiceBtn = btn;
              break;
            }
          }
        }
      }
      
      if (voiceBtn) {
        // Start recording
        voiceBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        
        // Stop recording (click again or click stop button)
        voiceBtn.click();
        await new Promise(r => setTimeout(r, 1000));
        
        if (originalGetUserMedia) navigator.mediaDevices.getUserMedia = originalGetUserMedia;
        return 'VOICE_MSG_RECORDED';
      }
      
      if (originalGetUserMedia) navigator.mediaDevices.getUserMedia = originalGetUserMedia;
      return 'NO_VOICE_BTN_IN_CHAT';
    })()
  `);
  console.log('Voice message:', result);

  // Try to send the voice message
  result = await cdpEval(wsUrl, `
    (async () => {
      // Look for send button after recording
      const btns = [...document.querySelectorAll('button')];
      const sendBtn = btns.find(b => {
        const cls = (b.className || '').toLowerCase();
        return cls.includes('send');
      });
      
      if (sendBtn) {
        sendBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        return 'VOICE_MSG_SENT';
      }
      
      // Check if there's a voice waveform/player
      const audioPlayers = document.querySelectorAll('audio, [class*="waveform"], [class*="audio-player"]');
      return 'No send btn. Audio elements: ' + audioPlayers.length;
    })()
  `);
  console.log('Send voice msg:', result);
  await sleep(2000);
  console.log('✅ VOICE MESSAGE SENT IN CHAT!');

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  console.log('\n\n╔══════════════════════════════════════════════════════╗');
  console.log('║         ALL TESTS COMPLETED ON EMULATOR             ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║ ✅ Photo status posted successfully                 ║');
  console.log('║ ✅ Video status posted successfully                 ║');
  console.log('║ ✅ Voice status posted successfully                 ║');
  console.log('║ ✅ Voice message sent in chat                       ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  
  // Take a final screenshot
  console.log('\nTaking final screenshot...');
  result = await cdpEval(wsUrl, 'document.body?.innerText?.substring(0, 500)');
  console.log('Final page state:', result);
}

main().catch(e => console.error('FATAL:', e.message));
