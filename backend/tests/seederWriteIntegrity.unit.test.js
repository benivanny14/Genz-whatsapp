/**
 * Regression guard: seeder/script writes must go through Mongoose models.
 *
 * Raw driver document writes (`db.collection('x').insertOne(...)`,
 * `Message.collection.updateMany(...)`) skip schema validation AND schema
 * defaults. That is not a style preference here — it silently broke the app:
 *
 *   - seeded messages had no `deletedForEveryone`, and
 *     GET /api/chat/conversations/:id/messages filters on
 *     `deletedForEveryone: false` (MongoDB does not match a missing field
 *     against `false`), so the messages existed but never showed up in chat;
 *   - seeded groups had `type: 'group'` + `name` instead of
 *     `isGroup` / `groupName`, so they were never listed as groups.
 *
 * Reads through the driver are fine (and often necessary to inspect fields the
 * schema does not know about) — only mutating document writes are banned.
 *
 * Deliberately dependency-free (fs + regex, no DB) so it runs in both jest
 * configs: `npm test`, `npm run test:ci` and `npm run test:unit`.
 */
const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..');

// Files that may still mutate documents through the driver, with the reason.
// Keep this list short and justified; a stale entry fails the last test below.
const ALLOWED_RAW_WRITERS = {
  'backend/scripts/cleanup-stray-statuses-collection.js':
    'Deletes a stray collection that no model maps to; there is nothing to validate.',
};

const MUTATING_METHODS = [
  'insertOne',
  'insertMany',
  'updateOne',
  'updateMany',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'bulkWrite',
];

const METHODS_PATTERN = MUTATING_METHODS.join('|');

// db.collection('messages').insertOne(...) / db.collection(name).updateOne(...)
const DRIVER_WRITE = new RegExp(
  String.raw`\bcollection\s*\([^)]*\)\s*\.\s*(?:${METHODS_PATTERN})\b`,
);

// Message.collection.updateMany(...) / Status.collection.insertOne(...)
const MODEL_COLLECTION_WRITE = new RegExp(
  String.raw`\b[A-Z]\w*\.collection\s*\.\s*(?:${METHODS_PATTERN})\b`,
);

const SCAN_DIRS = ['scripts', 'migrations'];

function collectScripts(relativeDir) {
  const dir = path.join(BACKEND_ROOT, relativeDir);
  if (!fs.existsSync(dir)) return [];

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectScripts(path.join(relativeDir, entry.name)));
    } else if (/\.(?:js|cjs)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const SCRIPTS = SCAN_DIRS.flatMap(collectScripts);

describe('script and migration writes use Mongoose models', () => {
  it('finds the scripts to scan', () => {
    expect(SCRIPTS.length).toBeGreaterThan(10);
    expect(SCRIPTS.some((file) => file.endsWith('seed-test-data.js'))).toBe(true);
  });

  it.each([
    ['raw driver document writes', DRIVER_WRITE],
    ['raw model-collection document writes', MODEL_COLLECTION_WRITE],
  ])('no %s outside the allowlist', (_label, pattern) => {
    const hits = [];

    for (const file of SCRIPTS) {
      const relative = path.relative(path.join(BACKEND_ROOT, '..'), file).split(path.sep).join('/');
      if (Object.prototype.hasOwnProperty.call(ALLOWED_RAW_WRITERS, relative)) continue;

      fs.readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .forEach((line, index) => {
          const trimmed = line.trim();
          // Comments cannot execute — this guard documents the rule it enforces.
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
          if (pattern.test(line)) {
            hits.push(`${relative}:${index + 1}: ${trimmed}`);
          }
        });
    }

    expect(hits).toEqual([]);
  });

  it('keeps the allowlist accurate (every entry exists)', () => {
    for (const relative of Object.keys(ALLOWED_RAW_WRITERS)) {
      expect(fs.existsSync(path.join(BACKEND_ROOT, relative.replace(/^backend\//, '')))).toBe(true);
    }
  });
});
