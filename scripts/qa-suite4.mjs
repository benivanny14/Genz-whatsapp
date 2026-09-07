// qa-suite4 — v1.1.22 regression suite on the live emulator app.
// Fixes over qa-suite3: correct REST path (/chat/messages), status share button
// is icon-only (button.send-status-btn), group-create assertion (no innerText
// for placeholders), schedule button matched by visible text ("Schedule message").
import { connect, installInstrumentation, evalJS, navTo, sleep, drainErrors } from './qa-driver-lib.mjs';
import { writeFileSync } from 'node:fs';
const API = 'http://localhost:5000/api';
const REPORT = [];
const log = (s, step, d) => { const l = '[' + s + '] ' + step + ' :: ' + d; REPORT.push(l); console.log(l); };
const pass = (s, d) => log('PASS', s, d);
const fail = (s, d) => log('FAIL', s, d);
const info = (s, d) => log('INFO', s, d);

const acFetch = (url, opts = {}, ms = 8000) => { const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), ms); return fetch(url, { ...opts, signal: ctl.signal }).finally(() => clearTimeout(to)); };
async function apiGet(t, p) { const r = await acFetch(API + p, { headers: { Authorization: 'Bearer ' + t } }); return r.json(); }
async function apiPost(t, p, b) { const r = await acFetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(b || {}) }); return { status: r.status, json: await r.json().catch(() => ({})) }; }
async function apiDelete(t, p) { const r = await acFetch(API + p, { method: 'DELETE', headers: { Authorization: 'Bearer ' + t } }); return { status: r.status, json: await r.json().catch(() => ({})) }; }

const cdp = await Promise.race([connect(), new Promise((_, rej) => setTimeout(() => rej(new Error('cdp connect timeout')), 25000))]);
await Promise.race([installInstrumentation(cdp), new Promise((_, rej) => setTimeout(() => rej(new Error('instrumentation timeout')), 20000))]);

// Time-bounded eval so a frozen page can't hang the whole suite.
const safeEval = (expr, ms = 30000) => Promise.race([
  evalJS(cdp, expr),
  new Promise((_, rej) => setTimeout(() => rej(new Error('eval timeout ' + ms + 'ms')), ms)),
]);
const { appendFileSync } = await import('node:fs');
const runTest = async (name, fn) => {
  console.log('--- running ' + name + ' ---');
  const t0 = Date.now();
  try { await fn(); } catch (e) { fail('RUNNER-' + name, 'exception ' + (e && e.message ? e.message : e)); }
  try { appendFileSync('scripts/qa-progress4.txt', name + ' done in ' + Math.round((Date.now() - t0) / 1000) + 's\n'); } catch { /* ignore */ }
};

// Navigate between SPA routes via pushState (no full reload), falling back to a
// hard navigation if the router ignores it, then wait for real content (not
// "Loading GENZ..."). Keeps the WebView from wedging under reload storms.
async function navStable(path, waitMs = 3000) {
  try {
    await safeEval('history.pushState({}, \'\', ' + JSON.stringify(path) + '); window.dispatchEvent(new PopStateEvent(\'popstate\'));', 6000);
    await sleep(2600);
    const reached = await safeEval('location.pathname', 6000).catch(() => 'ERR');
    if (String(reached).replace(/\/$/, '') !== String(path).replace(/\/$/, '')) {
      await safeEval('location.href = ' + JSON.stringify(path), 5000).catch(() => {});
      await sleep(waitMs);
    }
  } catch {
    await safeEval('location.href = ' + JSON.stringify(path), 5000).catch(() => {});
    await sleep(waitMs);
  }
  // wait for the route content to mount
  const t0 = Date.now();
  while (Date.now() - t0 < 12000) {
    const st = await safeEval('JSON.stringify({ loading: document.body.innerText.indexOf("Loading GENZ") >= 0, len: document.body.innerText.length })', 8000).then((s) => JSON.parse(s)).catch(() => ({ loading: true, len: 0 }));
    if (!st.loading && st.len > 60) return;
    await sleep(700);
  }
  // still stuck: one hard reload
  try { await safeEval('location.reload()', 4000); } catch { /* ignore */ }
  await sleep(6000);
}
const mountReady = async (ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const st = await safeEval('JSON.stringify({ loading: document.body.innerText.indexOf("Loading GENZ") >= 0 })', 8000).then((s) => JSON.parse(s)).catch(() => ({ loading: true }));
    if (!st.loading) return true;
    await sleep(600);
  }
  return false;
};

