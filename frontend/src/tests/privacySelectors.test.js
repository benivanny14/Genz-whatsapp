import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// `node --test` cannot import .jsx directly, so we load the components through
// Vite's SSR module loader (already a dev dependency) which transforms JSX.
const here = path.dirname(fileURLToPath(import.meta.url));

let server;
let PrivacyPermissionSelector;
let ContactSelectorScreen;

test.before(async () => {
  server = await createServer({
    configFile: false,
    root: path.resolve(here, '../..'),
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error'
  });
  const selectorMod = await server.ssrLoadModule('/src/components/PrivacyPermissionSelector.jsx');
  const contactMod = await server.ssrLoadModule('/src/components/ContactSelectorScreen.jsx');
  PrivacyPermissionSelector = selectorMod.default;
  ContactSelectorScreen = contactMod.default;
});

test.after(async () => {
  await server?.close();
});

// ── PrivacyPermissionSelector ────────────────────────────────────────────────

const DEFAULT_OPTIONS = ['everyone', 'contacts', 'contacts_except', 'nobody'];

const renderSelector = (props = {}) =>
  ReactDOMServer.renderToStaticMarkup(
    React.createElement(PrivacyPermissionSelector, {
      privacyType: 'last_seen',
      currentValue: 'everyone',
      options: DEFAULT_OPTIONS,
      onChange: () => {},
      ...props
    })
  );

test('PrivacyPermissionSelector renders the label + description for every option', () => {
  const html = renderSelector();
  assert.ok(html.includes('Everyone'));
  assert.ok(html.includes('Anyone on WhatsApp can see this information'));
  assert.ok(html.includes('My Contacts'));
  assert.ok(html.includes('My Contacts Except...'));
  assert.ok(html.includes('Nobody'));
  assert.ok(html.includes('No one can see this information'));
});

test('PrivacyPermissionSelector shows the checkmark on the current value only', () => {
  const html = renderSelector({ currentValue: 'contacts' });
  // The checked circle has the checkmark path (stroke M5 13l4 4L19 7)
  const checkSvg = 'M5 13l4 4L19 7';
  assert.equal((html.match(new RegExp(checkSvg, 'g')) || []).length, 1);
});

test('PrivacyPermissionSelector renders "Only Share With..." when provided', () => {
  const html = renderSelector({ options: [...DEFAULT_OPTIONS, 'only_share_with'] });
  assert.ok(html.includes('Only Share With...'));
  assert.ok(html.includes('Only people you choose can see this information'));
});

test('PrivacyPermissionSelector shows the online sub-section when showOnlineOption is set', () => {
  const html = renderSelector({
    showOnlineOption: true,
    onlineValue: 'same_as_last_seen',
    onOnlineChange: () => {}
  });
  assert.ok(html.includes('Who can see when I')); // React escapes ' → &#x27;
  assert.ok(html.includes('Same as Last Seen'));
  assert.ok(html.includes('Follows your Last Seen privacy setting'));
});

test('PrivacyPermissionSelector renders no online section when disabled', () => {
  const html = renderSelector();
  assert.ok(!html.includes('Who can see when I'));
});

// ── ContactSelectorScreen ────────────────────────────────────────────────────

const CONTACTS = [
  { _id: 'c1', username: 'Alice', phoneNumber: '+255700000001' },
  { _id: 'c2', username: 'Bob', phoneNumber: '+255700000002' },
  { _id: 'c3', name: 'Carol', phone: '+255700000003' }
];

const renderSelectorScreen = (props = {}) =>
  ReactDOMServer.renderToStaticMarkup(
    React.createElement(ContactSelectorScreen, {
      privacyType: 'status',
      selectorType: 'excluded',
      contacts: CONTACTS,
      initialSelectedContacts: [],
      onSave: () => {},
      onClose: () => {},
      ...props
    })
  );

test('ContactSelectorScreen renders header, subtitle and Done button', () => {
  const html = renderSelectorScreen();
  assert.ok(html.includes('Choose Contacts'));
  assert.ok(html.includes('Done'));
  assert.ok(html.includes('Selected (0)'));
  assert.ok(html.includes('should NOT be allowed to see this information'));
});

test('ContactSelectorScreen renders all contacts sorted alphabetically', () => {
  const html = renderSelectorScreen();
  const alice = html.indexOf('Alice');
  const bob = html.indexOf('Bob');
  const carol = html.indexOf('Carol');
  assert.ok(alice !== -1 && bob !== -1 && carol !== -1);
  assert.ok(alice < bob && bob < carol, 'contacts are alphabetically sorted');
});

test('ContactSelectorScreen shows the allowed-mode subtitle for selectorType=allowed', () => {
  const html = renderSelectorScreen({ selectorType: 'allowed' });
  assert.ok(html.includes('should be allowed to see this information'));
});

test('ContactSelectorScreen shows the pre-selected count', () => {
  const html = renderSelectorScreen({ initialSelectedContacts: ['c1'] });
  assert.ok(html.includes('Selected (1)'));
});

test('ContactSelectorScreen shows a phone number and renders Select All', () => {
  const html = renderSelectorScreen();
  assert.ok(html.includes('+255700000001'));
  assert.ok(html.includes('Select All'));
});

test('ContactSelectorScreen renders the empty state for no contacts', () => {
  const html = renderSelectorScreen({ contacts: [] });
  assert.ok(html.includes('No contacts found'));
});

test('ContactSelectorScreen windows large lists (only renders the visible slice)', () => {
  const many = Array.from({ length: 500 }, (_, i) => ({
    _id: `c${i}`,
    username: `Contact ${i}`,
    phoneNumber: `+2557000${String(i).padStart(4, '0')}`
  }));
  const html = renderSelectorScreen({ contacts: many });
  // First alphabetically-sorted row is rendered...
  assert.ok(html.includes('Contact 0'));
  // ...but rows far outside the initial window are not (virtual scrolling).
  assert.ok(!html.includes('Contact 499'));
  assert.ok(html.includes('Select All'));
});

test('ContactSelectorScreen windows the filtered result when searching', () => {
  // Search is internal state; SSR renders the initial window of the full list.
  // This guards that windowing does not break rendering when contacts change.
  const html = renderSelectorScreen({ contacts: [...CONTACTS, { _id: 'c9', username: 'Zed', phoneNumber: '+255700000009' }] });
  assert.ok(html.indexOf('Alice') !== -1);
  assert.ok(html.indexOf('Zed') !== -1);
});
