import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// `node --test` cannot import .jsx directly, so we load the components through
// Vite's SSR module loader (already a dev dependency) which transforms JSX.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

// MessageComposer transitively imports modules that touch localStorage at
// module-evaluation time (device-id headers), which does not exist under plain
// node. Provide a minimal storage shim before the Vite SSR loader runs (same
// pattern as conversationTags.test.js).
globalThis.localStorage = {
  store: {},
  getItem(key) { return this.store[key] ?? null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; }
};

if (globalThis.navigator) {
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: { ...globalThis.navigator, userAgent: 'node-test', platform: 'test' },
      configurable: true
    });
  } catch {
    // node 22+ exposes a getter-only navigator; the device module falls back
    // to defaults when userAgent is missing, which is fine for this test.
  }
}

let server;
let MessageComposer;

test.before(async () => {
  server = await createServer({
    configFile: false,
    root,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error'
  });
  const composerMod = await server.ssrLoadModule('/src/components/MessageComposer.jsx');
  MessageComposer = composerMod.default;
});

test.after(async () => {
  await server?.close();
});

// ── MessageComposer shield toggle ───────────────────────────────────────────

// Minimal ctx bundle — MessageComposer only branches on isViewOnceEnabled /
// allowScreenshotEnabled for the shield toggle, and the rest must not throw.
const makeCtx = (overrides = {}) => ({
  replyingTo: null, setReplyingTo: () => {},
  showMediaPanel: false, setShowMediaPanel: () => {},
  activeMediaTab: 'emoji', setActiveMediaTab: () => {},
  handleEmojiClick: () => {}, setSelectedMedia: () => {}, selectedMedia: null,
  editingMessage: null, setEditingMessage: () => {},
  setMessageInput: () => {}, messageInput: '', inputRef: { current: null },
  voiceRecorderActive: false, setVoiceRecorderActive: () => {},
  handleFormatText: () => {}, handleSendMessage: (e) => e?.preventDefault?.(),
  showAttachmentMenu: false, setShowAttachmentMenu: () => {},
  isViewOnceEnabled: false, setIsViewOnceEnabled: () => {},
  allowScreenshotEnabled: false, setAllowScreenshotEnabled: () => {},
  handleSchedule: () => {}, attachmentMenuRef: { current: null }, docInputRef: { current: null },
  canSendMedia: true, currentUserIsAdmin: true, openCamera: () => {},
  fileInputRef: { current: null }, openAudioAttachment: () => {},
  openVideoNoteRecorder: () => {}, handleShareLocation: () => {},
  handleContactSimulation: () => {}, canCreatePolls: true, setShowPollModal: () => {},
  handleSetDisappearingMessages: () => {}, selectedConversation: { _id: 'c1' },
  setFloatingStickerMode: () => {}, setShowPaymentModal: () => {},
  mentionState: {}, mentionSuggestions: [], selectMention: () => {},
  handleFileUpload: () => {}, audioInputRef: { current: null }, cameraInputRef: { current: null },
  adminOnlyMessagingEnabled: false, handleTyping: () => {},
  handleMentionKeyDown: () => {}, closeMentionPicker: () => {},
  selectedFont: 'system', setShowFontPicker: () => {}, showFontPicker: false,
  handleVoiceNoteSend: () => {}, safeMods: {}, sendRecordingStatus: null,
  sendButtonRef: { current: null }, showStickerPacks: false, setShowStickerPacks: () => {},
  floatingStickerMode: false, handleSendStickerWithCaption: () => {},
  AttachmentIcon: 'span',
  ...overrides
});

const renderComposer = (ctx) =>
  ReactDOMServer.renderToStaticMarkup(React.createElement(MessageComposer, { ctx }));

const SHIELD_LABEL = 'Toggle screenshot protection for view-once message';

test('MessageComposer hides the shield toggle when view-once mode is OFF', () => {
  const html = renderComposer(makeCtx({ isViewOnceEnabled: false }));
  assert.ok(!html.includes(SHIELD_LABEL), 'shield toggle must not render when view-once is off');
  assert.ok(!html.includes('aria-pressed="true"'), 'no aria-pressed state expected');
});

test('MessageComposer shows the shield toggle only when view-once mode is ON', () => {
  const html = renderComposer(makeCtx({ isViewOnceEnabled: true }));
  assert.ok(html.includes(SHIELD_LABEL), 'shield toggle must render when view-once is on');
  assert.ok(html.includes('aria-pressed="true"'), 'protection defaults to ON (aria-pressed true)');
  assert.ok(html.includes('Screenshot protection ON'), 'title reflects protection ON by default');
});

test('MessageComposer reflects the sender opting OUT of protection (aria-pressed false)', () => {
  const html = renderComposer(
    makeCtx({ isViewOnceEnabled: true, allowScreenshotEnabled: true })
  );
  assert.ok(html.includes(SHIELD_LABEL));
  assert.ok(html.includes('aria-pressed="false"'), 'protection OFF when allowScreenshotEnabled');
  assert.ok(html.includes('Screenshot protection OFF'), 'title reflects protection OFF');
});

// ── ChatContext default for view-once sends ─────────────────────────────────
// Source-level guard (same style as ctxBundles.test.js): every view-once send
// must default allowScreenshot to false unless the sender explicitly opted in.
test('ChatContext defaults allowScreenshot=false for view-once sends', () => {
  const src = fs.readFileSync(path.join(root, 'src/context/ChatContext.jsx'), 'utf8');
  assert.match(
    src,
    /if \(options\.isViewOnce && typeof options\.allowScreenshot !== 'boolean'\)[\s\S]*?allowScreenshot: false/,
    'ChatContext must default allowScreenshot=false for view-once (protection ON)'
  );
  assert.match(
    src,
    /allowScreenshot: typeof options\.allowScreenshot === 'boolean' \? options\.allowScreenshot : undefined/,
    'send payload must pass the sender toggle through when explicitly set'
  );
});