// ── T1 realtime two-user (bufftest2 -> bufftest1 live receive + list preview) ──
async function t1(token2) {
  const step = 'T1 realtime two-user';
  const convs = await apiGet(token2, '/chat/conversations');
  const conv = (convs.conversations || []).find((c) => !c.isGroup && (c.participants || []).some((p) => p && p.username === 'bufftest1'));
  info(step, 'directConv=' + !!conv + ' total=' + (convs.conversations || []).length);
  if (!conv) { fail(step, 'no direct bufftest1 conv for bufftest2: ' + JSON.stringify(convs).slice(0, 200)); return; }
  await navStable('/chat');
  const opened = await safeEval( `(async () => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').indexOf('bufftest2') === 0 && x.textContent.length < 120);
    if (!b) return JSON.stringify({ ok: false });
    b.click();
    await new Promise((r) => setTimeout(r, 3000));
    return JSON.stringify({ ok: true, hasComposer: !!Array.from(document.querySelectorAll('input')).find((i) => i.placeholder === 'Type a message...' && i.offsetWidth > 0) });
  })()`);
  info(step + ' open', opened);
  const uniq = 'live-msg-' + Date.now();
  const m1 = await apiPost(token2, '/chat/messages', { conversationId: conv._id, content: uniq });
  info(step + ' send', m1.status + ' ' + JSON.stringify(m1.json).slice(0, 80));
  const seen = await safeEval( `(async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 8000) {
      if (document.body.innerText.indexOf(${JSON.stringify(uniq)}) >= 0) return JSON.stringify({ seen: true, ms: Date.now() - t0 });
      await new Promise((r) => setTimeout(r, 500));
    }
    return JSON.stringify({ seen: false });
  })()`);
  info(step + ' seen', seen);
  await navStable('/chat');
  const uniq2 = 'snd-' + Date.now();
  await apiPost(token2, '/chat/messages', { conversationId: conv._id, content: uniq2 });
  const list = await safeEval( `(async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 8000) {
      if (document.body.innerText.indexOf(${JSON.stringify(uniq2)}) >= 0) return JSON.stringify({ has: true, ms: Date.now() - t0 });
      await new Promise((r) => setTimeout(r, 500));
    }
    return JSON.stringify({ has: false });
  })()`);
  info(step + ' list', list);
  const s = JSON.parse(seen), lj = JSON.parse(list);
  (s.seen && lj.has) ? pass(step, 'live receive + list preview OK') : fail(step, 'seen=' + s.seen + ' list=' + lj.has);
}

