#!/usr/bin/env node
const fs = require('fs');

// L-02: Add location privacy integration
{
  const p = 'controllers/locationSharingController.js';
  let c = fs.readFileSync(p, 'utf8');

  if (!c.includes('privacyExcluded')) {
    // Add privacy check variables after settings merge
    const anchor = 'const settings = mergeSettings(user.locationSharingSettings';
    const idx = c.indexOf(anchor);
    if (idx >= 0) {
      const lineEnd = c.indexOf('\n', idx);
      const insert = '    // L-02: Privacy exclusions for location sharing\n' +
        '    const privacyExcluded = user.privacyModsSettings?.excludedContacts || [];\n';
      c = c.slice(0, lineEnd + 1) + insert + c.slice(lineEnd + 1);
    }

    // Add exclusion check after isParticipant check
    const partAnchor = 'You are not a participant in this conversation';
    const partIdx = c.indexOf(partAnchor);
    if (partIdx >= 0) {
      let endIdx = c.indexOf('}', partIdx + partAnchor.length);
      endIdx = c.indexOf('}', endIdx + 1);
      const insertPoint = endIdx + 1;
      const block = '\n\n    // L-02: Check if any participant is excluded from location sharing\n' +
        '    if (privacyExcluded.length > 0) {\n' +
        '      const excludedParticipant = conversation.participants.find(p =>\n' +
        "        privacyExcluded.some(ex => String(ex) === String(p) && String(p) !== String(user._id))\n" +
        '      );\n' +
        "      if (excludedParticipant) {\n" +
        "        return res.status(403).json({ success: false, message: 'Cannot share location with excluded contacts' });\n" +
        '      }\n' +
        '    }';
      c = c.slice(0, insertPoint) + block + c.slice(insertPoint);
    }

    fs.writeFileSync(p, c, 'utf8');
    console.log('L-02: Added location privacy integration');
  } else {
    console.log('L-02: Already added');
  }
}

// L-01: Verify location auto-expire in server.js
{
  const p = 'server.js';
  let c = fs.readFileSync(p, 'utf8');
  if (c.includes('LocationSharing')) {
    console.log('L-01: Location cleanup already in cron');
  } else {
    console.log('L-01: Location cleanup NOT found - needs manual check');
  }
}

console.log('Done');
