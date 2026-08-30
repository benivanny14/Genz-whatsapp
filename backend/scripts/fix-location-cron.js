#!/usr/bin/env node
const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

const anchor = 'Error cleaning up expired messages';
const idx = c.indexOf(anchor);
if (idx >= 0) {
  const catchStart = c.lastIndexOf('} catch', idx);
  const block = [
    '',
    '      // L-01: Clean up expired live locations (auto-expire: 15min/1hr/8hr)',
    '      try {',
    "        const LocationUser = require('./models/User');",
    "        await LocationUser.updateMany(",
    "          { 'liveLocations.status': 'active', 'liveLocations.expiresAt': { $lte: now } },",
    "          { $set: { 'liveLocations.$[elem].status': 'expired' } },",
    "          { arrayFilters: [{ 'elem.status': 'active', 'elem.expiresAt': { $lte: now } }] }",
    '        );',
    '      } catch (locErr) {',
    '        // Non-critical — liveLocations cleanup',
    '      }',
    ''
  ].join('\n');

  c = c.slice(0, catchStart) + block + c.slice(catchStart);
  fs.writeFileSync('server.js', c, 'utf8');
  console.log('L-01: Added location cleanup to cron');
} else {
  console.log('L-01: Anchor not found');
}
