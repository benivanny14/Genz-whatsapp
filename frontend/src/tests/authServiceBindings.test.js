import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression guard for a bug that broke login and registration in the browser:
//
//   const authService = { clearTokens: () => {...}, login: async () => {
//     clearTokens();          // ← ReferenceError: clearTokens is not defined
//   }};
//
// A bare `clearTokens()` inside the object literal does NOT resolve to the
// sibling method (the methods are arrow properties, so there is no `this`
// either) and there is no module-scope binding — it throws, and every caller's
// catch block turns that into a friendly but useless "Login failed. Please try
// again.". The unit-level auth tests never noticed because they call the HTTP
// API directly; the Playwright e2e suite noticed, and every UI-login spec
// failed with a generic login error.
//
// This scans the real file so an unqualified sibling call cannot come back.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_FILE = path.join(__dirname, '..', 'services', 'authService.js');

test('authService never calls its own methods with an unbound bare identifier', () => {
  const source = fs.readFileSync(SERVICE_FILE, 'utf8');

  // Method names declared as properties of the authService object literal:
  //   login: async (payload) => { ... },
  //   clearTokens: () => { ... },
  const methodNames = [...source.matchAll(/^\s{2}([A-Za-z_$][\w$]*)\s*:/gm)].map((m) => m[1]);
  assert.ok(methodNames.length > 3, `expected to find authService methods, found ${methodNames.length}`);
  assert.ok(methodNames.includes('clearTokens'), 'clearTokens method should exist');

  const unbound = [];
  for (const name of methodNames) {
    // A call site: `name(` not preceded by `.` or `authService.`, i.e. a bare
    // identifier that would resolve (and fail) at module scope.
    const bareCall = new RegExp(`(?<![.\\w$])${name}\\s*\\(`, 'g');
    for (const match of source.matchAll(bareCall)) {
      const before = source.slice(Math.max(0, match.index - 40), match.index);
      if (before.includes('authService.')) continue;
      unbound.push(`${name}() at offset ${match.index}: …${before.trim()}`);
    }
  }

  assert.deepEqual(
    unbound,
    [],
    `authService must qualify its own methods (e.g. authService.clearTokens()):\n${unbound.join('\n')}`
  );
});
