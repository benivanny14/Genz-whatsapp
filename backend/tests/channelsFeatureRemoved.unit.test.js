/**
 * Regression guard: the Channels feature is gone and must not come back.
 *
 * The feature was deleted (routes, models, socket handlers, admin screens,
 * pages, e2e + smoke-test coverage). This suite fails if any of it is
 * reintroduced, so a rebase/merge cannot silently resurrect dead routes that
 * were never wired into server.js or App.jsx.
 *
 * Deliberately dependency-free (fs + regex, no mongoose, no DB) so it runs in
 * both jest configs: `npm test` and `npm run test:unit`.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BACKEND_ROOT = path.join(REPO_ROOT, 'backend');
const FRONTEND_ROOT = path.join(REPO_ROOT, 'frontend');

// Files that are allowed to reference the removed feature:
//  - this guard itself (it names every symbol it bans)
//  - migration 005, which rewrites legacy 'channel' / 'channel_post' report
//    values to 'other' and therefore has to name them
//  - the migration runbook, whose post-deploy checklist asserts that
//    /api/channels now answers 404
const ALLOWED_FILES = new Set([
  path.join('backend', 'tests', path.basename(__filename)),
  path.join('backend', 'migrations', '005_channel_abuse_reports_to_other.js'),
  path.join('docs', 'MIGRATIONS_RUNBOOK.md'),
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

// Symbols that only ever belonged to the Channels feature.
const BANNED_SOURCE_PATTERNS = [
  { name: 'channel routes module', re: /\bchannelRoutes\b/ },
  { name: 'Channels API path', re: /['"`]\/api\/channels\b/ },
  { name: 'Channels UI route path', re: /['"`]\/channels['"`]/ },
  { name: 'Channel / ChannelPost model', re: /require\([^)]*\bChannel(?:Post)?['"]\)/ },
  { name: 'moderate_channels permission', re: /\bmoderate_channels\b/ },
  { name: 'socket channel rooms', re: /['"`](?:join|leave):channel['"`]/ },
  {
    name: 'socket channel events',
    re: /\b(?:channel:deleted|channel:postDeleted|admin:channel_post)\b/,
  },
  { name: 'Channels admin screen', re: /\bChannelManagement\b/ },
  { name: 'Channels pages', re: /\b(?:Channels|ChannelView)\.jsx\b/ },
];

const REMOVED_FILES = [
  'backend/routes/channelRoutes.js',
  'backend/models/Channel.js',
  'backend/models/ChannelPost.js',
  'frontend/src/pages/Channels.jsx',
  'frontend/src/pages/ChannelView.jsx',
  'frontend/src/components/admin/ChannelManagement.jsx',
];

function collectFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
    } else if (/\.(?:js|jsx|md)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const SCANNED_FILES = [
  ...collectFiles(BACKEND_ROOT),
  ...collectFiles(path.join(FRONTEND_ROOT, 'src')),
  ...collectFiles(path.join(FRONTEND_ROOT, 'e2e')),
  ...collectFiles(path.join(REPO_ROOT, 'docs')),
  path.join(FRONTEND_ROOT, 'test-all-features.js'),
  path.join(REPO_ROOT, 'README.md'),
]
  .filter((file) => fs.existsSync(file))
  .filter((file) => !ALLOWED_FILES.has(path.relative(REPO_ROOT, file)));

describe('removed Channels feature', () => {
  it('scans the source tree (sanity check on the guard itself)', () => {
    expect(SCANNED_FILES.length).toBeGreaterThan(100);
    expect(
      SCANNED_FILES.some((file) => file.endsWith(path.join('backend', 'server.js'))),
    ).toBe(true);
  });

  it.each(BANNED_SOURCE_PATTERNS)('is not referenced anywhere: $name', ({ re }) => {
    const hits = [];

    for (const file of SCANNED_FILES) {
      const content = fs.readFileSync(file, 'utf8');
      content.split(/\r?\n/).forEach((line, index) => {
        if (re.test(line)) {
          hits.push(`${path.relative(REPO_ROOT, file)}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    expect(hits).toEqual([]);
  });

  it.each(REMOVED_FILES)('left no file behind: %s', (relativePath) => {
    expect(fs.existsSync(path.join(REPO_ROOT, relativePath))).toBe(false);
  });

  it('dropped the legacy content types from the AbuseReport enum', () => {
    const model = require('../models/AbuseReport');
    const enumValues = model.schema.path('contentType').enumValues;

    expect(enumValues).not.toContain('channel');
    expect(enumValues).not.toContain('channel_post');
    expect(enumValues).toContain('other');
  });

  it('ships migration 005 that rewrites legacy channel reports', () => {
    const migrationPath = path.join(
      BACKEND_ROOT,
      'migrations',
      '005_channel_abuse_reports_to_other.js',
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const { LEGACY_CONTENT_TYPES } = require('../migrations/005_channel_abuse_reports_to_other');
    expect(LEGACY_CONTENT_TYPES).toEqual(['channel', 'channel_post']);
  });

  it('keeps an "other" label in the admin abuse-report UI', () => {
    const ui = fs.readFileSync(
      path.join(FRONTEND_ROOT, 'src', 'components', 'admin', 'AbuseReports.jsx'),
      'utf8',
    );

    const labelsBlock = ui.slice(ui.indexOf('const CONTENT_TYPE_LABELS'));
    const block = labelsBlock.slice(0, labelsBlock.indexOf('};'));

    expect(block).toContain("other: 'Other'");
    expect(block).not.toMatch(/channel/i);
  });
});
