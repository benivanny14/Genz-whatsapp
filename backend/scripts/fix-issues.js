#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { escapeRegExp } = require('../utils/escapeRegExp');

let c = fs.readFileSync(path.join(__dirname, '../routes/status.js'), 'utf8');

// O-01: Import escapeRegExp
{
  const anchor = "const { isEitherUserBlocked } = require('../utils/messageSendHelpers');";
  if (!c.includes("escapeRegExp")) {
    c = c.replace(anchor, () => anchor + "\nconst { escapeRegExp } = require('../utils/escapeRegExp');");
    console.log('O-01: Added escapeRegExp import');
  }
}

// O-01: Fix mentions regex - use function replacement to avoid $` interpretation
{
  const old = "new RegExp(`^${uname}$`, 'i')";
  if (c.includes(old)) {
    c = c.replace(old, () => "new RegExp(`^${escapeRegExp(uname)}$`, 'i')");
    console.log('O-01: Fixed mentions regex');
  }
}

// O-01: Fix search regex
{
  const old = "new RegExp(query.trim(), 'i')";
  if (c.includes(old)) {
    c = c.replace(old, () => "new RegExp(escapeRegExp(query.trim()), 'i')");
    console.log('O-01: Fixed search regex');
  }
}

// O-02: Sanitize linkPreview
{
  const old = "linkPreview: linkPreview || undefined,";
  if (c.includes(old)) {
    c = c.replace(old, () => [
      "      linkPreview: linkPreview ? {",
      "        url: String(linkPreview.url || '').slice(0, 2048),",
      "        title: String(linkPreview.title || '').replace(/[<>]/g, '').slice(0, 200),",
      "        description: String(linkPreview.description || '').replace(/[<>]/g, '').slice(0, 500),",
      "        image: String(linkPreview.image || '').slice(0, 2048),",
      "        domain: String(linkPreview.domain || '').replace(/[<>]/g, '').slice(0, 200)",
      "      } : undefined,"
    ].join('\n'));
    console.log('O-02: Sanitized linkPreview');
  }
}

// KB-04: Remove call-link route
{
  const start = c.indexOf('// ============ CALL LINK ============');
  if (start >= 0) {
    let depth = 0, started = false, i = c.indexOf('router.post', start);
    while (i < c.length) {
      if (c[i] === '{') { depth++; started = true; }
      if (c[i] === '}') depth--;
      if (started && depth === 0) { i += 3; break; }
      i++;
    }
    while (i < c.length && c[i] === '\n') i++;
    c = c.slice(0, start) + c.slice(i);
    console.log('KB-04: Removed call-link route');
  }
}

// K-02: Move /revoked, /drafts, /search above /:id routes
{
  const lines = c.split('\n');
  let revokedStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("router.get('/revoked'")) {
      revokedStart = i;
      while (revokedStart > 0 && (lines[revokedStart - 1].trim() === '' || lines[revokedStart - 1].trim().startsWith('//'))) revokedStart--;
      break;
    }
  }

  let searchEnd = -1;
  if (revokedStart >= 0) {
    let inSearch = false;
    for (let i = revokedStart; i < lines.length; i++) {
      if (lines[i].includes("router.get('/search'")) inSearch = true;
      if (inSearch) {
        let depth = 0, started = false;
        for (let j = i; j < lines.length; j++) {
          for (const ch of lines[j]) {
            if (ch === '{') { depth++; started = true; }
            if (ch === '}') depth--;
          }
          if (started && depth === 0) {
            searchEnd = j;
            while (searchEnd + 1 < lines.length && lines[searchEnd + 1].trim() === '') searchEnd++;
            break;
          }
        }
        break;
      }
    }
  }

  if (revokedStart >= 0 && searchEnd >= 0) {
    const block = lines.slice(revokedStart, searchEnd + 1).join('\n');
    const newLines = [...lines];
    newLines.splice(revokedStart, searchEnd - revokedStart + 1);
    
    let insertIdx = -1;
    for (let i = 0; i < newLines.length; i++) {
      if (newLines[i].includes("router.post('/:id/view'")) {
        insertIdx = i;
        while (insertIdx > 0 && (newLines[insertIdx - 1].trim() === '' || newLines[insertIdx - 1].trim().startsWith('//'))) insertIdx--;
        break;
      }
    }
    
    if (insertIdx >= 0) {
      newLines.splice(insertIdx, 0, block + '\n');
      c = newLines.join('\n');
      console.log('K-02: Moved /revoked, /drafts, /search above /:id routes');
    }
  }
}

fs.writeFileSync(path.join(__dirname, '../routes/status.js'), c, 'utf8');
console.log('✅ status.js done');
