// CDP helper: evaluate JS in the emulator WebView (connected via `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`).
// Usage: node scripts/cdp-eval.cjs '<expression>'
// Prints the JSON-serialized result value. Requires Node >= 22 (global fetch/WebSocket).
const WebSocket = globalThis.WebSocket;

async function main() {
  const expr = process.argv[2];
  if (!expr) { console.error('usage: node cdp-eval.cjs <expression>'); process.exit(1); }

  const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
  const page = pages.find((p) => p.type === 'page' && p.webSocketDebuggerUrl) || pages[0];
  if (!page) { console.error('no page found'); process.exit(1); }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 30000);
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }
      }));
    });
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 1) {
        clearTimeout(timer);
        if (msg.error) return reject(new Error(JSON.stringify(msg.error)));
        resolve(msg.result);
      }
    });
    ws.addEventListener('error', (event) => reject(new Error(event.message || 'websocket error')));
  });
  ws.close();
  if (result.exceptionDetails) {
    console.error('EXCEPTION:', result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    process.exit(2);
  }
  console.log(typeof result.result.value === 'string' ? result.result.value : JSON.stringify(result.result.value));
}

main().catch((e) => { console.error('ERR:', e.message); process.exit(1); });