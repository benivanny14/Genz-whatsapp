/**
 * Regression guard: a conversation's display name must come from `groupName`.
 *
 * The `Conversation` schema has no `name` path — groups are `groupName` and
 * private chats are named after the other participant. Code that read `.name`
 * compiled fine and failed silently: analytics, chat search, chat sorting,
 * exports, the file manager and admin dashboards all showed "Unknown" / "" /
 * "Group chat" for every group.
 *
 * Two layers here:
 *   1. unit tests for `utils/conversationName.js` (the shared resolver);
 *   2. a static scan that fails on any new `<conversation-ish>.name` read that
 *      does not also consider `groupName`.
 *
 * Dependency-free (fs + regex), so it runs in every jest config.
 */
const fs = require('fs');
const path = require('path');

const { getConversationName } = require('../utils/conversationName');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BACKEND_ROOT = path.join(REPO_ROOT, 'backend');
const FRONTEND_SRC = path.join(REPO_ROOT, 'frontend', 'src');

// The resolver itself legitimately reads the legacy `name` field.
const ALLOWED_FILES = new Set([
  'backend/utils/conversationName.js',
  'backend/tests/conversationName.unit.test.js',
]);

const SKIP_DIRS = new Set([
  'node_modules',
  'coverage',
  'dist',
  'build',
  '.git',
  'android',
  'ios',
  '.kotlin',
]);

// Variables that hold a conversation object or payload.
const CONVERSATION_VARIABLES = [
  'conv',
  'conversation',
  'targetConv',
  'selectedConversation',
  'otherConversation',
];

// `.name` on a conversation is only acceptable when the same line also looks at
// `groupName` (legacy fallback) or hands the object to the shared resolver.
const BARE_NAME_READ = new RegExp(
  String.raw`\b(?:${CONVERSATION_VARIABLES.join('|')})\.name\b`,
);

function collectFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, out);
    else if (/\.(?:js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const SCANNED_FILES = [
  ...collectFiles(path.join(BACKEND_ROOT, 'controllers')),
  ...collectFiles(path.join(BACKEND_ROOT, 'routes')),
  ...collectFiles(path.join(BACKEND_ROOT, 'services')),
  ...collectFiles(path.join(BACKEND_ROOT, 'socket')),
  ...collectFiles(path.join(BACKEND_ROOT, 'utils')),
  ...collectFiles(FRONTEND_SRC),
].filter((file) => {
  const relative = path.relative(REPO_ROOT, file).split(path.sep).join('/');
  return !ALLOWED_FILES.has(relative);
});

describe('getConversationName', () => {
  it('prefers groupName for groups', () => {
    expect(getConversationName({ isGroup: true, groupName: 'Wana JF', name: 'Legacy' }, 'Group'))
      .toBe('Wana JF');
  });

  it('falls back to the legacy name field', () => {
    expect(getConversationName({ isGroup: true, name: 'Legacy Seeded Group' }, 'Group'))
      .toBe('Legacy Seeded Group');
  });

  it('falls back to the caller-supplied name (private chats)', () => {
    expect(getConversationName({ isGroup: false }, 'amara')).toBe('amara');
    expect(getConversationName({ isGroup: false, groupName: '' }, 'amara')).toBe('amara');
  });

  it('ignores blank and non-string names', () => {
    expect(getConversationName({ groupName: '   ' }, 'Group')).toBe('Group');
    expect(getConversationName({ name: null }, 'Group')).toBe('Group');
    expect(getConversationName({ groupName: 42 }, 'Group')).toBe('Group');
  });

  it('survives missing input', () => {
    expect(getConversationName(undefined, 'Chat')).toBe('Chat');
    expect(getConversationName(null)).toBe('');
  });
});

describe('conversation names are read from groupName', () => {
  it('scans the source tree (sanity check on the guard itself)', () => {
    expect(SCANNED_FILES.length).toBeGreaterThan(100);
  });

  it('has no bare `<conversation>.name` reads', () => {
    const hits = [];

    for (const file of SCANNED_FILES) {
      const relative = path.relative(REPO_ROOT, file).split(path.sep).join('/');

      fs.readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .forEach((line, index) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
          if (!BARE_NAME_READ.test(line)) return;
          // `conv.groupName || conv.name` and resolver calls are fine.
          if (line.includes('groupName') || line.includes('getConversationName')) return;
          hits.push(`${relative}:${index + 1}: ${trimmed}`);
        });
    }

    expect(hits).toEqual([]);
  });

  it('populates groupName whenever a conversation is populated', () => {
    const hits = [];
    const populateWithoutGroupName = /populate\(\s*['"]conversationId['"]\s*,\s*['"][^'"]*['"]\s*\)/g;
    const objectPopulatePath = /path:\s*['"]conversationId['"]/;

    for (const file of SCANNED_FILES) {
      const relative = path.relative(REPO_ROOT, file).split(path.sep).join('/');
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

      lines.forEach((line, index) => {
        for (const match of line.matchAll(populateWithoutGroupName)) {
          if (!match[0].includes('groupName')) {
            hits.push(`${relative}:${index + 1}: ${line.trim()}`);
          }
        }

        // Object form: `path: 'conversationId'` with a `select` a few lines
        // below must also ask for groupName.
        if (objectPopulatePath.test(line)) {
          const window = lines.slice(index, index + 5).join('\n');
          const select = window.match(/select:\s*['"]([^'"]*)['"]/);
          if (!select || !select[1].includes('groupName')) {
            hits.push(`${relative}:${index + 1}: ${line.trim()}`);
          }
        }
      });
    }

    expect(hits).toEqual([]);
  });

  // Verified behaviour: chaining `.populate('conversationId.participants', …)`
  // leaves participants as raw ObjectIds (no usernames), so private chats show
  // no name. The nested object form works.
  it('populates nested participants through the object form', () => {
    const hits = [];
    const chainedNestedPopulate = /\.populate\(\s*['"]conversationId\.participants['"]/;

    for (const file of SCANNED_FILES) {
      const relative = path.relative(REPO_ROOT, file).split(path.sep).join('/');

      fs.readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .forEach((line, index) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
          if (chainedNestedPopulate.test(line)) {
            hits.push(`${relative}:${index + 1}: ${trimmed}`);
          }
        });
    }

    expect(hits).toEqual([]);
  });
});