// ── T2 status text create (v1.1.22 flow, icon-only send button) ──
async function t2(token1) {
  const step = 'T2 status text create';
  await navStable('/status');
  await mountReady();  const res = await safeEval(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    // entry point differs: fresh user sees a "Create Status" button; a user with an
    // existing status gets the circular + (fab-create-status) / add-status-badge.
    let createBtn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Create Status' && b.offsetWidth > 0);
    out.createBtn = !!createBtn;
    if (!createBtn) {
      createBtn = document.querySelector('button.fab-create-status') || document.querySelector('.add-status-badge');
      out.fab = !!createBtn;
    }
    if (!createBtn) return JSON.stringify(out);
    createBtn.click();
    await wait(1800);
    const textOpt = Array.from(document.querySelectorAll('button.create-option,button')).find((el) => (el.textContent || '').trim() === 'Text' && el.offsetWidth > 0);
    out.textOpt = !!textOpt;
    if (textOpt) { textOpt.click(); await wait(1800); }
    const area = Array.from(document.querySelectorAll('textarea')).find((i) => i.placeholder === 'Type a status...' && i.offsetWidth > 0);
    out.area = !!area;
    const content = 'QA status text ' + Date.now();
    if (area) {
      const p = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      p.call(area, content);
      area.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(900);
      const sendBtn = document.querySelector('button.send-status-btn');
      out.sendDisabled = sendBtn ? sendBtn.disabled : null;
      if (sendBtn && !sendBtn.disabled) { sendBtn.click(); out.shared = true; }
      await wait(4000);
      out.bodyN = document.body.innerText.slice(0, 300);
      out.content = content;
    }
    return JSON.stringify(out);
  })()`);
  info(step, res);
  const j = JSON.parse(res);
  // poll server-side for the exact status content
  let found = false;
  for (let i = 0; i < 6 && !found; i++) {
    const myStatus = await apiGet(token1, '/status/my-status').catch((e) => ({ err: e.message }));
    const list = Array.isArray(myStatus) ? myStatus : (myStatus.statuses || myStatus.data || []);
    found = (list || []).some((s) => ((s.content || s.text || '') + '').indexOf('QA status text') >= 0);
    if (!found) await sleep(2000);
  }
  info(step + ' server', 'found=' + found);
  (j.textOpt && j.area && j.shared && found) ? pass(step, 'status shared + persisted server-side') : fail(step, res.slice(0, 400) + ' serverFound=' + found);
}

// ── T3 group create (assert via system message, not composer placeholder) ──
async function t3() {
  const step = 'T3 group create';
  await navStable('/new-group');
  await mountReady();
  const res = await safeEval( `(async () => {
    const out = {};
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const setIn = (el, v) => { setter.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    const search = Array.from(document.querySelectorAll('input')).find((i) => /search|jina|name/i.test(i.placeholder || ''));
    out.search = !!search;
    if (search) {
      setIn(search, 'bufftest2');
      await wait(1800);
      const hit = Array.from(document.querySelectorAll('button,div,label,li')).find((el) => {
        const t = (el.textContent || '').trim();
        return t.indexOf('bufftest2') === 0 && t.length < 80 && el.offsetWidth > 0 && el.getBoundingClientRect().height > 15;
      });
      out.hit = !!hit;
      if (hit) { hit.click(); await wait(900); }
    }
    let nextB = null;
    for (let i = 0; i < 8 && !nextB; i++) {
      nextB = Array.from(document.querySelectorAll('button')).find((b) => /next|forward/i.test(((b.textContent || '') + ' ' + (b.getAttribute('aria-label') || '')).trim()) && b.offsetWidth > 0);
      if (!nextB) await wait(600);
    }
    out.next = !!nextB;
    if (nextB) { nextB.click(); await wait(2200); }
    const nameIn = Array.from(document.querySelectorAll('input,textarea')).find((i) => i.offsetWidth > 0);
    const grpName = 'QA-Grp-' + Date.now().toString().slice(-5);
    if (nameIn) {
      const p = Object.getOwnPropertyDescriptor(nameIn.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set;
      p.call(nameIn, grpName);
      nameIn.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(800);
    }
    out.grpName = grpName;
    let createB = null;
    for (let i = 0; i < 8 && !createB; i++) {
      createB = Array.from(document.querySelectorAll('button')).find((b) => /create group|create|hifadhi|save|next/i.test(((b.textContent || '') + ' ' + (b.getAttribute('aria-label') || '')).trim()) && b.offsetWidth > 0);
      if (!createB) await wait(600);
    }
    out.create = !!createB;
    if (createB) { createB.click(); await wait(5000); }
    out.finalBody = document.body.innerText.slice(0, 500);
    out.url = location.href;
    return JSON.stringify(out);
  })()`);
  info(step, res);
  const j = JSON.parse(res);
  (j.create && j.finalBody.indexOf(j.grpName) >= 0 && j.finalBody.indexOf('created the group') >= 0) ? pass(step, 'group chat opened with system message') : fail(step, res.slice(0, 400));
}

// ── T4 winga post (real publish: category + photo + submit) + search ──
async function t4(token1) {
  const step = 'T4 winga post + search';
  const { resolve } = await import('node:path');
  const imgPath = resolve('scripts/qa-pixel.png');
  await navStable('/winga');
  await mountReady();
  const res = await safeEval(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    const title = 'QA T-Shirt ' + Date.now().toString().slice(-5);
    const postTop = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Post' && b.offsetWidth > 0);
    if (!postTop) return JSON.stringify({ ok: false, stage: 'no-post' });
    postTop.click();
    await wait(2200);
    out.formOpen = !!document.querySelector('[data-testid="winga-submit-post"]');
    const catBtn = Array.from(document.querySelectorAll('[data-testid^="post-category-"]')).find((b) => b.offsetWidth > 0);
    out.catBtn = !!catBtn;
    if (catBtn) { catBtn.click(); out.cat = catBtn.textContent.trim().slice(0, 30); await wait(500); }
    const inputs = Array.from(document.querySelectorAll('input,textarea')).filter((i) => i.offsetWidth > 0);
    const set = (el, v) => { const p = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    const tIn = inputs.find((i) => (i.placeholder || '').indexOf('Mfano:') >= 0);
    const pIn = inputs.find((i) => (i.placeholder || '').indexOf('250,000') >= 0);
    const dIn = inputs.find((i) => i.tagName === 'TEXTAREA');
    if (tIn) set(tIn, title);
    if (pIn) set(pIn, '5000');
    if (dIn) set(dIn, 'QA winga desc');
    out.filled = !!(tIn && pIn && dIn);
    out.title = title;
    return JSON.stringify(out);
  })()`);
  info(step + ' fill', res);
  const j = JSON.parse(res);
  // attach the test image through the real file input via the DOM domain
  let fileAttached = false;
  try {
    await cdp.send('DOM.enable');
    const doc = await cdp.send('DOM.getDocument', { depth: -1 });
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"][accept^="image"]' });
    if (nodeId) {
      await cdp.send('DOM.setFileInputFiles', { nodeId, files: [imgPath] });
      fileAttached = true;
    }
  } catch (e) { info(step + ' file', 'err ' + e.message); }
  await sleep(5000); // media upload
  const pub = await safeEval(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    out.thumbs = Array.from(document.querySelectorAll('img')).filter((i) => i.src && /(uploads|blob|data:)/.test(i.src) && i.getBoundingClientRect().width > 0).length;
    const btn = document.querySelector('[data-testid="winga-submit-post"]');
    out.btn = !!btn;
    if (btn) { btn.click(); out.clicked = true; }
    await wait(6000);
    out.bodyN = document.body.innerText.slice(0, 200);
    out.modalGone = !document.querySelector('[data-testid="winga-submit-post"]');
    return JSON.stringify(out);
  })()`);
  info(step + ' publish', pub);
  const p = JSON.parse(pub);
  // poll server: listing under the publisher's myListings
  let serverOk = false;
  for (let i = 0; i < 8 && !serverOk; i++) {
    const feed = await apiGet(token1, '/winga').catch((e) => ({}));
    const mine = feed.myListings || [];
    serverOk = mine.some((l) => (l.title || '') === j.title);
    if (!serverOk) await sleep(2000);
  }
  info(step + ' server', 'myListings found=' + serverOk);
  const passed = j.formOpen && j.catBtn && j.filled && fileAttached && p.clicked && p.modalGone && serverOk;
  passed ? pass(step, 'listing created + persisted server-side') : fail(step, 'form=' + j.formOpen + ' cat=' + j.catBtn + ' file=' + fileAttached + ' pub=' + (p.clicked && p.modalGone) + ' server=' + serverOk);
}

// ── T5 schedule message (type draft -> Schedule -> set time -> confirm) ──
async function t5(token1) {
  const step = 'T5 schedule message';
  await navStable('/chat');
  await mountReady();
  const res = await safeEval( `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    const selfRow = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').indexOf('You') === 0 && b.textContent.length < 220);
    if (selfRow) { selfRow.click(); await wait(2500); }
    const draft = 'QA-sched-' + Date.now().toString().slice(-6);
    const inp = Array.from(document.querySelectorAll('input')).find((i) => i.placeholder === 'Type a message...' && i.offsetWidth > 0);
    out.inp = !!inp;
    if (!inp) return JSON.stringify(out);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(inp, draft);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(700);
    const more = Array.from(document.querySelectorAll('button')).find((b) => (b.getAttribute('aria-label') || '') === 'More formatting options' && b.offsetWidth > 0);
    if (more) { more.click(); await wait(900); }
    const sched = Array.from(document.querySelectorAll('button,[role="button"]')).find((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && ((b.textContent || '') + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase().indexOf('schedule') >= 0;
    });
    out.sched = !!sched;
    if (!sched) return JSON.stringify(out);
    sched.click();
    await wait(1800);
    const dt = Array.from(document.querySelectorAll('input[type="datetime-local"]')).find((i) => i.offsetWidth > 0);
    out.dtInp = !!dt;
    if (dt) {
      const d = new Date(Date.now() + 15 * 60 * 1000);
      const pad = (n) => String(n).padStart(2, '0');
      const v = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      const sp = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      sp.call(dt, v);
      dt.dispatchEvent(new Event('input', { bubbles: true }));
      dt.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(700);
    }
    const confirm = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').indexOf('⏰') >= 0 && b.textContent.trim().indexOf('Schedule') >= 0 && b.offsetWidth > 0);
    out.confirm = !!confirm;
    if (confirm) { confirm.click(); out.confirmed = true; }
    await wait(2500);
    out.draft = draft;
    out.bodyN = document.body.innerText.slice(0, 250);
    out.areaGone = !Array.from(document.querySelectorAll('input')).find((i) => i.placeholder === 'Type a message...' && i.offsetWidth > 0) || (document.body.innerText.indexOf('Schedule Message') < 0);
    return JSON.stringify(out);
  })()`);
  info(step, res);
  const j = JSON.parse(res);
  let serverOk = false;
  if (j.confirmed && j.draft) {
    const list = await apiGet(token1, '/scheduled-messages').catch((e) => ({ err: e.message }));
    const items = (list && list.scheduledMessages) || (Array.isArray(list) ? list : []);
    serverOk = (items || []).some((m) => (m.content || '') === j.draft && m.status === 'scheduled');
    info(step + ' server', 'scheduled count=' + (items || []).length + ' found=' + serverOk);
    const mine = (items || []).filter((m) => (m.content || '') === j.draft);
    if (mine.length) {
      const id = mine[0]._id || mine[0].id;
      if (id) { const del = await apiDelete(token1, '/scheduled-messages/' + id); info(step + ' cleanup', 'delete ' + del.status); }
    }
  }
  (j.inp && j.sched && j.dtInp && j.confirmed && serverOk) ? pass(step, 'scheduled msg created + persisted + cleaned up') : fail(step, res.slice(0, 500));
}

const { login: qaLogin } = await import('./qa-auth.mjs');
const tokens = {};
const need = async (u) => (tokens[u] || (tokens[u] = await qaLogin(u)));
const only = (process.env.QA_RUN || '').split(',').filter(Boolean);
const run = (name, fn) => { if (only.length && !only.includes(name)) return; return runTest(name, fn); };
await run('T1', () => t1(need('bufftest2')));
await run('T2', () => t2(need('bufftest1')));
await run('T3', () => t3());
await run('T4', () => t4(need('bufftest1')));
await run('T5', () => t5(need('bufftest1')));
const errs = await safeEval('(() => { const e = window.__qa ? { errors: window.__qa.errors, failed: window.__qa.failed } : { errors: [], failed: [] }; if (window.__qa) { window.__qa.errors = []; window.__qa.failed = []; } return JSON.stringify(e); })()', 8000).then((v) => { try { return v ? JSON.parse(v) : { errors: [], failed: [] }; } catch { return { errors: [], failed: [] }; } }).catch(() => ({ errors: [], failed: [] }));
info('SESSION ERRORS', JSON.stringify(errs).slice(0, 1200));
writeFileSync('scripts/qa-results4.txt', REPORT.join('\n'));
console.log('----- SUMMARY -----');
console.log(REPORT.join('\n'));
cdp.close();
