#!/usr/bin/env node
const fs = require('fs');
let c = fs.readFileSync('routes/status.js', 'utf8');

// O-01: Add escapeRegExp - using simple string manipulation, no template literals
const anchor = "const { isEitherUserBlocked } = require('../utils/messageSendHelpers');";
const escapeFn = "const escapeRegExp = function(s) { return String(s).replace(/[-\\\\/^$*+?.()|[\\]{}]/g, '\\\\$&'); };";
if (!c.includes('escapeRegExp')) {
  c = c.replace(anchor, anchor + '\n' + escapeFn);
  console.log('Added escapeRegExp');
}

// O-01: Fix mentions regex
if (c.includes("new RegExp(`^${uname}$`, 'i')")) {
  c = c.replace(
    "new RegExp(`^${uname}$`, 'i')",
    "new RegExp(`^${escapeRegExp(uname)}$`, 'i')"
  );
  console.log('Fixed mentions regex');
}

// O-01: Fix search regex
if (c.includes("new RegExp(query.trim(), 'i')")) {
  c = c.replace(
    "new RegExp(query.trim(), 'i')",
    "new RegExp(escapeRegExp(query.trim()), 'i')"
  );
  console.log('Fixed search regex');
}

fs.writeFileSync('routes/status.js', c, 'utf8');
console.log('Done');
